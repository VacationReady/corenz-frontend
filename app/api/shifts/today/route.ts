import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, getDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Get employee details with working pattern
    // Check for working pattern assignments first (with effective dates), then fall back to direct assignment
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        WorkingPattern: {
          include: {
            WorkingPatternWeek: {
              include: {
                WorkingPatternDay: true,
              },
            },
          },
        },
        EmployeeWorkingPatternAssignment: {
          where: {
            effectiveDate: {
              lte: today,
            },
          },
          orderBy: {
            effectiveDate: 'desc',
          },
          take: 1,
          include: {
            WorkingPattern: {
              include: {
                WorkingPatternWeek: {
                  include: {
                    WorkingPatternDay: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Find scheduled shift
    // Note: Show employee their own shifts regardless of publish status
    // isPublished controls visibility to OTHER employees (e.g., open shifts), not the assigned employee
    const shift = await prisma.shift.findFirst({
      where: {
        employeeId,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
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

    // Check for active clock entry
    const activeClockEntry = await prisma.clockEntry.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
      },
      orderBy: {
        clockInTime: 'desc',
      },
    });

    // Determine which working pattern to use (prioritize assignment with effective date)
    const activeWorkingPattern = employee?.EmployeeWorkingPatternAssignment?.[0]?.WorkingPattern || employee?.WorkingPattern;

    // Debug logging
    console.log('[Today API] Employee:', employeeId);
    console.log('[Today API] Shift found:', !!shift);
    console.log('[Today API] Has assignment:', !!employee?.EmployeeWorkingPatternAssignment?.[0]);
    console.log('[Today API] Working pattern exists:', !!activeWorkingPattern);
    if (activeWorkingPattern) {
      console.log('[Today API] Working pattern name:', activeWorkingPattern.name);
      console.log('[Today API] Working pattern weeks:', activeWorkingPattern.WorkingPatternWeek?.length);
    }

    // Get working pattern for today if no shift
    let workingPattern = null;
    if (!shift && activeWorkingPattern) {
      // SHIFT_BASED patterns don't show as working patterns - they're flexible
      if (activeWorkingPattern.patternType === 'SHIFT_BASED') {
        // Don't show working pattern for shift-based workers
        // They're only "working" when a shift is explicitly created
      } else {
        const dayOfWeek = getDay(today); // 0 = Sunday, 6 = Saturday
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[dayOfWeek];

        // Check if working pattern has weeks configured
        const hasWeeks = activeWorkingPattern.WorkingPatternWeek && activeWorkingPattern.WorkingPatternWeek.length > 0;
      
      // Find working pattern for today
      console.log('[Today API] Looking for day:', dayName);
      console.log('[Today API] Has weeks:', hasWeeks);
      console.log('[Today API] Available days:', activeWorkingPattern.WorkingPatternWeek?.[0]?.WorkingPatternDay?.map((d: any) => d.day));
      
      if (!hasWeeks) {
        console.log('[Today API] WARNING: Working pattern has no weeks configured');
      }
      
      // Case-insensitive day matching (handles both "Monday" and "MONDAY")
      const workingDay = hasWeeks 
        ? activeWorkingPattern.WorkingPatternWeek[0].WorkingPatternDay?.find(
            (d: any) => d.day.toUpperCase() === dayName.toUpperCase()
          )
        : null;

      console.log('[Today API] Working day found:', !!workingDay);
      console.log('[Today API] Working day type:', workingDay?.type);

      if (workingDay) {
        // Default working hours based on day type
        let startTime: string | undefined;
        let endTime: string | undefined;

        switch (workingDay.type) {
          case 'FULL_DAY':
            startTime = '09:00';
            endTime = '17:00';
            break;
          case 'HALF_DAY_AM':
            startTime = '09:00';
            endTime = '13:00';
            break;
          case 'HALF_DAY_PM':
            startTime = '13:00';
            endTime = '17:00';
            break;
          default:
            break;
        }

        if (startTime && endTime) {
          workingPattern = {
            type: workingDay.type,
            day: dayName,
            startTime,
            endTime,
            name: activeWorkingPattern.name,
          };
        }
      }
      }
    }

    const response = {
      shift: shift || null,
      workingPattern,
      activeClockEntry,
      date: today.toISOString(),
      isWorkingDay: !!(shift || workingPattern),
    };

    console.log('[Today API] Final response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching today shift:', error);
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 });
  }
}
