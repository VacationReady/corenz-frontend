import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { z } from "zod";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

// Validation schema for automation rules
const AutomationRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
  triggerType: z.enum([
    "DOCUMENT_EXPIRING",
    "FORM_SUBMITTED",
    "ONBOARDING_STEP_COMPLETED",
    "EMPLOYEE_CREATED",
  ]),
  triggerConfig: z.record(z.any()),
  conditions: z.array(z.record(z.any())).optional(),
  actions: z.array(z.record(z.any())).min(1, "At least one action is required"),
});

// GET: Fetch all automation rules for the company
async function getHandler() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await prisma.automationRule.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            AutomationExecution: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("GET /api/automation-rules error:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation rules" },
      { status: 500 },
    );
  }
}

// POST: Create a new automation rule
async function postHandler(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Restrict creation to ADMIN users for now (can be relaxed to permission profile later)
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = AutomationRuleSchema.parse(body);

    // Check for duplicate names
    const existingRule = await prisma.automationRule.findFirst({
      where: {
        companyId: session.user.companyId,
        name: validatedData.name,
      },
    });

    if (existingRule) {
      return NextResponse.json(
        { error: "A rule with this name already exists" },
        { status: 400 },
      );
    }

    // Create the automation rule
    const rule = await prisma.automationRule.create({
      data: {
        id: crypto.randomUUID(),
        ...validatedData,
        companyId: session.user.companyId,
        createdBy: session.user.id,
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the creation in audit log
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        entityType: "AUTOMATION_RULE",
        entityId: rule.id,
        action: "CREATED",
        actorId: session.user.id,
        changes: {
          name: validatedData.name,
          triggerType: validatedData.triggerType,
          isActive: validatedData.isActive,
        },
        metadata: {
          ruleType: validatedData.triggerType,
          actionsCount: validatedData.actions.length,
          conditionsCount: validatedData.conditions?.length || 0,
        },
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("POST /api/automation-rules error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create automation rule" },
      { status: 500 },
    );
  }
}


// Apply feature guard
const automationGuard = withFeatureGuard(FEATURE_KEYS.AUTOMATION_RULES);
export const GET = automationGuard(getHandler);
export const POST = automationGuard(postHandler);
