import { NextRequest, NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { roundClockTime } from '@/lib/timesheet-calculations';
import { verifyClockLocation } from '@/lib/gps-verification';
import { isPhotoRequiredForClockOut, isGpsLocationRequired } from '@/types/time-tracking-settings';
import { autoMatchClockEntryToShift, linkClockEntryToShift } from '@/lib/time-tracking/shift-matcher';

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

    // Validate GPS if required (using type-safe helper)
    if (isGpsLocationRequired(settings) && !data.location) {
      return NextResponse.json(
        { error: 'GPS location is required for clock out' },
        { status: 400 }
      );
    }

    // Verify geofence if configured - but don't block clock-out on failure
    let locationVerificationFailed = false;
    let locationWarning = '';
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
    } : undefined;

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

    return NextResponse.json({
      success: true,
      clockEntry: updatedEntry,
      hoursWorked: hoursWorked.toFixed(2),
      shiftMatch,
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
