import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateHours } from '@/lib/timesheet-calculations';

const updateEntrySchema = z.object({
  date: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  breakMinutes: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  changeReason: z.string().min(1, 'Change reason is required'),
});

/**
 * PATCH /api/timesheets/entries/[id]
 * Edit a single timesheet entry with audit trail
 * Permission: ADMIN or MANAGER (can edit any timesheet entry in their scope)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: entryId } = await params;
    const body = await req.json();
    const data = updateEntrySchema.parse(body);

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
            name: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const isAdmin = requestingEmployee.User.role === 'ADMIN';
    const isManager = requestingEmployee.User.role === 'MANAGER';

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Only admins and managers can edit timesheet entries' },
        { status: 403 }
      );
    }

    // Get the entry with timesheet and employee details
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      include: {
        Timesheet: {
          include: {
            Employee: {
              select: {
                id: true,
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
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Validate company scoping
    if (entry.Timesheet.Employee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Entry belongs to different company' }, { status: 403 });
    }

    // Managers can only edit entries from their department or direct reports
    if (isManager && !isAdmin) {
      const isInDepartment = entry.Timesheet.Employee.departmentId === requestingEmployee.departmentId;
      const isDirectReport = entry.Timesheet.Employee.User?.managerId === requestingEmployee.User?.role;
      
      if (!isInDepartment && !isDirectReport) {
        return NextResponse.json(
          { error: 'Can only edit entries from your department or direct reports' },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    const auditLogs: any[] = [];

    // Track changes for audit
    if (data.date && new Date(data.date).toISOString() !== entry.date.toISOString()) {
      auditLogs.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        entryId: entry.id,
        timesheetId: entry.timesheetId,
        employeeId: entry.Timesheet.employeeId,
        changedById: requestingEmployee.id,
        changeReason: data.changeReason,
        field: 'date',
        oldValue: entry.date.toISOString(),
        newValue: data.date,
        changeType: 'UPDATED',
        companyId: requestingEmployee.companyId,
      });
      updateData.date = new Date(data.date);
    }

    if (data.startTime && new Date(data.startTime).toISOString() !== entry.startTime.toISOString()) {
      auditLogs.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        entryId: entry.id,
        timesheetId: entry.timesheetId,
        employeeId: entry.Timesheet.employeeId,
        changedById: requestingEmployee.id,
        changeReason: data.changeReason,
        field: 'startTime',
        oldValue: entry.startTime.toISOString(),
        newValue: data.startTime,
        changeType: 'UPDATED',
        companyId: requestingEmployee.companyId,
      });
      updateData.startTime = new Date(data.startTime);
    }

    if (data.endTime && new Date(data.endTime).toISOString() !== entry.endTime.toISOString()) {
      auditLogs.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        entryId: entry.id,
        timesheetId: entry.timesheetId,
        employeeId: entry.Timesheet.employeeId,
        changedById: requestingEmployee.id,
        changeReason: data.changeReason,
        field: 'endTime',
        oldValue: entry.endTime.toISOString(),
        newValue: data.endTime,
        changeType: 'UPDATED',
        companyId: requestingEmployee.companyId,
      });
      updateData.endTime = new Date(data.endTime);
    }

    if (data.breakMinutes !== undefined && data.breakMinutes !== entry.breakMinutes) {
      auditLogs.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        entryId: entry.id,
        timesheetId: entry.timesheetId,
        employeeId: entry.Timesheet.employeeId,
        changedById: requestingEmployee.id,
        changeReason: data.changeReason,
        field: 'breakMinutes',
        oldValue: entry.breakMinutes.toString(),
        newValue: data.breakMinutes.toString(),
        changeType: 'UPDATED',
        companyId: requestingEmployee.companyId,
      });
      updateData.breakMinutes = data.breakMinutes;
    }

    if (data.notes !== undefined && data.notes !== entry.notes) {
      auditLogs.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        entryId: entry.id,
        timesheetId: entry.timesheetId,
        employeeId: entry.Timesheet.employeeId,
        changedById: requestingEmployee.id,
        changeReason: data.changeReason,
        field: 'notes',
        oldValue: entry.notes || '',
        newValue: data.notes || '',
        changeType: 'UPDATED',
        companyId: requestingEmployee.companyId,
      });
      updateData.notes = data.notes;
    }

    // Recalculate hours if time changes
    const finalStartTime = updateData.startTime || entry.startTime;
    const finalEndTime = updateData.endTime || entry.endTime;
    const finalBreakMinutes = updateData.breakMinutes !== undefined ? updateData.breakMinutes : entry.breakMinutes;

    const newHours = calculateHours(
      finalStartTime,
      finalEndTime,
      finalBreakMinutes
    );

    if (newHours !== parseFloat(entry.hours.toString())) {
      auditLogs.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        entryId: entry.id,
        timesheetId: entry.timesheetId,
        employeeId: entry.Timesheet.employeeId,
        changedById: requestingEmployee.id,
        changeReason: data.changeReason,
        field: 'hours',
        oldValue: entry.hours.toString(),
        newValue: newHours.toString(),
        changeType: 'UPDATED',
        companyId: requestingEmployee.companyId,
      });
      updateData.hours = newHours;
    }

    // Mark as ADJUSTED if changed by manager/admin
    updateData.entryType = 'ADJUSTED';

    if (auditLogs.length === 0) {
      return NextResponse.json({ error: 'No changes detected' }, { status: 400 });
    }

    // Perform update in transaction
    await prisma.$transaction(async (tx) => {
      // Update the entry
      await tx.timesheetEntry.update({
        where: { id: entryId },
        data: updateData,
      });

      // Create audit logs
      for (const log of auditLogs) {
        await tx.timesheetEntryAudit.create({
          data: log,
        });
      }

      // Recalculate timesheet totals
      const allEntries = await tx.timesheetEntry.findMany({
        where: { timesheetId: entry.timesheetId },
      });

      const totalHours = allEntries.reduce(
        (sum, e) => sum + parseFloat(e.hours.toString()),
        0
      );

      const settings = await tx.timeTrackingSettings.findUnique({
        where: { companyId: requestingEmployee.companyId },
      });

      const overtimeThreshold = settings?.overtimeThreshold
        ? parseFloat(settings.overtimeThreshold.toString())
        : 40;

      const regularHours = Math.min(totalHours, overtimeThreshold);
      const overtimeHours = Math.max(0, totalHours - overtimeThreshold);

      await tx.timesheet.update({
        where: { id: entry.timesheetId },
        data: {
          totalHours,
          regularHours,
          overtimeHours,
        },
      });

      // Create global audit log
      await tx.globalAuditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random()}`,
          actorId: session.user.id,
          companyId: requestingEmployee.companyId,
          action: 'UPDATED',
          entityType: 'EMPLOYEE',
          entityId: entry.Timesheet.employeeId,
          metadata: {
            type: 'TIMESHEET_ENTRY_EDITED',
            entryId: entry.id,
            timesheetId: entry.timesheetId,
            changedBy: requestingEmployee.User.name,
            changeReason: data.changeReason,
            fieldsChanged: auditLogs.map(log => log.field),
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Entry updated successfully',
      changesCount: auditLogs.length,
    });
  } catch (error) {
    console.error('Entry update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

/**
 * GET /api/timesheets/entries/[id]/audit
 * Get audit trail for a specific entry
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

    const { id: entryId } = await params;

    // Get requesting employee
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

    // Get entry to validate access
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      include: {
        Timesheet: {
          select: {
            Employee: {
              select: {
                companyId: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (entry.Timesheet.Employee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get audit logs
    const auditLogs = await prisma.timesheetEntryAudit.findMany({
      where: { entryId },
      include: {
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
