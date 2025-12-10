import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for adding members
const addMemberSchema = z.object({
  employeeId: z.string(),
  assignedRoles: z.array(z.string()).default([]),
  assignedSkills: z.array(z.string()).default([]),
});

const addMultipleMembersSchema = z.object({
  members: z.array(addMemberSchema),
});

// GET /api/rota-groups/[id]/members - List members of a rota group
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

    // Non-admin/manager users can only view members if they are a member themselves
    if (!isAdminOrManager) {
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
          { error: 'You do not have permission to view this rota group\'s members' },
          { status: 403 }
        );
      }
    }

    const members = await prisma.rotaGroupMember.findMany({
      where: {
        rotaGroupId: id,
        isActive: true,
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
            Location: {
              select: {
                id: true,
                name: true,
              },
            },
            Department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching rota group members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/rota-groups/[id]/members - Add member(s) to rota group
export async function POST(
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

    // Only ADMIN or MANAGER can add members to rota groups
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to add members to rota groups' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Support both single member and batch addition
    let members: z.infer<typeof addMemberSchema>[];
    if (Array.isArray(body.members)) {
      const validated = addMultipleMembersSchema.parse(body);
      members = validated.members;
    } else {
      const validated = addMemberSchema.parse(body);
      members = [validated];
    }

    // Verify rota group exists and belongs to company
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

    // Verify all employees exist and belong to company
    const employeeIds = members.map(m => m.employeeId);
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        companyId: requestingEmployee.companyId,
        isActive: true,
      },
    });

    if (employees.length !== employeeIds.length) {
      return NextResponse.json(
        { error: 'One or more employees not found or inactive' },
        { status: 400 }
      );
    }

    // Create or update memberships
    const results = await Promise.all(
      members.map(async (member) => {
        return prisma.rotaGroupMember.upsert({
          where: {
            rotaGroupId_employeeId: {
              rotaGroupId: id,
              employeeId: member.employeeId,
            },
          },
          create: {
            rotaGroupId: id,
            employeeId: member.employeeId,
            assignedRoles: member.assignedRoles,
            assignedSkills: member.assignedSkills,
            isActive: true,
            addedBy: session.user.id,
          },
          update: {
            assignedRoles: member.assignedRoles,
            assignedSkills: member.assignedSkills,
            isActive: true,
            addedBy: session.user.id,
          },
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
      })
    );

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
          type: 'ROTA_GROUP_MEMBERS_ADDED',
          rotaGroupId: id,
          rotaGroupName: rotaGroup.name,
          addedEmployeeIds: employeeIds,
          memberCount: results.length,
        },
      },
    });

    return NextResponse.json({ members: results }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error adding members to rota group:', error);
    return NextResponse.json(
      { error: 'Failed to add members' },
      { status: 500 }
    );
  }
}
