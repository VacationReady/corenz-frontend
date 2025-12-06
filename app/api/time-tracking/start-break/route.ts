import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const startBreakSchema = z.object({
  entryId: z.string().optional(),
  breakType: z.enum(['MEAL_BREAK', 'REST_BREAK', 'UNPAID_BREAK']).default('REST_BREAK'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = startBreakSchema.parse(body);

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // If entryId is provided, verify it belongs to this employee
    // Otherwise, find the active clock entry
    let clockEntry;
    if (data.entryId) {
      clockEntry = await prisma.clockEntry.findFirst({
        where: {
          id: data.entryId,
          employeeId: employee.id,
          status: 'ACTIVE',
        },
      });
    } else {
      clockEntry = await prisma.clockEntry.findFirst({
        where: {
          employeeId: employee.id,
          status: 'ACTIVE',
        },
        orderBy: {
          clockInTime: 'desc',
        },
      });
    }

    if (!clockEntry) {
      return NextResponse.json(
        { error: 'No active clock entry found. Please clock in first.' },
        { status: 400 }
      );
    }

    // Check if there's already an active break
    const activeBreak = await prisma.breakRecord.findFirst({
      where: {
        employeeId: employee.id,
        endTime: null,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (activeBreak) {
      return NextResponse.json(
        { error: 'You already have an active break. Please end it first.' },
        { status: 400 }
      );
    }

    // Create break record
    const breakRecord = await prisma.breakRecord.create({
      data: {
        employeeId: employee.id,
        companyId: employee.companyId,
        breakType: data.breakType,
        startTime: new Date(),
        isPaid: data.breakType === 'REST_BREAK', // Rest breaks are typically paid
      },
    });

    return NextResponse.json({
      success: true,
      breakRecord,
      message: 'Break started successfully',
    });
  } catch (error) {
    console.error('Start break error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to start break' }, { status: 500 });
  }
}
