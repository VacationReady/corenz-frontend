import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const AutomationRuleUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  triggerType: z
    .enum([
      "DOCUMENT_EXPIRING",
      "FORM_SUBMITTED",
      "ONBOARDING_STEP_COMPLETED",
      "EMPLOYEE_CREATED",
    ])
    .optional(),
  triggerConfig: z.record(z.any()).optional(),
  conditions: z.array(z.record(z.any())).optional(),
  actions: z.array(z.record(z.any())).optional(),
});

// GET: Fetch a specific automation rule
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rule = await prisma.automationRule.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        executions: {
          take: 10,
          orderBy: {
            triggeredAt: "desc",
          },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error("GET /api/automation-rules/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation rule" },
      { status: 500 },
    );
  }
}

// PUT: Update an automation rule
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = AutomationRuleUpdateSchema.parse(body);

    // Check if rule exists and belongs to company
    const existingRule = await prisma.automationRule.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Check for duplicate names (excluding current rule)
    if (validatedData.name) {
      const duplicateRule = await prisma.automationRule.findFirst({
        where: {
          companyId: session.user.companyId,
          name: validatedData.name,
          id: { not: params.id },
        },
      });

      if (duplicateRule) {
        return NextResponse.json(
          { error: "A rule with this name already exists" },
          { status: 400 },
        );
      }
    }

    // Store old values for audit log
    const oldValues = {
      name: existingRule.name,
      isActive: existingRule.isActive,
      triggerType: existingRule.triggerType,
    };

    // Update the rule
    const updatedRule = await prisma.automationRule.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the update in audit log
    await prisma.globalAuditLog.create({
      data: {
        companyId: session.user.companyId,
        entityType: "AUTOMATION_RULE",
        entityId: params.id,
        action: "UPDATED",
        actorId: session.user.id,
        changes: {
          old: oldValues,
          new: {
            name: updatedRule.name,
            isActive: updatedRule.isActive,
            triggerType: updatedRule.triggerType,
          },
        },
        metadata: {
          fieldsUpdated: Object.keys(validatedData),
        },
      },
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error("PUT /api/automation-rules/[id] error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update automation rule" },
      { status: 500 },
    );
  }
}

// PATCH: Partial update (e.g., toggle active status)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // For PATCH, we only allow specific fields
    const allowedFields = ["isActive"];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Check if rule exists and belongs to company
    const existingRule = await prisma.automationRule.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Update the rule
    const updatedRule = await prisma.automationRule.update({
      where: { id: params.id },
      data: updateData,
    });

    // Log status change in audit log if isActive was changed
    if ("isActive" in updateData) {
      await prisma.globalAuditLog.create({
        data: {
          companyId: session.user.companyId,
          entityType: "AUTOMATION_RULE",
          entityId: params.id,
          action: updateData.isActive ? "ACTIVATED" : "DEACTIVATED",
          actorId: session.user.id,
          changes: {
            isActive: {
              from: existingRule.isActive,
              to: updateData.isActive,
            },
          },
        },
      });
    }

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error("PATCH /api/automation-rules/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update automation rule" },
      { status: 500 },
    );
  }
}

// DELETE: Delete an automation rule
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if rule exists and belongs to company
    const existingRule = await prisma.automationRule.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Delete the rule (this will cascade delete executions)
    await prisma.automationRule.delete({
      where: { id: params.id },
    });

    // Log the deletion in audit log
    await prisma.globalAuditLog.create({
      data: {
        companyId: session.user.companyId,
        entityType: "AUTOMATION_RULE",
        entityId: params.id,
        action: "DELETED",
        actorId: session.user.id,
        changes: {
          name: existingRule.name,
          triggerType: existingRule.triggerType,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/automation-rules/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete automation rule" },
      { status: 500 },
    );
  }
}
