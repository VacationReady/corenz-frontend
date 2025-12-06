import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateHours } from '@/lib/timesheet-calculations';
import { calculateOvertimeForEntry, OvertimeSettings, EmployeeOvertimeConfig } from '@/lib/overtime-calculator';
import { cancelPendingTimesheetApprovalActionItems } from '@/lib/action-items-helper';
import {
  validateTimesheetTenant,
  getRequestingEmployee,
  TenantValidationError,
  logTenantViolationAttempt,
} from '@/lib/tenant-validation';

const updateTimesheetSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string().optional(),
      date: z.string().datetime(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      breakMinutes: z.number().min(0).default(0),
      notes: z.string().optional(),
      entryType: z.enum(['CLOCK', 'MANUAL', 'ADJUSTED']).optional(),
    })
  ).optional(),
  notes: z.string().optional(),
});

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

    // ✅ SECURITY FIX: Validate tenant ownership BEFORE fetching full data
    try {
      await validateTimesheetTenant(id, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        await logTenantViolationAttempt(session.user.id, 'TIMESHEET', id, requestingEmployee.companyId);
        // Return 404 to avoid leaking existence of resources in other tenants
        return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
      }
      throw error;
    }

    // Safe to fetch full timesheet data - tenant ownership validated
    const timesheet = await prisma.timesheet.findFirst({
      where: { id, companyId: requestingEmployee.companyId },
      include: {
        ClockEntries: {
          orderBy: {
            clockInTime: 'asc',
          },
        },
        TimesheetEntries: {
          orderBy: {
            date: 'asc',
          },
        },
        ApprovalStages: {
          include: {
            Decisions: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        BreakRecords: {
          orderBy: {
            startTime: 'asc',
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    if (!isOwnTimesheet && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to view this timesheet' }, { status: 403 });
    }

    // Get employee details
    const employee = await prisma.employee.findFirst({
      where: { id: timesheet.employeeId, companyId: requestingEmployee.companyId },
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

    return NextResponse.json({
      timesheet: {
        ...timesheet,
        employee,
      },
    });
  } catch (error) {
    console.error('Timesheet fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheet' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await req.json();
    const data = updateTimesheetSchema.parse(body);

    // Get requesting employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // ✅ SECURITY FIX: Validate tenant ownership BEFORE operations
    try {
      await validateTimesheetTenant(id, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        await logTenantViolationAttempt(session.user.id, 'TIMESHEET', id, requestingEmployee.companyId);
        return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
      }
      throw error;
    }

    // Safe to fetch timesheet - tenant ownership validated
    const timesheet = await prisma.timesheet.findFirst({
      where: { id, companyId: requestingEmployee.companyId },
      include: {
        Employee: {
          select: {
            departmentId: true,
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = requestingEmployee.User.role === 'ADMIN';
    const isManager = requestingEmployee.User.role === 'MANAGER';
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    // Managers can only edit timesheets from their department
    if (!isOwnTimesheet) {
      if (!isAdmin && !isManager) {
        return NextResponse.json({ error: 'Unauthorized to update this timesheet' }, { status: 403 });
      }
      if (isManager && timesheet.Employee.departmentId !== requestingEmployee.departmentId) {
        return NextResponse.json({ error: 'You can only edit timesheets from your department' }, { status: 403 });
      }
    }

    const isAdminOrManager = isAdmin || isManager;

    // Check if timesheet is editable
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    if (
      timesheet.approvalStatus !== 'PENDING' &&
      !settings?.allowEditAfterSubmit &&
      !isAdminOrManager
    ) {
      return NextResponse.json(
        { error: 'Cannot edit timesheet after submission' },
        { status: 400 }
      );
    }

    // Update entries if provided
    const entries = data.entries ?? [];

    if (entries.length > 0) {
      // Use transaction to ensure consistency
      await prisma.$transaction(async (tx: any) => {
        // Delete existing manual/adjusted entries
        await tx.timesheetEntry.deleteMany({
          where: {
            timesheetId: id,
            entryType: { in: ['MANUAL', 'ADJUSTED'] },
            Timesheet: {
              companyId: requestingEmployee.companyId,
            },
          },
        });

        // Build overtime settings from company settings
        const overtimeSettings: OvertimeSettings = {
          overtimeCalculationMode: (settings?.overtimeCalculationMode as any) || 'DAILY',
          autoApplyOvertime: settings?.autoApplyOvertime ?? true,
          dailyOvertimeThreshold: settings?.dailyOvertimeThreshold 
            ? parseFloat(settings.dailyOvertimeThreshold.toString()) 
            : 8,
          weeklyOvertimeThreshold: settings?.weeklyOvertimeThreshold 
            ? parseFloat(settings.weeklyOvertimeThreshold.toString()) 
            : 40,
          monthlyOvertimeThreshold: settings?.monthlyOvertimeThreshold 
            ? parseFloat(settings.monthlyOvertimeThreshold.toString()) 
            : 173.33,
          overtimeMultiplier: settings?.overtimeMultiplier 
            ? parseFloat(settings.overtimeMultiplier.toString()) 
            : 1.5,
          overtimeMultiplierTier2: settings?.overtimeMultiplierTier2 
            ? parseFloat(settings.overtimeMultiplierTier2.toString()) 
            : undefined,
          overtimeThresholdTier2: settings?.overtimeThresholdTier2 
            ? parseFloat(settings.overtimeThresholdTier2.toString()) 
            : undefined,
          publicHolidayMultiplier: settings?.publicHolidayMultiplier 
            ? parseFloat(settings.publicHolidayMultiplier.toString()) 
            : 2.0,
          sundayMultiplier: settings?.sundayMultiplier 
            ? parseFloat(settings.sundayMultiplier.toString()) 
            : undefined,
        };

        // Get employee overtime config
        const employee = await tx.employee.findFirst({
          where: {
            id: timesheet.employeeId,
            companyId: requestingEmployee.companyId,
          },
          select: {
            overtimeEligible: true,
            overtimeThreshold: true,
            overtimeMultiplier: true,
          },
        });

        const employeeConfig: EmployeeOvertimeConfig | undefined = employee ? {
          overtimeEligible: employee.overtimeEligible ?? true,
          overtimeThreshold: employee.overtimeThreshold 
            ? parseFloat(employee.overtimeThreshold.toString()) 
            : undefined,
          overtimeMultiplier: employee.overtimeMultiplier 
            ? parseFloat(employee.overtimeMultiplier.toString()) 
            : undefined,
        } : undefined;

        const entryType = isAdminOrManager ? 'ADJUSTED' : 'MANUAL';
        
        // Process each entry with NZ-compliant overtime calculation
        for (const entry of entries) {
          const date = new Date(entry.date);
          const startTime = new Date(entry.startTime);
          const endTime = new Date(entry.endTime);
          
          const hours = calculateHours(startTime, endTime, entry.breakMinutes);

          // Calculate overtime for this entry (includes holiday metadata)
          // Pass transaction client and start/end times for accurate calculations
          const overtimeResult = await calculateOvertimeForEntry(
            {
              id: `temp-${Date.now()}`,
              date,
              hours,
              timesheetId: id,
              startTime,
              endTime,
              breakMinutes: entry.breakMinutes,
            },
            timesheet.employeeId,
            requestingEmployee.companyId,
            overtimeSettings,
            employeeConfig,
            tx
          );

          // Create entry with full overtime and public holiday metadata
          await tx.timesheetEntry.create({
            data: {
              timesheetId: id,
              date,
              startTime,
              endTime,
              breakMinutes: entry.breakMinutes,
              hours,
              // Overtime fields from NZ-compliant calculator
              regularHours: overtimeResult.regularHours,
              overtimeHours: overtimeResult.overtimeHours,
              overtimeMultiplier: overtimeResult.overtimeMultiplier,
              overtimeType: overtimeResult.overtimeType,
              overtimeReason: overtimeResult.overtimeReason || '',
              isOvertime: overtimeResult.overtimeHours > 0,
              // Public holiday fields from calculator (no re-fetching)
              isPublicHoliday: overtimeResult.isPublicHoliday,
              publicHolidayName: overtimeResult.publicHolidayName,
              publicHolidayHours: overtimeResult.publicHolidayHours,
              publicHolidayMultiplier: overtimeResult.publicHolidayMultiplier,
              publicHolidayType: overtimeResult.publicHolidayType,
              publicHolidayRegion: overtimeResult.publicHolidayRegion,
              alternativeDayGranted: overtimeResult.alternativeDayGranted,
              // Manager adjustment tracking
              managerAdjusted: isAdminOrManager,
              managerAdjustedBy: isAdminOrManager ? session.user.id : undefined,
              managerAdjustedAt: isAdminOrManager ? new Date() : undefined,
              notes: entry.notes,
              entryType: entry.entryType || entryType,
            },
          });
        }

        // Recalculate timesheet totals from all entries
        const allEntries = await tx.timesheetEntry.findMany({
          where: {
            timesheetId: id,
            Timesheet: {
              companyId: requestingEmployee.companyId,
            },
          },
          select: {
            hours: true,
            regularHours: true,
            overtimeHours: true,
            publicHolidayHours: true,
            breakMinutes: true,
          },
        });

        const totalHours = allEntries.reduce(
          (sum: number, e: any) => sum + parseFloat(e.hours.toString()),
          0
        );
        const regularHours = allEntries.reduce(
          (sum: number, e: any) => sum + parseFloat((e.regularHours || e.hours).toString()),
          0
        );
        const overtimeHours = allEntries.reduce(
          (sum: number, e: any) => sum + parseFloat((e.overtimeHours || 0).toString()),
          0
        );
        const breakHours = allEntries.reduce(
          (sum: number, e: any) => sum + (e.breakMinutes / 60),
          0
        );

        const updateResult = await tx.timesheet.updateMany({
          where: {
            id,
            companyId: requestingEmployee.companyId,
          },
          data: {
            totalHours,
            regularHours,
            overtimeHours,
            breakHours,
          },
        });

        if (updateResult.count === 0) {
          throw new TenantValidationError('Timesheet not found or access denied');
        }
      });
    }

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: timesheet.employeeId,
        metadata: {
          type: 'TIMESHEET_UPDATED',
          timesheetId: id,
          entriesCount: data.entries?.length || 0,
          calculationMode: settings?.overtimeCalculationMode || 'DAILY',
        },
      },
    });

    // Fetch updated timesheet
    const updatedTimesheet = await prisma.timesheet.findFirst({
      where: { id, companyId: requestingEmployee.companyId },
      include: {
        TimesheetEntries: {
          orderBy: {
            date: 'asc',
          },
        },
        ApprovalStages: {
          include: {
            Decisions: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet,
      message: 'Timesheet updated successfully',
    });
  } catch (error) {
    console.error('Timesheet update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update timesheet' }, { status: 500 });
  }
}

export async function DELETE(
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

    // ✅ SECURITY FIX: Validate tenant ownership BEFORE deletion
    try {
      await validateTimesheetTenant(id, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        await logTenantViolationAttempt(session.user.id, 'TIMESHEET', id, requestingEmployee.companyId);
        return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
      }
      throw error;
    }

    // Safe to fetch timesheet - tenant ownership validated
    const timesheet = await prisma.timesheet.findFirst({
      where: { id, companyId: requestingEmployee.companyId },
      include: {
        Employee: {
          select: {
            departmentId: true,
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = requestingEmployee.User.role === 'ADMIN';
    const isManager = requestingEmployee.User.role === 'MANAGER';
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    // Managers can only delete timesheets from their department
    if (!isOwnTimesheet) {
      if (!isAdmin && !isManager) {
        return NextResponse.json({ error: 'Unauthorized to delete this timesheet' }, { status: 403 });
      }
      if (isManager && timesheet.Employee.departmentId !== requestingEmployee.departmentId) {
        return NextResponse.json({ error: 'You can only delete timesheets from your department' }, { status: 403 });
      }
    }

    const isAdminOrManager = isAdmin || isManager;

    // Employees can only delete draft timesheets that haven't been submitted
    // Admins/Managers can delete any timesheet (for testing and corrections)
    if (!isAdminOrManager) {
      if (timesheet.approvalStatus !== 'PENDING' || timesheet.submittedAt) {
        return NextResponse.json(
          { error: 'You can only delete draft timesheets that have not been submitted' },
          { status: 400 }
        );
      }
    }
    
    // Prevent deletion of approved timesheets even for admins (preserve audit trail)
    if (timesheet.approvalStatus === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot delete approved timesheets. Please contact support if correction needed.' },
        { status: 400 }
      );
    }

    // Cancel any pending action items for this timesheet
    await cancelPendingTimesheetApprovalActionItems(id);

    // Unlink clock entries
    await prisma.clockEntry.updateMany({
      where: { timesheetId: id },
      data: { timesheetId: null },
    });

    // Delete timesheet (cascade will delete entries and stages)
    const deleteResult = await prisma.timesheet.deleteMany({
      where: { id, companyId: requestingEmployee.companyId },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'DELETED',
        entityType: 'EMPLOYEE',
        entityId: timesheet.employeeId,
        metadata: {
          type: 'TIMESHEET_DELETED',
          timesheetId: id,
          periodStart: timesheet.periodStart.toISOString(),
          periodEnd: timesheet.periodEnd.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Timesheet deleted successfully',
    });
  } catch (error) {
    console.error('Timesheet delete error:', error);
    return NextResponse.json({ error: 'Failed to delete timesheet' }, { status: 500 });
  }
}