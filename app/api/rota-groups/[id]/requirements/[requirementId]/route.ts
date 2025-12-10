import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// DELETE /api/rota-groups/[id]/requirements/[requirementId] - Delete single requirement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requirementId: string }> }
) {
  try {
    const { id, requirementId } = await params;
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

    // Only ADMIN or MANAGER can delete shift requirements
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to delete shift requirements' },
        { status: 403 }
      );
    }

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

    // Get the requirement before deleting for audit log
    const requirement = await prisma.shiftRequirement.findUnique({
      where: {
        id: requirementId,
        rotaGroupId: id,
      },
    });

    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }

    // Delete the requirement
    await prisma.shiftRequirement.delete({
      where: {
        id: requirementId,
        rotaGroupId: id,
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
        entityId: requirementId,
        metadata: {
          type: 'SHIFT_REQUIREMENT_DELETED',
          rotaGroupId: id,
          rotaGroupName: rotaGroup.name,
          requirementId: requirementId,
          role: requirement.role,
          dayOfWeek: requirement.dayOfWeek,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift requirement:', error);
    return NextResponse.json(
      { error: 'Failed to delete requirement' },
      { status: 500 }
    );
  }
}
