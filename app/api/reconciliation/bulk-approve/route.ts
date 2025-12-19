/**
 * Reconciliation Bulk Approve API
 * 
 * POST /api/reconciliation/bulk-approve
 * Bulk approve multiple timesheet entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { bulkApproveEntries } from '@/lib/time-tracking/shift-matcher';
import { z } from 'zod';

const bulkApproveSchema = z.object({
  entryIds: z.array(z.string().min(1)).min(1, 'At least one entry ID required'),
  maxVarianceMinutes: z.number().min(0).max(60).optional().default(15),
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
        { error: 'Only admins and managers can bulk approve entries' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = bulkApproveSchema.parse(body);

    const uniqueEntryIds = Array.from(new Set(data.entryIds));
    if (uniqueEntryIds.length !== data.entryIds.length) {
      console.warn(
        "[API] /api/reconciliation/bulk-approve deduped entryIds:",
        {
          received: data.entryIds.length,
          unique: uniqueEntryIds.length,
        },
      );
    }

    // Verify all entries belong to same company
    const entries = await prisma.timesheetEntry.findMany({
      where: { id: { in: uniqueEntryIds } },
      include: { Timesheet: { select: { companyId: true } } },
    });

    const invalidEntries = entries.filter(
      (e) => e.Timesheet.companyId !== employee.companyId
    );

    if (invalidEntries.length > 0) {
      return NextResponse.json(
        { error: 'Some entries do not belong to your company' },
        { status: 403 }
      );
    }

    // Only process entries that were found
    const validEntryIds = entries.map((e) => e.id);
    
    const result = await bulkApproveEntries(
      validEntryIds,
      session.user.id,
      data.maxVarianceMinutes
    );

    return NextResponse.json({
      success: true,
      message: `Approved ${result.approved} entries, skipped ${result.skipped}`,
      approved: result.approved,
      skipped: result.skipped,
      notFound: uniqueEntryIds.length - validEntryIds.length,
    });
  } catch (error) {
    console.error('[API] Reconciliation bulk approve error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to bulk approve entries' },
      { status: 500 }
    );
  }
}






