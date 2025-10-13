import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating member
const updateMemberSchema = z.object({
  assignedRoles: z.array(z.string()),
  isActive: z.boolean().optional(),
});

// GET /api/rota-groups/[id]/members/[employeeId] - Get single member
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; employeeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify rota group belongs to company
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

    const member = await prisma.rotaGroupMember.findUnique({
      where: {
        rotaGroupId_employeeId: {
          rotaGroupId: params.id,
          employeeId: params.employeeId,
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
                image: true,
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
  { params }: { params: { id: string; employeeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    // Verify rota group belongs to company
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

    const member = await prisma.rotaGroupMember.update({
      where: {
        rotaGroupId_employeeId: {
          rotaGroupId: params.id,
          employeeId: params.employeeId,
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
  { params }: { params: { id: string; employeeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify rota group belongs to company
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

    // Check if employee has upcoming shifts in this group
    const upcomingShifts = await prisma.shift.count({
      where: {
        rotaGroupId: params.id,
        employeeId: params.employeeId,
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
          rotaGroupId: params.id,
          employeeId: params.employeeId,
        },
      },
      data: {
        isActive: false,
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
