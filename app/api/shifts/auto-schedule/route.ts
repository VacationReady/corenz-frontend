import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { autoScheduleShifts, ShiftRequirement, EmployeeProfile } from '@/lib/auto-scheduler';
import { differenceInHours } from 'date-fns';

const autoScheduleSchema = z.object({
  requirements: z.array(
    z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      role: z.string().optional(),
      requiredSkills: z.array(z.string()).default([]),
      departmentId: z.string().optional(),
      locationId: z.string().optional(),
      breakDuration: z.number().default(0),
      minStaffing: z.number().default(1),
    })
  ),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  laborBudget: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = autoScheduleSchema.parse(body);

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
        { error: 'You do not have permission to auto-schedule shifts' },
        { status: 403 }
      );
    }

    // Get company settings
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    if (!settings?.autoSchedulingEnabled) {
      return NextResponse.json(
        { error: 'Auto-scheduling is not enabled for your company' },
        { status: 400 }
      );
    }

    // Convert requirements to proper format
    const requirements: ShiftRequirement[] = data.requirements.map((req) => ({
      startTime: new Date(req.startTime),
      endTime: new Date(req.endTime),
      role: req.role,
      requiredSkills: req.requiredSkills,
      departmentId: req.departmentId || data.departmentId,
      locationId: req.locationId || data.locationId,
      breakDuration: req.breakDuration,
      minStaffing: req.minStaffing,
    }));

    // Get eligible employees
    const employeeFilter: any = {
      companyId: requestingEmployee.companyId,
      isActive: true,
    };

    if (data.departmentId) {
      employeeFilter.departmentId = data.departmentId;
    }

    const employees = await prisma.employee.findMany({
      where: employeeFilter,
      include: {
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    // Fetch availability patterns and recent shifts for each employee
    const employeeIds = employees.map((e: { id: string }) => e.id);

    const availabilityPatterns = await prisma.availabilityPattern.findMany({
      where: {
        employeeId: { in: employeeIds },
      },
    });

    const recentShifts = await prisma.shift.findMany({
      where: {
        employeeId: { in: employeeIds },
        startTime: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    // Build employee profiles
    const employeeProfiles: EmployeeProfile[] = employees.map((emp: any) => {
      const empPatterns = availabilityPatterns.filter((p: any) => p.employeeId === emp.id);
      const empRecentShifts = recentShifts.filter((s: any) => s.employeeId === emp.id);

      const currentWeekHours = empRecentShifts.reduce((sum: number, shift: any) => {
        return sum + differenceInHours(shift.endTime, shift.startTime);
      }, 0);

      return {
        id: emp.id,
        name: emp.User.name || 'Unknown',
        skills: [], // TODO: Add skills from employee profile
        hourlyRate: emp.hourlyRate ? parseFloat(emp.hourlyRate.toString()) : 0,
        maxHoursPerWeek: 40, // TODO: Get from employee contract
        preferredShifts: [], // TODO: Get from employee preferences
        availabilityPatterns: empPatterns.map((p: any) => ({
          dayOfWeek: p.dayOfWeek,
          startTime: p.startTime,
          endTime: p.endTime,
          isAvailable: p.isAvailable,
        })),
        currentWeekHours,
        recentShifts: empRecentShifts.map((s: any) => ({
          startTime: s.startTime,
          endTime: s.endTime,
          role: s.role,
        })),
      };
    });

    // Run auto-scheduler
    const result = autoScheduleShifts(requirements, employeeProfiles, {
      minimumRestHours: settings.minimumRestHours,
      maxHoursPerWeek: 40,
      laborBudget: data.laborBudget,
      fairDistribution: true,
    });

    return NextResponse.json({
      success: true,
      result: {
        assignments: result.assignments,
        unassignedShifts: result.unassignedShifts,
        conflicts: result.conflicts,
        totalCost: result.totalCost,
        utilizationByEmployee: Array.from(result.utilizationByEmployee.entries()).map(
          (entry: [string, number]) => ({
            employeeId: entry[0],
            hours: entry[1],
            employee: employeeProfiles.find((e: EmployeeProfile) => e.id === entry[0]),
          })
        ),
      },
      message: `Successfully assigned ${result.assignments.length} of ${requirements.length} shifts`,
    });
  } catch (error) {
    console.error('Auto-schedule error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to auto-schedule shifts' }, { status: 500 });
  }
}
