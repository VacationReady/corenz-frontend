import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendShiftSwapRequestEmail } from '@/lib/shift-swap-emails';

const createSwapSchema = z.object({
  shiftId: z.string(),
  targetEmployeeId: z.string().optional().nullable(),
  requestMessage: z.string().optional().nullable(),
});

/**
 * GET /api/shift-swaps
 * List shift swap requests
 * Permission: Employees see their own swaps, MANAGER/ADMIN see all company swaps
 */
export async function GET(req: NextRequest) {
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

    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any;
    const requesterId = searchParams.get('requesterId');
    const targetEmployeeId = searchParams.get('targetEmployeeId');

    // Build filter
    const where: any = {};

    // Scope to company
    where.Shift = {
      companyId: requestingEmployee.companyId,
    };

    // If not admin/manager, only show swaps involving this employee
    if (!isAdminOrManager) {
      where.OR = [
        { requesterId: requestingEmployee.id },
        { targetEmployeeId: requestingEmployee.id },
        { targetEmployeeId: null }, // Open swap requests
      ];
    }

    // Apply filters
    if (status) {
      where.status = status;
    }

    if (requesterId) {
      where.requesterId = requesterId;
    }

    if (targetEmployeeId) {
      where.targetEmployeeId = targetEmployeeId;
    }

    const swapRequests = await prisma.shiftSwapRequest.findMany({
      where,
      include: {
        Shift: {
          include: {
            Template: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get employee details for requester and target
    const employeeIds = new Set<string>();
    swapRequests.forEach((swap) => {
      employeeIds.add(swap.requesterId);
      if (swap.targetEmployeeId) employeeIds.add(swap.targetEmployeeId);
      if (swap.managerApprovedBy) employeeIds.add(swap.managerApprovedBy);
    });

    const employees = await prisma.employee.findMany({
      where: {
        id: { in: Array.from(employeeIds) },
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

    // Enrich swap requests with employee data
    const enrichedSwaps = swapRequests.map((swap) => ({
      ...swap,
      requester: employeeMap.get(swap.requesterId),
      targetEmployee: swap.targetEmployeeId ? employeeMap.get(swap.targetEmployeeId) : null,
      managerApprover: swap.managerApprovedBy ? employeeMap.get(swap.managerApprovedBy) : null,
    }));

    return NextResponse.json({
      swapRequests: enrichedSwaps,
      total: enrichedSwaps.length,
    });
  } catch (error) {
    console.error('Shift swap list error:', error);
    return NextResponse.json({ error: 'Failed to fetch swap requests' }, { status: 500 });
  }
}

/**
 * POST /api/shift-swaps
 * Create shift swap request
 * Permission: Employees can swap their own shifts
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createSwapSchema.parse(body);

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

    // Verify shift exists and belongs to requester
    const shift = await prisma.shift.findUnique({
      where: { id: data.shiftId },
      include: {
        Template: true,
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Check company scoping
    if (shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify requester owns the shift
    if (shift.employeeId !== requestingEmployee.id) {
      return NextResponse.json(
        { error: 'You can only swap your own shifts' },
        { status: 403 }
      );
    }

    // Verify shift is published
    if (!shift.isPublished) {
      return NextResponse.json(
        { error: 'Cannot swap unpublished shifts' },
        { status: 400 }
      );
    }

    // Verify shift is not in the past
    if (shift.startTime < new Date()) {
      return NextResponse.json(
        { error: 'Cannot swap shifts that have already started' },
        { status: 400 }
      );
    }

    // If target specified, verify they exist and are not the requester
    let targetEmployee = null;
    if (data.targetEmployeeId) {
      if (data.targetEmployeeId === requestingEmployee.id) {
        return NextResponse.json(
          { error: 'Cannot swap with yourself' },
          { status: 400 }
        );
      }

      // ✅ SECURITY: Validate company upfront in the query
      targetEmployee = await prisma.employee.findFirst({
        where: { 
          id: data.targetEmployeeId,
          companyId: requestingEmployee.companyId  // Tenant isolation
        },
        include: {
          User: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!targetEmployee) {
        // Don't reveal if employee exists in another company - return generic 404
        return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });
      }
    }

    // Check for existing pending swap for this shift
    const existingSwap = await prisma.shiftSwapRequest.findFirst({
      where: {
        shiftId: data.shiftId,
        status: {
          in: ['PENDING', 'MANAGER_PENDING'],
        },
      },
    });

    if (existingSwap) {
      return NextResponse.json(
        { error: 'A swap request for this shift is already pending' },
        { status: 400 }
      );
    }

    // Get time tracking settings for manager approval requirement
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    const requiresManagerApproval = settings?.managerApprovalSwaps ?? true;

    // Create swap request
    const swapRequest = await prisma.shiftSwapRequest.create({
      data: {
        shiftId: data.shiftId,
        requesterId: requestingEmployee.id,
        targetEmployeeId: data.targetEmployeeId || null,
        requestMessage: data.requestMessage || null,
        status: 'PENDING',
        managerApprovalRequired: requiresManagerApproval,
      },
      include: {
        Shift: {
          include: {
            Template: true,
          },
        },
      },
    });

    // Send notification to target employee (or broadcast if no target)
    if (targetEmployee) {
      await sendShiftSwapRequestEmail(
        targetEmployee as any,
        {
          User: {
            name: requestingEmployee.User.name || 'Employee',
            email: requestingEmployee.User.email,
          },
        },
        {
          startTime: shift.startTime,
          endTime: shift.endTime,
          // ✅ SECURITY: Include company validation for defense-in-depth
          location: shift.locationId
            ? await prisma.location.findFirst({ 
                where: { 
                  id: shift.locationId,
                  companyId: requestingEmployee.companyId 
                } 
              })
            : null,
          notes: shift.notes,
          role: shift.role,
        },
        data.requestMessage || undefined
      );
    }

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'CREATED',
        entityType: 'EMPLOYEE',
        entityId: requestingEmployee.id,
        metadata: {
          type: 'SHIFT_SWAP_REQUESTED',
          swapRequestId: swapRequest.id,
          shiftId: data.shiftId,
          targetEmployeeId: data.targetEmployeeId,
          message: data.requestMessage,
        },
      },
    });

    return NextResponse.json({
      success: true,
      swapRequest: {
        ...swapRequest,
        requester: requestingEmployee,
        targetEmployee,
      },
      message: 'Shift swap request created successfully',
    });
  } catch (error) {
    console.error('Shift swap creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create swap request' }, { status: 500 });
  }
}
