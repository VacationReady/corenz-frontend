import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { LeaveType } from "@prisma/client";
import { auth } from "@/lib/auth-options";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    // ✅ Restrict to ADMIN only
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.id;
    const entitlements: { leaveType: LeaveType; totalDays: number }[] =
      await req.json();

    for (const entitlement of entitlements) {
      await prisma.leaveEntitlement.upsert({
        where: {
          employeeId_leaveType: {
            employeeId: employeeId,
            leaveType: entitlement.leaveType,
          },
        },
        update: {
          totalDays: entitlement.totalDays,
        },
        create: {
          employeeId: employeeId,
          leaveType: entitlement.leaveType,
          totalDays: entitlement.totalDays,
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
