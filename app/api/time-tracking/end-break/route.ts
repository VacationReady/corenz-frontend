import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const endBreakSchema = z.object({
  breakId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = endBreakSchema.parse(body);

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

    // Find the break record
    const breakRecord = await prisma.breakRecord.findFirst({
      where: {
        id: data.breakId,
        employeeId: employee.id,
        endTime: null,
      },
    });

    if (!breakRecord) {
      return NextResponse.json(
        { error: 'Break record not found or already ended' },
        { status: 404 }
      );
    }

    // Calculate duration in minutes
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - breakRecord.startTime.getTime()) / 1000 / 60);

    // Update break record
    const updatedBreak = await prisma.breakRecord.update({
      where: { id: data.breakId },
      data: {
        endTime,
        duration,
      },
    });

    return NextResponse.json({
      success: true,
      breakRecord: updatedBreak,
      message: 'Break ended successfully',
      duration: {
        minutes: duration,
        formatted: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      },
    });
  } catch (error) {
    console.error('End break error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to end break' }, { status: 500 });
  }
}
