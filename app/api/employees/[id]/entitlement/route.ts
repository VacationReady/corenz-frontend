// /app/api/employees/[id]/entitlement/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { roundToTwoDecimals } from "@/lib/decimalPrecision";

// ✅ Handle GET requests
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await auth();

    if (!session || !session.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = id;
    const companyId = session.user.companyId;

    // ✅ Fetch entitlements with related event category scoped by company
    const entitlements = await prisma.leaveEntitlement.findMany({
      where: { employeeId, companyId, EventCategory: { isActive: true } },
      include: {
        EventCategory: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // ✅ Shape response to match client expectations (eventCategory, not EventCategory)
    // Round all values to 2 decimal places for consistent display
    const serialized = entitlements.map((entitlement: any) => ({
      id: entitlement.id,
      totalDays: roundToTwoDecimals(entitlement.totalDays),
      usedDays: roundToTwoDecimals(entitlement.usedDays),
      carryoverDays: roundToTwoDecimals(entitlement.carryoverDays ?? 0),
      eventCategory: {
        id: entitlement.EventCategory.id,
        name: entitlement.EventCategory.name,
        color: entitlement.EventCategory.color,
      },
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching entitlements:", error);
    return NextResponse.json(
      { error: "Failed to fetch entitlements" },
      { status: 500 },
    );
  }
}

// ✅ Existing POST handler remains unchanged
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await auth();

    // ✅ Restrict to ADMIN only and ensure company scope
    if (!session || session.user.role !== "ADMIN" || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = id;
    const companyId = session.user.companyId;
    const entitlements: Array<
      | { eventCategoryId: string; totalDays: number; daysAllocated?: number }
      | { EventCategoryId: string; totalDays: number; daysAllocated?: number }
    > = await req.json();

    for (const entitlement of entitlements) {
      const eventCategoryId =
        // accept either camelCase or PascalCase to be backwards compatible
        (entitlement as any).eventCategoryId ?? (entitlement as any).EventCategoryId;

      if (!eventCategoryId || (entitlement as any).totalDays === undefined) {
        return NextResponse.json(
          { error: "Missing required fields in entitlement." },
          { status: 400 },
        );
      }

      // Round all entitlement values to 2 decimal places (NZ HRIS requirement)
      const roundedTotalDays = roundToTwoDecimals((entitlement as any).totalDays);
      const roundedDaysAllocated = roundToTwoDecimals((entitlement as any).daysAllocated ?? 0);

      await prisma.leaveEntitlement.upsert({
        where: {
          employeeId_eventCategoryId: {
            employeeId,
            eventCategoryId,
          },
        },
        update: {
          totalDays: roundedTotalDays,
        },
        create: {
          id: crypto.randomUUID(),
          employeeId,
          eventCategoryId,
          totalDays: roundedTotalDays,
          usedDays: 0, // adjust if needed
          daysAllocated: roundedDaysAllocated,
          companyId,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating entitlements:", error);
    return NextResponse.json(
      { error: "Failed to update entitlements" },
      { status: 500 },
    );
  }
}
