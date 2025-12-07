/**
 * Edit Clock Entry API
 * 
 * POST /api/reconciliation/edit-clock-entry
 * Allows managers/admins to edit existing clock entries (e.g., missed clocks, time challenges)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { processTimesheetEntry, recalculateTimesheetTotals } from '@/lib/time-tracking/timesheet-entry-processor';
import { calculateVariance, linkTimesheetEntryToShift } from '@/lib/time-tracking/shift-matcher';

const editClockEntrySchema = z.object({
  clockEntryId: z.string(),
  clockInTime: z.string().datetime(),
  clockOutTime: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
  breakMinutes: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = editClockEntrySchema.parse(body);

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
    const isAdminOrManager = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to edit clock entries' },
        { status: 403 }
      );
    }

    // Get the existing clock entry
    const existingEntry = await prisma.clockEntry.findUnique({
      where: { id: data.clockEntryId },
      include: {
        Shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            breakDuration: true,
          },
        },
      },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Clock entry not found' }, { status: 404 });
    }

    // Verify same company
    if (existingEntry.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Clock entry not found' }, { status: 404 });
    }

    // Validate times
    const newClockInTime = new Date(data.clockInTime);
    const newClockOutTime = data.clockOutTime ? new Date(data.clockOutTime) : null;

    if (newClockOutTime && newClockOutTime <= newClockInTime) {
      return NextResponse.json(
        { error: 'Clock out time must be after clock in time' },
        { status: 400 }
      );
    }

    // Disallow future times
    const now = new Date();
    if (newClockInTime > now) {
      return NextResponse.json(
        { error: 'Cannot set clock in time in the future' },
        { status: 400 }
      );
    }

    if (newClockOutTime && newClockOutTime > now) {
      return NextResponse.json(
        { error: 'Cannot set clock out time in the future' },
        { status: 400 }
      );
    }

    // Get break minutes - use provided value, or get from linked shift
    const breakMinutes = data.breakMinutes ?? existingEntry.Shift?.breakDuration ?? 0;

    // Use transaction to update clock entry AND related timesheet entry
    const result = await prisma.$transaction(async (tx) => {
      // Store original values for audit
      const originalClockIn = existingEntry.clockInTime;
      const originalClockOut = existingEntry.clockOutTime;

      // Update clock entry
      const updatedClockEntry = await tx.clockEntry.update({
        where: { id: data.clockEntryId },
        data: {
          clockInTime: newClockInTime,
          clockOutTime: newClockOutTime,
          notes: data.notes
            ? `${existingEntry.notes ? existingEntry.notes + ' | ' : ''}Edit: ${data.notes}`
            : existingEntry.notes,
          status: newClockOutTime ? 'COMPLETED' : 'ACTIVE',
        },
      });

      // Find and update related timesheet entry if exists
      let updatedTimesheetEntry = null;
      
      // Find timesheet entry linked to this clock entry via shift or same time range
      const relatedTimesheetEntry = await tx.timesheetEntry.findFirst({
        where: {
          OR: [
            { shiftId: existingEntry.shiftId },
            {
              Timesheet: {
                employeeId: existingEntry.employeeId,
              },
              startTime: {
                gte: new Date(originalClockIn.getTime() - 60000), // Within 1 minute
                lte: new Date(originalClockIn.getTime() + 60000),
              },
            },
          ],
        },
        include: {
          Timesheet: true,
        },
      });

      if (relatedTimesheetEntry && newClockOutTime) {
        // Process entry with updated times
        const processedEntry = await processTimesheetEntry(
          {
            date: newClockInTime,
            startTime: newClockInTime,
            endTime: newClockOutTime,
            breakMinutes,
          },
          existingEntry.employeeId,
          existingEntry.companyId,
          'ADJUSTED',
          data.notes
        );

        // Update timesheet entry
        updatedTimesheetEntry = await tx.timesheetEntry.update({
          where: { id: relatedTimesheetEntry.id },
          data: {
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
            managerAdjustmentNote: data.notes || 'Clock entry edited',
            reconciliationStatus: 'ADJUSTED',
            reconciliationNotes: data.notes || 'Clock entry edited by manager',
            reconciledBy: session.user.id,
            reconciledAt: new Date(),
          },
        });

        // Update variance if linked to shift
        if (existingEntry.Shift) {
          const variance = calculateVariance(
            existingEntry.Shift.startTime,
            existingEntry.Shift.endTime,
            newClockInTime,
            newClockOutTime
          );

          await tx.timesheetEntry.update({
            where: { id: relatedTimesheetEntry.id },
            data: {
              varianceMinutes: variance.minutes,
              varianceType: variance.type,
            },
          });
        }

        // Recalculate timesheet totals
        await recalculateTimesheetTotals(relatedTimesheetEntry.timesheetId, tx);
      }

      // Log the edit
      await tx.globalAuditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random()}`,
          companyId: existingEntry.companyId,
          actorId: session.user.id,
          action: 'UPDATED',
          entityType: 'EMPLOYEE',
          entityId: existingEntry.employeeId,
          metadata: {
            type: 'CLOCK_ENTRY_EDIT',
            clockEntryId: data.clockEntryId,
            timesheetEntryId: updatedTimesheetEntry?.id,
            originalClockIn: originalClockIn.toISOString(),
            originalClockOut: originalClockOut?.toISOString(),
            newClockIn: newClockInTime.toISOString(),
            newClockOut: newClockOutTime?.toISOString(),
            breakMinutes,
            notes: data.notes,
          },
        },
      });

      return { clockEntry: updatedClockEntry, timesheetEntry: updatedTimesheetEntry };
    });

    return NextResponse.json({
      success: true,
      clockEntry: result.clockEntry,
      timesheetEntry: result.timesheetEntry,
      message: 'Clock entry updated successfully',
    });
  } catch (error) {
    console.error('Edit clock entry error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update clock entry' }, { status: 500 });
  }
}
