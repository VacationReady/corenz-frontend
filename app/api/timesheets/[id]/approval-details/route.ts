import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import {
  validateTimesheetTenant,
  getRequestingEmployee,
  TenantValidationError,
  logTenantViolationAttempt,
} from '@/lib/tenant-validation';
import { format } from 'date-fns';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get requesting employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // Validate tenant ownership
    try {
      await validateTimesheetTenant(id, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        await logTenantViolationAttempt(session.user.id, 'TIMESHEET', id, requestingEmployee.companyId);
        return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
      }
      throw error;
    }

    // Fetch timesheet with all related data
    const timesheet = await prisma.timesheet.findFirst({
      where: { id, companyId: requestingEmployee.companyId },
      include: {
        Employee: {
          select: {
            id: true,
            hourlyRate: true,
            salaryAmount: true,
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
        },
        TimesheetEntries: {
          orderBy: {
            date: 'asc',
          },
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            breakMinutes: true,
            hours: true,
            notes: true,
            isOvertime: true,
            entryType: true,
          },
        },
        ClockEntries: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions - must be admin, manager, or assigned approver
    const isAdminOrManager = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(requestingEmployee.User.role);
    
    // Check if user is an assigned approver for this timesheet
    const isApprover = await prisma.timesheetApprovalDecision.findFirst({
      where: {
        approverId: requestingEmployee.id,
        Stage: {
          timesheetId: id,
        },
      },
    });

    if (!isAdminOrManager && !isApprover) {
      return NextResponse.json({ error: 'Unauthorized to view this timesheet' }, { status: 403 });
    }

    // Calculate cost estimate
    let estimatedCost: number | null = null;
    let payType: 'HOURLY' | 'SALARY' | 'UNKNOWN' = 'UNKNOWN';
    let hourlyRate: number | null = null;

    if (timesheet.Employee.hourlyRate) {
      hourlyRate = parseFloat(timesheet.Employee.hourlyRate.toString());
      estimatedCost = hourlyRate * parseFloat(timesheet.totalHours.toString());
      payType = 'HOURLY';
    } else if (timesheet.Employee.salaryAmount) {
      payType = 'SALARY';
      // For salaried employees, we could calculate based on annual salary / hours per year
      // but for now we'll just show the salary type
    }

    // Format period label
    const periodStart = new Date(timesheet.periodStart);
    const periodEnd = new Date(timesheet.periodEnd);
    const periodLabel = `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;

    // Build response
    const response = {
      success: true,
      data: {
        id: timesheet.id,
        employee: {
          id: timesheet.Employee.id,
          name: timesheet.Employee.User.name || 'Unknown',
          email: timesheet.Employee.User.email || '',
          profileImageUrl: timesheet.Employee.User.profileImageUrl,
          department: timesheet.Employee.Department?.name,
        },
        period: {
          start: timesheet.periodStart.toISOString(),
          end: timesheet.periodEnd.toISOString(),
          label: periodLabel,
        },
        hours: {
          total: parseFloat(timesheet.totalHours.toString()),
          regular: parseFloat((timesheet.regularHours || timesheet.totalHours).toString()),
          overtime: parseFloat((timesheet.overtimeHours || 0).toString()),
          break: parseFloat((timesheet.breakHours || 0).toString()),
        },
        cost: estimatedCost !== null ? {
          estimated: estimatedCost,
          hourlyRate: hourlyRate,
          payType,
        } : null,
        entries: timesheet.TimesheetEntries.map((entry) => ({
          id: entry.id,
          date: entry.date.toISOString(),
          startTime: entry.startTime.toISOString(),
          endTime: entry.endTime.toISOString(),
          breakMinutes: entry.breakMinutes,
          hours: parseFloat(entry.hours.toString()),
          notes: entry.notes,
          isOvertime: entry.isOvertime,
          entryType: entry.entryType,
        })),
        submittedAt: timesheet.submittedAt?.toISOString(),
        notes: undefined, // Timesheet model doesn't have notes field
        clockEntryCount: timesheet.ClockEntries.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Timesheet approval details fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheet details' }, { status: 500 });
  }
}
