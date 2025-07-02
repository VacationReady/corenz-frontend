import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log("SESSION OBJECT:", session);

    if (!session?.user?.id || !session.user.role) {
      console.log("❌ Unauthenticated or missing role");
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    console.log("✅ Authenticated User ID:", session.user.id);
    console.log("✅ Authenticated User Role:", session.user.role);

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      console.log("❌ Unauthorized role attempted access");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED" | null;
    const status = statusParam || "PENDING";

    console.log("Fetching leave requests with status:", status);

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        status: status,
        ...(session.user.role === "MANAGER" && {
          employee: {
            user: {
              managerId: session.user.id,
            },
          },
        }),
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        notes: true,
        dayType: true,
        status: true,
        eventCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        employee: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                id: true,
                managerId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    console.log("✅ Leave requests found:", JSON.stringify(leaveRequests, null, 2));

    return NextResponse.json({ success: true, data: leaveRequests });
  } catch (error: any) {
    console.error("API error fetching leave requests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave requests." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic"; // ensures fresh data, disables ISR for this route
