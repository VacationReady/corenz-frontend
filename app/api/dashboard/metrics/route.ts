import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
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
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      headcount,
      managers,
      newStartersThisMonth,
      pendingApprovalsMyLeave,
      pendingApprovalsAllLeave,
      pendingApprovalsMyTxn,
      pendingApprovalsAllTxn,
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
          ...(departmentId ? { departmentId } : {}),
          startDate: { gte: thirtyDaysAgo, lte: now },
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
      // transactional approvals - my
      (prisma as any).transactionalChangeRequest.count({
        where: { companyId, status: "PENDING", approverIds: { has: session.user.id } },
      }),
      // transactional approvals - all
      (prisma as any).transactionalChangeRequest.count({
        where: { companyId, status: "PENDING" },
      }),
    ]);

    return NextResponse.json({
      headcount,
      managers,
      newStartersThisMonth,
      pendingApprovals: {
        my: pendingApprovalsMyLeave + pendingApprovalsMyTxn,
        all: canViewAllApprovals ? (pendingApprovalsAllLeave + pendingApprovalsAllTxn) : undefined,
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

