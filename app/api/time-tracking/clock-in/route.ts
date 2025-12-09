import { NextRequest, NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma, ensurePrismaConnected } from '@/lib/prisma';
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
    // Ensure Prisma connection is established before operations
    // This prevents timeout on first request due to cold connection
    await ensurePrismaConnected();
    
    const session = await getMobileSession(req);

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

    // Verify geofence if configured - but don't block clock-in on failure
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
        locationWarning = `Clocked in outside of approved location${distanceInfo}`;
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

    // Build notes - include location warning if verification failed
    let notes = data.notes || '';
    if (locationVerificationFailed) {
      notes = notes ? `${notes} | ${locationWarning}` : locationWarning;
    }

    // Build location data with verification status
    const clockInLocationData = data.location ? {
      ...data.location,
      verificationFailed: locationVerificationFailed,
    } : undefined;

    // Create clock entry
    const clockEntry = await prisma.clockEntry.create({
      data: {
        employeeId: employee.id,
        companyId: employee.companyId,
        clockInTime,
        clockInLocation: clockInLocationData,
        clockInPhotoUrl: data.photoUrl,
        ipAddress,
        deviceInfo: data.deviceInfo || undefined,
        notes,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      clockEntry,
      message: locationVerificationFailed 
        ? locationWarning 
        : 'Clocked in successfully',
      warning: locationVerificationFailed ? locationWarning : undefined,
    });
  } catch (error) {
    console.error('Clock in error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 });
  }
}
