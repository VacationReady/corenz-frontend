import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for adding managers
const addManagersSchema = z.object({
  employeeIds: z.array(z.string()).min(1, 'At least one employee ID is required'),
});

// GET /api/rota-groups/[id]/managers - List managers of a rota group
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

    const managers = await prisma.rotaGroupManager.findMany({
      where: {
        rotaGroupId: id,
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

    return NextResponse.json({ managers });
  } catch (error) {
    console.error('Error fetching rota group managers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch managers' },
      { status: 500 }
    );
  }
}

// POST /api/rota-groups/[id]/managers - Add manager(s) to rota group
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

    // Only ADMIN or SUPER_ADMIN can add managers to rota groups
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(requestingEmployee.User.role);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can add managers to rota groups' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = addManagersSchema.parse(body);

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

    // Verify all employees exist and belong to company
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: validatedData.employeeIds },
        companyId: requestingEmployee.companyId,
        isActive: true,
      },
    });

    if (employees.length !== validatedData.employeeIds.length) {
      return NextResponse.json(
        { error: 'One or more employees not found or inactive' },
        { status: 400 }
      );
    }

    // Create manager records
    const results = await Promise.all(
      employees.map(async (employee) => {
        return prisma.rotaGroupManager.upsert({
          where: {
            rotaGroupId_employeeId: {
              rotaGroupId: id,
              employeeId: employee.id,
            },
          },
          create: {
            rotaGroupId: id,
            employeeId: employee.id,
            addedBy: session.user.id,
          },
          update: {
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
          type: 'ROTA_GROUP_MANAGERS_ADDED',
          rotaGroupId: id,
          rotaGroupName: rotaGroup.name,
          addedEmployeeIds: validatedData.employeeIds,
          managerCount: results.length,
        },
      },
    });

    return NextResponse.json({ managers: results }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error adding managers to rota group:', error);
    return NextResponse.json(
      { error: 'Failed to add managers' },
      { status: 500 }
    );
  }
}
