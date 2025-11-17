import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hasPermission } from "@/lib/permissions";

/**
 * Autosave endpoint for incremental draft saves
 * Creates version snapshots without affecting published state
 * Debounced on client side to avoid excessive writes
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const {
      templateId,
      name,
      description,
      departments = [],
      jobRoles = [],
      steps = [],
      changesSummary,
    } = body;

    // Verify template ownership
    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        companyId: true,
        version: true,
        isActive: true,
        Department: { select: { id: true } },
        JobRole: { select: { id: true } },
        OnboardingStep: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            label: true,
            order: true,
            documentId: true,
            uploadType: true,
            instruction: true,
            formId: true,
            dependencies: true,
            metadata: true,
            slaDays: true,
            taskOwnerId: true,
            trainingId: true,
            reminderEnabled: true,
            reminderDaysBefore: true,
            reminderTime: true,
            reminderEscalationEnabled: true,
            reminderEscalationDays: true,
            reminderEscalationRole: true,
            reminderEscalationUserId: true,
            slaEnabled: true,
            slaCompletionDays: true,
            slaWarningDays: true,
            excludePublicHolidays: true,
            excludeWeekends: true,
          },
        },
      },
    });

    if (!template || template.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Create draft version snapshot
    const draftVersion = await prisma.templateVersion.create({
      data: {
        templateId,
        companyId: session.user.companyId,
        version: template.version,
        status: "DRAFT",
        name: name || `Draft ${new Date().toISOString()}`,
        description: description || "",
        isActive: template.isActive,
        departmentIds: departments.map((d: any) => d.id || d),
        jobRoleIds: jobRoles.map((j: any) => j.id || j),
        stepsSnapshot: steps,
        createdBy: session.user.id,
        changesSummary: changesSummary || "Autosave draft",
      },
    });

    return NextResponse.json({
      success: true,
      versionId: draftVersion.id,
      version: draftVersion.version,
      createdAt: draftVersion.createdAt,
    });
  } catch (err) {
    console.error("Failed to autosave template draft", err);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 },
    );
  }
}

/**
 * GET - Retrieve draft versions for a template
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const url = new URL(req.url);
    const templateId = url.searchParams.get("templateId");
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 },
      );
    }

    // Verify template ownership
    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: templateId },
      select: { companyId: true },
    });

    if (!template || template.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Fetch version history
    const versions = await prisma.templateVersion.findMany({
      where: {
        templateId,
        companyId: session.user.companyId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        version: true,
        status: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        publishedAt: true,
        changesSummary: true,
        CreatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        PublishedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ versions });
  } catch (err) {
    console.error("Failed to fetch template versions", err);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 },
    );
  }
}
