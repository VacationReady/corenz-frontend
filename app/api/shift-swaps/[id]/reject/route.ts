import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendShiftSwapRejectedEmail } from '@/lib/shift-swap-emails';

const rejectSwapSchema = z.object({
  reason: z.string().optional().nullable(),
});

/**
 * POST /api/shift-swaps/[id]/reject
 * Employee rejects swap request
 * Permission: Target employee only
 */
export async function POST(
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

    const { id } = await params;

    const body = await req.json();
    const data = rejectSwapSchema.parse(body);

    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            role: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: id },
      include: {
        Shift: true,
      },
    });

    if (!swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
    }

    // Verify shift belongs to same company
    if (swapRequest.Shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify swap is still PENDING
    if (swapRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This swap request is no longer pending' },
        { status: 400 }
      );
    }

    // Verify requester is the target employee
    if (!swapRequest.targetEmployeeId || swapRequest.targetEmployeeId !== requestingEmployee.id) {
      return NextResponse.json(
        { error: 'You cannot reject this swap request' },
        { status: 403 }
      );
    }

    // Get requester details for notification
    const requester = await prisma.employee.findUnique({
      where: { id: swapRequest.requesterId },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!requester) {
      return NextResponse.json({ error: 'Requester not found' }, { status: 404 });
    }

    // Update swap request status
    await prisma.shiftSwapRequest.update({
      where: { id: id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        responseMessage: data.reason || null,
      },
    });

    // Get shift location details for email
    let location = null;
    if (swapRequest.Shift.locationId) {
      location = await prisma.location.findUnique({
        where: { id: swapRequest.Shift.locationId },
      });
    }

    // Send notification to requester
    await sendShiftSwapRejectedEmail(
      {
        User: {
          name: requester.User.name || 'Employee',
          email: requester.User.email,
        },
      },
      {
        User: {
          name: requestingEmployee.User.name || 'Employee',
          email: requestingEmployee.User.email,
        },
      },
      {
        startTime: swapRequest.Shift.startTime,
        endTime: swapRequest.Shift.endTime,
        location,
        notes: swapRequest.Shift.notes,
        role: swapRequest.Shift.role,
      },
      data.reason || undefined
    );

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: requestingEmployee.id,
        metadata: {
          type: 'SHIFT_SWAP_REJECTED',
          swapRequestId: id,
          shiftId: swapRequest.shiftId,
          reason: data.reason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Swap request rejected successfully',
    });
  } catch (error) {
    console.error('Swap rejection error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to reject swap request' }, { status: 500 });
  }
}
