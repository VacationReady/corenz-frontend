import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/timesheets/[id]/audit
 * Get audit trail for all entries in a timesheet
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: timesheetId } = await params;

    // Get requesting employee
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
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

    // Get timesheet to validate access
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        Employee: {
          select: {
            companyId: true,
            departmentId: true,
            User: {
              select: {
                managerId: true,
              },
            },
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    if (timesheet.Employee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const isAdmin = requestingEmployee.User.role === 'ADMIN';
    const isManager = requestingEmployee.User.role === 'MANAGER';
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    // Check permissions - must be own timesheet, manager of department, or admin
    if (!isOwnTimesheet && !isAdmin) {
      if (!isManager) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      const isInDepartment = timesheet.Employee.departmentId === requestingEmployee.departmentId;
      const isDirectReport = timesheet.Employee.User?.managerId === session.user.id;
      
      if (!isInDepartment && !isDirectReport) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get audit logs for all entries in this timesheet
    const auditLogs = await prisma.timesheetEntryAudit.findMany({
      where: { timesheetId },
      include: {
        Entry: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
            hours: true,
          },
        },
        ChangedBy: {
          select: {
            User: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
    });

    return NextResponse.json({ auditLogs });
  } catch (error) {
    console.error('Audit fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit trail' }, { status: 500 });
  }
}
