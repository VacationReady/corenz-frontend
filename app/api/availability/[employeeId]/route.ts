import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { detectScheduleConflicts } from '@/lib/conflict-detector';

const availabilityPatternSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  isAvailable: z.boolean(),
});

const updatePatternsSchema = z.object({
  patterns: z.array(availabilityPatternSchema),
});

/**
 * GET /api/availability/[employeeId]
 * Fetch availability patterns and exceptions for an employee
 * Permission: Own data or MANAGER/ADMIN
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;

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
      where: { id: employeeId },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (targetEmployee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnData = employeeId === requestingEmployee.id;

    if (!isOwnData && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to view this availability' }, { status: 403 });
    }

    // Fetch patterns, exceptions, and working pattern
    const [patterns, exceptions, employee] = await Promise.all([
      prisma.availabilityPattern.findMany({
        where: {
          employeeId: employeeId,
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
      }),
      prisma.availabilityException.findMany({
        where: {
          employeeId: employeeId,
          date: {
            gte: new Date(), // Only future exceptions
          },
        },
        orderBy: {
          date: 'asc',
        },
      }),
      prisma.employee.findUnique({
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
                lte: new Date(),
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
      }),
    ]);

    // Determine which working pattern to use (prioritize assignment with effective date)
    const activeWorkingPattern = 
      employee?.EmployeeWorkingPatternAssignment?.[0]?.WorkingPattern || 
      employee?.WorkingPattern;

    // Transform working pattern into a format compatible with availability display
    const workingPatternInfo = activeWorkingPattern ? {
      id: activeWorkingPattern.id,
      name: activeWorkingPattern.name,
      description: activeWorkingPattern.description,
      days: activeWorkingPattern.WorkingPatternWeek?.[0]?.WorkingPatternDay?.map((day: any) => ({
        day: day.day,
        type: day.type,
        startTime: day.startTime,
        endTime: day.endTime,
        hoursPerDay: day.hoursPerDay,
      })) || [],
    } : null;

    return NextResponse.json({
      patterns,
      exceptions,
      upcomingExceptions: exceptions,
      workingPattern: workingPatternInfo,
    });
  } catch (error) {
    console.error('Availability fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

/**
 * PUT /api/availability/[employeeId]
 * Update recurring availability patterns
 * Permission: Own data or MANAGER/ADMIN
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;

    const body = await req.json();
    const data = updatePatternsSchema.parse(body);

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
      where: { id: employeeId },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (targetEmployee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnData = employeeId === requestingEmployee.id;

    if (!isOwnData && !isAdminOrManager) {
      return NextResponse.json(
        { error: 'Unauthorized to update this availability' },
        { status: 403 }
      );
    }

    // Delete existing patterns for the employee
    await prisma.availabilityPattern.deleteMany({
      where: {
        employeeId: employeeId,
      },
    });

    // Create new patterns
    const createdPatterns = await Promise.all(
      data.patterns.map((pattern) =>
        prisma.availabilityPattern.create({
          data: {
            employeeId: employeeId,
            companyId: requestingEmployee.companyId,
            dayOfWeek: pattern.dayOfWeek,
            startTime: pattern.startTime,
            endTime: pattern.endTime,
            isAvailable: pattern.isAvailable,
          },
        })
      )
    );

    // Run conflict detection for existing shifts
    const shifts = await prisma.shift.findMany({
      where: {
        employeeId: employeeId,
        companyId: requestingEmployee.companyId,
        startTime: {
          gte: new Date(), // Only future shifts
        },
      },
    });

    // Get exceptions
    const exceptions = await prisma.availabilityException.findMany({
      where: {
        employeeId: employeeId,
      },
    });

    // Convert to Map format for conflict detector
    const patternsMap = new Map();
    patternsMap.set(employeeId, createdPatterns);

    const exceptionsMap = new Map();
    exceptionsMap.set(employeeId, exceptions);

    const employeeSkills = new Map();
    employeeSkills.set(employeeId, []); // Simplified for now

    // Detect conflicts
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    const conflicts = detectScheduleConflicts(
      shifts,
      patternsMap,
      exceptionsMap,
      employeeSkills,
      new Map(), // leaveRequests - empty for now
      {
        minimumRestHours: settings?.minimumRestHours || 11,
        maxHoursPerWeek: 40, // Default max hours per week
      }
    );

    // Filter to only availability conflicts
    const availabilityConflicts = conflicts.filter((c) => c.type === 'UNAVAILABLE');

    // Create conflict records in database if any
    if (availabilityConflicts.length > 0) {
      await Promise.all(
        availabilityConflicts.map((conflict) =>
          prisma.scheduleConflict.create({
            data: {
              companyId: requestingEmployee.companyId,
              employeeId: conflict.employeeId,
              conflictType: conflict.type,
              description: conflict.description,
              shift1Id: conflict.shift1Id || null,
              shift2Id: conflict.shift2Id || null,
              severity: conflict.severity,
              resolvedAt: null,
            },
          })
        )
      );
    }

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        metadata: {
          type: 'AVAILABILITY_PATTERNS_UPDATED',
          patternsCount: createdPatterns.length,
          conflicts: availabilityConflicts.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      patterns: createdPatterns,
      conflicts: availabilityConflicts,
      message:
        availabilityConflicts.length > 0
          ? `Availability updated with ${availabilityConflicts.length} conflict(s) detected`
          : 'Availability patterns updated successfully',
    });
  } catch (error) {
    console.error('Availability update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}
