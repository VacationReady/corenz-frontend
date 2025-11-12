import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { processTimesheetEntry, findOrCreateTimesheet, recalculateTimesheetTotals } from '@/lib/time-tracking/timesheet-entry-processor';

const manualEntrySchema = z.object({
  employeeId: z.string(),
  clockInTime: z.string().datetime(),
  clockOutTime: z.string().datetime(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = manualEntrySchema.parse(body);

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
        { error: 'You do not have permission to create manual entries' },
        { status: 403 }
      );
    }

    // Verify target employee exists and belongs to same company
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { companyId: true },
    });

    if (!targetEmployee || targetEmployee.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });
    }

    // Validate times
    const clockInTime = new Date(data.clockInTime);
    const clockOutTime = new Date(data.clockOutTime);

    if (clockOutTime <= clockInTime) {
      return NextResponse.json(
        { error: 'Clock out time must be after clock in time' },
        { status: 400 }
      );
    }

    // Check for overlapping entries
    const overlappingEntry = await prisma.clockEntry.findFirst({
      where: {
        employeeId: data.employeeId,
        OR: [
          {
            // New entry starts during existing entry
            AND: [
              { clockInTime: { lte: clockInTime } },
              {
                OR: [
                  { clockOutTime: { gte: clockInTime } },
                  { clockOutTime: null }, // Active entry
                ],
              },
            ],
          },
          {
            // New entry ends during existing entry
            AND: [
              { clockInTime: { lte: clockOutTime } },
              {
                OR: [
                  { clockOutTime: { gte: clockOutTime } },
                  { clockOutTime: null },
                ],
              },
            ],
          },
          {
            // Existing entry is completely within new entry
            AND: [
              { clockInTime: { gte: clockInTime } },
              { clockInTime: { lte: clockOutTime } },
            ],
          },
        ],
      },
    });

    if (overlappingEntry) {
      return NextResponse.json(
        { error: 'This time entry overlaps with an existing entry' },
        { status: 400 }
      );
    }

    // Use transaction to create clock entry AND timesheet entry with overtime calculation
    const result = await prisma.$transaction(async (tx) => {
      // Create manual clock entry
      const clockEntry = await tx.clockEntry.create({
        data: {
          employeeId: data.employeeId,
          companyId: requestingEmployee.companyId,
          clockInTime,
          clockOutTime,
          notes: data.notes,
          status: 'COMPLETED',
        },
      });

      // Find or create timesheet for this date
      const timesheetId = await findOrCreateTimesheet(
        data.employeeId,
        requestingEmployee.companyId,
        clockInTime
      );

      // Process entry with NZ-compliant overtime calculation
      const processedEntry = await processTimesheetEntry(
        {
          date: clockInTime,
          startTime: clockInTime,
          endTime: clockOutTime,
          breakMinutes: 0,
        },
        data.employeeId,
        requestingEmployee.companyId,
        'ADJUSTED', // Manager-created entries are ADJUSTED
        data.notes
      );

      // Create timesheet entry with full metadata
      const timesheetEntry = await tx.timesheetEntry.create({
        data: {
          timesheetId,
          date: processedEntry.date,
          startTime: processedEntry.startTime,
          endTime: processedEntry.endTime,
          breakMinutes: processedEntry.breakMinutes,
          hours: processedEntry.hours,
          regularHours: processedEntry.regularHours,
          overtimeHours: processedEntry.overtimeHours,
          overtimeMultiplier: processedEntry.overtimeMultiplier,
          overtimeType: processedEntry.overtimeType,
          overtimeReason: processedEntry.overtimeReason,
          isOvertime: processedEntry.isOvertime,
          isPublicHoliday: processedEntry.isPublicHoliday,
          publicHolidayName: processedEntry.publicHolidayName,
          publicHolidayHours: processedEntry.publicHolidayHours,
          publicHolidayMultiplier: processedEntry.publicHolidayMultiplier,
          publicHolidayType: processedEntry.publicHolidayType,
          publicHolidayRegion: processedEntry.publicHolidayRegion,
          alternativeDayGranted: processedEntry.alternativeDayGranted,
          managerAdjusted: true,
          managerAdjustedBy: session.user.id,
          managerAdjustedAt: new Date(),
          notes: processedEntry.notes,
          entryType: processedEntry.entryType as any,
        },
      });

      // Link clock entry to timesheet
      await tx.clockEntry.update({
        where: { id: clockEntry.id },
        data: { timesheetId },
      });

      // Recalculate timesheet totals
      await recalculateTimesheetTotals(timesheetId, tx);

      // Log the manual entry creation with overtime info
      await tx.globalAuditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random()}`,
          companyId: requestingEmployee.companyId,
          actorId: session.user.id,
          action: 'CREATED',
          entityType: 'EMPLOYEE',
          entityId: data.employeeId,
          metadata: {
            type: 'MANUAL_TIME_ENTRY',
            clockEntryId: clockEntry.id,
            timesheetEntryId: timesheetEntry.id,
            targetEmployeeId: data.employeeId,
            clockInTime: clockInTime.toISOString(),
            clockOutTime: clockOutTime.toISOString(),
            hours: processedEntry.hours,
            overtimeHours: processedEntry.overtimeHours,
            isPublicHoliday: processedEntry.isPublicHoliday,
            publicHolidayName: processedEntry.publicHolidayName,
          },
        },
      });

      return { clockEntry, timesheetEntry };
    });

    return NextResponse.json({
      success: true,
      clockEntry: result.clockEntry,
      timesheetEntry: result.timesheetEntry,
      message: 'Manual time entry created successfully',
    });
  } catch (error) {
    console.error('Manual entry error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create manual entry' }, { status: 500 });
  }
}
