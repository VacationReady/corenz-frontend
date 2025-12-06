import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addDays, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { calculateShiftCost } from '@/lib/timesheet-calculations';
import { detectScheduleConflicts } from '@/lib/conflict-detector';

const bulkCreateSchema = z.object({
  templateId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  employeeIds: z.array(z.string()).min(1, 'At least one employee required'),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  notes: z.string().optional(),
  requiresConfirmation: z.boolean().default(false),
  // Manual shift details (if not using template)
  shiftStartTime: z.string().optional(), // HH:MM format
  shiftEndTime: z.string().optional(), // HH:MM format
  breakDuration: z.number().min(0).default(0),
  role: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  // Pattern options
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0=Sunday, 6=Saturday
  skipWeekends: z.boolean().default(false),
});

/**
 * POST /api/shifts/bulk-create
 * Create multiple shifts from template or manual specification
 * - Accepts templateId OR manual shift details
 * - Creates shifts for date range and employees
 * - Calculates cost for each shift
 * - Returns created shifts with conflict warnings
 * Permission: MANAGER/ADMIN only
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = bulkCreateSchema.parse(body);

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

    // Only managers and admins can bulk create shifts
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to create shifts' }, { status: 403 });
    }

    // Get shift template if specified
    let template = null;
    if (data.templateId) {
      template = await prisma.shiftTemplate.findUnique({
        where: { 
          id: data.templateId,
          companyId: requestingEmployee.companyId,
        },
      });

      if (!template) {
        return NextResponse.json({ error: 'Shift template not found' }, { status: 404 });
      }

      // Note: ShiftTemplate model doesn't have isActive field, so we skip this check
    }

    // Validate manual shift details if not using template
    if (!data.templateId && (!data.shiftStartTime || !data.shiftEndTime)) {
      return NextResponse.json(
        { error: 'Either templateId or manual shift times (shiftStartTime, shiftEndTime) required' },
        { status: 400 }
      );
    }

    // Get shift time details
    const startTime = template?.startTime || data.shiftStartTime!;
    const endTime = template?.endTime || data.shiftEndTime!;
    const breakDuration = template?.breakDuration || data.breakDuration;

    // Parse time strings (HH:MM format)
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Validate employees exist and belong to company
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: data.employeeIds },
        companyId: requestingEmployee.companyId,
      },
    });

    if (employees.length !== data.employeeIds.length) {
      return NextResponse.json(
        { error: 'Some employees not found or do not belong to your company' },
        { status: 404 }
      );
    }

    // Generate date range
    const startDate = parseISO(data.startDate);
    const endDate = parseISO(data.endDate);
    const dates: Date[] = [];
    
    let currentDate = startOfDay(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Check day of week filters
      let includeDate = true;
      
      if (data.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        includeDate = false;
      }
      
      if (data.daysOfWeek && data.daysOfWeek.length > 0) {
        includeDate = data.daysOfWeek.includes(dayOfWeek);
      }
      
      if (includeDate) {
        dates.push(new Date(currentDate));
      }
      
      currentDate = addDays(currentDate, 1);
    }

    if (dates.length === 0) {
      return NextResponse.json(
        { error: 'No valid dates in range after applying filters' },
        { status: 400 }
      );
    }

    // Create shifts
    const createdShifts = [];
    const errors = [];

    for (const employee of employees) {
      const hourlyRate = employee.hourlyRate ? parseFloat(employee.hourlyRate.toString()) : 0;

      for (const date of dates) {
        try {
          // Calculate shift start/end times
          let shiftStart = setHours(setMinutes(date, startMinute), startHour);
          let shiftEnd = setHours(setMinutes(date, endMinute), endHour);

          // Handle shifts that span midnight
          if (shiftEnd <= shiftStart) {
            shiftEnd = addDays(shiftEnd, 1);
          }

          // Calculate cost
          const shiftHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
          const cost = calculateShiftCost(shiftHours, breakDuration, hourlyRate);

          // Create shift
          const shift = await prisma.shift.create({
            data: {
              companyId: requestingEmployee.companyId,
              employeeId: employee.id,
              templateId: data.templateId,
              departmentId: data.departmentId || employee.departmentId,
              locationId: data.locationId,
              startTime: shiftStart,
              endTime: shiftEnd,
              breakDuration,
              notes: data.notes,
              role: data.role,
              requiredSkills: data.requiredSkills,
              requiresConfirmation: data.requiresConfirmation,
              isPublished: false,
              attendanceStatus: 'SCHEDULED',
              cost,
              createdBy: session.user.id,
            },
          });

          createdShifts.push(shift);
        } catch (error) {
          console.error('Error creating shift:', error);
          errors.push({
            employeeId: employee.id,
            date: date.toISOString(),
            error: 'Failed to create shift',
          });
        }
      }
    }

    // Detect conflicts for created shifts
    const allShifts = await prisma.shift.findMany({
      where: {
        companyId: requestingEmployee.companyId,
        startTime: {
          gte: startDate,
          lte: addDays(endDate, 1),
        },
      },
      select: {
        id: true,
        employeeId: true,
        startTime: true,
        endTime: true,
        requiredSkills: true,
      },
    });

    // Get availability patterns and employee skills
    const availabilityPatterns = new Map();
    const availabilityExceptions = new Map();
    const employeeSkills = new Map();

    for (const employee of employees) {
      const patterns = await prisma.availabilityPattern.findMany({
        where: { employeeId: employee.id },
      });
      availabilityPatterns.set(employee.id, patterns);

      const exceptions = await prisma.availabilityException.findMany({
        where: { 
          employeeId: employee.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      availabilityExceptions.set(employee.id, exceptions);

      // Parse skills from employee - TODO: Implement employee skills system
      employeeSkills.set(employee.id, []);
    }

    // Get time tracking settings for conflict detection
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    const conflictSettings = {
      minimumRestHours: settings?.minimumRestHours || 11,
      maxHoursPerWeek: settings?.overtimeThreshold 
        ? parseFloat(settings.overtimeThreshold.toString()) 
        : 40,
    };

    const conflicts = detectScheduleConflicts(
      allShifts as any,
      availabilityPatterns,
      availabilityExceptions,
      employeeSkills,
      new Map(), // leaveRequests - empty for now
      conflictSettings
    );

    // Filter conflicts to only those affecting newly created shifts
    const newShiftIds = new Set(createdShifts.map(s => s.id));
    const relevantConflicts = conflicts.filter(
      c => (c.shift1Id && newShiftIds.has(c.shift1Id)) || 
           (c.shift2Id && newShiftIds.has(c.shift2Id))
    );

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'CREATED',
        entityType: 'EMPLOYEE',
        entityId: 'multiple',
        metadata: {
          type: 'SHIFTS_BULK_CREATED',
          count: createdShifts.length,
          employeeCount: employees.length,
          dateRange: {
            start: data.startDate,
            end: data.endDate,
          },
          templateId: data.templateId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${createdShifts.length} shift${createdShifts.length !== 1 ? 's' : ''} created successfully`,
      shifts: createdShifts,
      conflicts: relevantConflicts,
      warnings: [
        ...errors,
        ...(relevantConflicts.length > 0 
          ? [`${relevantConflicts.length} potential conflict${relevantConflicts.length !== 1 ? 's' : ''} detected`]
          : []
        ),
      ],
      statistics: {
        totalCreated: createdShifts.length,
        employeeCount: employees.length,
        dateCount: dates.length,
        conflictCount: relevantConflicts.length,
        errorCount: errors.length,
      },
    });
  } catch (error) {
    console.error('Bulk shift creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create shifts' }, { status: 500 });
  }
}
