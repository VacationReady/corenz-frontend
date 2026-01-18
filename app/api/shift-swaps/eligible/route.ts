import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/app/lib/mobile-session';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get('shiftId');

    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 });
    }

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get the shift
    const shift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        companyId: requestingEmployee.companyId,
      },
      select: {
        id: true,
        employeeId: true,
        companyId: true,
        departmentId: true,
        startTime: true,
        endTime: true,
        requiredSkills: true,
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Verify ownership
    if (shift.employeeId !== requestingEmployee.id) {
      return NextResponse.json({ error: 'You can only swap your own shifts' }, { status: 403 });
    }

    // Find eligible employees
    // Criteria:
    // 1. Same company
    // 2. Same department (if shift has department)
    // 3. Not the requesting employee
    // 4. Active employee
    // 5. No conflicting shift at the same time

    const whereClause: any = {
      companyId: requestingEmployee.companyId,
      id: { not: requestingEmployee.id },
      status: 'ACTIVE',
    };

    // Optionally filter by department
    if (shift.departmentId) {
      whereClause.departmentId = shift.departmentId;
    }

    const potentialEmployees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
      },
    });

    // Filter out employees with conflicting shifts
    const eligibleEmployees = [];

    for (const emp of potentialEmployees) {
      const conflictingShift = await prisma.shift.findFirst({
        where: {
          employeeId: emp.id,
          OR: [
            {
              // Shift starts during the target shift
              startTime: {
                gte: shift.startTime,
                lt: shift.endTime,
              },
            },
            {
              // Shift ends during the target shift
              endTime: {
                gt: shift.startTime,
                lte: shift.endTime,
              },
            },
            {
              // Shift completely contains the target shift
              AND: [
                { startTime: { lte: shift.startTime } },
                { endTime: { gte: shift.endTime } },
              ],
            },
          ],
        },
      });

      if (!conflictingShift) {
        eligibleEmployees.push({
          id: emp.id,
          firstName: emp.User.firstName,
          lastName: emp.User.lastName,
          email: emp.User.email,
          profileImageUrl: emp.User.profileImageUrl,
          department: emp.Department?.name || null,
        });
      }
    }

    return NextResponse.json({
      employees: eligibleEmployees,
      total: eligibleEmployees.length,
    });
  } catch (error) {
    console.error('Eligible swap targets fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch eligible employees' }, { status: 500 });
  }
}
