/**
 * Reconciliation Details API
 * 
 * GET /api/reconciliation/details
 * Returns detailed breakdown of reconciliation stats for modals
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { parseISO, isValid, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { Prisma } from '@prisma/client';

export type DetailType = 
  | 'total_shifts'
  | 'pending'
  | 'approved'
  | 'flagged'
  | 'no_shows'
  | 'variance'
  | 'scheduled_hours'
  | 'actual_hours';

interface ShiftDetail {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeEmail: string | null;
  profileImageUrl: string | null;
  role: string | null;
  department: string | null;
  startTime: string;
  endTime: string;
  scheduledHours: number;
  actualHours: number | null;
  varianceMinutes: number | null;
  varianceType: string | null;
  reconciliationStatus: string;
  hasClockEntry: boolean;
  hasTimesheetEntry: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
}

export async function GET(req: NextRequest) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        { error: 'Only admins can access reconciliation details' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as DetailType;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!type || !startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: type, startDate, endDate' },
        { status: 400 }
      );
    }

    const startDate = parseISO(startDateParam);
    const endDate = parseISO(endDateParam);

    if (!isValid(startDate) || !isValid(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: Prisma.ShiftWhereInput = {
      companyId: employee.companyId,
      isPublished: true,
      startTime: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    };


    // Fetch shifts with all related data
    const shifts = await prisma.shift.findMany({
      where: whereClause,
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
            Department: {
              select: { name: true },
            },
          },
        },
        ClockEntries: {
          orderBy: { clockInTime: 'asc' },
          take: 1,
        },
        TimesheetEntries: {
          where: {
            date: {
              gte: startOfDay(startDate),
              lte: endOfDay(endDate),
            },
          },
          take: 1,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Process shifts into details
    const allDetails: ShiftDetail[] = shifts.map((shift) => {
      const clockEntry = shift.ClockEntries[0] || null;
      const timesheetEntry = shift.TimesheetEntries[0] || null;
      
      const scheduledMinutes = differenceInMinutes(shift.endTime, shift.startTime);
      let actualMinutes: number | null = null;
      let varianceMinutes: number | null = null;
      let varianceType: string | null = null;
      let reconciliationStatus = 'PENDING';

      if (clockEntry && clockEntry.clockOutTime) {
        actualMinutes = differenceInMinutes(clockEntry.clockOutTime, clockEntry.clockInTime);
        varianceMinutes = actualMinutes - scheduledMinutes;
        varianceType = getVarianceType(varianceMinutes);
      } else if (timesheetEntry) {
        actualMinutes = differenceInMinutes(timesheetEntry.endTime, timesheetEntry.startTime);
        varianceMinutes = actualMinutes - scheduledMinutes;
        varianceType = timesheetEntry.varianceType || getVarianceType(varianceMinutes);
        reconciliationStatus = timesheetEntry.reconciliationStatus || 'PENDING';
      } else if (shift.endTime < new Date()) {
        varianceType = 'NO_SHOW';
        reconciliationStatus = 'NO_SHOW';
      }

      const employeeName = shift.Employee?.User?.name ||
        `${shift.Employee?.User?.firstName || ''} ${shift.Employee?.User?.lastName || ''}`.trim() ||
        'Unassigned';

      return {
        id: shift.id,
        employeeId: shift.employeeId,
        employeeName,
        employeeEmail: shift.Employee?.User?.email || null,
        profileImageUrl: shift.Employee?.User?.profileImageUrl || null,
        role: shift.role,
        department: shift.Employee?.Department?.name || null,
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        scheduledHours: Math.round((scheduledMinutes / 60) * 100) / 100,
        actualHours: actualMinutes !== null ? Math.round((actualMinutes / 60) * 100) / 100 : null,
        varianceMinutes,
        varianceType,
        reconciliationStatus,
        hasClockEntry: !!clockEntry,
        hasTimesheetEntry: !!timesheetEntry,
        clockInTime: clockEntry?.clockInTime?.toISOString() || null,
        clockOutTime: clockEntry?.clockOutTime?.toISOString() || null,
      };
    });

    // Filter based on type
    let filteredDetails: ShiftDetail[] = [];
    let summary: Record<string, any> = {};

    switch (type) {
      case 'total_shifts':
        filteredDetails = allDetails;
        summary = {
          total: allDetails.length,
          matched: allDetails.filter(d => d.hasClockEntry || d.hasTimesheetEntry).length,
          unmatched: allDetails.filter(d => !d.hasClockEntry && !d.hasTimesheetEntry).length,
        };
        break;

      case 'pending':
        filteredDetails = allDetails.filter(d => 
          d.reconciliationStatus === 'PENDING' || 
          d.reconciliationStatus === 'AUTO_MATCHED'
        );
        summary = {
          total: filteredDetails.length,
          withClockData: filteredDetails.filter(d => d.hasClockEntry).length,
          withTimesheetData: filteredDetails.filter(d => d.hasTimesheetEntry).length,
        };
        break;

      case 'approved':
        filteredDetails = allDetails.filter(d => d.reconciliationStatus === 'APPROVED');
        summary = {
          total: filteredDetails.length,
          totalHours: filteredDetails.reduce((sum, d) => sum + (d.actualHours || 0), 0),
        };
        break;

      case 'flagged':
        filteredDetails = allDetails.filter(d => d.reconciliationStatus === 'FLAGGED');
        summary = {
          total: filteredDetails.length,
          avgVariance: filteredDetails.length > 0
            ? Math.round(filteredDetails.reduce((sum, d) => sum + Math.abs(d.varianceMinutes || 0), 0) / filteredDetails.length)
            : 0,
        };
        break;

      case 'no_shows':
        filteredDetails = allDetails.filter(d => 
          d.varianceType === 'NO_SHOW' || 
          (!d.hasClockEntry && !d.hasTimesheetEntry && new Date(d.endTime) < new Date())
        );
        summary = {
          total: filteredDetails.length,
          lostHours: filteredDetails.reduce((sum, d) => sum + d.scheduledHours, 0),
        };
        break;

      case 'variance':
        filteredDetails = allDetails
          .filter(d => d.varianceMinutes !== null && d.varianceMinutes !== 0)
          .sort((a, b) => Math.abs(b.varianceMinutes || 0) - Math.abs(a.varianceMinutes || 0));
        
        const variances = filteredDetails.map(d => d.varianceMinutes || 0);
        summary = {
          total: filteredDetails.length,
          avgVariance: variances.length > 0 
            ? Math.round(variances.reduce((sum, v) => sum + Math.abs(v), 0) / variances.length)
            : 0,
          overtime: filteredDetails.filter(d => (d.varianceMinutes || 0) > 15).length,
          undertime: filteredDetails.filter(d => (d.varianceMinutes || 0) < -15).length,
          onTime: allDetails.filter(d => d.varianceMinutes !== null && Math.abs(d.varianceMinutes) <= 5).length,
        };
        break;

      case 'scheduled_hours':
        filteredDetails = allDetails;
        const totalScheduled = allDetails.reduce((sum, d) => sum + d.scheduledHours, 0);
        const byRole: Record<string, number> = {};
        allDetails.forEach(d => {
          const role = d.role || 'Unassigned';
          byRole[role] = (byRole[role] || 0) + d.scheduledHours;
        });
        summary = {
          totalHours: Math.round(totalScheduled * 100) / 100,
          byRole: Object.entries(byRole)
            .map(([role, hours]) => ({ role, hours: Math.round(hours * 100) / 100 }))
            .sort((a, b) => b.hours - a.hours),
          avgPerShift: allDetails.length > 0 
            ? Math.round((totalScheduled / allDetails.length) * 100) / 100
            : 0,
        };
        break;

      case 'actual_hours':
        filteredDetails = allDetails.filter(d => d.actualHours !== null);
        const totalActual = filteredDetails.reduce((sum, d) => sum + (d.actualHours || 0), 0);
        const totalScheduledForActual = filteredDetails.reduce((sum, d) => sum + d.scheduledHours, 0);
        summary = {
          totalHours: Math.round(totalActual * 100) / 100,
          scheduledHours: Math.round(totalScheduledForActual * 100) / 100,
          difference: Math.round((totalActual - totalScheduledForActual) * 100) / 100,
          shiftsWithData: filteredDetails.length,
          shiftsWithoutData: allDetails.length - filteredDetails.length,
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({
      type,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary,
      details: filteredDetails,
    });
  } catch (error) {
    console.error('[API] Reconciliation details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation details' },
      { status: 500 }
    );
  }
}

function getVarianceType(varianceMinutes: number): string {
  if (Math.abs(varianceMinutes) <= 5) return 'ON_TIME';
  if (varianceMinutes > 15) return 'OVERTIME';
  if (varianceMinutes < -15) return 'UNDERTIME';
  if (varianceMinutes > 0) return 'LATE_END';
  return 'EARLY_END';
}
