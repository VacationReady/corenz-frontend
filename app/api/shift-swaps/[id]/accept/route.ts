import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  sendShiftSwapAcceptedEmail,
  sendManagerApprovalNeededEmail,
  sendShiftSwapApprovedEmail,
} from '@/lib/shift-swap-emails';

const acceptSwapSchema = z.object({
  offerShiftId: z.string().optional().nullable(),
});

/**
 * POST /api/shift-swaps/[id]/accept
 * Employee accepts swap request
 * Permission: Target employee or anyone if targetEmployeeId is null
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await req.json();
    const data = acceptSwapSchema.parse(body);

    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
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

    // Verify requester is the target or target is null (open swap)
    if (swapRequest.targetEmployeeId && swapRequest.targetEmployeeId !== requestingEmployee.id) {
      return NextResponse.json(
        { error: 'This swap request is not for you' },
        { status: 403 }
      );
    }

    // Verify accepting employee is not the requester
    if (swapRequest.requesterId === requestingEmployee.id) {
      return NextResponse.json(
        { error: 'Cannot accept your own swap request' },
        { status: 400 }
      );
    }

    // Verify shift is still in the future
    if (swapRequest.Shift.startTime < new Date()) {
      return NextResponse.json(
        { error: 'Cannot accept swap for a shift that has already started' },
        { status: 400 }
      );
    }

    // Get requester details
    const requester = await prisma.employee.findUnique({
      where: { id: swapRequest.requesterId },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
        Department: true,
      },
    });

    if (!requester) {
      return NextResponse.json({ error: 'Requester not found' }, { status: 404 });
    }

    // Get shift location details for emails
    let location = null;
    if (swapRequest.Shift.locationId) {
      location = await prisma.location.findUnique({
        where: { id: swapRequest.Shift.locationId },
      });
    }

    // Check if manager approval is required
    if (swapRequest.managerApprovalRequired) {
      // Update status to MANAGER_PENDING
      await prisma.shiftSwapRequest.update({
        where: { id: id },
        data: {
          status: 'MANAGER_PENDING',
          acceptedAt: new Date(),
          // Store accepting employee ID in targetEmployeeId if it was null
          targetEmployeeId: swapRequest.targetEmployeeId || requestingEmployee.id,
        },
      });

      // Find manager to notify
      // First try department manager, then any manager/admin in the company
      let managerEmail = null;
      let managerName = null;

      if (requestingEmployee.departmentId) {
        const department = await prisma.department.findUnique({
          where: { id: requestingEmployee.departmentId },
          include: {
            User_Department_headIdToUser: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        });

        if (department?.User_Department_headIdToUser) {
          managerEmail = department.User_Department_headIdToUser.email;
          managerName = department.User_Department_headIdToUser.name || 'Manager';
        }
      }

      // Fallback to any admin/manager in the company
      if (!managerEmail) {
        const manager = await prisma.user.findFirst({
          where: {
            role: { in: ['ADMIN', 'MANAGER'] },
            Employee: {
              companyId: requestingEmployee.companyId,
            },
          },
          include: {
            Employee: true,
          },
        });

        if (manager) {
          managerEmail = manager.email;
          managerName = manager.name;
        }
      }

      // Send manager approval notification
      if (managerEmail && managerName) {
        await sendManagerApprovalNeededEmail(
          managerEmail,
          managerName,
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
            location: location || undefined,
            notes: swapRequest.Shift.notes || undefined,
            role: swapRequest.Shift.role || undefined,
          }
        );
      }

      // Send notification to requester
      await sendShiftSwapAcceptedEmail(
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
          location: location || undefined,
          notes: swapRequest.Shift.notes || undefined,
          role: swapRequest.Shift.role || undefined,
        },
        true // requiresManagerApproval
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
            type: 'SHIFT_SWAP_ACCEPTED',
            swapRequestId: id,
            shiftId: swapRequest.shiftId,
            status: 'MANAGER_PENDING',
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Swap request accepted. Waiting for manager approval.',
        status: 'MANAGER_PENDING',
      });
    } else {
      // No manager approval needed - swap shifts immediately
      await prisma.shift.update({
        where: { id: swapRequest.shiftId },
        data: {
          employeeId: requestingEmployee.id,
        },
      });

      // Update swap request
      await prisma.shiftSwapRequest.update({
        where: { id: id },
        data: {
          status: 'COMPLETED',
          acceptedAt: new Date(),
          targetEmployeeId: swapRequest.targetEmployeeId || requestingEmployee.id,
        },
      });

      // Send confirmation emails to both employees
      await sendShiftSwapAcceptedEmail(
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
          location: location || undefined,
          notes: swapRequest.Shift.notes || undefined,
          role: swapRequest.Shift.role || undefined,
        },
        false // No manager approval required
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
            type: 'SHIFT_SWAP_COMPLETED',
            swapRequestId: id,
            shiftId: swapRequest.shiftId,
            fromEmployeeId: swapRequest.requesterId,
            toEmployeeId: requestingEmployee.id,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Swap request accepted and shift reassigned successfully.',
        status: 'COMPLETED',
      });
    }
  } catch (error) {
    console.error('Swap acceptance error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to accept swap request' }, { status: 500 });
  }
}
