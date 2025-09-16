import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch all leave policies for a company
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventCategoryId = searchParams.get("eventCategoryId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where = {
      companyId: session.user.companyId,
      ...(eventCategoryId && { eventCategoryId }),
      ...(activeOnly && { isActive: true }),
    };

    const policies = await prisma.leavePolicy.findMany({
      where,
      include: {
        EventCategory: {
          select: { id: true, name: true, color: true },
        },
        LeavePolicyAssignment: true,
        _count: {
          select: { LeavePolicyAssignment: true },
        },
      },
      orderBy: [{ effectiveFrom: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Error fetching leave policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Create a new leave policy
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      eventCategoryId,
      effectiveFrom,
      effectiveTo,
      accrualRate,
      accrualPeriod = "MONTHLY",
      accrualUnit = "DAYS",
      enableProration = true,
      prorationMethod = "DAILY",
      serviceLengthTiers,
      allowNegativeBalance = false,
      isActive = true,
    } = body;

    // Validation
    if (!name || !eventCategoryId || !effectiveFrom || !accrualRate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, eventCategoryId, effectiveFrom, accrualRate",
        },
        { status: 400 },
      );
    }

    // Verify event category exists and belongs to company
    const eventCategory = await prisma.eventCategory.findFirst({
      where: {
        id: eventCategoryId,
        companyId: session.user.companyId,
      },
    });

    if (!eventCategory) {
      return NextResponse.json(
        { error: "Invalid event category" },
        { status: 400 },
      );
    }

    // Check for duplicate name
    const existingPolicy = await prisma.leavePolicy.findFirst({
      where: {
        companyId: session.user.companyId,
        name,
        id: { not: undefined }, // For create, we don't want any match
      },
    });

    if (existingPolicy) {
      return NextResponse.json(
        { error: "A leave policy with this name already exists" },
        { status: 400 },
      );
    }

    // Validate service length tiers if provided
    if (serviceLengthTiers && Array.isArray(serviceLengthTiers)) {
      for (const tier of serviceLengthTiers) {
        if (typeof tier.minYears !== "number" || tier.minYears < 0) {
          return NextResponse.json(
            {
              error:
                "Invalid service length tier: minYears must be a non-negative number",
            },
            { status: 400 },
          );
        }
        if (
          tier.maxYears !== undefined &&
          (typeof tier.maxYears !== "number" || tier.maxYears <= tier.minYears)
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid service length tier: maxYears must be greater than minYears",
            },
            { status: 400 },
          );
        }
        if (typeof tier.accrualRate !== "number" || tier.accrualRate < 0) {
          return NextResponse.json(
            {
              error:
                "Invalid service length tier: accrualRate must be a non-negative number",
            },
            { status: 400 },
          );
        }
      }
    }

    const policy = await prisma.leavePolicy.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        companyId: session.user.companyId,
        name,
        description,
        eventCategoryId,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        accrualRate,
        accrualPeriod,
        accrualUnit,
        enableProration,
        prorationMethod,
        serviceLengthTiers,
        allowNegativeBalance,
        isActive,
      },
      include: {
        EventCategory: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error("Error creating leave policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

