import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating rota groups
const updateRotaGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  locationId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  optionalTags: z.array(z.string()).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
  managerIds: z.array(z.string()).optional(), // Employee IDs who can manage this group
});

// GET /api/rota-groups/[id] - Get single rota group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id,
        companyId: requestingEmployee.companyId,
      },
      include: {
        Location: {
          select: { id: true, name: true },
        },
        Department: {
          select: { id: true, name: true },
        },
        Members: {
          where: { isActive: true },
          include: {
            Employee: {
              include: {
                User: {
                  select: { name: true, email: true },
                },
              },
            },
          },
          orderBy: {
            addedAt: 'desc',
          },
        },
        Managers: {
          include: {
            Employee: {
              include: {
                User: {
                  select: { id: true, name: true, email: true, profileImageUrl: true },
                },
                Location: {
                  select: { id: true, name: true },
                },
                Department: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: {
            addedAt: 'desc',
          },
        },
        _count: {
          select: {
            Members: true,
            Managers: true,
            Shifts: true,
            ShiftRequirements: true,
          },
        },
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    // Non-admin/manager users can only view rota groups they are members of OR managers of
    if (!isAdminOrManager) {
      const [membership, managerRecord] = await Promise.all([
        prisma.rotaGroupMember.findUnique({
          where: {
            rotaGroupId_employeeId: {
              rotaGroupId: id,
              employeeId: requestingEmployee.id,
            },
          },
        }),
        prisma.rotaGroupManager.findUnique({
          where: {
            rotaGroupId_employeeId: {
              rotaGroupId: id,
              employeeId: requestingEmployee.id,
            },
          },
        }),
      ]);

      const isMember = membership && membership.isActive;
      const isGroupManager = !!managerRecord;

      if (!isMember && !isGroupManager) {
        return NextResponse.json(
          { error: 'You do not have permission to view this rota group' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ rotaGroup });
  } catch (error) {
    console.error('Error fetching rota group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rota group' },
      { status: 500 }
    );
  }
}

// PUT /api/rota-groups/[id] - Update rota group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Only ADMIN or MANAGER can update rota groups
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to update rota groups' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateRotaGroupSchema.parse(body);

    // Verify ownership
    const existing = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: requestingEmployee.companyId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    // If name is being changed, check for duplicates
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.rotaGroup.findUnique({
        where: {
          companyId_name: {
            companyId: requestingEmployee.companyId,
            name: validatedData.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A rota group with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Extract managerIds before updating the group (only admins can update managers)
    const { managerIds, ...groupData } = validatedData;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(requestingEmployee.User.role);

    const rotaGroup = await prisma.rotaGroup.update({
      where: { id: id },
      data: groupData,
      include: {
        Location: {
          select: { id: true, name: true },
        },
        Department: {
          select: { id: true, name: true },
        },
        Managers: {
          include: {
            Employee: {
              include: {
                User: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            Members: true,
            Managers: true,
            Shifts: true,
          },
        },
      },
    });

    // Update managers if provided (only admins can do this)
    if (isAdmin && managerIds !== undefined) {
      // Get current managers
      const currentManagers = await prisma.rotaGroupManager.findMany({
        where: { rotaGroupId: id },
        select: { employeeId: true },
      });
      const currentManagerIds = currentManagers.map((m) => m.employeeId);

      // Determine additions and removals
      const toAdd = managerIds.filter((empId) => !currentManagerIds.includes(empId));
      const toRemove = currentManagerIds.filter((empId) => !managerIds.includes(empId));

      // Verify employees to add exist and belong to company
      if (toAdd.length > 0) {
        const employees = await prisma.employee.findMany({
          where: {
            id: { in: toAdd },
            companyId: requestingEmployee.companyId,
            isActive: true,
          },
        });

        if (employees.length > 0) {
          await prisma.rotaGroupManager.createMany({
            data: employees.map((emp) => ({
              rotaGroupId: id,
              employeeId: emp.id,
              addedBy: session.user.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Remove managers
      if (toRemove.length > 0) {
        await prisma.rotaGroupManager.deleteMany({
          where: {
            rotaGroupId: id,
            employeeId: { in: toRemove },
          },
        });
      }
    }

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: rotaGroup.id,
        metadata: {
          type: 'ROTA_GROUP_UPDATED',
          rotaGroupId: rotaGroup.id,
          name: rotaGroup.name,
          changes: validatedData,
        },
      },
    });

    return NextResponse.json({ rotaGroup });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating rota group:', error);
    return NextResponse.json(
      { error: 'Failed to update rota group' },
      { status: 500 }
    );
  }
}

// DELETE /api/rota-groups/[id] - Delete rota group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Only ADMIN or MANAGER can delete rota groups
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to delete rota groups' },
        { status: 403 }
      );
    }

    // Verify ownership
    const existing = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: requestingEmployee.companyId,
      },
      include: {
        _count: {
          select: {
            Shifts: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    // Check if there are active shifts
    if (existing._count.Shifts > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete rota group with active shifts. Please delete or reassign shifts first.',
          shiftCount: existing._count.Shifts,
        },
        { status: 400 }
      );
    }

    await prisma.rotaGroup.delete({
      where: { id: id },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'DELETED',
        entityType: 'EMPLOYEE',
        entityId: id,
        metadata: {
          type: 'ROTA_GROUP_DELETED',
          rotaGroupId: id,
          name: existing.name,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rota group:', error);
    return NextResponse.json(
      { error: 'Failed to delete rota group' },
      { status: 500 }
    );
  }
}
