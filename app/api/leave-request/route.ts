import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log("SESSION OBJECT:", session);

    if (!session?.user?.id) {
      console.log("❌ Unauthenticated");
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    console.log("✅ Authenticated User ID:", session.user.id);

    // Fetch user with permission profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        permissionProfile: true,
      },
    });

    if (!user) {
      console.log("❌ User not found");
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Check if user has permission to view leave requests
    if (!hasPermission(user as any, 'leave-requests', 'read')) {
      console.log("❌ Insufficient permissions");
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED" | null;
    const status = statusParam || "PENDING";
    const scope = searchParams.get("scope"); // "my" or "all" (admins only)
    const departmentId = searchParams.get("departmentId") || undefined;
    const limitParam = searchParams.get("limit");
    const take = limitParam ? Math.max(1, Math.min(50, parseInt(limitParam, 10) || 0)) : undefined;

    console.log("Fetching leave requests with status:", status);

    const isAdminEditor = hasPermission(user as any, 'leave-requests', 'edit');

    const employeeFilter: any = {
      ...(departmentId ? { departmentId } : {}),
      ...((!isAdminEditor || (isAdminEditor && scope === 'my'))
        ? { user: { managerId: session.user.id } }
        : {}),
    };

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        approvalStatus: status,
        employee: Object.keys(employeeFilter).length > 0 ? employeeFilter : undefined,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        dayType: true,
        approvalStatus: true,
        reason: true,
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
      take,
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
