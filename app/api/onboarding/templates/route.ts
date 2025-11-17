import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createTemplate, updateTemplate, TemplateConflictError } from "./actions";
import { hasPermission } from "@/lib/permissions";
import { fetchTenantTemplates, serializeTemplate, templateSelect } from "./tenantScopedFetch";

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

  const url = new URL(req.url);
  const templateId = url.searchParams.get("id");

  if (templateId) {
    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: templateId },
      select: templateSelect,
    });

    if (!template || template.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(
      serializeTemplate(template as any, session.user.companyId),
    );
  }

  const templates = await fetchTenantTemplates(session.user.companyId);

  return NextResponse.json(templates);
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
    if (err instanceof TemplateConflictError) {
      return NextResponse.json(
        { error: err.message, latestTemplate: err.latest },
        { status: 409 },
      );
    }
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

    // CRITICAL: Verify template belongs to current tenant before deletion
    const template = await prisma.onboardingTemplate.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!template || template.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

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

