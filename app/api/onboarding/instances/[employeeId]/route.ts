import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

const mapStepType = (type: string) => {
  switch (type) {
    case "ACKNOWLEDGE_DOCUMENT":
      return "acknowledge-document";
    case "UPLOAD_DOCUMENT":
      return "upload-document";
    case "INSTRUCTION":
      return "instructions";
    case "FORM_FILL":
      return "fill-form";
    default:
      return type.toLowerCase();
  }
};

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } },
) {
  const { employeeId } = params;

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  try {
    const instance = await prisma.onboardingInstance.findFirst({
      where: { employeeId, status: { in: ["active", "in_progress"] } },
      orderBy: { startedAt: "desc" },
      include: {
        OnboardingStepInstance: true, // OnboardingStepInstance records (instance-specific status)
        OnboardingTemplate: {
          include: {
            OnboardingStep: {
              include: {
                Document: true,
                Form: { select: { id: true, name: true } },
              }, // include linked document for ACK steps
            },
          },
        },
      },
    });

    if (!instance) {
      return NextResponse.json(
        { error: "No active onboarding found" },
        { status: 404 },
      );
    }

    // ✅ Merge template steps with instance step info
    const mergedSteps = await Promise.all(
      instance.OnboardingTemplate.OnboardingStep.map(async (tStep) => {
        const instStep = instance.OnboardingStepInstance.find((i) => i.stepId === tStep.id);
        let url: string | null = null;
        if (tStep.Document?.url) {
          const { data: signed } = await supabase.storage
            .from("documents")
            .createSignedUrl(tStep.Document.url, 60 * 5);
          url = signed?.signedUrl ?? null;
        }
        return {
          id: tStep.id, // template step ID
          instanceStepId: instStep?.id || null, // ✅ onboardingStepInstance ID
          type: mapStepType(tStep.type),
          label: tStep.label,
          instruction: tStep.instruction ?? undefined,
          uploadType: tStep.uploadType ?? undefined,
          documentId: tStep.documentId ?? undefined,
          document: tStep.Document
            ? {
                id: tStep.Document.id,
                name: tStep.Document.name,
                url,
              }
            : undefined,
          formId: tStep.formId ?? undefined,
          order: tStep.order,
          status: instStep?.status || "pending",
        };
      }),
    );

    const normalized = {
      id: instance.id,
      template: { name: instance.OnboardingTemplate.name },
      steps: mergedSteps,
    };

    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("Get onboarding instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
