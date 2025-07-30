// /app/api/onboarding/instances/[employeeId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  const { employeeId } = params;

  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
  }

  try {
    // Find latest active onboarding instance for employee (could also filter for status === "active" only)
    const instance = await prisma.onboardingInstance.findFirst({
      where: { employeeId, status: { in: ['active', 'in_progress'] } },
      orderBy: { startedAt: 'desc' },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        template: {
          select: { name: true },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'No active onboarding found' }, { status: 404 });
    }

    return NextResponse.json(instance, { status: 200 });
  } catch (error) {
    console.error('Get onboarding instance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
