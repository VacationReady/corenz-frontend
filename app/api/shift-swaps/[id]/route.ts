import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shift-swaps/[id]
 * Fetch single swap request with full details
 * Permission: Requester, target, or MANAGER/ADMIN
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: params.id },
      include: {
        Shift: {
          include: {
            Template: true,
          },
        },
      },
    });

    if (!swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
    }

    // Verify shift belongs to same company
    const shift = await prisma.shift.findUnique({
      where: { id: swapRequest.shiftId },
    });

    if (!shift || shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isRequester = swapRequest.requesterId === requestingEmployee.id;
    const isTarget = swapRequest.targetEmployeeId === requestingEmployee.id;

    if (!isAdminOrManager && !isRequester && !isTarget) {
      return NextResponse.json({ error: 'Unauthorized to view this swap request' }, { status: 403 });
    }

    // Get employee details
    const employeeIds = [swapRequest.requesterId];
    if (swapRequest.targetEmployeeId) employeeIds.push(swapRequest.targetEmployeeId);
    if (swapRequest.managerApprovedBy) employeeIds.push(swapRequest.managerApprovedBy);

    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
            profileImageUrl: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
      },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Get location details if applicable
    let location = null;
    if (shift.locationId) {
      location = await prisma.location.findUnique({
        where: { id: shift.locationId },
        select: {
          id: true,
          name: true,
        },
      });
    }

    return NextResponse.json({
      swapRequest: {
        ...swapRequest,
        requester: employeeMap.get(swapRequest.requesterId),
        targetEmployee: swapRequest.targetEmployeeId
          ? employeeMap.get(swapRequest.targetEmployeeId)
          : null,
        managerApprover: swapRequest.managerApprovedBy
          ? employeeMap.get(swapRequest.managerApprovedBy)
          : null,
        Shift: {
          ...swapRequest.Shift,
          location,
        },
      },
    });
  } catch (error) {
    console.error('Swap request fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch swap request' }, { status: 500 });
  }
}

/**
 * DELETE /api/shift-swaps/[id]
 * Cancel swap request (only by requester, only if PENDING)
 * Permission: Requester only
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: params.id },
    });

    if (!swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
    }

    // Verify requester owns the swap request
    if (swapRequest.requesterId !== requestingEmployee.id) {
      return NextResponse.json(
        { error: 'Only the requester can cancel a swap request' },
        { status: 403 }
      );
    }

    // Can only cancel pending requests
    if (swapRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only cancel pending swap requests' },
        { status: 400 }
      );
    }

    // Update status to CANCELLED
    await prisma.shiftSwapRequest.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
      },
    });

    // Create audit log
    const shift = await prisma.shift.findUnique({
      where: { id: swapRequest.shiftId },
    });

    if (shift) {
      await prisma.globalAuditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random()}`,
          actorId: session.user.id,
          companyId: requestingEmployee.companyId,
          action: 'DELETED',
          entityType: 'EMPLOYEE',
          entityId: requestingEmployee.id,
          metadata: {
            type: 'SHIFT_SWAP_CANCELLED',
            swapRequestId: params.id,
            shiftId: swapRequest.shiftId,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Swap request cancelled successfully',
    });
  } catch (error) {
    console.error('Swap request cancellation error:', error);
    return NextResponse.json({ error: 'Failed to cancel swap request' }, { status: 500 });
  }
}
