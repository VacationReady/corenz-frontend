import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'week'; // week, month, all
    const employeeId = searchParams.get('employeeId'); // Admin/Manager can view others

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

    // Determine which employee's history to fetch
    let targetEmployeeId = employee.id;

    if (employeeId && employeeId !== employee.id) {
      // Check if user has permission to view other's history
      const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(employee.User.role);

      if (!isAdminOrManager) {
        return NextResponse.json(
          { error: 'You do not have permission to view this employee\'s history' },
          { status: 403 }
        );
      }

      // Verify the employee belongs to the same company
      const targetEmployee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true },
      });

      if (!targetEmployee || targetEmployee.companyId !== employee.companyId) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      targetEmployeeId = employeeId;
    }

    // Determine date range
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (period === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else if (period === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    // Fetch clock entries
    const entries = await prisma.clockEntry.findMany({
      where: {
        employeeId: targetEmployeeId,
        companyId: employee.companyId,
        ...(startDate && endDate
          ? {
              clockInTime: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {}),
      },
      orderBy: {
        clockInTime: 'desc',
      },
      take: period === 'all' ? 100 : undefined, // Limit to 100 for 'all'
    });

    // Calculate summary statistics
    const completedEntries = entries.filter((e: any) => e.status === 'COMPLETED');
    const totalHours = completedEntries.reduce((sum: number, entry: any) => {
      if (entry.clockOutTime) {
        const duration = entry.clockOutTime.getTime() - entry.clockInTime.getTime();
        return sum + duration / (1000 * 60 * 60);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      entries,
      summary: {
        totalEntries: entries.length,
        completedEntries: completedEntries.length,
        activeEntries: entries.filter((e: any) => e.status === 'ACTIVE').length,
        totalHours: totalHours.toFixed(2),
        averageHoursPerDay: completedEntries.length > 0 ? (totalHours / completedEntries.length).toFixed(2) : '0',
      },
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch clock history' }, { status: 500 });
  }
}
