import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateNotesSchema = z.object({
  notes: z.string().max(1000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: entryId } = await params;
    const body = await req.json();
    const data = updateNotesSchema.parse(body);

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

    // Fetch entry with timesheet (tenant-scoped)
    const entry = await prisma.timesheetEntry.findFirst({
      where: {
        id: entryId,
        Timesheet: {
          companyId: requestingEmployee.companyId,
        },
      },
      include: {
        Timesheet: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Verify access - must be own entry or admin/manager
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnEntry = entry.Timesheet.employeeId === requestingEmployee.id;

    if (!isOwnEntry && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if timesheet is already approved (can't edit approved timesheets unless admin/manager)
    if (entry.Timesheet.approvalStatus === 'APPROVED' && !isAdminOrManager) {
      return NextResponse.json(
        { error: 'Cannot edit entries on approved timesheets' },
        { status: 400 }
      );
    }

    // Update notes
    const updatedEntry = await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: {
        notes: data.notes.trim() || null,
      },
    });

    // Log the update
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        companyId: requestingEmployee.companyId,
        actorId: session.user.id,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: entry.Timesheet.employeeId,
        metadata: {
          type: 'ENTRY_NOTES_UPDATED',
          entryId,
          timesheetId: entry.timesheetId,
          previousNotes: entry.notes,
          newNotes: data.notes.trim(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
    });
  } catch (error) {
    console.error('Entry notes update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update entry notes' }, { status: 500 });
  }
}
