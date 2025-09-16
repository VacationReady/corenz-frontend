import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

// Validation schema for event rule overrides
const EventRuleOverrideSchema = z.object({
  eventCategoryId: z.string().cuid("Invalid event category ID"),
  departmentId: z.string().cuid("Invalid department ID").optional(),
  teamId: z.string().cuid("Invalid team ID").optional(),
  enforceEntitlement: z.boolean().optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
  maxConcurrent: z.number().int().min(1).optional(),
  maxBookingLength: z.number().int().min(1).optional(),
  maxConcurrentMode: z.enum(["HARD_BLOCK", "SOFT_GATE"]).optional(),
  maxBookingLengthMode: z.enum(["HARD_BLOCK", "SOFT_GATE"]).optional(),
  staffingDensityEnabled: z.boolean().default(false),
  staffingDensityThreshold: z.number().min(0).max(1).optional(),
  staffingDensityBehavior: z.enum(["DENY", "REQUIRE_APPROVAL"]).default("DENY"),
});

// GET: Fetch all event rule overrides for the company
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const overrides = await prisma.eventRuleOverride.findMany({
      where: {
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
      orderBy: [
        { EventCategory: { name: "asc" } },
        { Department: { name: "asc" } },
      ],
    });

    return NextResponse.json(overrides);
  } catch (error) {
    console.error("GET /api/event-rule-overrides error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event rule overrides" },
      { status: 500 },
    );
  }
}

// POST: Create a new event rule override
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = EventRuleOverrideSchema.parse(body);

    // Check for duplicate overrides (same category + department/team combination)
    const existingOverride = await prisma.eventRuleOverride.findFirst({
      where: {
        companyId: session.user.companyId,
        eventCategoryId: validatedData.eventCategoryId,
        departmentId: validatedData.departmentId || null,
        teamId: validatedData.teamId || null,
      },
    });

    if (existingOverride) {
      return NextResponse.json(
        { error: "An override for this category and scope already exists" },
        { status: 400 },
      );
    }

    // Validate that the event category exists and belongs to the company
    const eventCategory = await prisma.eventCategory.findFirst({
      where: {
        id: validatedData.eventCategoryId,
        companyId: session.user.companyId,
      },
    });

    if (!eventCategory) {
      return NextResponse.json(
        { error: "Event category not found" },
        { status: 404 },
      );
    }

    // Validate department if provided
    if (validatedData.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: validatedData.departmentId,
          companyId: session.user.companyId,
        },
      });

      if (!department) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 },
        );
      }
    }

    // Create the override
    const override = await prisma.eventRuleOverride.create({
      data: {
        ...validatedData,
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

    // Log the creation in audit log
    await prisma.globalAuditLog.create({
      data: {
        companyId: session.user.companyId,
        entityType: "EVENT_RULE",
        entityId: override.id,
        action: "CREATED",
        actorId: session.user.id,
        changes: {
          eventCategory: eventCategory.name,
          departmentId: validatedData.departmentId,
          staffingDensityEnabled: validatedData.staffingDensityEnabled,
        },
        metadata: {
          overrideType: "rule_override",
          scope: validatedData.departmentId ? "department" : "company",
        },
      },
    });

    return NextResponse.json(override, { status: 201 });
  } catch (error) {
    console.error("POST /api/event-rule-overrides error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create event rule override" },
      { status: 500 },
    );
  }
}

