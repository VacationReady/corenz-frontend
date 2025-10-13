import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parseISO } from 'date-fns';
import { detectScheduleConflicts, getConflictSummary } from '@/lib/conflict-detector';

/**
 * GET /api/shifts/conflicts
 * Detect scheduling conflicts for date range
 * Query params:
 *   - startDate (required): ISO date string
 *   - endDate (required): ISO date string
 *   - employeeId (optional): Filter to specific employee
 *   - departmentId (optional): Filter to specific department
 * Returns conflicts with severity levels
 * Permission: MANAGER/ADMIN for all conflicts, employees can see own conflicts
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');
    const departmentId = searchParams.get('departmentId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
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

    // Build where clause for shifts
    const where: any = {
      companyId: requestingEmployee.companyId,
      startTime: {
        gte: parseISO(startDate),
        lte: parseISO(endDate),
      },
    };

    // Regular employees can only see their own conflicts
    if (!isAdminOrManager) {
      where.employeeId = requestingEmployee.id;
    } else {
      if (employeeId) {
        where.employeeId = employeeId;
      }
      if (departmentId) {
        where.departmentId = departmentId;
      }
    }

    // Fetch shifts for the date range
    const shifts = await prisma.shift.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        startTime: true,
        endTime: true,
        requiredSkills: true,
      },
    });

    if (shifts.length === 0) {
      return NextResponse.json({
        conflicts: [],
        summary: getConflictSummary([]),
        message: 'No shifts found in date range',
      });
    }

    // Get unique employee IDs
    const employeeIds = [...new Set(shifts.map(s => s.employeeId).filter(Boolean))] as string[];

    // Get availability patterns for employees
    const availabilityPatterns = new Map();
    const patterns = await prisma.availabilityPattern.findMany({
      where: {
        employeeId: { in: employeeIds },
      },
    });

    for (const pattern of patterns) {
      if (!availabilityPatterns.has(pattern.employeeId)) {
        availabilityPatterns.set(pattern.employeeId, []);
      }
      availabilityPatterns.get(pattern.employeeId).push(pattern);
    }

    // Get availability exceptions for employees
    const availabilityExceptions = new Map();
    const exceptions = await prisma.availabilityException.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: {
          gte: parseISO(startDate),
          lte: parseISO(endDate),
        },
      },
    });

    for (const exception of exceptions) {
      if (!availabilityExceptions.has(exception.employeeId)) {
        availabilityExceptions.set(exception.employeeId, []);
      }
      availabilityExceptions.get(exception.employeeId).push(exception);
    }

    // Get employee skills
    const employeeSkills = new Map();
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
      select: {
        id: true,
      },
    });

    for (const employee of employees) {
      // TODO: Implement employee skills system
      employeeSkills.set(employee.id, []);
    }

    // Get time tracking settings
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    const conflictSettings = {
      minimumRestHours: settings?.minimumRestHours || 11,
      maxHoursPerWeek: settings?.overtimeThreshold 
        ? parseFloat(settings.overtimeThreshold.toString()) 
        : 40,
    };

    // Detect conflicts
    const conflicts = detectScheduleConflicts(
      shifts as any,
      availabilityPatterns,
      availabilityExceptions,
      employeeSkills,
      new Map(), // leaveRequests - empty for now
      conflictSettings
    );

    // Get employee details for conflicts
    const conflictEmployeeIds = [...new Set(conflicts.map(c => c.employeeId))];
    const conflictEmployees = await prisma.employee.findMany({
      where: {
        id: { in: conflictEmployeeIds },
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
      },
    });

    const employeeMap = new Map(conflictEmployees.map(e => [e.id, e]));

    // Enrich conflicts with employee and shift details
    const enrichedConflicts = conflicts.map(conflict => {
      const employee = employeeMap.get(conflict.employeeId);
      
      const shift1 = conflict.shift1Id 
        ? shifts.find(s => s.id === conflict.shift1Id)
        : null;
      
      const shift2 = conflict.shift2Id 
        ? shifts.find(s => s.id === conflict.shift2Id)
        : null;

      return {
        ...conflict,
        employee: employee ? {
          id: employee.id,
          name: employee.User.name,
          email: employee.User.email,
          department: employee.Department?.name,
        } : null,
        shift1: shift1 ? {
          id: shift1.id,
          startTime: shift1.startTime,
          endTime: shift1.endTime,
        } : null,
        shift2: shift2 ? {
          id: shift2.id,
          startTime: shift2.startTime,
          endTime: shift2.endTime,
        } : null,
      };
    });

    // Get summary
    const summary = getConflictSummary(conflicts);

    // Store unresolved conflicts in database
    const existingConflicts = await prisma.scheduleConflict.findMany({
      where: {
        companyId: requestingEmployee.companyId,
        resolvedAt: null,
      },
    });

    const existingConflictKeys = new Set(
      existingConflicts.map(c => `${c.employeeId}-${c.conflictType}-${c.shift1Id}-${c.shift2Id}`)
    );

    // Create new conflict records
    for (const conflict of conflicts) {
      const conflictKey = `${conflict.employeeId}-${conflict.type}-${conflict.shift1Id || ''}-${conflict.shift2Id || ''}`;
      
      if (!existingConflictKeys.has(conflictKey)) {
        await prisma.scheduleConflict.create({
          data: {
            id: `conflict-${Date.now()}-${Math.random()}`,
            companyId: requestingEmployee.companyId,
            employeeId: conflict.employeeId,
            conflictType: conflict.type,
            description: conflict.description,
            shift1Id: conflict.shift1Id,
            shift2Id: conflict.shift2Id,
            severity: conflict.severity,
          },
        });
      }
    }

    return NextResponse.json({
      conflicts: enrichedConflicts,
      summary,
      settings: conflictSettings,
      shiftsAnalyzed: shifts.length,
      employeesAffected: conflictEmployeeIds.length,
    });
  } catch (error) {
    console.error('Conflict detection error:', error);
    return NextResponse.json({ error: 'Failed to detect conflicts' }, { status: 500 });
  }
}
