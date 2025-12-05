/**
 * Reconciliation Day API
 * 
 * GET /api/reconciliation/day/[date]
 * Returns all shifts with their actual time data for a specific day
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getShiftsWithActualsForDay } from '@/lib/time-tracking/shift-matcher';
import { startOfDay, parseISO, isValid } from 'date-fns';

export async function GET(
  req: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const session = await getServerSession(authOptions);

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
    const isManager = employee.User.role === 'MANAGER';

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Only admins and managers can access reconciliation data' },
        { status: 403 }
      );
    }

    // Parse date from params
    const dateStr = params.date;
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

    // If manager, restrict to their department
    const effectiveDepartmentId = isManager && !isAdmin
      ? employee.departmentId || undefined
      : departmentId;

    // Get shifts with actuals
    const shiftsWithActuals = await getShiftsWithActualsForDay(
      employee.companyId,
      date,
      {
        departmentId: effectiveDepartmentId,
        employeeId,
        locationId,
      }
    );

    // Also get unmatched clock entries for this day
    const unmatchedClockEntries = await prisma.clockEntry.findMany({
      where: {
        companyId: employee.companyId,
        shiftId: null,
        clockInTime: {
          gte: startOfDay(date),
          lt: new Date(startOfDay(date).getTime() + 24 * 60 * 60 * 1000),
        },
        ...(effectiveDepartmentId ? {
          Employee: { departmentId: effectiveDepartmentId }
        } : {}),
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
    });

    return NextResponse.json({
      date: date.toISOString(),
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
    });
  } catch (error) {
    console.error('[API] Reconciliation day error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation data' },
      { status: 500 }
    );
  }
}

