import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateHours, calculateOvertime } from '@/lib/timesheet-calculations';

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: id },
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
    const employee = await prisma.employee.findUnique({
      where: { id: timesheet.employeeId },
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await req.json();
    const data = updateTimesheetSchema.parse(body);

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

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: id },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    if (!isOwnTimesheet && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to update this timesheet' }, { status: 403 });
    }

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
    if (data.entries && data.entries.length > 0) {
      // Delete existing manual/adjusted entries
      await prisma.timesheetEntry.deleteMany({
        where: {
          timesheetId: id,
          entryType: { in: ['MANUAL', 'ADJUSTED'] },
        },
      });

      // Create new entries
      const entryType = isAdminOrManager ? 'ADJUSTED' : 'MANUAL';
      
      for (const entry of data.entries) {
        const hours = calculateHours(
          new Date(entry.startTime),
          new Date(entry.endTime),
          entry.breakMinutes
        );

        await prisma.timesheetEntry.create({
          data: {
            timesheetId: id,
            date: new Date(entry.date),
            startTime: new Date(entry.startTime),
            endTime: new Date(entry.endTime),
            breakMinutes: entry.breakMinutes,
            hours,
            isOvertime: false,
            notes: entry.notes,
            entryType: entry.entryType || entryType,
          },
        });
      }

      // Recalculate total hours
      const allEntries = await prisma.timesheetEntry.findMany({
        where: { timesheetId: id },
      });

      const totalHours = allEntries.reduce(
        (sum, e) => sum + parseFloat(e.hours.toString()),
        0
      );

      const overtimeThreshold = settings?.overtimeThreshold
        ? parseFloat(settings.overtimeThreshold.toString())
        : 40;

      const { regularHours, overtimeHours } = calculateOvertime(totalHours, overtimeThreshold);

      await prisma.timesheet.update({
        where: { id: id },
        data: {
          totalHours,
          regularHours,
          overtimeHours,
        },
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
        },
      },
    });

    // Fetch updated timesheet
    const updatedTimesheet = await prisma.timesheet.findUnique({
      where: { id: id },
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: id },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    if (!isOwnTimesheet && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to delete this timesheet' }, { status: 403 });
    }

    // Can only delete draft timesheets
    if (timesheet.approvalStatus !== 'PENDING' || timesheet.submittedAt) {
      return NextResponse.json(
        { error: 'Can only delete draft timesheets that have not been submitted' },
        { status: 400 }
      );
    }

    // Unlink clock entries
    await prisma.clockEntry.updateMany({
      where: { timesheetId: id },
      data: { timesheetId: null },
    });

    // Delete timesheet (cascade will delete entries and stages)
    await prisma.timesheet.delete({
      where: { id: id },
    });

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