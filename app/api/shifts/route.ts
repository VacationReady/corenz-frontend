import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { calculateShiftCost } from '@/lib/timesheet-calculations';

const createShiftSchema = z.object({
  employeeId: z.string().optional(),
  templateId: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  breakDuration: z.number().default(0),
  notes: z.string().optional(),
  role: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  requiresConfirmation: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');
    const employeeId = searchParams.get('employeeId');
    const isPublished = searchParams.get('isPublished');

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

    // Regular employees can only see their own published shifts
    if (!isAdminOrManager) {
      where.employeeId = requestingEmployee.id;
      where.isPublished = true;
    } else {
      if (employeeId) {
        where.employeeId = employeeId;
      }
      if (departmentId) {
        where.departmentId = departmentId;
      }
      if (isPublished !== null) {
        where.isPublished = isPublished === 'true';
      }
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Fetch shifts
    const shifts = await prisma.shift.findMany({
      where,
      include: {
        Template: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Get employee details
    const employeeIds = shifts
      .map((s) => s.employeeId)
      .filter((id): id is string => id !== null);

    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
      include: {
        User: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    const enrichedShifts = shifts.map((shift) => ({
      ...shift,
      employee: shift.employeeId ? employeeMap.get(shift.employeeId) : null,
    }));

    return NextResponse.json({
      shifts: enrichedShifts,
      total: shifts.length,
    });
  } catch (error) {
    console.error('Shifts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createShiftSchema.parse(body);

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

    // Check permission (ADMIN or MANAGER only)
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to create shifts' },
        { status: 403 }
      );
    }

    // Validate times
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Calculate cost if employee assigned
    let cost = null;
    if (data.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: data.employeeId },
        select: { hourlyRate: true },
      });

      if (employee?.hourlyRate) {
        const shiftHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        cost = calculateShiftCost(
          shiftHours,
          data.breakDuration,
          parseFloat(employee.hourlyRate.toString())
        );
      }
    }

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        companyId: requestingEmployee.companyId,
        employeeId: data.employeeId,
        templateId: data.templateId,
        departmentId: data.departmentId,
        locationId: data.locationId,
        startTime,
        endTime,
        breakDuration: data.breakDuration,
        notes: data.notes,
        role: data.role,
        requiredSkills: data.requiredSkills,
        requiresConfirmation: data.requiresConfirmation,
        cost: cost,
        createdBy: session.user.id,
      },
      include: {
        Template: true,
      },
    });

    return NextResponse.json({
      success: true,
      shift,
      message: 'Shift created successfully',
    });
  } catch (error) {
    console.error('Shift creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
  }
}
