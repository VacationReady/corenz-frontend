import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { areIntervalsOverlapping, parseISO } from 'date-fns';

const createExceptionSchema = z.object({
  employeeId: z.string(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  isAvailable: z.boolean(),
  reason: z.string().optional().nullable(),
});

/**
 * POST /api/availability/exceptions
 * Create one-time availability exception
 * Permission: Own data or MANAGER/ADMIN
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createExceptionSchema.parse(body);

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

    // Verify target employee exists and is in same company
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (targetEmployee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnData = data.employeeId === requestingEmployee.id;

    if (!isOwnData && !isAdminOrManager) {
      return NextResponse.json(
        { error: 'Unauthorized to create availability exception' },
        { status: 403 }
      );
    }

    // Parse the date
    const exceptionDate = parseISO(data.date);

    // Verify date is in the future
    if (exceptionDate < new Date()) {
      return NextResponse.json(
        { error: 'Cannot create exception for past dates' },
        { status: 400 }
      );
    }

    // Check for conflicting shifts if marking as unavailable
    const conflicts = [];
    if (!data.isAvailable) {
      const shiftsOnDate = await prisma.shift.findMany({
        where: {
          employeeId: data.employeeId,
          companyId: requestingEmployee.companyId,
          startTime: {
            gte: new Date(exceptionDate.getFullYear(), exceptionDate.getMonth(), exceptionDate.getDate(), 0, 0, 0),
            lt: new Date(exceptionDate.getFullYear(), exceptionDate.getMonth(), exceptionDate.getDate(), 23, 59, 59),
          },
        },
      });

      // If specific time range, check for overlaps
      if (data.startTime && data.endTime && shiftsOnDate.length > 0) {
        const [startHour, startMin] = data.startTime.split(':').map(Number);
        const [endHour, endMin] = data.endTime.split(':').map(Number);

        const exceptionStart = new Date(exceptionDate);
        exceptionStart.setHours(startHour, startMin, 0, 0);

        const exceptionEnd = new Date(exceptionDate);
        exceptionEnd.setHours(endHour, endMin, 0, 0);

        for (const shift of shiftsOnDate) {
          if (
            areIntervalsOverlapping(
              { start: exceptionStart, end: exceptionEnd },
              { start: shift.startTime, end: shift.endTime }
            )
          ) {
            conflicts.push({
              shiftId: shift.id,
              startTime: shift.startTime,
              endTime: shift.endTime,
            });
          }
        }
      } else if (!data.startTime && !data.endTime) {
        // All-day unavailability - all shifts conflict
        conflicts.push(
          ...shiftsOnDate.map((shift) => ({
            shiftId: shift.id,
            startTime: shift.startTime,
            endTime: shift.endTime,
          }))
        );
      }
    }

    // Create exception
    const exception = await prisma.availabilityException.create({
      data: {
        employeeId: data.employeeId,
        companyId: requestingEmployee.companyId,
        date: exceptionDate,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        isAvailable: data.isAvailable,
        reason: data.reason || null,
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'CREATED',
        entityType: 'EMPLOYEE',
        entityId: data.employeeId,
        metadata: {
          type: 'AVAILABILITY_EXCEPTION_CREATED',
          exceptionId: exception.id,
          date: data.date,
          isAvailable: data.isAvailable,
          reason: data.reason,
          conflicts: conflicts.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      exception,
      conflicts,
      message:
        conflicts.length > 0
          ? `Exception created with ${conflicts.length} shift conflict(s)`
          : 'Availability exception created successfully',
    });
  } catch (error) {
    console.error('Exception creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create availability exception' }, { status: 500 });
  }
}

/**
 * DELETE /api/availability/exceptions?id=[exceptionId]
 * Remove availability exception
 * Permission: Own data or MANAGER/ADMIN
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const exceptionId = searchParams.get('id');

    if (!exceptionId) {
      return NextResponse.json({ error: 'Exception ID is required' }, { status: 400 });
    }

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

    // Fetch the exception
    const exception = await prisma.availabilityException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception) {
      return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
    }

    // Verify company scoping
    if (exception.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnData = exception.employeeId === requestingEmployee.id;

    if (!isOwnData && !isAdminOrManager) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this exception' },
        { status: 403 }
      );
    }

    // Delete exception
    await prisma.availabilityException.delete({
      where: { id: exceptionId },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'DELETED',
        entityType: 'EMPLOYEE',
        entityId: exception.employeeId,
        metadata: {
          type: 'AVAILABILITY_EXCEPTION_DELETED',
          exceptionId,
          date: exception.date.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Availability exception deleted successfully',
    });
  } catch (error) {
    console.error('Exception deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete availability exception' }, { status: 500 });
  }
}
