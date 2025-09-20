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

    const canViewAllApprovals = hasPermission(user as any, "leave-requests", "edit");

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
        where: {
          isActive: true,
          companyId,
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.user.count({
        where: {
          companyId,
          role: "MANAGER",
          ...(departmentId ? { Department_User_departmentIdToDepartment: { id: departmentId } } : {} as any),
        } as any,
      }),
      prisma.employee.count({
        where: {
          companyId,
          isActive: true,
          ...(departmentId ? { departmentId } : {}),
          User: { createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
        },
      }),
      // my: count of active pending decisions for current user
      prisma.leaveApprovalDecision.count({
        where: {
          approverId: session.user.id,
          status: "PENDING",
          isActive: true,
          stage: { leaveRequest: { Employee: { companyId, ...(departmentId ? { departmentId } : {}) } } },
        },
      }),
      // all: count of active pending decisions across company
      prisma.leaveApprovalDecision.count({
        where: {
          status: "PENDING",
          isActive: true,
          stage: {
            leaveRequest: {
              Employee: { companyId, ...(departmentId ? { departmentId } : {}) },
            },
          },
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

