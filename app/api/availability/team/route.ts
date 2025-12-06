import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, format, addDays, isSameDay, parseISO } from 'date-fns';

/**
 * GET /api/availability/team
 * Get team availability for scheduling (MANAGER/ADMIN only)
 * Query params:
 *   - date: ISO date string (required)
 *   - departmentId: string (optional)
 * Returns grid of employees and their availability for the week
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

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

    // Only managers and admins can view team availability
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'Only managers and admins can view team availability' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const departmentId = searchParams.get('departmentId');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const selectedDate = parseISO(dateParam);
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

    // Build employee filter
    const employeeWhere: any = {
      companyId: requestingEmployee.companyId,
      status: 'ACTIVE',
    };

    if (departmentId) {
      employeeWhere.departmentId = departmentId;
    }

    // Fetch employees
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
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
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { Department: { name: 'asc' } },
        { User: { name: 'asc' } },
      ],
    });

    // Fetch all availability patterns for these employees
    const employeeIds = employees.map((e) => e.id);

    const [patterns, exceptions, shifts] = await Promise.all([
      prisma.availabilityPattern.findMany({
        where: {
          employeeId: { in: employeeIds },
        },
      }),
      prisma.availabilityException.findMany({
        where: {
          employeeId: { in: employeeIds },
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),
      prisma.shift.findMany({
        where: {
          employeeId: { in: employeeIds },
          companyId: requestingEmployee.companyId,
          startTime: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),
    ]);

    // Group by employee
    const patternsByEmployee = new Map<string, typeof patterns>();
    const exceptionsByEmployee = new Map<string, typeof exceptions>();
    const shiftsByEmployee = new Map<string, typeof shifts>();

    for (const employee of employees) {
      patternsByEmployee.set(
        employee.id,
        patterns.filter((p) => p.employeeId === employee.id)
      );
      exceptionsByEmployee.set(
        employee.id,
        exceptions.filter((e) => e.employeeId === employee.id)
      );
      shiftsByEmployee.set(
        employee.id,
        shifts.filter((s) => s.employeeId === employee.id)
      );
    }

    // Build availability grid
    const availabilityGrid = employees.map((employee) => {
      const employeePatterns = patternsByEmployee.get(employee.id) || [];
      const employeeExceptions = exceptionsByEmployee.get(employee.id) || [];
      const employeeShifts = shiftsByEmployee.get(employee.id) || [];

      // Calculate availability for each day of the week
      const weekAvailability: Record<number, { available: boolean; hasShift: boolean; reason?: string }> = {};

      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(weekStart, i);
        const dayOfWeek = currentDay.getDay();

        // Check for exception first
        const exception = employeeExceptions.find((e) =>
          isSameDay(e.date, currentDay)
        );

        if (exception) {
          weekAvailability[i] = {
            available: exception.isAvailable,
            hasShift: employeeShifts.some((s) => isSameDay(s.startTime, currentDay)),
            reason: exception.reason || undefined,
          };
        } else {
          // Check pattern
          const pattern = employeePatterns.find((p) => p.dayOfWeek === dayOfWeek);

          weekAvailability[i] = {
            available: pattern ? pattern.isAvailable : true, // Default to available
            hasShift: employeeShifts.some((s) => isSameDay(s.startTime, currentDay)),
          };
        }
      }

      return {
        employeeId: employee.id,
        name: employee.User.name,
        email: employee.User.email,
        profileImage: employee.User.profileImageUrl,
        department: employee.Department?.name || 'No Department',
        departmentId: employee.Department?.id || null,
        availability: weekAvailability,
        shiftsCount: employeeShifts.length,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalEmployees: employees.length,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      departments: [...new Set(employees.map((e) => e.Department?.name).filter(Boolean))],
    };

    return NextResponse.json({
      availabilityGrid,
      summary,
    });
  } catch (error) {
    console.error('Team availability fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch team availability' }, { status: 500 });
  }
}
