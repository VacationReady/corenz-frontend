import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createTemplate, updateTemplate } from "./actions";

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
      updatedAt: true,
      updatedBy: { select: { id: true, name: true, email: true } },
      departments: { select: { id: true, name: true } },
      jobRoles: { select: { id: true, name: true } },
      steps: {
        orderBy: { order: "asc" },
        include: {
          document: { select: { id: true, name: true } },
          form: { select: { id: true, name: true } },
        },
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
    const template = await createTemplate(session, body);

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
    const template = await updateTemplate(session, body);
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

    // Remove step responses and instances before deleting steps
    await prisma.onboardingStepResponse.deleteMany({
      where: { onboardingStepInstance: { step: { templateId: id } } },
    });
    await prisma.onboardingStepInstance.deleteMany({
      where: { step: { templateId: id } },
    });
    await prisma.onboardingStep.deleteMany({ where: { templateId: id } });
    await prisma.onboardingTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete onboarding template", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
