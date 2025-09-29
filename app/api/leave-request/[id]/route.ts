import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveStatusUpdate } from "@/lib/sendLeaveStatusUpdate";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { z } from "zod";
import { processDecision } from "@/lib/advanceLeaveApproval";

const leaveRequestActionSchema = z.object({
  action: z.enum(["approve", "decline"], {
    required_error: "action is required",
  }),
  decisionId: z.string().optional(),
});

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    await ensurePrismaConnected();
    const { id } = await context.params;
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        Employee: { include: { User: true, Department: true } },
        EventCategory: true,
        EventSubcategory: true,
        LeaveApprovalStage: {
          orderBy: { order: "asc" },
          include: { decisions: { include: { approver: true }, orderBy: { order: "asc" } } },
        },
      },
    });

    if (!leave || leave.companyId !== session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Leave request not found" },
        { status: 404 },
      );
    }

    const user = leave.Employee?.User;
    const displayName = user
      ? (user.name && user.name.trim().length > 0
          ? user.name
          : `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()) || null
      : null;

    const data = {
      id: leave.id,
      type: leave.EventCategory?.name ?? "",
      eventCategoryId: leave.eventCategoryId,
      eventSubcategory: leave.EventSubcategory
        ? { id: leave.EventSubcategory.id, name: leave.EventSubcategory.name }
        : null,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason ?? null,
      approvalStatus: leave.approvalStatus,
      paidStatus: leave.paidStatus ?? null,
      dayType: leave.dayType,
      employee: {
        id: leave.employeeId,
        user: {
          name: displayName,
          email: user?.email ?? null,
          id: user?.id ?? null,
        },
        department: leave.Employee?.Department?.name ?? null,
      },
      approvalStages: (leave.LeaveApprovalStage || []).map((s: any) => ({
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
        const active = (leave.LeaveApprovalStage || [])
          .flatMap((s: any) => s.decisions.map((d: any) => ({ ...d, stageId: s.id, mode: s.mode })))
          .find((d: any) => d.approverId === session.user.id && d.status === "PENDING" && d.isActive);
        return active ? { id: active.id, stageId: active.stageId, mode: active.mode } : null;
      })(),
    } as const;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[LEAVE_REQUEST_GET]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const { id: leaveId } = await context.params;

  try {
    const { action, decisionId } = leaveRequestActionSchema.parse(await req.json());

    if (decisionId) {
      const result = await processDecision({ decisionId, action, actorUserId: session.user.id });
      return NextResponse.json({ success: true, data: result.leaveRequest });
    }

    // If multi-stage workflow exists for this request, require decisionId to prevent bypassing stages
    const multiCount = await prisma.leaveApprovalStage.count({ where: { leaveRequestId: leaveId } });
    if (multiCount > 0) {
      return NextResponse.json(
        { success: false, error: "This request uses multi-stage approvals. You must act on your assigned decision." },
        { status: 400 },
      );
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        Employee: {
          include: { User: true },
        },
        EventCategory: true,
      },
    });

    if (!leave) {
      return NextResponse.json(
        { success: false, error: "Leave request not found." },
        { status: 404 },
      );
    }

    if (action === "approve") {
      const totalDays: number[] = [];
      let currentDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);

      while (currentDate <= endDate) {
        const deduction = await calculateLeaveDeduction(
          leave.employeeId,
          currentDate,
        );
        totalDays.push(deduction);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDeduction = totalDays.reduce((sum, val) => sum + val, 0);

      const updatedLeaveRequest = await prisma.$transaction(async (tx) => {
        const entitlement = await tx.leaveEntitlement.findFirst({
          where: {
            employeeId: leave.employeeId,
            eventCategoryId: leave.eventCategoryId,
          },
        });

        if (!entitlement || entitlement.totalDays - entitlement.usedDays < totalDeduction) {
          throw new Error("Insufficient leave balance.");
        }

        await tx.leaveEntitlement.update({
          where: { id: entitlement.id },
          data: { usedDays: entitlement.usedDays + totalDeduction },
        });

        return tx.leaveRequest.update({
          where: { id: leaveId },
          data: { approvalStatus: "APPROVED", approvedById: session.user.id },
        });
      });

      return NextResponse.json({ success: true, data: updatedLeaveRequest });
    }

    // Decline
    const declined = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { approvalStatus: "DECLINED", approvedById: session.user.id },
    });

    await sendLeaveStatusUpdate({
      to: leave.Employee.User.email ?? "",
      subject: `Your ${leave.EventCategory?.name ?? "Leave"} request has been declined`,
      employeeName: leave.Employee.User.firstName ?? leave.Employee.User.name ?? "",
      type: leave.EventCategory?.name ?? "Leave",
      startDate: String(leave.startDate),
      endDate: String(leave.endDate),
      status: "DECLINED",
    });

    return NextResponse.json({ success: true, data: declined });
  } catch (error: any) {
    console.error("[LEAVE_REQUEST_PATCH]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request" },
      { status: 500 },
    );
  }
}

export function POST() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed" },
    { status: 405 },
  );
}

export function PUT() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed" },
    { status: 405 },
  );
}

export function DELETE() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed" },
    { status: 405 },
  );
}
