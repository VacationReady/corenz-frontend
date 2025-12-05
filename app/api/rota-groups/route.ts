import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating/updating rota groups
const rotaGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  locationId: z.string().optional(),
  departmentId: z.string().optional(),
  roles: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  optionalTags: z.array(z.string()).default([]),
  color: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

// GET /api/rota-groups - List all rota groups for the company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const departmentId = searchParams.get('departmentId');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {
      companyId: session.user.companyId,
    };

    if (locationId) where.locationId = locationId;
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== null) where.isActive = isActive === 'true';

    const rotaGroups = await prisma.rotaGroup.findMany({
      where,
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
            ShiftRequirements: true,
          },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ rotaGroups });
  } catch (error) {
    console.error('Error fetching rota groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rota groups' },
      { status: 500 }
    );
  }
}

// POST /api/rota-groups - Create a new rota group
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = rotaGroupSchema.parse(body);

    // Check if group with same name already exists
    const existing = await prisma.rotaGroup.findUnique({
      where: {
        companyId_name: {
          companyId: session.user.companyId,
          name: validatedData.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A rota group with this name already exists' },
        { status: 400 }
      );
    }

    const rotaGroup = await prisma.rotaGroup.create({
      data: {
        ...validatedData,
        companyId: session.user.companyId,
      },
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

    return NextResponse.json({ rotaGroup }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating rota group:', error);
    return NextResponse.json(
      { error: 'Failed to create rota group' },
      { status: 500 }
    );
  }
}
