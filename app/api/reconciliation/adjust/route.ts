/**
 * Reconciliation Adjust API
 * 
 * POST /api/reconciliation/adjust
 * Adjust a timesheet entry to match scheduled time or custom time
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { adjustToScheduled, calculateVariance } from '@/lib/time-tracking/shift-matcher';
import { differenceInMinutes, parseISO, isValid } from 'date-fns';
import { z } from 'zod';

const adjustSchema = z.object({
  entryId: z.string().min(1),
  adjustmentType: z.enum(['TO_SCHEDULED', 'CUSTOM']),
  customStartTime: z.string().optional(),
  customEndTime: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: { select: { role: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const isAdmin = employee.User.role === 'ADMIN' || employee.User.role === 'SUPER_ADMIN';
    const isManager = employee.User.role === 'MANAGER';

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Only admins and managers can adjust entries' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = adjustSchema.parse(body);

    // Verify entry belongs to same company
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: data.entryId },
      include: { Timesheet: { select: { companyId: true } } },
    });

    if (!entry || entry.Timesheet.companyId !== employee.companyId) {
      return NextResponse.json({ error: 'Timesheet entry not found' }, { status: 404 });
    }

    if (data.adjustmentType === 'TO_SCHEDULED') {
      await adjustToScheduled(data.entryId, session.user.id, data.notes);
    } else {
      // Custom adjustment
      if (!data.customStartTime || !data.customEndTime) {
        return NextResponse.json(
          { error: 'Custom start and end times required for custom adjustment' },
          { status: 400 }
        );
      }

      const newStartTime = parseISO(data.customStartTime);
      const newEndTime = parseISO(data.customEndTime);

      if (!isValid(newStartTime) || !isValid(newEndTime)) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }

      const hours = differenceInMinutes(newEndTime, newStartTime) / 60 - (entry.breakMinutes / 60);

      // Calculate new variance if linked to shift
      let varianceMinutes = null;
      let varianceType = null;

      if (entry.scheduledStartTime && entry.scheduledEndTime) {
        const variance = calculateVariance(
          entry.scheduledStartTime,
          entry.scheduledEndTime,
          newStartTime,
          newEndTime
        );
        varianceMinutes = variance.minutes;
        varianceType = variance.type;
      }

      await prisma.timesheetEntry.update({
        where: { id: data.entryId },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
          hours,
          varianceMinutes,
          varianceType,
          reconciliationStatus: 'ADJUSTED',
          reconciliationNotes: data.notes || 'Custom time adjustment',
          reconciledBy: session.user.id,
          reconciledAt: new Date(),
          managerAdjusted: true,
          managerAdjustedBy: session.user.id,
          managerAdjustedAt: new Date(),
          managerAdjustmentNote: data.notes || 'Custom time adjustment',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Entry adjusted successfully',
    });
  } catch (error) {
    console.error('[API] Reconciliation adjust error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Entry not linked to a shift') {
      return NextResponse.json(
        { error: 'Cannot adjust to scheduled - entry is not linked to a shift' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to adjust entry' },
      { status: 500 }
    );
  }
}

