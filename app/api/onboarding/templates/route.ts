import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  createTemplate,
  updateTemplate,
  getTemplateNotificationPreferences,
} from "./actions";
import { hasPermission } from "@/lib/permissions";

// ✅ GET - Fetch Templates
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user with permission profile
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      PermissionProfile: true,
    },
  });

  if (!user || !hasPermission(user as any, "onboarding", "read")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  const templates = await prisma.onboardingTemplate.findMany({
    where: { companyId: session.user.companyId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true, // ✅ Boolean field replaces status
      updatedAt: true,
      User: { select: { id: true, name: true, email: true } },
      Department: { select: { id: true, name: true } },
      JobRole: { select: { id: true, name: true } },
      OnboardingStep: {
        orderBy: { order: "asc" },
        include: {
          Document: { select: { id: true, name: true } },
          Form: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const templatesWithPreferences = await Promise.all(
    templates.map(async (template) => ({
      ...template,
      notificationPreferences: await getTemplateNotificationPreferences(
        session.user.companyId,
        template.id,
      ),
    })),
  );

  return NextResponse.json(templatesWithPreferences);
}

// ✅ POST - Create Template
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user with permission profile
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      PermissionProfile: true,
    },
  });

  if (!user || !hasPermission(user as any, "onboarding", "edit")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
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
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user with permission profile
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      PermissionProfile: true,
    },
  });

  if (!user || !hasPermission(user as any, "onboarding", "edit")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
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
      where: { OnboardingStepInstance: { OnboardingStep: { templateId: id } } },
    });
    await prisma.onboardingStepInstance.deleteMany({
      where: { OnboardingStep: { templateId: id } },
    });
    await prisma.onboardingStep.deleteMany({ where: { templateId: id } });
    await prisma.onboardingTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete onboarding template", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

