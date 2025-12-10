import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating member
const updateMemberSchema = z.object({
  assignedRoles: z.array(z.string()).optional(),
  assignedSkills: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/rota-groups/[id]/members/[employeeId] - Get single member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; employeeId: string }> }
) {
  try {
    const { id, employeeId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get requesting user's employee record with role
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

    // Verify rota group belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id,
        companyId: requestingEmployee.companyId,
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    // Non-admin/manager users can only view their own membership or if they are a member
    if (!isAdminOrManager && employeeId !== requestingEmployee.id) {
      const membership = await prisma.rotaGroupMember.findUnique({
        where: {
          rotaGroupId_employeeId: {
            rotaGroupId: id,
            employeeId: requestingEmployee.id,
          },
        },
      });

      if (!membership || !membership.isActive) {
        return NextResponse.json(
          { error: 'You do not have permission to view this member' },
          { status: 403 }
        );
      }
    }

    const member = await prisma.rotaGroupMember.findUnique({
      where: {
        rotaGroupId_employeeId: {
          rotaGroupId: id,
          employeeId,
        },
      },
      include: {
        Employee: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

// PUT /api/rota-groups/[id]/members/[employeeId] - Update member roles
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; employeeId: string }> }
) {
  try {
    const { id, employeeId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get requesting user's employee record with role
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

    // Only ADMIN or MANAGER can update member roles
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to update member roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    // Verify rota group belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: requestingEmployee.companyId,
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    const member = await prisma.rotaGroupMember.update({
      where: {
        rotaGroupId_employeeId: {
          rotaGroupId: id,
          employeeId: employeeId,
        },
      },
      data: validatedData,
      include: {
        Employee: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        metadata: {
          type: 'ROTA_GROUP_MEMBER_UPDATED',
          rotaGroupId: id,
          rotaGroupName: rotaGroup.name,
          employeeId: employeeId,
          changes: validatedData,
        },
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE /api/rota-groups/[id]/members/[employeeId] - Remove member from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; employeeId: string }> }
) {
  try {
    const { id, employeeId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get requesting user's employee record with role
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

    // Only ADMIN or MANAGER can remove members from rota groups
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to remove members from rota groups' },
        { status: 403 }
      );
    }

    // Verify rota group belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: requestingEmployee.companyId,
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    // Check if employee has upcoming shifts in this group
    const upcomingShifts = await prisma.shift.count({
      where: {
        rotaGroupId: id,
        employeeId: employeeId,
        startTime: {
          gte: new Date(),
        },
      },
    });

    if (upcomingShifts > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot remove member with upcoming shifts. Please reassign shifts first.',
          upcomingShifts,
        },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.rotaGroupMember.update({
      where: {
        rotaGroupId_employeeId: {
          rotaGroupId: id,
          employeeId: employeeId,
        },
      },
      data: {
        isActive: false,
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'DELETED',
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        metadata: {
          type: 'ROTA_GROUP_MEMBER_REMOVED',
          rotaGroupId: id,
          rotaGroupName: rotaGroup.name,
          employeeId: employeeId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
