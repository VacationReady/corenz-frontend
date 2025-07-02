import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // ✅ Restrict to ADMIN only
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.id;
    const entitlements: { eventCategoryId: string; totalDays: number; daysAllocated?: number }[] = await req.json();

    for (const entitlement of entitlements) {
      if (!entitlement.eventCategoryId || entitlement.totalDays === undefined) {
        return NextResponse.json(
          { error: "Missing required fields in entitlement." },
          { status: 400 }
        );
      }

      await prisma.leaveEntitlement.upsert({
        where: {
          employeeId_eventCategoryId: {
            employeeId,
            eventCategoryId: entitlement.eventCategoryId,
          },
        },
        update: {
          totalDays: entitlement.totalDays,
        },
        create: {
          employeeId,
          eventCategoryId: entitlement.eventCategoryId,
          totalDays: entitlement.totalDays,
          usedDays: 0, // adjust if needed
          daysAllocated: entitlement.daysAllocated ?? 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating entitlements:", error);
    return NextResponse.json(
      { error: "Failed to update entitlements" },
      { status: 500 }
    );
  }
}
