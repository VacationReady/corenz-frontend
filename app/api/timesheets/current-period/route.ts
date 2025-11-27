import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getTimesheetPeriod, calculateHours } from '@/lib/timesheet-calculations';
import { findNearestGeofence, isWithinGeofence, Geofence } from '@/lib/gps-verification';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get company settings to determine period
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    // Determine current period
    const period = getTimesheetPeriod(
      new Date(),
      (settings?.timesheetPeriod || 'WEEKLY') as any,
      (settings?.periodStartDay || 'MONDAY') as any
    );

    const { periodStart, periodEnd } = period;

    // Fetch clock entries for the current period that aren't assigned to a timesheet yet
    const clockEntries = await prisma.clockEntry.findMany({
      where: {
        employeeId: requestingEmployee.id,
        companyId: requestingEmployee.companyId,
        clockInTime: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'COMPLETED',
        timesheetId: null, // Only entries not yet in a timesheet
      },
      orderBy: {
        clockInTime: 'asc',
      },
    });

    // Note: Manual entries without a timesheetId don't exist yet in the current schema
    // Manual entries are always created as part of a timesheet, not standalone
    // So we'll just use an empty array for now
    const manualEntries: any[] = [];

    // Get geofence locations for matching
    const geofences: Geofence[] = settings?.geofenceLocations
      ? (settings.geofenceLocations as any[]).map((g: any) => ({
          lat: g.lat,
          lng: g.lng,
          radius: g.radius || 100,
          name: g.name || 'Unknown Location',
        }))
      : [];

    // Helper to get location name from coordinates
    const getLocationName = (locationData: any): string | null => {
      if (!locationData || typeof locationData !== 'object') return null;
      
      const { lat, lng } = locationData;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;

      // If no geofences configured, return coordinates info
      if (geofences.length === 0) {
        return 'GPS Recorded';
      }

      // Check if within any geofence
      for (const geofence of geofences) {
        if (isWithinGeofence({ lat, lng }, geofence)) {
          return geofence.name;
        }
      }

      // Find nearest geofence
      const nearest = findNearestGeofence({ lat, lng }, geofences);
      if (nearest) {
        const distanceMeters = Math.round(nearest.distance);
        if (distanceMeters < 1000) {
          return `Near ${nearest.geofence.name} (${distanceMeters}m away)`;
        }
        return `${(distanceMeters / 1000).toFixed(1)}km from ${nearest.geofence.name}`;
      }

      return 'Location recorded';
    };

    // Transform clock entries to match TimesheetTable format
    const formattedClockEntries = clockEntries.map((entry: any) => ({
      id: entry.id,
      date: entry.clockInTime,
      startTime: entry.clockInTime,
      endTime: entry.clockOutTime || entry.clockInTime,
      breakMinutes: entry.breakMinutes ?? 0,
      hours: entry.clockOutTime
        ? calculateHours(entry.clockInTime, entry.clockOutTime, entry.breakMinutes ?? 0)
        : 0,
      isOvertime: false,
      notes: entry.notes,
      entryType: 'CLOCK',
      clockInLocation: entry.clockInLocation,
      clockOutLocation: entry.clockOutLocation,
      locationName: getLocationName(entry.clockInLocation),
    }));

    // Manual entries are already in the correct format
    const formattedManualEntries = manualEntries.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      breakMinutes: entry.breakMinutes,
      hours: typeof entry.hours === 'string' ? parseFloat(entry.hours) : entry.hours,
      isOvertime: entry.isOvertime,
      notes: entry.notes,
      entryType: entry.entryType,
    }));

    // Combine and sort all entries by date
    const allEntries = [...formattedClockEntries, ...formattedManualEntries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    // Calculate totals
    const totalHours = allEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const regularHours = allEntries
      .filter((e) => !e.isOvertime)
      .reduce((sum, entry) => sum + entry.hours, 0);
    const overtimeHours = allEntries
      .filter((e) => e.isOvertime)
      .reduce((sum, entry) => sum + entry.hours, 0);

    return NextResponse.json({
      entries: allEntries,
      periodStart,
      periodEnd,
      summary: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        regularHours: parseFloat(regularHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        entryCount: allEntries.length,
        clockEntryCount: formattedClockEntries.length,
        manualEntryCount: formattedManualEntries.length,
      },
    });
  } catch (error) {
    console.error('Current period fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch current period entries' }, { status: 500 });
  }
}
