import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { roundClockTime } from '@/lib/timesheet-calculations';
import { verifyClockLocation } from '@/lib/gps-verification';
import { isPhotoRequiredForClockIn, isGpsLocationRequired } from '@/types/time-tracking-settings';

const clockInSchema = z.object({
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
  photoUrl: z.string().optional(),
  deviceInfo: z
    .object({
      device: z.string(),
      os: z.string(),
      browser: z.string(),
    })
    .optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = clockInSchema.parse(body);

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

    // Check if there's an active clock entry
    const activeEntry = await prisma.clockEntry.findFirst({
      where: {
        employeeId: employee.id,
        status: 'ACTIVE',
      },
    });

    if (activeEntry) {
      return NextResponse.json(
        { error: 'You are already clocked in', activeEntry },
        { status: 400 }
      );
    }

    // Validate GPS if required (using type-safe helper)
    if (isGpsLocationRequired(settings) && !data.location) {
      return NextResponse.json(
        { error: 'GPS location is required for clock in' },
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
    if (isPhotoRequiredForClockIn(settings) && !data.photoUrl) {
      return NextResponse.json({ error: 'Photo is required for clock in' }, { status: 400 });
    }

    // Get IP address
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

    // Apply rounding if configured
    let clockInTime = new Date();
    if (settings?.roundClockTimes && settings.roundClockTimes !== 'NONE') {
      clockInTime = roundClockTime(clockInTime, settings.roundClockTimes as any);
    }

    // Create clock entry
    const clockEntry = await prisma.clockEntry.create({
      data: {
        employeeId: employee.id,
        companyId: employee.companyId,
        clockInTime,
        clockInLocation: data.location || undefined,
        clockInPhotoUrl: data.photoUrl,
        ipAddress,
        deviceInfo: data.deviceInfo || undefined,
        notes: data.notes,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      clockEntry,
      message: 'Clocked in successfully',
    });
  } catch (error) {
    console.error('Clock in error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 });
  }
}
