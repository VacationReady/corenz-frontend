import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId") || undefined;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, PermissionProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const canViewAllApprovals = hasPermission(
      user as any,
      "leave-requests",
      "edit",
    );

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      headcount,
      managers,
      newStartersThisMonth,
      pendingApprovalsMy,
      pendingApprovalsAll,
    ] = await Promise.all([
      prisma.employee.count({
        where: { isActive: true, companyId, departmentId },
      }),
      prisma.user.count({
        where: {
          companyId,
          role: "MANAGER",
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.user.count({
        where: {
          companyId,
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
          Employee: {
            isActive: true,
            ...(departmentId ? { departmentId } : {}),
          },
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.leaveRequest.count({
        where: {
          approvalStatus: "PENDING",
          Employee: {
            User: { managerId: session.user.id },
            companyId,
            ...(departmentId ? { departmentId } : {}),
          },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          approvalStatus: "PENDING",
          Employee: { companyId, ...(departmentId ? { departmentId } : {}) },
        },
      }),
    ]);

    return NextResponse.json({
      headcount,
      managers,
      newStartersThisMonth,
      pendingApprovals: {
        my: pendingApprovalsMy,
        all: canViewAllApprovals ? pendingApprovalsAll : undefined,
      },
      canViewAllApprovals,
    });
  } catch (error) {
    console.error("[DASHBOARD_METRICS]", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
