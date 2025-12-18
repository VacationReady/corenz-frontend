import { NextRequest, NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfDay } from 'date-fns';
import { roundClockTime } from '@/lib/timesheet-calculations';
import { verifyClockLocation } from '@/lib/gps-verification';
import { uploadClockPhoto } from '@/lib/storage/clock-photos';
import { autoMatchClockEntryToShift, linkClockEntryToShift } from '@/lib/time-tracking/shift-matcher';
import { 
  findOrCreateTimesheet, 
  processTimesheetEntry, 
  recalculateTimesheetTotals 
} from '@/lib/time-tracking/timesheet-entry-processor';

const syncEntrySchema = z.object({
  localId: z.string(),
  type: z.enum(['CLOCK_IN', 'CLOCK_OUT']),
  timestamp: z.string().datetime(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
  locationId: z.string().optional(),
  photoBase64: z.string().optional(),
  notes: z.string().optional(),
  breakDuration: z.number().optional(),
  offlineCreated: z.literal(true),
});

const syncRequestSchema = z.object({
  entries: z.array(syncEntrySchema),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getMobileSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = syncRequestSchema.parse(body);

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

    const synced: Array<{
      localId: string;
      serverId: string;
      success: true;
    }> = [];
    const failed: Array<{
      localId: string;
      error: string;
    }> = [];

    // Process each offline entry
    for (const entry of data.entries) {
      try {
        // Check if this local ID has already been synced
        const existing = await prisma.clockEntry.findFirst({
          where: {
            localId: entry.localId,
            employeeId: employee.id,
          },
        });

        if (existing) {
          failed.push({
            localId: entry.localId,
            error: 'Entry already synced',
          });
          continue;
        }

        if (entry.type === 'CLOCK_IN') {
          // Check for active clock entry
          const activeEntry = await prisma.clockEntry.findFirst({
            where: {
              employeeId: employee.id,
              status: 'ACTIVE',
            },
          });

          if (activeEntry) {
            failed.push({
              localId: entry.localId,
              error: 'Already clocked in',
            });
            continue;
          }

          // Track if GPS was expected but not provided (for flagging, not blocking)
          // HRIS Best Practice: Never block clock-in due to GPS failure - employees must be able to record time
          // Instead, flag entries without location for manager review
          const gpsExpectedButMissing = settings?.requireGpsLocation && !entry.latitude && !entry.longitude;

          // Verify geofence if configured - don't block sync on failure, just flag it
          let locationVerificationFailed = gpsExpectedButMissing || false;
          let locationWarning = gpsExpectedButMissing ? 'GPS location could not be captured' : '';
          if (entry.latitude && entry.longitude && settings?.geofenceLocations) {
            const geofences = settings.geofenceLocations as any[];
            const verification = verifyClockLocation(
              { lat: entry.latitude, lng: entry.longitude, accuracy: entry.accuracy },
              geofences,
              {
                requireGeofence: settings.requireGpsLocation,
                maxAccuracyMeters: 100,
              }
            );

            if (!verification.isValid) {
              // Don't block - just flag that verification failed
              locationVerificationFailed = true;
              const distanceInfo = verification.nearestGeofence 
                ? ` (${Math.round(verification.nearestGeofence.distance)}m from ${verification.nearestGeofence.name})`
                : '';
              locationWarning = `Clocked in outside of approved location${distanceInfo}`;
            }
          }

          // Apply rounding if configured
          let clockInTime = new Date(entry.timestamp);
          if (settings?.roundClockTimes && settings.roundClockTimes !== 'NONE') {
            clockInTime = roundClockTime(clockInTime, settings.roundClockTimes as any);
          }

          // Upload photo if provided
          let clockInPhotoUrl: string | undefined;
          if (entry.photoBase64) {
            try {
              const uploadResult = await uploadClockPhoto(entry.photoBase64, {
                entryId: entry.localId, // Use localId temporarily
                photoType: 'clockIn',
                employeeId: employee.id,
                companyId: employee.companyId,
              });
              clockInPhotoUrl = uploadResult.url;
            } catch (uploadError) {
              console.error('[sync] Clock-in photo upload failed:', uploadError);
              // Continue without photo - don't fail the entire sync
            }
          }

          // Build notes with location warning if applicable
          let notes = entry.notes || '';
          if (locationVerificationFailed) {
            notes = notes ? `${notes} | ${locationWarning}` : locationWarning;
          }

          // Build location data with verification status
          const clockInLocationData = entry.latitude && entry.longitude
            ? { lat: entry.latitude, lng: entry.longitude, accuracy: entry.accuracy, verificationFailed: locationVerificationFailed }
            : (gpsExpectedButMissing ? { verificationFailed: true, captureError: 'Location unavailable' } : undefined);

          // Create clock entry
          const clockEntry = await prisma.clockEntry.create({
            data: {
              employeeId: employee.id,
              companyId: employee.companyId,
              clockInTime,
              clockInLocation: clockInLocationData,
              clockInPhotoUrl,
              notes,
              status: 'ACTIVE',
              localId: entry.localId,
              syncedAt: new Date(),
              offlineCreated: true,
            },
          });

          synced.push({
            localId: entry.localId,
            serverId: clockEntry.id,
            success: true,
          });
        } else if (entry.type === 'CLOCK_OUT') {
          // Find the active clock entry to close
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
            failed.push({
              localId: entry.localId,
              error: 'No active clock entry to clock out',
            });
            continue;
          }

          // Track if GPS was expected but not provided (for flagging, not blocking)
          const clockOutGpsExpectedButMissing = settings?.requireGpsLocation && !entry.latitude && !entry.longitude;

          // Verify geofence if configured - don't block sync on failure, just flag it
          let clockOutLocationVerificationFailed = clockOutGpsExpectedButMissing || false;
          let clockOutLocationWarning = clockOutGpsExpectedButMissing ? 'GPS location could not be captured' : '';
          if (entry.latitude && entry.longitude && settings?.geofenceLocations) {
            const geofences = settings.geofenceLocations as any[];
            const verification = verifyClockLocation(
              { lat: entry.latitude, lng: entry.longitude, accuracy: entry.accuracy },
              geofences,
              {
                requireGeofence: settings.requireGpsLocation,
                maxAccuracyMeters: 100,
              }
            );

            if (!verification.isValid) {
              clockOutLocationVerificationFailed = true;
              const distanceInfo = verification.nearestGeofence 
                ? ` (${Math.round(verification.nearestGeofence.distance)}m from ${verification.nearestGeofence.name})`
                : '';
              clockOutLocationWarning = `Clocked out outside of approved location${distanceInfo}`;
            }
          }

          // Apply rounding if configured
          let clockOutTime = new Date(entry.timestamp);
          if (settings?.roundClockTimes && settings.roundClockTimes !== 'NONE') {
            clockOutTime = roundClockTime(clockOutTime, settings.roundClockTimes as any);
          }

          // Upload photo if provided
          let clockOutPhotoUrl: string | undefined;
          if (entry.photoBase64) {
            try {
              const uploadResult = await uploadClockPhoto(entry.photoBase64, {
                entryId: activeEntry.id,
                photoType: 'clockOut',
                employeeId: employee.id,
                companyId: employee.companyId,
              });
              clockOutPhotoUrl = uploadResult.url;
            } catch (uploadError) {
              console.error('[sync] Clock-out photo upload failed:', uploadError);
              // Continue without photo - don't fail the entire sync
            }
          }

          // Build notes with location warning if applicable
          let clockOutNotes = entry.notes || activeEntry.notes || '';
          if (clockOutLocationVerificationFailed) {
            clockOutNotes = clockOutNotes ? `${clockOutNotes} | ${clockOutLocationWarning}` : clockOutLocationWarning;
          }

          // Build clock-out location data with verification status
          const clockOutLocationData = entry.latitude && entry.longitude
            ? { lat: entry.latitude, lng: entry.longitude, accuracy: entry.accuracy, verificationFailed: clockOutLocationVerificationFailed }
            : (clockOutGpsExpectedButMissing ? { verificationFailed: true, captureError: 'Location unavailable' } : undefined);

          // Update clock entry
          const updatedEntry = await prisma.clockEntry.update({
            where: { id: activeEntry.id },
            data: {
              clockOutTime,
              clockOutLocation: clockOutLocationData,
              clockOutPhotoUrl,
              status: 'COMPLETED',
              notes: clockOutNotes,
              syncedAt: new Date(),
            },
          });

          // Auto-match to shift (non-blocking)
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
            console.error('[Sync] Auto-match error (non-blocking):', matchError);
          }

          // Auto-generate timesheet entry from clock data (non-blocking)
          // Skip if the clock entry was already linked to a timesheet (e.g., from manual generation)
          if (!activeEntry.timesheetId) {
            try {
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
              clockOutNotes || undefined
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
            await prisma.$transaction(async (tx) => {
              // Find or create timesheet for this period
              const timesheetId = await findOrCreateTimesheet(
                employee.id,
                employee.companyId,
                clockOutTime,
                tx
              );

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

              await tx.timesheetEntry.create({
                data: entryData,
              });

              // Update clock entry to link to timesheet
              await tx.clockEntry.update({
                where: { id: updatedEntry.id },
                data: { timesheetId },
              });

              // Recalculate timesheet totals
              await recalculateTimesheetTotals(timesheetId, tx);
            });
            } catch (timesheetError) {
              // Log but don't fail the sync - timesheet can be generated manually if needed
              console.error('[Sync] Auto-generate timesheet error (non-blocking):', timesheetError);
            }
          }

          synced.push({
            localId: entry.localId,
            serverId: activeEntry.id,
            success: true,
          });
        }
      } catch (error) {
        console.error('Sync entry error:', error);
        failed.push({
          localId: entry.localId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      failed,
      summary: {
        total: data.entries.length,
        succeeded: synced.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to sync entries' }, { status: 500 });
  }
}

