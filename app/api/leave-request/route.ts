import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
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

    // Only ADMINs may view "all"; managers default to direct reports only
    const canViewAll = session.user.role === "ADMIN";

    const baseInclude = {
      EventCategory: { select: { id: true, name: true } },
      Employee: { select: { User: { select: { name: true, email: true, profileImageUrl: true } } } },
      LeaveApprovalStage: {
        orderBy: { order: "asc" },
        include: { decisions: { include: { approver: true }, orderBy: { order: "asc" } } },
      },
    } as const;

    let leaveRequests: any[] = [];

    if (scope === "my") {
      const myDecisions = await prisma.leaveApprovalDecision.findMany({
        where: {
          approverId: session.user.id,
          status: "PENDING",
          isActive: true,
          stage: { leaveRequest: { companyId: session.user.companyId } },
        },
        select: { stage: { select: { leaveRequestId: true } } },
        take: take ?? undefined,
      });
      const ids = Array.from(new Set(myDecisions.map((d) => d.stage.leaveRequestId)));
      leaveRequests = await prisma.leaveRequest.findMany({
        where: { id: { in: ids } },
        include: baseInclude,
        orderBy: { startDate: "asc" },
      });
    } else if (scope === "all" && canViewAll) {
      const decisions = await prisma.leaveApprovalDecision.findMany({
        where: {
          status: "PENDING",
          isActive: true,
          stage: {
            leaveRequest: {
              companyId: session.user.companyId,
              Employee: departmentId ? { departmentId } : undefined,
            },
          },
        },
        select: { stage: { select: { leaveRequestId: true } } },
        take: take ?? undefined,
      });
      const ids = Array.from(new Set(decisions.map((d) => d.stage.leaveRequestId)));
      leaveRequests = await prisma.leaveRequest.findMany({
        where: { id: { in: ids } },
        include: baseInclude,
        orderBy: { startDate: "asc" },
      });
    } else {
      // Fallback legacy: by approvalStatus for manager queues
      const employeeFilter: any = {
        ...(departmentId ? { departmentId } : {}),
        ...(!(canViewAll && scope === "all") ? { User: { managerId: session.user.id } } : {}),
      };
      leaveRequests = await prisma.leaveRequest.findMany({
        where: {
          companyId: session.user.companyId,
          approvalStatus: status,
          Employee: Object.keys(employeeFilter).length > 0 ? employeeFilter : undefined,
        },
        include: baseInclude,
        orderBy: { startDate: "asc" },
        take,
      });
    }

    const data = leaveRequests.map((lr: any) => ({
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
      employee: lr.Employee,
      approvalStages: (lr.LeaveApprovalStage || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        mode: s.mode,
        status: s.status,
        isActive: s.isActive,
        decisions: s.decisions.map((d: any) => ({
          id: d.id,
          approverId: d.approverId,
          approverName: d.approver?.name ?? null,
          approverEmail: d.approver?.email ?? null,
          order: d.order,
          status: d.status,
          isActive: d.isActive,
        })),
      })),
      myDecision: (() => {
        const active = (lr.LeaveApprovalStage || [])
          .flatMap((s: any) => s.decisions.map((d: any) => ({ ...d, stageId: s.id, mode: s.mode })))
          .find((d: any) => d.approverId === session.user.id && d.status === "PENDING" && d.isActive);
        return active ? { id: active.id, stageId: active.stageId, mode: active.mode } : null;
      })(),
    }));

    return NextResponse.json({ success: true, data });
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

