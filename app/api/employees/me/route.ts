import { NextRequest, NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/employees/me
 * Get current logged-in employee record
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getMobileSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            dateOfBirth: true,
            profileImageUrl: true,
            pronouns: true,
            addressStreet: true,
            addressCity: true,
            addressPostcode: true,
            addressCountry: true,
            genderOptionId: true,
            nationalId: true,
          },
        },
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
        JobRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Get current employee error:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}
