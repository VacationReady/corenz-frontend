import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { validateTimesheetTenant, getRequestingEmployee, TenantValidationError } from '@/lib/tenant-validation';

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

    // Get requesting employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // ✅ SECURITY: Validate tenant ownership BEFORE audit access
    try {
      await validateTimesheetTenant(timesheetId, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
      }
      throw error;
    }

    // Safe to fetch timesheet - tenant ownership validated
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
