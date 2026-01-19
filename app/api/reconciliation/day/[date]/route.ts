/**
 * Reconciliation Day API
 * 
 * GET /api/reconciliation/day/[date]
 * Returns all shifts with their actual time data for a specific day
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getShiftsWithActualsForDay } from '@/lib/time-tracking/shift-matcher';
import { startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Infer timezone from public holiday region.
 * Returns IANA timezone string or null if unknown.
 */
function inferTimezoneFromRegion(region: string | null | undefined): string | null {
  if (!region) return null;
  
  const regionTimezones: Record<string, string> = {
    // New Zealand regions
    'NZ': 'Pacific/Auckland',
    'NZ-AUK': 'Pacific/Auckland',
    'NZ-WGN': 'Pacific/Auckland',
    'NZ-CAN': 'Pacific/Auckland',
    'NZ-OTA': 'Pacific/Auckland',
    'NZ-STL': 'Pacific/Auckland',
    'NZ-TKI': 'Pacific/Auckland',
    'NZ-HKB': 'Pacific/Auckland',
    'NZ-MWT': 'Pacific/Auckland',
    'NZ-WTC': 'Pacific/Auckland',
    'NZ-MBH': 'Pacific/Auckland',
    'NZ-NSN': 'Pacific/Auckland',
    'NZ-NTL': 'Pacific/Auckland',
    'NZ-BOP': 'Pacific/Auckland',
    'NZ-GIS': 'Pacific/Auckland',
    'NZ-TAS': 'Pacific/Auckland',
    'NZ-WKO': 'Pacific/Auckland',
    // Chatham Islands (NZ) - different timezone
    'NZ-CIT': 'Pacific/Chatham',
    // Australia regions
    'AU': 'Australia/Sydney',
    'AU-NSW': 'Australia/Sydney',
    'AU-VIC': 'Australia/Melbourne',
    'AU-QLD': 'Australia/Brisbane',
    'AU-WA': 'Australia/Perth',
    'AU-SA': 'Australia/Adelaide',
    'AU-TAS': 'Australia/Hobart',
    'AU-NT': 'Australia/Darwin',
    'AU-ACT': 'Australia/Sydney',
    // UK
    'GB': 'Europe/London',
    'UK': 'Europe/London',
    // US (default to Eastern, could be more granular)
    'US': 'America/New_York',
  };
  
  return regionTimezones[region.toUpperCase()] || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get employee to verify permissions and get companyId
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
        User: { select: { role: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const isAdmin = employee.User.role === 'ADMIN' || employee.User.role === 'SUPER_ADMIN';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can access reconciliation data' },
        { status: 403 }
      );
    }

    // Parse date from params (Next.js 15 requires awaiting params)
    const { date: dateStr } = await params;
    let date: Date;

    try {
      // Try ISO format first
      date = parseISO(dateStr);
      if (!isValid(date)) {
        // Try as timestamp
        const timestamp = parseInt(dateStr, 10);
        if (!isNaN(timestamp)) {
          date = new Date(timestamp);
        } else {
          throw new Error('Invalid date');
        }
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD or timestamp.' },
        { status: 400 }
      );
    }

    // Parse query params for filters
    const searchParams = req.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const locationId = searchParams.get('locationId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500); // Cap at 500

    const effectiveDepartmentId = departmentId;

    // Get company timezone (fallback to Pacific/Auckland for NZ-based system)
    // TODO: Add timezone field to Company model for multi-region support
    const company = await prisma.company.findUnique({
      where: { id: employee.companyId },
      select: { publicHolidayRegion: true },
    });
    
    // Infer timezone from region or default to NZ
    const timeZone = inferTimezoneFromRegion(company?.publicHolidayRegion) || 'Pacific/Auckland';

    // Get shifts with actuals (pass timezone for correct day boundary calculation)
    const shiftsWithActuals = await getShiftsWithActualsForDay(
      employee.companyId,
      date,
      {
        departmentId: effectiveDepartmentId,
        employeeId,
        locationId,
        timezone: timeZone,
      }
    );
    
    const zonedDate = toZonedTime(date, timeZone);
    const zonedStart = startOfDay(zonedDate);
    const zonedEnd = endOfDay(zonedDate);
    const dayStart = fromZonedTime(zonedStart, timeZone);
    const dayEnd = fromZonedTime(zonedEnd, timeZone);

    // Get unmatched clock entries with server-side shiftId filtering and pagination
    const unmatchedClockEntries = await prisma.clockEntry.findMany({
      where: {
        companyId: employee.companyId,
        shiftId: null, // Server-side filter for unmatched entries
        clockInTime: {
          gte: dayStart,
          lt: dayEnd,
        },
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        Employee: {
          include: {
            User: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
      orderBy: { clockInTime: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const totalUnmatchedCount = await prisma.clockEntry.count({
      where: {
        companyId: employee.companyId,
        shiftId: null,
        clockInTime: {
          gte: dayStart,
          lt: dayEnd,
        },
        ...(employeeId ? { employeeId } : {}),
      },
    });

    return NextResponse.json({
      date: date.toISOString(),
      timezone: timeZone,
      shifts: shiftsWithActuals,
      unmatchedClockEntries: unmatchedClockEntries.map((entry) => ({
        id: entry.id,
        employeeId: entry.employeeId,
        clockInTime: entry.clockInTime,
        clockOutTime: entry.clockOutTime,
        employee: entry.Employee ? {
          id: entry.Employee.id,
          name: entry.Employee.User?.name ||
            `${entry.Employee.User?.firstName || ''} ${entry.Employee.User?.lastName || ''}`.trim() ||
            entry.Employee.User?.email || 'Unknown',
          profileImageUrl: entry.Employee.User?.profileImageUrl,
        } : null,
      })),
      totalShifts: shiftsWithActuals.length,
      matchedCount: shiftsWithActuals.filter((s) => s.clockEntry || s.timesheetEntry).length,
      pendingCount: shiftsWithActuals.filter((s) => s.reconciliationStatus === 'PENDING').length,
      pagination: {
        page,
        limit,
        totalUnmatched: totalUnmatchedCount,
        hasMore: (page * limit) < totalUnmatchedCount,
      },
    });
  } catch (error) {
    console.error('[API] Reconciliation day error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation data' },
      { status: 500 }
    );
  }
}

