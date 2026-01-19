import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendShiftSwapApprovedEmail } from '@/lib/shift-swap-emails';

const approveSwapSchema = z.object({
  comments: z.string().optional().nullable(),
});

/**
 * POST /api/shift-swaps/[id]/approve
 * Manager approves swap
 * Permission: MANAGER/ADMIN only
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
    const data = approveSwapSchema.parse(body);

    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            role: true,
            name: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Verify requester is MANAGER/ADMIN
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'Only managers and admins can approve swap requests' },
        { status: 403 }
      );
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

    // Verify swap is MANAGER_PENDING
    if (swapRequest.status !== 'MANAGER_PENDING') {
      return NextResponse.json(
        { error: 'This swap request is not awaiting manager approval' },
        { status: 400 }
      );
    }

    // Verify targetEmployeeId is set (should be set when swap was accepted)
    if (!swapRequest.targetEmployeeId) {
      return NextResponse.json(
        { error: 'Invalid swap request: no target employee' },
        { status: 400 }
      );
    }

    // Get requester and accepting employee details
    const [requester, acceptingEmployee] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: swapRequest.requesterId },
        include: {
          User: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.employee.findUnique({
        where: { id: swapRequest.targetEmployeeId },
        include: {
          User: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    if (!requester || !acceptingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Swap the shift assignment
    await prisma.shift.update({
      where: { id: swapRequest.shiftId },
      data: {
        employeeId: acceptingEmployee.id,
      },
    });

    // Update swap request status
    await prisma.shiftSwapRequest.update({
      where: { id: id },
      data: {
        status: 'APPROVED',
        managerApprovedBy: requestingEmployee.id,
        managerApprovedAt: new Date(),
        responseMessage: data.comments || null,
      },
    });

    // Get shift location details for email
    let location = null;
    if (swapRequest.Shift.locationId) {
      location = await prisma.location.findUnique({
        where: { id: swapRequest.Shift.locationId },
      });
    }

    // Send confirmation emails to both employees
    await sendShiftSwapApprovedEmail(
      {
        User: {
          name: requester.User.name || 'Employee',
          email: requester.User.email,
        },
      },
      {
        User: {
          name: acceptingEmployee.User.name || 'Employee',
          email: acceptingEmployee.User.email,
        },
      },
      {
        startTime: swapRequest.Shift.startTime,
        endTime: swapRequest.Shift.endTime,
        location: location || undefined,
        notes: swapRequest.Shift.notes || undefined,
        role: swapRequest.Shift.role || undefined,
      },
      requestingEmployee.User.name || 'Manager'
    );

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: swapRequest.shiftId,
        metadata: {
          type: 'SHIFT_SWAP_APPROVED',
          swapRequestId: id,
          shiftId: swapRequest.shiftId,
          fromEmployeeId: swapRequest.requesterId,
          toEmployeeId: acceptingEmployee.id,
          approvedBy: requestingEmployee.User.name,
          comments: data.comments,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Swap request approved and shift reassigned successfully',
    });
  } catch (error) {
    console.error('Swap approval error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to approve swap request' }, { status: 500 });
  }
}
