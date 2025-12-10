import { NextRequest, NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma, ensurePrismaConnected } from '@/lib/prisma';
import { z } from 'zod';
import { startOfDay } from 'date-fns';
import { roundClockTime } from '@/lib/timesheet-calculations';
import { verifyClockLocation } from '@/lib/gps-verification';
import { isPhotoRequiredForClockOut, isGpsLocationRequired } from '@/types/time-tracking-settings';
import { autoMatchClockEntryToShift, linkClockEntryToShift } from '@/lib/time-tracking/shift-matcher';
import { 
  findOrCreateTimesheet, 
  processTimesheetEntry, 
  recalculateTimesheetTotals,
  autoSubmitTimesheet,
} from '@/lib/time-tracking/timesheet-entry-processor';

const clockOutSchema = z.object({
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Ensure Prisma connection is established before heavy operations
    // This prevents timeout on first request due to cold connection
    await ensurePrismaConnected();
    
    const session = await getMobileSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = clockOutSchema.parse(body);

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get time tracking settings
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: employee.companyId },
    });

    // Find active clock entry
    const activeEntry = await prisma.clockEntry.findFirst({
      where: {
        employeeId: employee.id,
        status: 'ACTIVE',
      },
      orderBy: {
        clockInTime: 'desc',
      },
    });

    if (!activeEntry) {
      return NextResponse.json(
        { error: 'No active clock entry found. Please clock in first.' },
        { status: 400 }
      );
    }

    // Track if GPS was expected but not provided (for flagging, not blocking)
    // HRIS Best Practice: Never block clock-out due to GPS failure - employees must be able to record time
    // Instead, flag entries without location for manager review
    const gpsExpectedButMissing = isGpsLocationRequired(settings) && !data.location;

    // Verify geofence if configured - but don't block clock-out on failure
    let locationVerificationFailed = gpsExpectedButMissing;
    let locationWarning = gpsExpectedButMissing ? 'GPS location could not be captured' : '';
    if (data.location && settings?.geofenceLocations) {
      const geofences = settings.geofenceLocations as any[];
      const verification = verifyClockLocation(data.location, geofences, {
        requireGeofence: isGpsLocationRequired(settings),
        // Increase max accuracy tolerance for mobile networks
        maxAccuracyMeters: 2000,
      });

      if (!verification.isValid) {
        // Don't block - just flag that verification failed
        locationVerificationFailed = true;
        const distanceInfo = verification.nearestGeofence 
          ? ` (${Math.round(verification.nearestGeofence.distance)}m from ${verification.nearestGeofence.name})`
          : '';
        locationWarning = `Clocked out outside of approved location${distanceInfo}`;
      }
    }

    // Validate photo if required (using type-safe helper)
    if (isPhotoRequiredForClockOut(settings) && !data.photoUrl) {
      return NextResponse.json({ error: 'Photo is required for clock out' }, { status: 400 });
    }

    // Apply rounding if configured
    let clockOutTime = new Date();
    if (settings?.roundClockTimes && settings.roundClockTimes !== 'NONE') {
      clockOutTime = roundClockTime(clockOutTime, settings.roundClockTimes as any);
    }

    // Build notes - include location warning if verification failed
    let notes = data.notes || activeEntry.notes || '';
    if (locationVerificationFailed) {
      notes = notes ? `${notes} | ${locationWarning}` : locationWarning;
    }

    // Build location data with verification status
    const clockOutLocationData = data.location ? {
      ...data.location,
      verificationFailed: locationVerificationFailed,
    } : (gpsExpectedButMissing ? { verificationFailed: true, captureError: 'Location unavailable' } : undefined);

    // Update clock entry
    const updatedEntry = await prisma.clockEntry.update({
      where: { id: activeEntry.id },
      data: {
        clockOutTime,
        clockOutLocation: clockOutLocationData,
        clockOutPhotoUrl: data.photoUrl,
        notes,
        status: 'COMPLETED',
      },
    });

    // Calculate hours worked
    const hoursWorked =
      (clockOutTime.getTime() - activeEntry.clockInTime.getTime()) / (1000 * 60 * 60);

    // Auto-match to shift if enabled (non-blocking - errors are logged but don't fail clock-out)
    let shiftMatch = null;
    try {
      const matchResult = await autoMatchClockEntryToShift({
        id: updatedEntry.id,
        employeeId: employee.id,
        companyId: employee.companyId,
        clockInTime: activeEntry.clockInTime,
        clockOutTime,
      });
      
      if (matchResult && matchResult.confidence >= 0.7) {
        await linkClockEntryToShift(
          updatedEntry.id,
          matchResult.shiftId,
          'AUTO',
          matchResult.confidence
        );
        shiftMatch = {
          shiftId: matchResult.shiftId,
          confidence: matchResult.confidence,
          varianceMinutes: matchResult.varianceMinutes,
        };
      }
    } catch (matchError) {
      // Log but don't fail the clock-out
      console.error('[Clock-out] Auto-match error (non-blocking):', matchError);
    }

    // Auto-generate timesheet entry from clock data (non-blocking)
    // Skip if the clock entry was already linked to a timesheet (e.g., from manual generation)
    let timesheetEntry = null;
    if (!activeEntry.timesheetId) {
      try {
        // Find or create timesheet for this period
        const timesheetId = await findOrCreateTimesheet(
          employee.id,
          employee.companyId,
          clockOutTime
        );

      // Get break duration from matched shift or use default
      let breakMinutes = 0;
      if (shiftMatch?.shiftId) {
        const matchedShift = await prisma.shift.findUnique({
          where: { id: shiftMatch.shiftId },
          select: { breakDuration: true },
        });
        breakMinutes = matchedShift?.breakDuration || 0;
      }

      // Process the entry with overtime/holiday calculations
      const processedEntry = await processTimesheetEntry(
        {
          date: startOfDay(activeEntry.clockInTime),
          startTime: activeEntry.clockInTime,
          endTime: clockOutTime,
          breakMinutes,
        },
        employee.id,
        employee.companyId,
        'CLOCK',
        notes || undefined
      );

      // Get shift details if matched for linking
      let shiftDetails: { startTime: Date; endTime: Date } | null = null;
      if (shiftMatch?.shiftId) {
        shiftDetails = await prisma.shift.findUnique({
          where: { id: shiftMatch.shiftId },
          select: { startTime: true, endTime: true },
        });
      }

      // Create timesheet entry in transaction
      // Note: Using 'as any' for shift reconciliation fields due to Prisma type generation lag
      const createdEntry = await prisma.$transaction(async (tx) => {
        const entryData: any = {
          timesheetId,
          date: processedEntry.date,
          startTime: processedEntry.startTime,
          endTime: processedEntry.endTime,
          breakMinutes: processedEntry.breakMinutes,
          hours: processedEntry.hours,
          regularHours: processedEntry.regularHours,
          overtimeHours: processedEntry.overtimeHours,
          overtimeMultiplier: processedEntry.overtimeMultiplier,
          overtimeType: processedEntry.overtimeType,
          overtimeReason: processedEntry.overtimeReason,
          isOvertime: processedEntry.isOvertime,
          isPublicHoliday: processedEntry.isPublicHoliday,
          publicHolidayName: processedEntry.publicHolidayName,
          publicHolidayHours: processedEntry.publicHolidayHours,
          publicHolidayMultiplier: processedEntry.publicHolidayMultiplier,
          publicHolidayType: processedEntry.publicHolidayType,
          publicHolidayRegion: processedEntry.publicHolidayRegion,
          alternativeDayGranted: processedEntry.alternativeDayGranted,
          notes: processedEntry.notes,
          entryType: 'CLOCK',
          reconciliationStatus: shiftMatch ? 'AUTO_MATCHED' : 'PENDING',
        };

        // Add shift linking fields if matched
        if (shiftMatch && shiftDetails) {
          entryData.shiftId = shiftMatch.shiftId;
          entryData.scheduledStartTime = shiftDetails.startTime;
          entryData.scheduledEndTime = shiftDetails.endTime;
          entryData.varianceMinutes = shiftMatch.varianceMinutes;
        }

        const entry = await tx.timesheetEntry.create({
          data: entryData,
        });

        // Update clock entry to link to timesheet
        await tx.clockEntry.update({
          where: { id: updatedEntry.id },
          data: { timesheetId },
        });

        // Recalculate timesheet totals
        await recalculateTimesheetTotals(timesheetId, tx);

        return entry;
      });

      timesheetEntry = {
        id: createdEntry.id,
        timesheetId,
        hours: processedEntry.hours,
      };

      // Auto-submit the timesheet for approval (fire-and-forget to avoid timeout)
      // Using setImmediate pattern to not block the response
      const submitTimesheetId = timesheetId;
      const submitEmployeeId = employee.id;
      const submitCompanyId = employee.companyId;
      setImmediate(async () => {
        try {
          await autoSubmitTimesheet(submitTimesheetId, submitEmployeeId, submitCompanyId);
        } catch (submitError) {
          console.error('[Clock-out] Auto-submit timesheet error (non-blocking):', submitError);
        }
      });
      } catch (timesheetError) {
        // Log but don't fail the clock-out - timesheet can be generated manually if needed
        console.error('[Clock-out] Auto-generate timesheet error (non-blocking):', timesheetError);
      }
    }

    return NextResponse.json({
      success: true,
      clockEntry: updatedEntry,
      hoursWorked: hoursWorked.toFixed(2),
      shiftMatch,
      timesheetEntry,
      message: locationVerificationFailed 
        ? locationWarning 
        : 'Clocked out successfully',
      warning: locationVerificationFailed ? locationWarning : undefined,
    });
  } catch (error) {
    console.error('Clock out error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 });
  }
}
