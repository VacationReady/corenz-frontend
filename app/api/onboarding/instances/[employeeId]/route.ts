import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Map Prisma enum values -> UI-friendly step types
const mapStepType = (type: string) => {
  switch (type) {
    case 'ACKNOWLEDGE_DOCUMENT': return 'acknowledge-document';
    case 'UPLOAD_DOCUMENT': return 'upload-document';
    case 'INSTRUCTION': return 'instructions';
    default: return type.toLowerCase(); // fallback (safe guard)
  }
};

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  const { employeeId } = params;

  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
  }

  try {
    // ✅ Fetch latest active onboarding instance for employee
    const instance = await prisma.onboardingInstance.findFirst({
      where: { employeeId, status: { in: ['active', 'in_progress'] } },
      orderBy: { startedAt: 'desc' },
      include: {
        steps: true, // Instance steps (includes status)
        template: { include: { steps: true } }, // Template steps (definitions)
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'No active onboarding found' }, { status: 404 });
    }

    // ✅ Normalize step types for frontend
    const normalized = {
      ...instance,
      steps: instance.steps.map(s => ({ ...s, type: mapStepType(s.type) })),
      template: {
        ...instance.template,
        steps: instance.template.steps.map(s => ({ ...s, type: mapStepType(s.type) })),
      },
    };

    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error('Get onboarding instance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
