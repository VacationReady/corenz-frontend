import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { roundClockTime } from '@/lib/timesheet-calculations';
import { verifyClockLocation } from '@/lib/gps-verification';
import { isPhotoRequiredForClockOut, isGpsLocationRequired } from '@/types/time-tracking-settings';

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
    const session = await getServerSession(authOptions);

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

    // Verify geofence if configured
    if (data.location && settings?.geofenceLocations) {
      const geofences = settings.geofenceLocations as any[];
      const verification = verifyClockLocation(data.location, geofences, {
        requireGeofence: isGpsLocationRequired(settings),
        maxAccuracyMeters: 100,
      });

      if (!verification.isValid) {
        return NextResponse.json(
          {
            error: 'Location verification failed',
            details: verification.errors,
            warnings: verification.warnings,
          },
          { status: 400 }
        );
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

    // Update clock entry
    const updatedEntry = await prisma.clockEntry.update({
      where: { id: activeEntry.id },
      data: {
        clockOutTime,
        clockOutLocation: data.location || undefined,
        clockOutPhotoUrl: data.photoUrl,
        notes: data.notes || activeEntry.notes,
        status: 'COMPLETED',
      },
    });

    // Calculate hours worked
    const hoursWorked =
      (clockOutTime.getTime() - activeEntry.clockInTime.getTime()) / (1000 * 60 * 60);

    return NextResponse.json({
      success: true,
      clockEntry: updatedEntry,
      hoursWorked: hoursWorked.toFixed(2),
      message: 'Clocked out successfully',
    });
  } catch (error) {
    console.error('Clock out error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 });
  }
}
