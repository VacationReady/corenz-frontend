import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: timesheetId } = await params;

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

    // Fetch timesheet with entries
    const timesheet = await prisma.timesheet.findFirst({
      where: {
        id: timesheetId,
        companyId: requestingEmployee.companyId,
      },
      include: {
        TimesheetEntries: {
          orderBy: { date: 'asc' },
        },
        Employee: {
          include: {
            User: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Verify access - must be own timesheet or admin/manager
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    if (!isOwnTimesheet && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      timesheet: {
        id: timesheet.id,
        employeeId: timesheet.employeeId,
        companyId: timesheet.companyId,
        periodStart: timesheet.periodStart,
        periodEnd: timesheet.periodEnd,
        totalHours: timesheet.totalHours,
        regularHours: timesheet.regularHours,
        overtimeHours: timesheet.overtimeHours,
        approvalStatus: timesheet.approvalStatus,
        submittedAt: timesheet.submittedAt,
        approvedAt: timesheet.approvedAt,
        employee: timesheet.Employee,
      },
      entries: timesheet.TimesheetEntries,
    });
  } catch (error) {
    console.error('Timesheet entries fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheet entries' }, { status: 500 });
  }
}
