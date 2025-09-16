import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const EventRuleOverrideUpdateSchema = z.object({
  eventCategoryId: z.string().cuid("Invalid event category ID").optional(),
  departmentId: z.string().cuid("Invalid Department ID").optional(),
  teamId: z.string().cuid("Invalid team ID").optional(),
  enforceEntitlement: z.boolean().optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
  maxConcurrent: z.number().int().min(1).optional(),
  maxBookingLength: z.number().int().min(1).optional(),
  maxConcurrentMode: z.enum(["HARD_BLOCK", "SOFT_GATE"]).optional(),
  maxBookingLengthMode: z.enum(["HARD_BLOCK", "SOFT_GATE"]).optional(),
  staffingDensityEnabled: z.boolean().optional(),
  staffingDensityThreshold: z.number().min(0).max(1).optional(),
  staffingDensityBehavior: z.enum(["DENY", "REQUIRE_APPROVAL"]).optional(),
});

// GET: Fetch a specific event rule override
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const override = await prisma.eventRuleOverride.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        EventCategory: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!override) {
      return NextResponse.json(
        { error: "Override not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(override);
  } catch (error) {
    console.error("GET /api/event-rule-overrides/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event rule override" },
      { status: 500 },
    );
  }
}

// PUT: Update an event rule override
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
    const validatedData = EventRuleOverrideUpdateSchema.parse(body);

    // Check if override exists and belongs to company
    const existingOverride = await prisma.eventRuleOverride.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        EventCategory: true,
      },
    });

    if (!existingOverride) {
      return NextResponse.json(
        { error: "Override not found" },
        { status: 404 },
      );
    }

    // Check for duplicate overrides if category or scope is being changed
    if (
      validatedData.eventCategoryId ||
      validatedData.departmentId !== undefined
    ) {
      const duplicateOverride = await prisma.eventRuleOverride.findFirst({
        where: {
          companyId: session.user.companyId,
          eventCategoryId:
            validatedData.eventCategoryId || existingOverride.eventCategoryId,
          departmentId:
            validatedData.departmentId !== undefined
              ? validatedData.departmentId
              : existingOverride.departmentId,
          teamId:
            validatedData.teamId !== undefined
              ? validatedData.teamId
              : existingOverride.teamId,
          id: { not: params.id },
        },
      });

      if (duplicateOverride) {
        return NextResponse.json(
          { error: "An override for this category and scope already exists" },
          { status: 400 },
        );
      }
    }

    // Store old values for audit log
    const oldValues = {
      eventCategoryId: existingOverride.eventCategoryId,
      departmentId: existingOverride.departmentId,
      staffingDensityEnabled: existingOverride.staffingDensityEnabled,
      staffingDensityThreshold: existingOverride.staffingDensityThreshold,
    };

    // Update the override
    const updatedOverride = await prisma.eventRuleOverride.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        EventCategory: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log the update in audit log
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        entityType: "EVENT_RULE",
        entityId: params.id,
        action: "UPDATED",
        actorId: session.user.id,
        changes: {
          old: oldValues,
          new: {
            eventCategoryId: updatedOverride.eventCategoryId,
            departmentId: updatedOverride.departmentId,
            staffingDensityEnabled: updatedOverride.staffingDensityEnabled,
            staffingDensityThreshold: updatedOverride.staffingDensityThreshold,
          },
        },
        metadata: {
          overrideType: "rule_override",
          fieldsUpdated: Object.keys(validatedData),
        },
      },
    });

    return NextResponse.json(updatedOverride);
  } catch (error) {
    console.error("PUT /api/event-rule-overrides/[id] error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update event rule override" },
      { status: 500 },
    );
  }
}

// DELETE: Delete an event rule override
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if override exists and belongs to company
    const existingOverride = await prisma.eventRuleOverride.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        EventCategory: true,
        Department: true,
      },
    });

    if (!existingOverride) {
      return NextResponse.json(
        { error: "Override not found" },
        { status: 404 },
      );
    }

    // Delete the override
    await prisma.eventRuleOverride.delete({
      where: { id: params.id },
    });

    // Log the deletion in audit log
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        entityType: "EVENT_RULE",
        entityId: params.id,
        action: "DELETED",
        actorId: session.user.id,
        changes: {
          EventCategory: existingOverride.EventCategory.name,
          Department: existingOverride.Department?.name,
          staffingDensityEnabled: existingOverride.staffingDensityEnabled,
        },
        metadata: {
          overrideType: "rule_override",
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/event-rule-overrides/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete event rule override" },
      { status: 500 },
    );
  }
}
