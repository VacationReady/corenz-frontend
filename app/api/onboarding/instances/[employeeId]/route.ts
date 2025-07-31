import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const mapStepType = (type: string) => {
  switch (type) {
    case 'ACKNOWLEDGE_DOCUMENT': return 'acknowledge-document';
    case 'UPLOAD_DOCUMENT': return 'upload-document';
    case 'INSTRUCTION': return 'instructions';
    default: return type.toLowerCase();
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
    const instance = await prisma.onboardingInstance.findFirst({
      where: { employeeId, status: { in: ['active', 'in_progress'] } },
      orderBy: { startedAt: 'desc' },
      include: {
        steps: true, // instance (status only)
        template: { include: { steps: true } }, // template (definitions)
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'No active onboarding found' }, { status: 404 });
    }

    // ✅ Merge template steps with instance status, normalize nulls
    const mergedSteps = instance.template.steps.map(tStep => {
      const instStep = instance.steps.find(i => i.stepId === tStep.id);
      return {
        id: tStep.id,
        type: mapStepType(tStep.type),
        label: tStep.label,
        instruction: tStep.instruction ?? undefined,
        uploadType: tStep.uploadType ?? undefined,
        documentId: tStep.documentId ?? undefined,
        order: tStep.order,
        status: instStep?.status || 'pending',
      };
    });

    const normalized = {
      id: instance.id,
      template: { name: instance.template.name },
      steps: mergedSteps, // ✅ fully merged + normalized
    };

    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error('Get onboarding instance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
