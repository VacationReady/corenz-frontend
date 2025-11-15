import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { mapDbStepTypeToUi } from "@/lib/onboarding/stepTypeMapping";
import { normalizeStepMetadata } from "@/lib/onboarding/stepMetadata";

const mapStepType = (type: string) => {
  const mapped = mapDbStepTypeToUi(type);
  if (mapped) {
    return mapped;
  }
  return typeof type === "string"
    ? type.toLowerCase().replace(/_/g, "-")
    : type;
};

export async function GET(
  req: NextRequest,
  context: any,
) {
  const rawParams = context?.params;
  const { employeeId } = rawParams?.then ? await rawParams : rawParams;

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  try {
    const instance = await prisma.onboardingInstance.findFirst({
      where: { employeeId, status: { in: ["active", "in_progress"] } },
      orderBy: { startedAt: "desc" },
      include: {
        OnboardingStepInstance: {
          include: {
            OnboardingStepResponse: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        OnboardingTemplate: {
          include: {
            OnboardingStep: {
              include: {
                Document: true,
                Form: { select: { id: true, name: true, formType: true } },
              },
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
        const latestResponse = instStep?.OnboardingStepResponse?.[0]?.response ?? undefined;
        let url: string | null = null;
        if (tStep.Document?.url) {
          const { data: signed } = await supabase.storage
            .from("documents")
            .createSignedUrl(tStep.Document.url, 60 * 5);
          url = signed?.signedUrl ?? null;
        }
        const uiType = mapStepType(tStep.type);
        return {
          id: tStep.id, // template step ID
          instanceStepId: instStep?.id || null, // ✅ onboardingStepInstance ID
          type: uiType,
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
          form: tStep.Form
            ? {
                id: tStep.Form.id,
                name: tStep.Form.name,
                formType: tStep.Form.formType ?? undefined,
              }
            : undefined,
          metadata: normalizeStepMetadata(uiType, tStep.metadata),
          existingResponse: latestResponse,
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
