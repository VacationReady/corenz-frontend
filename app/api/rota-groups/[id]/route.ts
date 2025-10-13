import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
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
});

// GET /api/rota-groups/[id] - Get single rota group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id,
        companyId: session.user.companyId,
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
        _count: {
          select: {
            Members: true,
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateRotaGroupSchema.parse(body);

    // Verify ownership
    const existing = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: session.user.companyId,
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
            companyId: session.user.companyId,
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

    const rotaGroup = await prisma.rotaGroup.update({
      where: { id: id },
      data: validatedData,
      include: {
        Location: {
          select: { id: true, name: true },
        },
        Department: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            Members: true,
            Shifts: true,
          },
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: session.user.companyId,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rota group:', error);
    return NextResponse.json(
      { error: 'Failed to delete rota group' },
      { status: 500 }
    );
  }
}
