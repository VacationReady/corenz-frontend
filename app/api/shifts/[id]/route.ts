import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateShiftCost } from '@/lib/timesheet-calculations';

const updateShiftSchema = z.object({
  employeeId: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  breakDuration: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  requiredSkills: z.array(z.string()).optional(),
  requiresConfirmation: z.boolean().optional(),
  attendanceStatus: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']).optional(),
});

/**
 * GET /api/shifts/[id]
 * Fetch single shift with employee, department, location details
 * Permission: MANAGER/ADMIN for all shifts, employees can view own published shifts
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);

    // Fetch shift with related data
    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        Template: true,
        ShiftSwapRequests: {
          where: {
            status: {
              not: 'REJECTED',
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Check company scoping
    if (shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check permissions
    const isOwnShift = shift.employeeId === requestingEmployee.id;
    
    if (!isAdminOrManager && !isOwnShift) {
      return NextResponse.json({ error: 'Unauthorized to view this shift' }, { status: 403 });
    }

    // Employees can only view published shifts
    if (!isAdminOrManager && !shift.isPublished) {
      return NextResponse.json({ error: 'Shift not available' }, { status: 403 });
    }

    // Get employee details if assigned
    let employee = null;
    if (shift.employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: shift.employeeId },
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
    }

    // Get department details if assigned
    let department = null;
    if (shift.departmentId) {
      department = await prisma.department.findUnique({
        where: { id: shift.departmentId },
        select: {
          id: true,
          name: true,
        },
      });
    }

    // Get location details if assigned
    let location = null;
    if (shift.locationId) {
      location = await prisma.location.findUnique({
        where: { id: shift.locationId },
        select: {
          id: true,
          name: true,
        },
      });
    }

    return NextResponse.json({
      shift: {
        ...shift,
        employee,
        department,
        location,
      },
    });
  } catch (error) {
    console.error('Shift fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 });
  }
}

/**
 * PUT /api/shifts/[id]
 * Update shift (time, employee assignment, notes)
 * Permission: MANAGER/ADMIN only
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = updateShiftSchema.parse(body);

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

    // Only managers and admins can edit shifts
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to update shifts' }, { status: 403 });
    }

    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Check company scoping
    if (shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update data
    const updateData: any = {};

    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.templateId !== undefined) updateData.templateId = data.templateId;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.breakDuration !== undefined) updateData.breakDuration = data.breakDuration;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.requiredSkills !== undefined) updateData.requiredSkills = data.requiredSkills;
    if (data.requiresConfirmation !== undefined) updateData.requiresConfirmation = data.requiresConfirmation;
    if (data.attendanceStatus) updateData.attendanceStatus = data.attendanceStatus;

    // Recalculate cost if time changed
    if (data.startTime || data.endTime || data.employeeId !== undefined) {
      const startTime = data.startTime ? new Date(data.startTime) : shift.startTime;
      const endTime = data.endTime ? new Date(data.endTime) : shift.endTime;
      const employeeId = data.employeeId !== undefined ? data.employeeId : shift.employeeId;
      const breakDuration = data.breakDuration !== undefined ? data.breakDuration : shift.breakDuration;

      if (employeeId) {
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
        });

        if (employee) {
          const shiftHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          const cost = calculateShiftCost(
            shiftHours,
            breakDuration,
            employee.hourlyRate ? parseFloat(employee.hourlyRate.toString()) : 0
          );
          updateData.cost = cost;
        }
      }
    }

    // Update shift
    const updatedShift = await prisma.shift.update({
      where: { id: params.id },
      data: updateData,
      include: {
        Template: true,
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: updatedShift.employeeId || 'unassigned',
        metadata: {
          type: 'SHIFT_UPDATED',
          shiftId: params.id,
          changes: data,
        },
      },
    });

    // Get employee details for response
    let employee = null;
    if (updatedShift.employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: updatedShift.employeeId },
        include: {
          User: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      shift: {
        ...updatedShift,
        employee,
      },
      message: 'Shift updated successfully',
    });
  } catch (error) {
    console.error('Shift update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
  }
}

/**
 * DELETE /api/shifts/[id]
 * Delete unpublished shifts only
 * Permission: MANAGER/ADMIN only
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Only managers and admins can delete shifts
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to delete shifts' }, { status: 403 });
    }

    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Check company scoping
    if (shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can only delete unpublished shifts
    if (shift.isPublished) {
      return NextResponse.json(
        { error: 'Cannot delete published shifts. Please unpublish first or cancel instead.' },
        { status: 400 }
      );
    }

    // Delete shift (cascade will handle related records)
    await prisma.shift.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'DELETED',
        entityType: 'EMPLOYEE',
        entityId: shift.employeeId || 'unassigned',
        metadata: {
          type: 'SHIFT_DELETED',
          shiftId: params.id,
          startTime: shift.startTime.toISOString(),
          endTime: shift.endTime.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    console.error('Shift delete error:', error);
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
  }
}
