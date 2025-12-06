import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);

    // Build where clause
    const where: any = {
      companyId: requestingEmployee.companyId,
    };

    // If a specific employeeId is requested, use that (with permission check)
    if (employeeId) {
      // Admin/Manager can view any employee's timesheets
      if (isAdminOrManager) {
        where.employeeId = employeeId;
      } else if (employeeId === requestingEmployee.id) {
        // Non-admin/manager can only view their own
        where.employeeId = requestingEmployee.id;
      } else {
        return NextResponse.json({ error: 'Unauthorized to view other employees' }, { status: 403 });
      }
    } else {
      // No employeeId specified - always show requesting user's own timesheets
      // This prevents managers from accidentally seeing all company timesheets in "My Timesheets"
      where.employeeId = requestingEmployee.id;
    }

    if (status) {
      where.approvalStatus = status;
    }

    if (startDate && endDate) {
      where.periodStart = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Fetch timesheets
    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        ApprovalStages: {
          include: {
            Decisions: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        ClockEntries: {
          select: {
            id: true,
            clockInTime: true,
            clockOutTime: true,
            status: true,
          },
        },
        _count: {
          select: {
            TimesheetEntries: true,
          },
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    // Get employee details for each timesheet
    const employeeIds = [...new Set(timesheets.map((t: any) => t.employeeId))];
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
            profileImageUrl: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
      },
    });

    const employeeMap = new Map(employees.map((e: any) => [e.id, e]));

    const enrichedTimesheets = timesheets.map((timesheet: any) => ({
      ...timesheet,
      employee: employeeMap.get(timesheet.employeeId),
    }));

    return NextResponse.json({
      timesheets: enrichedTimesheets,
      total: timesheets.length,
    });
  } catch (error) {
    console.error('Timesheets fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheets' }, { status: 500 });
  }
}
