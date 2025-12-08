import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isManualEntryAllowed } from '@/types/time-tracking-settings';
import { processTimesheetEntry, findOrCreateTimesheet, recalculateTimesheetTotals, autoSubmitTimesheet } from '@/lib/time-tracking/timesheet-entry-processor';
import { autoMatchClockEntryToShift, linkClockEntryToShift, linkTimesheetEntryToShift } from '@/lib/time-tracking/shift-matcher';

const employeeManualEntrySchema = z.object({
  clockInTime: z.string().datetime(),
  clockOutTime: z.string().datetime(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = employeeManualEntrySchema.parse(body);

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Check if manual entry is allowed for this company
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    // Use type-safe helper function instead of type coercion
    if (!isManualEntryAllowed(settings)) {
      return NextResponse.json(
        { error: 'Manual time entry is not enabled for your organization' },
        { status: 403 }
      );
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

    // Check if date is not in the future
    const now = new Date();
    if (clockInTime > now || clockOutTime > now) {
      return NextResponse.json(
        { error: 'Cannot add entries for future dates' },
        { status: 400 }
      );
    }

    // Check for overlapping entries
    const overlappingEntry = await prisma.clockEntry.findFirst({
      where: {
        employeeId: requestingEmployee.id,
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
      // Create manual clock entry for the employee themselves
      const clockEntry = await tx.clockEntry.create({
        data: {
          employeeId: requestingEmployee.id,
          companyId: requestingEmployee.companyId,
          clockInTime,
          clockOutTime,
          notes: data.notes,
          status: 'COMPLETED',
        },
      });

      // Find or create timesheet for this date
      const timesheetId = await findOrCreateTimesheet(
        requestingEmployee.id,
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
        requestingEmployee.id,
        requestingEmployee.companyId,
        'MANUAL', // Employee-created entries are MANUAL
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

      // Auto-match to shift (non-blocking within transaction)
      try {
        const matchResult = await autoMatchClockEntryToShift({
          id: clockEntry.id,
          employeeId: requestingEmployee.id,
          companyId: requestingEmployee.companyId,
          clockInTime,
          clockOutTime,
        });

        if (matchResult && matchResult.confidence >= 0.7) {
          // Link clock entry to shift
          await linkClockEntryToShift(
            clockEntry.id,
            matchResult.shiftId,
            'AUTO',
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
        console.error('[Employee manual entry] Auto-match error (non-blocking):', matchError);
      }

      // Log the manual entry creation with overtime info
      await tx.globalAuditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random()}`,
          companyId: requestingEmployee.companyId,
          actorId: session.user.id,
          action: 'CREATED',
          entityType: 'EMPLOYEE',
          entityId: requestingEmployee.id,
          metadata: {
            type: 'EMPLOYEE_MANUAL_TIME_ENTRY',
            clockEntryId: clockEntry.id,
            timesheetEntryId: timesheetEntry.id,
            clockInTime: clockInTime.toISOString(),
            clockOutTime: clockOutTime.toISOString(),
            hours: processedEntry.hours,
            overtimeHours: processedEntry.overtimeHours,
            isPublicHoliday: processedEntry.isPublicHoliday,
            publicHolidayName: processedEntry.publicHolidayName,
          },
        },
      });

      return { clockEntry, timesheetEntry, timesheetId };
    });

    // Auto-submit the timesheet for approval (non-blocking)
    try {
      await autoSubmitTimesheet(result.timesheetId, requestingEmployee.id, requestingEmployee.companyId);
    } catch (submitError) {
      console.error('[Employee manual entry] Auto-submit timesheet error (non-blocking):', submitError);
    }

    return NextResponse.json({
      success: true,
      clockEntry: result.clockEntry,
      timesheetEntry: result.timesheetEntry,
      message: 'Manual time entry created successfully',
    });
  } catch (error) {
    console.error('Employee manual entry error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create manual entry' }, { status: 500 });
  }
}
