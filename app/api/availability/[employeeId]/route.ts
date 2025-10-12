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
  { params }: { params: { employeeId: string } }
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

    // Verify target employee exists and is in same company
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: params.employeeId },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (targetEmployee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnData = params.employeeId === requestingEmployee.id;

    if (!isOwnData && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to view this availability' }, { status: 403 });
    }

    // Fetch patterns and exceptions
    const [patterns, exceptions] = await Promise.all([
      prisma.availabilityPattern.findMany({
        where: {
          employeeId: params.employeeId,
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
      }),
      prisma.availabilityException.findMany({
        where: {
          employeeId: params.employeeId,
          date: {
            gte: new Date(), // Only future exceptions
          },
        },
        orderBy: {
          date: 'asc',
        },
      }),
    ]);

    return NextResponse.json({
      patterns,
      exceptions,
      upcomingExceptions: exceptions,
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
  { params }: { params: { employeeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      where: { id: params.employeeId },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (targetEmployee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnData = params.employeeId === requestingEmployee.id;

    if (!isOwnData && !isAdminOrManager) {
      return NextResponse.json(
        { error: 'Unauthorized to update this availability' },
        { status: 403 }
      );
    }

    // Delete existing patterns for the employee
    await prisma.availabilityPattern.deleteMany({
      where: {
        employeeId: params.employeeId,
      },
    });

    // Create new patterns
    const createdPatterns = await Promise.all(
      data.patterns.map((pattern) =>
        prisma.availabilityPattern.create({
          data: {
            employeeId: params.employeeId,
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
        employeeId: params.employeeId,
        companyId: requestingEmployee.companyId,
        startTime: {
          gte: new Date(), // Only future shifts
        },
      },
    });

    // Get exceptions
    const exceptions = await prisma.availabilityException.findMany({
      where: {
        employeeId: params.employeeId,
      },
    });

    // Convert to Map format for conflict detector
    const patternsMap = new Map();
    patternsMap.set(params.employeeId, createdPatterns);

    const exceptionsMap = new Map();
    exceptionsMap.set(params.employeeId, exceptions);

    const employeeSkills = new Map();
    employeeSkills.set(params.employeeId, []); // Simplified for now

    // Detect conflicts
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    const conflicts = detectScheduleConflicts(
      shifts,
      patternsMap,
      exceptionsMap,
      employeeSkills,
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
        entityId: params.employeeId,
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
