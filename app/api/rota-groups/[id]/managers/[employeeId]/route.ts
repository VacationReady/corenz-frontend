import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// DELETE /api/rota-groups/[id]/managers/[employeeId] - Remove a manager from rota group
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

    // Only ADMIN or SUPER_ADMIN can remove managers from rota groups
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(requestingEmployee.User.role);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can remove managers from rota groups' },
        { status: 403 }
      );
    }

    // Verify rota group exists and belongs to company
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

    // Check if manager exists
    const manager = await prisma.rotaGroupManager.findUnique({
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
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    if (!manager) {
      return NextResponse.json(
        { error: 'Manager not found in this rota group' },
        { status: 404 }
      );
    }

    // Delete the manager record
    await prisma.rotaGroupManager.delete({
      where: {
        rotaGroupId_employeeId: {
          rotaGroupId: id,
          employeeId,
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
        entityId: id,
        metadata: {
          type: 'ROTA_GROUP_MANAGER_REMOVED',
          rotaGroupId: id,
          rotaGroupName: rotaGroup.name,
          removedEmployeeId: employeeId,
          removedEmployeeName: manager.Employee.User.name || manager.Employee.User.email,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing manager from rota group:', error);
    return NextResponse.json(
      { error: 'Failed to remove manager' },
      { status: 500 }
    );
  }
}
