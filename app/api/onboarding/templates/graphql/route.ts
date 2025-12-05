import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fetchTenantTemplates } from "../tenantScopedFetch";
import { createTemplate, updateTemplate } from "../actions";

const operationAliases: Record<string, string> = {
  onboardingTemplates: "OnboardingTemplates",
  OnboardingTemplates: "OnboardingTemplates",
  GetOnboardingTemplates: "OnboardingTemplates",
  createOnboardingTemplate: "CreateOnboardingTemplate",
  CreateOnboardingTemplate: "CreateOnboardingTemplate",
  updateOnboardingTemplate: "UpdateOnboardingTemplate",
  UpdateOnboardingTemplate: "UpdateOnboardingTemplate",
};

function detectOperationName(body: any): string | undefined {
  if (body?.operationName) {
    return operationAliases[body.operationName] || body.operationName;
  }
  if (typeof body?.query === "string") {
    const query = body.query;
    if (query.includes("updateOnboardingTemplate")) {
      return "UpdateOnboardingTemplate";
    }
    if (query.includes("createOnboardingTemplate")) {
      return "CreateOnboardingTemplate";
    }
    if (query.includes("onboardingTemplates")) {
      return "OnboardingTemplates";
    }
  }
  return undefined;
}

async function ensurePermission(
  userId: string,
  scope: "read" | "edit",
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      PermissionProfile: true,
    },
  });
  if (!user) return false;
  return hasPermission(user as any, "onboarding", scope);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json(
      { errors: [{ message: "Unauthorized" }] },
      { status: 401 },
    );
  }

  const body = await req.json();
  const operationName = detectOperationName(body);

  if (!operationName) {
    return NextResponse.json(
      { errors: [{ message: "Unknown GraphQL operation" }] },
      { status: 400 },
    );
  }

  try {
    if (operationName === "OnboardingTemplates") {
      const allowed = await ensurePermission(session.user.id, "read");
      if (!allowed) {
        return NextResponse.json(
          { errors: [{ message: "Insufficient permissions" }] },
          { status: 403 },
        );
      }
      const templates = await fetchTenantTemplates(session.user.companyId);
      return NextResponse.json({
        data: { onboardingTemplates: templates },
      });
    }

    if (operationName === "CreateOnboardingTemplate") {
      const allowed = await ensurePermission(session.user.id, "edit");
      if (!allowed) {
        return NextResponse.json(
          { errors: [{ message: "Insufficient permissions" }] },
          { status: 403 },
        );
      }
      const input = body?.variables?.input ?? {};
      const template = await createTemplate(session, input);
      return NextResponse.json({
        data: { createOnboardingTemplate: template },
      });
    }

    if (operationName === "UpdateOnboardingTemplate") {
      const allowed = await ensurePermission(session.user.id, "edit");
      if (!allowed) {
        return NextResponse.json(
          { errors: [{ message: "Insufficient permissions" }] },
          { status: 403 },
        );
      }
      const input = body?.variables?.input ?? body?.variables ?? {};
      const template = await updateTemplate(session, input);
      return NextResponse.json({
        data: { updateOnboardingTemplate: template },
      });
    }

    return NextResponse.json(
      { errors: [{ message: "Unsupported operation" }] },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("GraphQL onboarding error", err);
    return NextResponse.json(
      { errors: [{ message: "Internal server error" }] },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      errors: [
        {
          message:
            "GraphQL mutations and queries must be sent via POST with a JSON payload.",
        },
      ],
    },
    { status: 405 },
  );
}
