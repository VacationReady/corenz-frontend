import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("❌ Unauthenticated");
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }


    // Fetch user with permission profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        PermissionProfile: true,
      },
    });

    if (!user) {
      console.log("❌ User not found");
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Check if user has permission to view leave requests
    if (!hasPermission(user as any, "leave-requests", "read")) {
      console.log("❌ Insufficient permissions");
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as
      | "PENDING"
      | "APPROVED"
      | "DECLINED"
      | "CANCELLED"
      | null;
    const status = statusParam || "PENDING";
    const scope = searchParams.get("scope"); // "my" or "all" (admins only)
    const departmentId = searchParams.get("departmentId") || undefined;
    const limitParam = searchParams.get("limit");
    const take = limitParam
      ? Math.max(1, Math.min(50, parseInt(limitParam, 10) || 0))
      : undefined;

    console.log("Fetching leave requests with status:", status);

    // Only ADMINs may view "all"; managers default to direct reports only
    const canViewAll = session.user.role === "ADMIN";

    const employeeFilter: any = {
      ...(departmentId ? { departmentId } : {}),
      ...(!(canViewAll && scope === "all") ? { User: { managerId: session.user.id } } : {}),
    };

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        companyId: session.user.companyId,
        approvalStatus: status,
        Employee:
          Object.keys(employeeFilter).length > 0 ? employeeFilter : undefined,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        dayType: true,
        approvalStatus: true,
        reason: true,
        EventCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        Employee: {
          select: {
            User: {
              select: {
                name: true,
                email: true,
                id: true,
                managerId: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: "asc" },
      take,
    });

    // Normalize shape for UI expectations (employee.user.* and type)
    const normalized = leaveRequests.map((lr) => {
      const user = lr.Employee?.User;
      const fullName = user
        ? (user.name && user.name.trim().length > 0
            ? user.name
            : `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()) || null
        : null;
      return {
        id: lr.id,
        type: lr.EventCategory?.name ?? "",
        startDate: lr.startDate,
        endDate: lr.endDate,
        reason: lr.reason ?? null,
        approvalStatus: lr.approvalStatus,
        dayType: lr.dayType,
        eventCategory: lr.EventCategory
          ? { id: lr.EventCategory.id, name: lr.EventCategory.name }
          : null,
        employee: {
          user: {
            name: fullName,
            email: user?.email ?? null,
            profileImageUrl: user?.profileImageUrl ?? null,
          },
        },
      } as const;
    });

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    console.error("API error fetching leave requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch leave requests.",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic"; // ensures fresh data, disables ISR for this route

