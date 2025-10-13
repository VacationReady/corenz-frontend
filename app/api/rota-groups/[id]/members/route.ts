import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for adding members
const addMemberSchema = z.object({
  employeeId: z.string(),
  assignedRoles: z.array(z.string()).default([]),
});

const addMultipleMembersSchema = z.object({
  members: z.array(addMemberSchema),
});

// GET /api/rota-groups/[id]/members - List members of a rota group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify rota group exists and belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    const members = await prisma.rotaGroupMember.findMany({
      where: {
        rotaGroupId: params.id,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        id: params.id,
        companyId: session.user.companyId,
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
        companyId: session.user.companyId,
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
              rotaGroupId: params.id,
              employeeId: member.employeeId,
            },
          },
          create: {
            rotaGroupId: params.id,
            employeeId: member.employeeId,
            assignedRoles: member.assignedRoles,
            isActive: true,
            addedBy: session.user.id,
          },
          update: {
            assignedRoles: member.assignedRoles,
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
