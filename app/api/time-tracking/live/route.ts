import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const locationId = searchParams.get('locationId');

    // Get employee record
    const employee = await prisma.employee.findUnique({
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

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Only allow MANAGER or ADMIN to view live attendance
    if (employee.User.role !== 'MANAGER' && employee.User.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions to view live attendance' },
        { status: 403 }
      );
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Build employee filter
    const employeeFilter: any = {
      companyId: employee.companyId,
      isActive: true,
    };

    if (departmentId) {
      employeeFilter.departmentId = departmentId;
    }
    if (locationId) {
      employeeFilter.locationId = locationId;
    }

    // Get all active clock entries for today
    const activeClocksPromise = prisma.clockEntry.findMany({
      where: {
        companyId: employee.companyId,
        status: 'ACTIVE',
        clockInTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        Employee: {
          select: {
            id: true,
            User: {
              select: {
                name: true,
                email: true,
              },
            },
            Location: {
              select: {
                name: true,
              },
            },
            Department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Get recent activity (last 10 clock in/out events)
    const recentActivityPromise = prisma.clockEntry.findMany({
      where: {
        companyId: employee.companyId,
        clockInTime: {
          gte: startOfDay,
        },
      },
      include: {
        Employee: {
          select: {
            User: {
              select: {
                name: true,
              },
            },
            Location: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        clockInTime: 'desc',
      },
      take: 20,
    });

    // Get employees with their clock status
    const employeesPromise = prisma.employee.findMany({
      where: employeeFilter,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Location: {
          select: {
            name: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
      },
    });

    const [activeClocks, recentActivity, employees] = await Promise.all([
      activeClocksPromise,
      recentActivityPromise,
      employeesPromise,
    ]);

    // Map active clocks by employee ID
    const activeClocksByEmployee = new Map(
      activeClocks.map((clock) => [clock.employeeId, clock])
    );

    // Build employee status list
    const employeeStatuses = employees.map((emp) => {
      const activeClock = activeClocksByEmployee.get(emp.id);
      const isClockedIn = !!activeClock;

      let hoursWorked = 0;
      if (activeClock) {
        const duration = now.getTime() - activeClock.clockInTime.getTime();
        hoursWorked = Number((duration / (1000 * 60 * 60)).toFixed(2));
      }

      return {
        id: emp.id,
        name: emp.User.name || 'Unknown',
        email: emp.User.email,
        department: emp.Department?.name,
        location: emp.Location?.name,
        status: isClockedIn ? 'CLOCKED_IN' : 'CLOCKED_OUT',
        clockInTime: activeClock?.clockInTime,
        hoursWorked,
        clockInLocation: activeClock?.clockInLocation,
      };
    });

    // Calculate summary stats
    const totalClockedIn = activeClocks.length;
    const totalEmployees = employees.length;
    const totalClockedOut = totalEmployees - totalClockedIn;

    // Build recent activity feed
    const recentActivityFeed = recentActivity.map((entry) => ({
      employeeName: entry.Employee?.User.name || 'Unknown',
      action: entry.status === 'ACTIVE' ? 'CLOCKED_IN' : 'CLOCKED_OUT',
      location: entry.Employee?.Location?.name,
      timestamp: entry.clockInTime,
      clockInTime: entry.clockInTime,
      clockOutTime: entry.clockOutTime,
    }));

    return NextResponse.json({
      summary: {
        totalEmployees,
        totalClockedIn,
        totalClockedOut,
        attendanceRate: totalEmployees > 0 ? ((totalClockedIn / totalEmployees) * 100).toFixed(1) : '0',
      },
      employees: employeeStatuses,
      recentActivity: recentActivityFeed,
      timestamp: now,
    });
  } catch (error) {
    console.error('Live attendance error:', error);
    return NextResponse.json({ error: 'Failed to fetch live attendance data' }, { status: 500 });
  }
}
