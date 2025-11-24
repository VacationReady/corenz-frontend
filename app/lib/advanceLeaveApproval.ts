import { prisma } from "@/lib/prisma";
import { ApprovalStatus, ApprovalStageMode } from "@prisma/client";
import { notifyApproversForStage, notifyRequesterStatusChange } from "./approvalNotifications";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

async function _activateNextApproverSequential(stageId: string) {
  const next = await prisma.leaveApprovalDecision.findFirst({
    where: { stageId, status: "PENDING", isActive: false },
    orderBy: { order: "asc" },
  });
  if (next) {
    await prisma.leaveApprovalDecision.update({
      where: { id: next.id },
      data: { isActive: true },
    });
  }
}

export async function processDecision({
  prisma: p = prisma,
  decisionId,
  action,
  actorUserId,
}: {
  prisma?: typeof prisma;
  decisionId: string;
  action: "approve" | "decline";
  actorUserId: string;
}) {
  return await p.$transaction(async (tx) => {
    const decision = await tx.leaveApprovalDecision.findUnique({
      where: { id: decisionId },
      include: {
        stage: {
          include: {
            leaveRequest: {
              include: {
                Employee: { include: { User: true } },
                EventCategory: true,
              },
            },
            decisions: { include: { approver: true } },
          },
        },
      },
    });

    if (!decision) throw new Error("Decision not found");
    if (!decision.isActive || decision.approverId !== actorUserId)
      throw new Error("Not authorized to act on this decision");

    const now = new Date();
    const status: ApprovalStatus = action === "approve" ? "APPROVED" : "DECLINED";

    await tx.leaveApprovalDecision.update({
      where: { id: decision.id },
      data: { status, isActive: false, respondedAt: now },
    });

    const stage = await tx.leaveApprovalStage.findUnique({
      where: { id: decision.stageId },
      include: { decisions: true, leaveRequest: true },
    });
    if (!stage) throw new Error("Stage not found");

    // Decline path: cancel stage and future stages, update LR
    if (status === "DECLINED") {
      await tx.leaveApprovalStage.update({
        where: { id: stage.id },
        data: { status: "DECLINED", isActive: false, completedAt: now },
      });
      await tx.leaveApprovalDecision.updateMany({
        where: { stageId: stage.id, status: "PENDING" },
        data: { status: "CANCELLED", isActive: false },
      });
      await tx.leaveApprovalStage.updateMany({
        where: { leaveRequestId: stage.leaveRequestId, order: { gt: stage.order } },
        data: { status: "CANCELLED", isActive: false },
      });
      const lr = await tx.leaveRequest.update({
        where: { id: stage.leaveRequestId },
        data: { approvalStatus: "DECLINED", approvedById: actorUserId },
        include: { Employee: { include: { User: true } }, EventCategory: true },
      });
      await notifyRequesterStatusChange({
        leaveRequest: lr,
        employeeUser: lr.Employee.User,
        status: "DECLINED",
        eventCategoryName: lr.EventCategory.name,
      });
      return { leaveRequest: lr, activeStage: null } as const;
    }

    // Approval path: check stage completion by mode
    const updatedDecisions = await tx.leaveApprovalDecision.findMany({
      where: { stageId: stage.id },
      orderBy: { order: "asc" },
    });

    const mode = stage.mode as ApprovalStageMode;
    let stageComplete = false;

    if (mode === "SEQUENTIAL") {
      const hasPendingActive = updatedDecisions.some((d) => d.isActive && d.status === "PENDING");
      if (!hasPendingActive) {
        const next = updatedDecisions.find((d) => d.status === "PENDING");
        if (next) {
          await tx.leaveApprovalDecision.update({
            where: { id: next.id },
            data: { isActive: true },
          });
        } else {
          stageComplete = true;
        }
      }
    } else if (mode === "FIRST_RESPONDER") {
      // Winner decided; cancel remaining
      await tx.leaveApprovalDecision.updateMany({
        where: { stageId: stage.id, status: "PENDING" },
        data: { status: "CANCELLED", isActive: false },
      });
      stageComplete = true;
    } else if (mode === "UNANIMOUS") {
      stageComplete = updatedDecisions.every((d) => d.status === "APPROVED");
    }

    if (!stageComplete) {
      const lr = await tx.leaveRequest.findUnique({
        where: { id: stage.leaveRequestId },
        include: {
          Employee: { include: { User: true } },
          EventCategory: true,
          LeaveApprovalStage: { include: { decisions: true } },
        },
      });
      return { leaveRequest: lr, activeStage: stage } as const;
    }

    // Complete this stage and activate next
    await tx.leaveApprovalStage.update({
      where: { id: stage.id },
      data: { status: "APPROVED", isActive: false, completedAt: now },
    });

    const nextStage = await tx.leaveApprovalStage.findFirst({
      where: { leaveRequestId: stage.leaveRequestId, order: { gt: stage.order } },
      orderBy: { order: "asc" },
      include: { decisions: { include: { approver: true } } },
    });

    if (nextStage) {
      await tx.leaveApprovalStage.update({
        where: { id: nextStage.id },
        data: { isActive: true },
      });
      if (nextStage.mode === "SEQUENTIAL") {
        const first = nextStage.decisions.sort((a, b) => a.order - b.order)[0];
        if (first) {
          await tx.leaveApprovalDecision.update({
            where: { id: first.id },
            data: { isActive: true },
          });
        }
      } else {
        await tx.leaveApprovalDecision.updateMany({
          where: { stageId: nextStage.id, status: "PENDING" },
          data: { isActive: true },
        });
      }

      const lr = await tx.leaveRequest.findUnique({
        where: { id: stage.leaveRequestId },
        include: {
          Employee: { include: { User: true } },
          EventCategory: true,
          LeaveApprovalStage: { include: { decisions: { include: { approver: true } } } },
        },
      });

      // Notify new stage approvers
      await notifyApproversForStage({
        stage: nextStage as any,
        leaveRequest: lr as any,
        eventCategoryName: (lr as any).EventCategory.name,
      });

      return { leaveRequest: lr, activeStage: nextStage } as const;
    }

    // No next stage -> finalize request and deduct entitlement
    const lrFull = await tx.leaveRequest.findUnique({
      where: { id: stage.leaveRequestId },
      include: {
        Employee: { include: { User: true } },
        EventCategory: true,
      },
    });

    if (!lrFull) {
      throw new Error("Leave request not found");
    }

    // Check if entitlement is enforced for this event category
    const eventRule = await tx.eventRule.findUnique({
      where: {
        companyId_eventCategoryId: {
          companyId: lrFull.companyId,
          eventCategoryId: lrFull.eventCategoryId,
        },
      },
      select: { enforceEntitlement: true },
    });

    const enforceEntitlement = eventRule?.enforceEntitlement ?? true;

    // Only perform deduction if the request is not already approved AND entitlement is enforced
    if (lrFull.approvalStatus !== "APPROVED" && enforceEntitlement) {
      const totalDays: number[] = [];
      let currentDate = new Date(lrFull.startDate);
      const endDate = new Date(lrFull.endDate);
      // End date is return-to-work (exclusive) for deduction purposes
      const exclusiveEnd = new Date(endDate);
      exclusiveEnd.setDate(exclusiveEnd.getDate() - 1);

      while (currentDate <= exclusiveEnd) {
        const deduction = await calculateLeaveDeduction(
          lrFull.employeeId,
          currentDate,
          tx,
        );
        totalDays.push(deduction);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDeduction = totalDays.reduce((sum, val) => sum + val, 0);

      if (totalDeduction > 0) {
        const entitlement = await tx.leaveEntitlement.findFirst({
          where: {
            employeeId: lrFull.employeeId,
            eventCategoryId: lrFull.eventCategoryId,
          },
        });

        if (!entitlement || entitlement.totalDays - entitlement.usedDays < totalDeduction) {
          throw new Error("Insufficient leave balance.");
        }

        await tx.leaveEntitlement.update({
          where: { id: entitlement.id },
          data: { usedDays: entitlement.usedDays + totalDeduction },
        });
      }
    } else if (!enforceEntitlement) {
      console.log("ℹ️ Entitlement enforcement disabled for this event type. Skipping balance deduction.");
    }

    const lr = await tx.leaveRequest.update({
      where: { id: stage.leaveRequestId },
      data: { approvalStatus: "APPROVED", approvedById: actorUserId },
      include: { Employee: { include: { User: true } }, EventCategory: true },
    });
    await notifyRequesterStatusChange({
      leaveRequest: lr,
      employeeUser: lr.Employee.User,
      status: "APPROVED",
      eventCategoryName: lr.EventCategory.name,
    });
    return { leaveRequest: lr, activeStage: null } as const;
  });
}


