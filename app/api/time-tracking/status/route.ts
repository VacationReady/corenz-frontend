import { NextRequest, NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma, ensurePrismaConnected } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Ensure Prisma connection is established before operations
    await ensurePrismaConnected();
    
    const session = await getMobileSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Find active clock entry
    const activeEntry = await prisma.clockEntry.findFirst({
      where: {
        employeeId: employee.id,
        status: 'ACTIVE',
      },
      orderBy: {
        clockInTime: 'desc',
      },
    });

    if (!activeEntry) {
      return NextResponse.json({
        isClockedIn: false,
        activeEntry: null,
      });
    }

    // Calculate duration
    const now = new Date();
    const duration = now.getTime() - activeEntry.clockInTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    return NextResponse.json({
      isClockedIn: true,
      activeEntry,
      duration: {
        hours,
        minutes,
        totalMinutes: Math.floor(duration / (1000 * 60)),
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Failed to get clock status' }, { status: 500 });
  }
}
