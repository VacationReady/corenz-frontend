// /app/api/employees/[id]/entitlement/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// ✅ Handle GET requests
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.id;
    const companyId = session.user.companyId;

    // ✅ Fetch entitlements with related event category scoped by company
    const entitlements = await prisma.leaveEntitlement.findMany({
      where: { employeeId, companyId },
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

    // ✅ Shape response to remove non-serializable fields
    const serialized = entitlements.map((entitlement) => ({
      id: entitlement.id,
      totalDays: entitlement.totalDays,
      usedDays: entitlement.usedDays,
      carryoverDays: entitlement.carryoverDays ?? 0,
      EventCategory: {
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    // ✅ Restrict to ADMIN only and ensure company scope
    if (!session || session.user.role !== "ADMIN" || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.id;
    const companyId = session.user.companyId;
    const entitlements: {
      EventCategoryId: string;
      totalDays: number;
      daysAllocated?: number;
    }[] = await req.json();

    for (const entitlement of entitlements) {
      if (!entitlement.EventCategoryId || entitlement.totalDays === undefined) {
        return NextResponse.json(
          { error: "Missing required fields in entitlement." },
          { status: 400 },
        );
      }

      await prisma.leaveEntitlement.upsert({
        where: {
          employeeId_eventCategoryId: {
            employeeId,
            eventCategoryId: entitlement.EventCategoryId,
          },
        },
        update: {
          totalDays: entitlement.totalDays,
        },
        create: {
          id: crypto.randomUUID(),
          employeeId,
          eventCategoryId: entitlement.EventCategoryId,
          totalDays: entitlement.totalDays,
          usedDays: 0, // adjust if needed
          daysAllocated: entitlement.daysAllocated ?? 0,
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
