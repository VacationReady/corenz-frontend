import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma, OnboardingStepType, OnboardingUploadType } from "@prisma/client";

// Type guard to validate onboarding steps
function isStep(
  step: any
): step is {
  type: OnboardingStepType;
  label: string;
  order: number;
  documentId?: string | null;
  uploadType?: OnboardingUploadType | null;
  instruction?: string | null;
} {
  return !!step;
}

const typeMap: Record<string, OnboardingStepType> = {
  "acknowledge-document": OnboardingStepType.ACKNOWLEDGE_DOCUMENT,
  "upload-document": OnboardingStepType.UPLOAD_DOCUMENT,
  "instructions": OnboardingStepType.INSTRUCTION,
};

const uploadTypeMap: Record<string, OnboardingUploadType> = {
  "passport": OnboardingUploadType.PASSPORT,
  "right-to-work": OnboardingUploadType.RIGHT_TO_WORK,
  "driver-licence": OnboardingUploadType.DRIVER_LICENSE,
  "training-certificate": OnboardingUploadType.TRAINING_CERTIFICATE,
  "other": OnboardingUploadType.OTHER,
};

// ✅ GET - Fetch Templates
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.onboardingTemplate.findMany({
    where: { companyId: session.user.companyId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true, // ✅ Boolean field replaces status
      departments: { select: { id: true, name: true } },
      jobRoles: { select: { id: true, name: true } },
      steps: {
        orderBy: { order: "asc" },
        include: { document: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(templates);
}

// ✅ POST - Create Template
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, departments = [], jobRoles = [], steps = [], isActive = false } = body;

    // Filter steps to only allow valid enums
    const filteredSteps = Array.isArray(steps)
      ? (steps
          .map((step: any, i: number) => {
            const mappedType = typeMap[step.type];
            if (!mappedType) return undefined;
            const base = { type: mappedType, label: step.label || step.title || "", order: i + 1 };
            if (mappedType === OnboardingStepType.ACKNOWLEDGE_DOCUMENT) {
              return { ...base, documentId: step.documentId || null };
            }
            if (mappedType === OnboardingStepType.UPLOAD_DOCUMENT) {
              return { ...base, uploadType: step.uploadType ? uploadTypeMap[step.uploadType] || null : null };
            }
            if (mappedType === OnboardingStepType.INSTRUCTION) {
              return { ...base, instruction: step.description || "" };
            }
            return undefined;
          })
          .filter(isStep)) as Prisma.OnboardingStepCreateInput[]
      : [];

    const template = await prisma.onboardingTemplate.create({
      data: {
        name,
        description: description || "",
        companyId: session.user.companyId,
        isActive: Boolean(isActive), // ✅ Safe boolean
        departments: departments.length > 0 ? { connect: departments.map((id: string) => ({ id })) } : undefined,
        jobRoles: jobRoles.length > 0 ? { connect: jobRoles.map((id: string) => ({ id })) } : undefined,
        steps: filteredSteps.length > 0 ? { create: filteredSteps } : undefined,
      },
      include: {
        departments: { select: { id: true, name: true } },
        jobRoles: { select: { id: true, name: true } },
        steps: true,
      },
    });

    return NextResponse.json(template);
  } catch (err) {
    console.error("Failed to create onboarding template", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

// ✅ PUT - Update Template (Includes Publish/Unpublish)
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, description, departments = [], jobRoles = [], isActive } = body;

    const template = await prisma.onboardingTemplate.update({
      where: { id },
      data: {
        name,
        description: description || "",
        isActive: Boolean(isActive), // ✅ Handles toggle
        departments: {
          set: [],
          connect: departments.length > 0 ? departments.map((id: string) => ({ id })) : [],
        },
        jobRoles: {
          set: [],
          connect: jobRoles.length > 0 ? jobRoles.map((id: string) => ({ id })) : [],
        },
      },
      include: {
        departments: { select: { id: true, name: true } },
        jobRoles: { select: { id: true, name: true } },
        steps: true,
      },
    });

    return NextResponse.json(template);
  } catch (err) {
    console.error("Failed to update onboarding template", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

// ✅ DELETE - Delete Template (Steps cascade manually)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    // First delete steps, then template (avoids FK constraints)
    await prisma.onboardingStep.deleteMany({ where: { templateId: id } });
    await prisma.onboardingTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete onboarding template", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
