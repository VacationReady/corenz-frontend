import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO, addDays } from 'date-fns';

interface CoverageGap {
  date: string;
  dayOfWeek: number;
  role: string;
  required: number;
  scheduled: number;
  gap: number;
  priority: string;
  suggestions: Array<{
    employeeId: string;
    employeeName: string;
    canWork: boolean;
    reason?: string;
  }>;
}

// GET /api/rota-groups/[id]/coverage - Analyze staffing coverage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart'); // ISO date string
    
    // Default to current week if not specified
    const baseDate = weekStart ? parseISO(weekStart) : new Date();
    const weekStartDate = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
    const weekEndDate = endOfWeek(baseDate, { weekStartsOn: 1 }); // Sunday

    // Verify rota group belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        Members: {
          where: { isActive: true },
          include: {
            Employee: {
              include: {
                User: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        ShiftRequirements: {
          where: { isActive: true },
        },
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    // Get all shifts for this week
    const shifts = await prisma.shift.findMany({
      where: {
        rotaGroupId: id,
        startTime: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
        attendanceStatus: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      include: {
        Employee: {
          include: {
            User: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Calculate coverage for each day
    const days = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });
    const coverage: CoverageGap[] = [];

    for (const day of days) {
      const dayOfWeek = day.getDay();
      const dateStr = format(day, 'yyyy-MM-dd');

      // Get requirements for this day
      const dayRequirements = rotaGroup.ShiftRequirements.filter(
        (req: any) => req.dayOfWeek === dayOfWeek
      );

      // Get shifts for this day
      const dayShifts = shifts.filter(
        (shift: any) => format(shift.startTime, 'yyyy-MM-dd') === dateStr
      );

      // Analyze each requirement
      for (const requirement of dayRequirements) {
        // Count how many shifts are scheduled for this role
        const scheduledCount = dayShifts.filter(
          (shift: any) => shift.role === requirement.role && shift.employeeId !== null
        ).length;

        const gap = requirement.quantity - scheduledCount;

        if (gap > 0) {
          // Find employees who can fill this gap
          const suggestions = rotaGroup.Members
            .filter((member: any) => 
              member.assignedRoles.includes(requirement.role)
            )
            .map((member: any) => {
              const employee = member.Employee;
              
              // Check if already scheduled for this day
              const alreadyScheduled = dayShifts.some(
                (shift: any) => shift.employeeId === employee.id
              );

              return {
                employeeId: employee.id,
                employeeName: employee.User.name || 'Unknown',
                canWork: !alreadyScheduled,
                reason: alreadyScheduled ? 'Already scheduled' : undefined,
              };
            })
            .filter((s: any) => s.canWork);

          coverage.push({
            date: dateStr,
            dayOfWeek,
            role: requirement.role,
            required: requirement.quantity,
            scheduled: scheduledCount,
            gap,
            priority: requirement.priority,
            suggestions: suggestions.slice(0, 5), // Top 5 suggestions
          });
        }
      }
    }

    // Calculate summary statistics
    const totalGaps = coverage.reduce((sum: number, c: any) => sum + c.gap, 0);
    const criticalGaps = coverage.filter((c: any) => c.priority === 'CRITICAL').length;
    const highGaps = coverage.filter((c: any) => c.priority === 'HIGH').length;

    return NextResponse.json({
      weekStart: format(weekStartDate, 'yyyy-MM-dd'),
      weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
      rotaGroup: {
        id: rotaGroup.id,
        name: rotaGroup.name,
        icon: rotaGroup.icon,
      },
      summary: {
        totalGaps,
        criticalGaps,
        highGaps,
        totalRequirements: rotaGroup.ShiftRequirements.length,
      },
      gaps: coverage,
    });
  } catch (error) {
    console.error('Error analyzing coverage:', error);
    return NextResponse.json(
      { error: 'Failed to analyze coverage' },
      { status: 500 }
    );
  }
}
