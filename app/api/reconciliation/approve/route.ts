/**
 * Reconciliation Approve API
 * 
 * POST /api/reconciliation/approve
 * Approve a timesheet entry variance as-is
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const approveSchema = z.object({
  entryId: z.string().min(1),
  notes: z.string().optional(),
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
        { error: 'Only admins and managers can approve entries' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = approveSchema.parse(body);

    // Verify entry belongs to same company
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: data.entryId },
      include: { Timesheet: { select: { companyId: true } } },
    });

    if (!entry || entry.Timesheet.companyId !== employee.companyId) {
      return NextResponse.json({ error: 'Timesheet entry not found' }, { status: 404 });
    }

    await prisma.timesheetEntry.update({
      where: { id: data.entryId },
      data: {
        reconciliationStatus: 'APPROVED',
        reconciliationNotes: data.notes || 'Approved as-is',
        reconciledBy: session.user.id,
        reconciledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Entry approved successfully',
    });
  } catch (error) {
    console.error('[API] Reconciliation approve error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to approve entry' },
      { status: 500 }
    );
  }
}

