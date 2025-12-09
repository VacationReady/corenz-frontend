/**
 * Reconciliation Match API
 * 
 * POST /api/reconciliation/match
 * Manually match a clock entry or timesheet entry to a shift
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { manuallyMatchToShift } from '@/lib/time-tracking/shift-matcher';
import { z } from 'zod';

const matchSchema = z.object({
  entryType: z.enum(['clock', 'timesheet']),
  entryId: z.string().min(1),
  shiftId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

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
        { error: 'Only admins and managers can match entries' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = matchSchema.parse(body);

    // Verify shift belongs to same company
    const shift = await prisma.shift.findUnique({
      where: { id: data.shiftId },
      select: { companyId: true },
    });

    if (!shift || shift.companyId !== employee.companyId) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Verify entry belongs to same company
    if (data.entryType === 'clock') {
      const entry = await prisma.clockEntry.findUnique({
        where: { id: data.entryId },
        select: { companyId: true },
      });
      if (!entry || entry.companyId !== employee.companyId) {
        return NextResponse.json({ error: 'Clock entry not found' }, { status: 404 });
      }
    } else {
      const entry = await prisma.timesheetEntry.findUnique({
        where: { id: data.entryId },
        include: { Timesheet: { select: { companyId: true } } },
      });
      if (!entry || entry.Timesheet.companyId !== employee.companyId) {
        return NextResponse.json({ error: 'Timesheet entry not found' }, { status: 404 });
      }
    }

    await manuallyMatchToShift(
      data.entryType,
      data.entryId,
      data.shiftId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Entry matched to shift successfully',
    });
  } catch (error) {
    console.error('[API] Reconciliation match error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to match entry to shift' },
      { status: 500 }
    );
  }
}


