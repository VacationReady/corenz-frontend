import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { roundClockTime } from '@/lib/timesheet-calculations';
import { verifyClockLocation } from '@/lib/gps-verification';

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
    const session = await getServerSession(authOptions);

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

          // Validate GPS if required (using canonical field name)
          if (settings?.requireGpsLocation && !entry.latitude && !entry.longitude) {
            failed.push({
              localId: entry.localId,
              error: 'GPS location is required',
            });
            continue;
          }

          // Verify geofence if configured
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
              failed.push({
                localId: entry.localId,
                error: `Location verification failed: ${verification.errors.join(', ')}`,
              });
              continue;
            }
          }

          // Apply rounding if configured
          let clockInTime = new Date(entry.timestamp);
          if (settings?.roundClockTimes && settings.roundClockTimes !== 'NONE') {
            clockInTime = roundClockTime(clockInTime, settings.roundClockTimes as any);
          }

          // Create clock entry
          const clockEntry = await prisma.clockEntry.create({
            data: {
              employeeId: employee.id,
              companyId: employee.companyId,
              clockInTime,
              clockInLocation:
                entry.latitude && entry.longitude
                  ? { lat: entry.latitude, lng: entry.longitude, accuracy: entry.accuracy }
                  : undefined,
              clockInPhotoUrl: entry.photoBase64
                ? await uploadPhoto(entry.photoBase64, employee.id, 'clockIn')
                : undefined,
              notes: entry.notes,
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

          // Apply rounding if configured
          let clockOutTime = new Date(entry.timestamp);
          if (settings?.roundClockTimes && settings.roundClockTimes !== 'NONE') {
            clockOutTime = roundClockTime(clockOutTime, settings.roundClockTimes as any);
          }

          // Update clock entry
          await prisma.clockEntry.update({
            where: { id: activeEntry.id },
            data: {
              clockOutTime,
              clockOutLocation:
                entry.latitude && entry.longitude
                  ? { lat: entry.latitude, lng: entry.longitude, accuracy: entry.accuracy }
                  : undefined,
              clockOutPhotoUrl: entry.photoBase64
                ? await uploadPhoto(entry.photoBase64, employee.id, 'clockOut')
                : undefined,
              status: 'COMPLETED',
              notes: entry.notes || activeEntry.notes,
              syncedAt: new Date(),
            },
          });

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

async function uploadPhoto(photoBase64: string, employeeId: string, photoType: string): Promise<string> {
  // TODO: Implement actual cloud storage upload
  const timestamp = Date.now();
  return `https://storage.corenz.app/time-tracking/synced/${employeeId}/${photoType}_${timestamp}.jpg`;
}
