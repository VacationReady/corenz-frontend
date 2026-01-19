/**
 * Reconciliation Flag API
 * 
 * POST /api/reconciliation/flag
 * Flag a timesheet entry for review
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { flagEntryForReview } from '@/lib/time-tracking/shift-matcher';
import { z } from 'zod';

const flagSchema = z.object({
  entryId: z.string().min(1),
  notes: z.string().min(1, 'Notes are required when flagging an entry'),
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

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can flag entries' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = flagSchema.parse(body);

    // Verify entry belongs to same company
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: data.entryId },
      include: { Timesheet: { select: { companyId: true } } },
    });

    if (!entry || entry.Timesheet.companyId !== employee.companyId) {
      return NextResponse.json({ error: 'Timesheet entry not found' }, { status: 404 });
    }

    await flagEntryForReview(data.entryId, session.user.id, data.notes);

    return NextResponse.json({
      success: true,
      message: 'Entry flagged for review',
    });
  } catch (error) {
    console.error('[API] Reconciliation flag error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to flag entry' },
      { status: 500 }
    );
  }
}








