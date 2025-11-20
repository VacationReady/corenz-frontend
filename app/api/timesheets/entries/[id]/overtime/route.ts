/**
 * API Endpoint: Manager Overtime Amendment
 * 
 * PATCH /api/timesheets/entries/[id]/overtime
 * 
 * Allows managers to amend overtime classification for timesheet entries
 * Creates audit trail for NZ Employment Relations Act 2000 compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  validateOvertimeAmendment,
  canAmendOvertime,
} from '@/lib/overtime-validation';
import {
  validateTimesheetEntryTenant,
  getRequestingEmployee,
  TenantValidationError,
  logTenantViolationAttempt,
} from '@/lib/tenant-validation';

const amendOvertimeSchema = z.object({
  regularHours: z.number().min(0).max(24),
  overtimeHours: z.number().min(0).max(24),
  multiplier: z.number().min(1.0).max(3.0),
  reason: z.string().min(10).max(500),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: entryId } = await params;

    // Get requesting employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // ✅ SECURITY FIX: Validate tenant ownership BEFORE overtime amendment
    let entry;
    try {
      entry = await validateTimesheetEntryTenant(entryId, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        await logTenantViolationAttempt(
          session.user.id,
          'TIMESHEET_ENTRY_OVERTIME',
          entryId,
          requestingEmployee.companyId
        );
        return NextResponse.json(
          { error: 'Timesheet entry not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Check permissions - now safe since tenant is validated
    const canAmend = await canAmendOvertime(
      session.user.id,
      entry.Timesheet.employeeId
    );

    if (!canAmend) {
      return NextResponse.json(
        { error: 'You do not have permission to amend overtime for this employee' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = amendOvertimeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const amendment = validationResult.data;

    // Validate amendment against total hours
    const totalHours = parseFloat(entry.hours.toString());
    const businessValidation = validateOvertimeAmendment(totalHours, amendment);

    if (!businessValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid amendment',
          details: businessValidation.errors,
        },
        { status: 400 }
      );
    }

    // Capture previous values for audit
    const previousValues = {
      regularHours: entry.regularHours ? parseFloat(entry.regularHours.toString()) : null,
      overtimeHours: entry.overtimeHours ? parseFloat(entry.overtimeHours.toString()) : null,
      overtimeMultiplier: entry.overtimeMultiplier
        ? parseFloat(entry.overtimeMultiplier.toString())
        : null,
      overtimeType: entry.overtimeType,
      isOvertime: entry.isOvertime,
    };

    const newValues = {
      regularHours: amendment.regularHours,
      overtimeHours: amendment.overtimeHours,
      overtimeMultiplier: amendment.multiplier,
      overtimeType: 'MANAGER_ADJUSTED',
      isOvertime: amendment.overtimeHours > 0,
    };

    // Update entry in transaction with audit log
    const result = await prisma.$transaction(async (tx) => {
      // Update the entry
      const updateResult = await tx.timesheetEntry.updateMany({
        where: {
          id: entryId,
          Timesheet: {
            companyId: requestingEmployee.companyId,
          },
        },
        data: {
          regularHours: amendment.regularHours,
          overtimeHours: amendment.overtimeHours,
          overtimeMultiplier: amendment.multiplier,
          overtimeType: 'MANAGER_ADJUSTED',
          isOvertime: amendment.overtimeHours > 0,
          managerAdjusted: true,
          managerAdjustedBy: session.user.id,
          managerAdjustedAt: new Date(),
          managerAdjustmentNote: amendment.reason,
        },
      });

      if (updateResult.count === 0) {
        throw new TenantValidationError('Timesheet entry not found or access denied');
      }

      const updatedEntry = await tx.timesheetEntry.findFirst({
        where: {
          id: entryId,
          Timesheet: {
            companyId: requestingEmployee.companyId,
          },
        },
      });

      if (!updatedEntry) {
        throw new TenantValidationError('Timesheet entry not found or access denied');
      }

      // Create audit log entry
      await tx.overtimeAuditLog.create({
        data: {
          timesheetEntryId: entryId,
          employeeId: entry.Timesheet.employeeId,
          companyId: entry.Timesheet.companyId,
          action: 'MANAGER_OVERRIDE',
          previousValues,
          newValues,
          calculationMethod: 'MANUAL_AMENDMENT',
          triggeredBy: session.user.id,
          reason: amendment.reason,
        },
      });

      return updatedEntry;
    });

    return NextResponse.json({
      success: true,
      entry: {
        id: result.id,
        regularHours: parseFloat(result.regularHours?.toString() || '0'),
        overtimeHours: parseFloat(result.overtimeHours?.toString() || '0'),
        overtimeMultiplier: parseFloat(result.overtimeMultiplier?.toString() || '1.0'),
        overtimeType: result.overtimeType,
        managerAdjusted: result.managerAdjusted,
        managerAdjustedAt: result.managerAdjustedAt,
      },
    });
  } catch (error) {
    console.error('Error amending overtime:', error);
    if (error instanceof TenantValidationError) {
      return NextResponse.json(
        { error: 'Timesheet entry not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/timesheets/entries/[id]/overtime
 * 
 * Get overtime amendment history for an entry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: entryId } = await params;

    // Get requesting employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // ✅ SECURITY FIX: Validate tenant ownership BEFORE accessing audit logs
    try {
      await validateTimesheetEntryTenant(entryId, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        await logTenantViolationAttempt(
          session.user.id,
          'TIMESHEET_ENTRY_OVERTIME',
          entryId,
          requestingEmployee.companyId
        );
        return NextResponse.json(
          { error: 'Timesheet entry not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Safe to fetch audit logs - tenant ownership validated
    const auditLogs = await prisma.overtimeAuditLog.findMany({
      where: {
        timesheetEntryId: entryId,
        companyId: requestingEmployee.companyId,
        action: 'MANAGER_OVERRIDE',
      },
      orderBy: { triggeredAt: 'desc' },
    });

    return NextResponse.json({
      amendments: auditLogs.map((log) => ({
        id: log.id,
        triggeredAt: log.triggeredAt,
        reason: log.reason,
        previousValues: log.previousValues,
        newValues: log.newValues,
      })),
    });
  } catch (error) {
    console.error('Error fetching overtime amendments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
