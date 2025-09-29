import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
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
  context: any,
) {
  const rawParams = context?.params;
  const { employeeId } = rawParams?.then ? await rawParams : rawParams;

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user?.companyId) {
      return NextResponse.json(
        { error: "Company context required" },
        { status: 403 },
      );
    }

    const instance = await prisma.onboardingInstance.findFirst({
      where: {
        employeeId,
        status: { in: ["active", "in_progress"] },
        Employee: { companyId: session.user.companyId },
      },
      orderBy: { startedAt: "desc" },
      include: {
        Employee: { select: { companyId: true } },
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
      const mismatchedInstance = await prisma.onboardingInstance.findFirst({
        where: {
          employeeId,
          status: { in: ["active", "in_progress"] },
        },
        select: {
          Employee: { select: { companyId: true } },
        },
      });

      if (mismatchedInstance?.Employee?.companyId !== undefined) {
        if (mismatchedInstance.Employee.companyId !== session.user.companyId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

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
