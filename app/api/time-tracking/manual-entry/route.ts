import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { processTimesheetEntry, findOrCreateTimesheet, recalculateTimesheetTotals } from '@/lib/time-tracking/timesheet-entry-processor';
import { autoMatchClockEntryToShift, linkClockEntryToShift, linkTimesheetEntryToShift } from '@/lib/time-tracking/shift-matcher';

const manualEntrySchema = z.object({
  employeeId: z.string(),
  clockInTime: z.string().datetime(),
  clockOutTime: z.string().datetime(),
  notes: z.string().optional(),
  shiftId: z.string().optional(),
  breakMinutes: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

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

    // Get break minutes before transaction to avoid extra queries inside
    let breakMinutesFromShift = data.breakMinutes ?? 0;
    if (breakMinutesFromShift === 0 && data.shiftId) {
      const shiftWithBreak = await prisma.shift.findUnique({
        where: { id: data.shiftId },
        select: { breakDuration: true },
      });
      breakMinutesFromShift = shiftWithBreak?.breakDuration ?? 0;
    }

    // Use transaction to create clock entry AND timesheet entry with overtime calculation
    // Increase timeout to 15 seconds to handle slower database operations
    const result = await prisma.$transaction(async (tx) => {
      // If a shiftId is provided, validate it belongs to the same company and employee
      let manualShift: {
        id: string;
        companyId: string;
        employeeId: string | null;
        startTime: Date;
        endTime: Date;
      } | null = null;

      if (data.shiftId) {
        manualShift = await tx.shift.findUnique({
          where: { id: data.shiftId },
          select: {
            id: true,
            companyId: true,
            employeeId: true,
            startTime: true,
            endTime: true,
          },
        });

        if (!manualShift || manualShift.companyId !== requestingEmployee.companyId || manualShift.employeeId !== data.employeeId) {
          throw new Error('Invalid shift for manual manual time entry');
        }
      }
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

      // Use break minutes obtained before transaction
      const breakMinutes = breakMinutesFromShift;

      // Process entry with NZ-compliant overtime calculation
      const processedEntry = await processTimesheetEntry(
        {
          date: clockInTime,
          startTime: clockInTime,
          endTime: clockOutTime,
          breakMinutes,
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

      // If a specific shiftId was provided, explicitly link this entry to that shift.
      // Otherwise, fall back to auto-matching behaviour.
      if (manualShift) {
        try {
          await linkClockEntryToShift(
            clockEntry.id,
            manualShift.id,
            session.user.id,
            1.0,
            tx
          );

          await linkTimesheetEntryToShift(
            timesheetEntry.id,
            manualShift.id,
            { startTime: manualShift.startTime, endTime: manualShift.endTime },
            { startTime: clockInTime, endTime: clockOutTime },
            session.user.id,
            'MANUALLY_MATCHED',
            data.notes,
            tx
          );
        } catch (matchError) {
          console.error('[Manual entry] Manual shift link error (non-blocking):', matchError);
        }
      } else {
        // Auto-match to shift (non-blocking within transaction)
        try {
          const matchResult = await autoMatchClockEntryToShift({
            id: clockEntry.id,
            employeeId: data.employeeId,
            companyId: requestingEmployee.companyId,
            clockInTime,
            clockOutTime,
          });

          if (matchResult && matchResult.confidence >= 0.7) {
            // Link clock entry to shift
            await linkClockEntryToShift(
              clockEntry.id,
              matchResult.shiftId,
              session.user.id,
              matchResult.confidence,
              tx
            );

            // Also link timesheet entry to shift with variance data
            await linkTimesheetEntryToShift(
              timesheetEntry.id,
              matchResult.shiftId,
              { startTime: matchResult.scheduledStartTime, endTime: matchResult.scheduledEndTime },
              { startTime: clockInTime, endTime: clockOutTime },
              session.user.id,
              'AUTO_MATCHED',
              undefined,
              tx
            );
          }
        } catch (matchError) {
          // Log but don't fail the transaction
          console.error('[Manual entry] Auto-match error (non-blocking):', matchError);
        }
      }

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
