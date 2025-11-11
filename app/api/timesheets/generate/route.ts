import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getTimesheetPeriod, calculateHours, calculateOvertime } from '@/lib/timesheet-calculations';
import { calculateOvertimeForEntry, OvertimeSettings } from '@/lib/overtime-calculator';

const generateTimesheetSchema = z.object({
  employeeId: z.string().optional(), // If not provided, generates for requesting user
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = generateTimesheetSchema.parse(body);

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

    // Determine target employee
    const targetEmployeeId = data.employeeId || requestingEmployee.id;

    // Check permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (data.employeeId && data.employeeId !== requestingEmployee.id && !isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to generate timesheets for other employees' },
        { status: 403 }
      );
    }

    // Get company settings
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    // Determine period
    let periodStart: Date;
    let periodEnd: Date;

    if (data.periodStart && data.periodEnd) {
      periodStart = new Date(data.periodStart);
      periodEnd = new Date(data.periodEnd);
    } else {
      // Use settings to determine period
      const period = getTimesheetPeriod(
        new Date(),
        (settings?.timesheetPeriod || 'WEEKLY') as any,
        (settings?.periodStartDay || 'MONDAY') as any
      );
      periodStart = period.periodStart;
      periodEnd = period.periodEnd;
    }

    // Check if timesheet already exists for this period
    const existingTimesheet = await prisma.timesheet.findUnique({
      where: {
        employeeId_periodStart_periodEnd: {
          employeeId: targetEmployeeId,
          periodStart,
          periodEnd,
        },
      },
    });

    if (existingTimesheet) {
      return NextResponse.json(
        { error: 'Timesheet already exists for this period', timesheet: existingTimesheet },
        { status: 400 }
      );
    }

    // Fetch clock entries for the period
    const clockEntries = await prisma.clockEntry.findMany({
      where: {
        employeeId: targetEmployeeId,
        companyId: requestingEmployee.companyId,
        clockInTime: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'COMPLETED',
      },
      orderBy: {
        clockInTime: 'asc',
      },
    });

    // Calculate total hours
    let totalHours = 0;
    let breakHours = 0;

    for (const entry of clockEntries) {
      if (entry.clockOutTime) {
        const hours = calculateHours(entry.clockInTime, entry.clockOutTime, 0);
        totalHours += hours;
      }
    }

    // Calculate overtime
    const overtimeThreshold = settings?.overtimeThreshold
      ? parseFloat(settings.overtimeThreshold.toString())
      : 40;

    const { regularHours, overtimeHours } = calculateOvertime(totalHours, overtimeThreshold);

    // Create timesheet
    const timesheet = await prisma.timesheet.create({
      data: {
        employeeId: targetEmployeeId,
        companyId: requestingEmployee.companyId,
        periodStart,
        periodEnd,
        totalHours,
        regularHours,
        overtimeHours,
        breakHours,
        approvalStatus: 'PENDING',
      },
    });

    // Link clock entries to timesheet
    await prisma.clockEntry.updateMany({
      where: {
        id: { in: clockEntries.map((e: any) => e.id) },
      },
      data: {
        timesheetId: timesheet.id,
      },
    });

    // Create timesheet entries from clock entries
    const timesheetEntries = clockEntries.map((entry: any) => ({
      timesheetId: timesheet.id,
      date: entry.clockInTime,
      startTime: entry.clockInTime,
      endTime: entry.clockOutTime || entry.clockInTime,
      breakMinutes: 0,
      hours: entry.clockOutTime
        ? calculateHours(entry.clockInTime, entry.clockOutTime, 0)
        : 0,
      isOvertime: false,
      entryType: 'CLOCK' as const,
    }));

    let createdEntries: any[] = [];
    if (timesheetEntries.length > 0) {
      // Create entries and get IDs back
      for (const entryData of timesheetEntries) {
        const created = await prisma.timesheetEntry.create({
          data: entryData,
        });
        createdEntries.push(created);
      }
    }

    // Auto-apply overtime calculation if enabled
    if (settings?.autoApplyOvertime && createdEntries.length > 0) {
      const overtimeSettings: OvertimeSettings = {
        overtimeCalculationMode: (settings.overtimeCalculationMode as any) || 'PATTERN_BASED',
        autoApplyOvertime: settings.autoApplyOvertime,
        dailyOvertimeThreshold: settings.dailyOvertimeThreshold ? Number(settings.dailyOvertimeThreshold) : undefined,
        weeklyOvertimeThreshold: settings.weeklyOvertimeThreshold ? Number(settings.weeklyOvertimeThreshold) : undefined,
        monthlyOvertimeThreshold: settings.monthlyOvertimeThreshold ? Number(settings.monthlyOvertimeThreshold) : undefined,
        overtimeMultiplier: Number(settings.overtimeMultiplier || 1.5),
        overtimeMultiplierTier2: settings.overtimeMultiplierTier2 ? Number(settings.overtimeMultiplierTier2) : undefined,
        overtimeThresholdTier2: settings.overtimeThresholdTier2 ? Number(settings.overtimeThresholdTier2) : undefined,
        publicHolidayMultiplier: Number(settings.publicHolidayMultiplier || 1.5),
        sundayMultiplier: settings.sundayMultiplier ? Number(settings.sundayMultiplier) : undefined,
      };

      // Calculate overtime for each entry
      for (const entry of createdEntries) {
        try {
          const overtimeResult = await calculateOvertimeForEntry(
            {
              id: entry.id,
              date: new Date(entry.date),
              hours: Number(entry.hours),
              timesheetId: entry.timesheetId,
            },
            targetEmployeeId,
            requestingEmployee.companyId,
            overtimeSettings
          );

          // Update entry with overtime calculations AND public holiday metadata
          await prisma.timesheetEntry.update({
            where: { id: entry.id },
            data: {
              regularHours: overtimeResult.regularHours,
              overtimeHours: overtimeResult.overtimeHours,
              overtimeMultiplier: overtimeResult.overtimeMultiplier,
              overtimeType: overtimeResult.overtimeType,
              overtimeReason: overtimeResult.overtimeReason,
              isOvertime: overtimeResult.overtimeHours > 0,
              // Public holiday metadata from calculator
              isPublicHoliday: overtimeResult.isPublicHoliday,
              publicHolidayName: overtimeResult.publicHolidayName,
              publicHolidayHours: overtimeResult.publicHolidayHours,
              publicHolidayMultiplier: overtimeResult.publicHolidayMultiplier,
              publicHolidayType: overtimeResult.publicHolidayType,
              publicHolidayRegion: overtimeResult.publicHolidayRegion,
            },
          });
        } catch (overtimeError) {
          console.error(`Failed to calculate overtime for entry ${entry.id}:`, overtimeError);
          // Continue processing other entries even if one fails
        }
      }

      // Recalculate timesheet totals after overtime application
      const updatedEntries = await prisma.timesheetEntry.findMany({
        where: { timesheetId: timesheet.id },
      });

      const newTotalHours = updatedEntries.reduce((sum, e) => sum + Number(e.hours), 0);
      const newRegularHours = updatedEntries.reduce((sum, e) => sum + Number(e.regularHours || e.hours), 0);
      const newOvertimeHours = updatedEntries.reduce((sum, e) => sum + Number(e.overtimeHours || 0), 0);

      await prisma.timesheet.update({
        where: { id: timesheet.id },
        data: {
          totalHours: newTotalHours,
          regularHours: newRegularHours,
          overtimeHours: newOvertimeHours,
        },
      });
    }

    // Auto-submit if configured
    if (settings?.autoSubmit) {
      await prisma.timesheet.update({
        where: { id: timesheet.id },
        data: {
          submittedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      timesheet,
      entriesCount: clockEntries.length,
      message: 'Timesheet generated successfully',
    });
  } catch (error) {
    console.error('Timesheet generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to generate timesheet' }, { status: 500 });
  }
}
