import { NextRequest, NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isToday, isTomorrow } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getMobileSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view') || 'week'; // 'today', 'week', 'custom'

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Determine date range
    let queryStartDate: Date;
    let queryEndDate: Date;

    if (view === 'today') {
      queryStartDate = startOfDay(new Date());
      queryEndDate = endOfDay(new Date());
    } else if (startDate && endDate) {
      queryStartDate = new Date(startDate);
      queryEndDate = new Date(endDate);
    } else {
      // Default to current week
      queryStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      queryEndDate = endOfWeek(new Date(), { weekStartsOn: 1 });
    }

    // Fetch shifts
    const shifts = await prisma.shift.findMany({
      where: {
        employeeId: employee.id,
        companyId: employee.companyId,
        startTime: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      include: {
        Template: {
          select: {
            name: true,
            role: true,
          },
        },
        Location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Get department info
    const employeeWithDept = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Format shifts for mobile
    const formattedShifts = shifts.map((shift) => ({
      id: shift.id,
      startTime: shift.startTime.toISOString(),
      endTime: shift.endTime.toISOString(),
      breakDuration: shift.breakDuration,
      notes: shift.notes,
      role: shift.role,
      attendanceStatus: shift.attendanceStatus,
      isPublished: shift.isPublished,
      isToday: isToday(shift.startTime),
      isTomorrow: isTomorrow(shift.startTime),
      department: employeeWithDept?.Department || null,
      location: shift.Location,
      template: shift.Template,
    }));

    // Calculate summary
    const totalShifts = formattedShifts.length;
    const todayShift = formattedShifts.find((s) => s.isToday);
    const tomorrowShift = formattedShifts.find((s) => s.isTomorrow);
    const totalHours = shifts.reduce((acc, shift) => {
      const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
      return acc + hours - (shift.breakDuration || 0) / 60;
    }, 0);

    return NextResponse.json({
      shifts: formattedShifts,
      summary: {
        totalShifts,
        totalHours: Math.round(totalHours * 10) / 10,
        hasToday: !!todayShift,
        hasTomorrow: !!tomorrowShift,
      },
      todayShift,
      tomorrowShift,
    });
  } catch (error) {
    console.error('Mobile shifts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}
