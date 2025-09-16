import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch a specific leave policy
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policy = await prisma.leavePolicy.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        EventCategory: {
          select: { id: true, name: true, color: true },
        },
        LeavePolicyAssignment: true,
      },
    });

    if (!policy) {
      return NextResponse.json(
        { error: "Leave policy not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Error fetching leave policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT: Update a leave policy
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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
      accrualPeriod,
      accrualUnit,
      enableProration,
      prorationMethod,
      serviceLengthTiers,
      allowNegativeBalance,
      isActive,
    } = body;

    // Check if policy exists and belongs to company
    const existingPolicy = await prisma.leavePolicy.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!existingPolicy) {
      return NextResponse.json(
        { error: "Leave policy not found" },
        { status: 404 },
      );
    }

    // Validate required fields
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

    // Check for duplicate name (excluding current policy)
    const duplicatePolicy = await prisma.leavePolicy.findFirst({
      where: {
        companyId: session.user.companyId,
        name,
        id: { not: params.id },
      },
    });

    if (duplicatePolicy) {
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

    const updatedPolicy = await prisma.leavePolicy.update({
      where: { id: params.id },
      data: {
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
        LeavePolicyAssignment: true,
      },
    });

    return NextResponse.json(updatedPolicy);
  } catch (error) {
    console.error("Error updating leave policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE: Delete a leave policy
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if policy exists and belongs to company
    const existingPolicy = await prisma.leavePolicy.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { LeavePolicyAssignment: true },
        },
      },
    });

    if (!existingPolicy) {
      return NextResponse.json(
        { error: "Leave policy not found" },
        { status: 404 },
      );
    }

    // Check if policy has assignments (soft delete approach)
    if (existingPolicy._count.LeavePolicyAssignment > 0) {
      // Instead of hard delete, deactivate the policy
      const deactivatedPolicy = await prisma.leavePolicy.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Leave policy deactivated (has existing assignments)",
        policy: deactivatedPolicy,
      });
    }

    // Hard delete if no assignments
    await prisma.leavePolicy.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Leave policy deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting leave policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
