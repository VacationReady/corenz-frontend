import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for shift requirements
const shiftRequirementSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  role: z.string().min(1),
  quantity: z.number().min(1).default(1),
  priority: z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  breakDuration: z.number().min(0).default(30),
  isActive: z.boolean().default(true),
});

const batchRequirementsSchema = z.object({
  requirements: z.array(shiftRequirementSchema),
});

// GET /api/rota-groups/[id]/requirements - Get all requirements for a rota group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify rota group belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: session.user.companyId,
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dayOfWeek = searchParams.get('dayOfWeek');
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');

    const where: any = {
      rotaGroupId: id,
    };

    if (dayOfWeek !== null) where.dayOfWeek = parseInt(dayOfWeek);
    if (role) where.role = role;
    if (isActive !== null) where.isActive = isActive === 'true';

    const requirements = await prisma.shiftRequirement.findMany({
      where,
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
        { role: 'asc' },
      ],
    });

    return NextResponse.json({ requirements });
  } catch (error) {
    console.error('Error fetching shift requirements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requirements' },
      { status: 500 }
    );
  }
}

// POST /api/rota-groups/[id]/requirements - Create requirement(s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Support both single and batch creation
    let requirements: z.infer<typeof shiftRequirementSchema>[];
    if (Array.isArray(body.requirements)) {
      const validated = batchRequirementsSchema.parse(body);
      requirements = validated.requirements;
    } else {
      const validated = shiftRequirementSchema.parse(body);
      requirements = [validated];
    }

    // Verify rota group belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: session.user.companyId,
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    // Validate that roles exist in the rota group
    const invalidRoles = requirements
      .map(r => r.role)
      .filter(role => !rotaGroup.roles.includes(role));

    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { 
          error: 'One or more roles not defined in rota group',
          invalidRoles,
          availableRoles: rotaGroup.roles,
        },
        { status: 400 }
      );
    }

    // Create requirements
    const results = await Promise.all(
      requirements.map(async (req) => {
        return prisma.shiftRequirement.create({
          data: {
            ...req,
            companyId: session.user.companyId,
            rotaGroupId: id,
          },
        });
      })
    );

    return NextResponse.json({ requirements: results }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating shift requirements:', error);
    return NextResponse.json(
      { error: 'Failed to create requirements' },
      { status: 500 }
    );
  }
}

// DELETE /api/rota-groups/[id]/requirements - Delete all requirements (with optional filter)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify rota group belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id: id,
        companyId: session.user.companyId,
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dayOfWeek = searchParams.get('dayOfWeek');
    const role = searchParams.get('role');

    const where: any = {
      rotaGroupId: id,
    };

    if (dayOfWeek !== null) where.dayOfWeek = parseInt(dayOfWeek);
    if (role) where.role = role;

    await prisma.shiftRequirement.deleteMany({
      where,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift requirements:', error);
    return NextResponse.json(
      { error: 'Failed to delete requirements' },
      { status: 500 }
    );
  }
}
