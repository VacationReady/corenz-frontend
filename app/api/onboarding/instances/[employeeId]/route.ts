import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { mapDbStepTypeToUi } from "@/lib/onboarding/mapStepType";
import { normalizeStepMetadata } from "@/lib/onboarding/stepMetadata";
import { hasPermission } from "@/lib/permissions";
import { getMobileSession } from "@/lib/mobile-session";

export async function GET(
  req: NextRequest,
  context: any,
) {
  // 🔒 Authentication check - supports both web (NextAuth) and mobile (JWT token)
  const session = await getMobileSession(req);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { employeeId } = rawParams?.then ? await rawParams : rawParams;

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  // 🔒 Tenant-scoped access control: Verify employee belongs to user's company
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { 
      companyId: true,
      userId: true,
      User: { select: { managerId: true } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (employee.companyId !== session.user.companyId) {
    return NextResponse.json(
      { error: "Forbidden: Cross-tenant access denied" },
      { status: 403 },
    );
  }

  // 🔒 Employee-level access control: Only allow self, manager, admin, or users with explicit elevated permissions
  // This prevents employees from viewing other employees' onboarding instances
  const isSelf = employee.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const isManager = employee.User?.managerId === session.user.id;

  // Check for explicit elevated onboarding permission via custom permission profile
  // Note: Default role-based onboarding:read only grants access to self/direct reports
  // Only custom permission profiles with onboarding:read grant broader access (e.g., HR users)
  let hasElevatedOnboardingPermission = false;
  if (!isAdmin && !isSelf && !isManager) {
    const requestorUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { PermissionProfile: true },
    });
    if (requestorUser?.PermissionProfile) {
      // Only check custom permission profile - not default role permissions
      // This ensures HR users with explicit onboarding permission can view any employee
      hasElevatedOnboardingPermission = hasPermission(
        { ...requestorUser, permissionProfile: requestorUser.PermissionProfile },
        "onboarding",
        "read"
      );
    }
  }

  if (!isSelf && !isAdmin && !isManager && !hasElevatedOnboardingPermission) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view this employee's onboarding" },
      { status: 403 },
    );
  }

  try {
    // 🔒 Query with tenant scope enforcement
    // First try to find an active/in_progress instance
    let instance = await prisma.onboardingInstance.findFirst({
      where: {
        employeeId,
        status: { in: ["active", "in_progress"] },
        OnboardingTemplate: { companyId: session.user.companyId },
      },
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

    // If no active instance, check for recently completed one (within last 5 minutes)
    // This handles the edge case where employee refreshes right after completion
    if (!instance) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      instance = await prisma.onboardingInstance.findFirst({
        where: {
          employeeId,
          status: "completed",
          completedAt: { gte: fiveMinutesAgo },
          OnboardingTemplate: { companyId: session.user.companyId },
        },
        orderBy: { completedAt: "desc" },
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
    }

    if (!instance) {
      return NextResponse.json(
        { error: "No active onboarding found" },
        { status: 404 },
      );
    }

    // ✅ Merge template steps with instance step info
    const mergedSteps = await Promise.all(
      instance.OnboardingTemplate.OnboardingStep.map(async (tStep: any) => {
        const instStep = instance.OnboardingStepInstance.find((i: any) => i.stepId === tStep.id);
        const latestResponse = instStep?.OnboardingStepResponse?.[0]?.response ?? undefined;
        let url: string | null = null;
        if (tStep.Document?.url) {
          const { data: signed } = await supabase.storage
            .from("documents")
            .createSignedUrl(tStep.Document.url, 60 * 5);
          url = signed?.signedUrl ?? null;
        }
        const uiType = mapDbStepTypeToUi(tStep.type);
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
