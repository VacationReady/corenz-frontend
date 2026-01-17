import { prisma } from "@/lib/prisma";
import { ApprovalStatus, ApprovalStageMode } from "@prisma/client";
import { notifyApproversForStage, notifyRequesterStatusChange } from "./approvalNotifications";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { roundToTwoDecimals, addWithPrecision, subtractWithPrecision, formatLeaveBalance } from "@/lib/decimalPrecision";
import { recordSickLeaveUsage, applySickLeaveGrants, daysToHours } from "@/lib/leave/nz-sick-leave-ledger";

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
  // Fetch decision details first to determine if sick leave grants need to be applied
  const decisionDetails = await p.leaveApprovalDecision.findUnique({
    where: { id: decisionId },
    include: {
      stage: {
        include: {
          leaveRequest: {
            include: {
              EventCategory: true,
            },
          },
        },
      },
    },
  });

  if (!decisionDetails) throw new Error("Decision not found");
  
  // Check if this is sick leave and needs grants applied
  const isSickLeave = decisionDetails.stage.leaveRequest.EventCategory.name.toLowerCase().includes("sick");
  if (isSickLeave && action === "approve" && decisionDetails.stage.leaveRequest.approvalStatus !== "APPROVED") {
    // Apply any pending grants BEFORE starting the transaction
    try {
      await applySickLeaveGrants(p as any, decisionDetails.stage.leaveRequest.employeeId, new Date(), actorUserId);
    } catch (grantError: any) {
      console.error("❌ Failed to apply sick leave grants:", grantError);
      // Continue - grants may already be applied or employee may not be eligible yet
    }
  }

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

    const stage = decision.stage;
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

    // Only enforce entitlement for Annual Leave by default (unless explicitly configured)
    const isAnnualLeave = lrFull.EventCategory.name.toLowerCase().includes("annual leave");
    const isSickLeave = lrFull.EventCategory.name.toLowerCase().includes("sick");
    const enforceEntitlement = eventRule?.enforceEntitlement ?? isAnnualLeave;

    // ── NZ HOLIDAYS ACT 2003: PRE-12-MONTH EMPLOYEE CHECK ──────────────────
    // Determine if this employee is pre-12-month (has not yet reached entitlement crystallisation).
    // Pre-12-month employees have a futureAnnualLeaveEntitlement stored but no LeaveEntitlement record.
    // For these employees, we track leave usage in leaveInAdvanceUsed instead of LeaveEntitlement.usedDays.
    let isPreTwelveMonthEmployee = false;
    
    if (isAnnualLeave) {
      // Check if employee has a LeaveEntitlement record for annual leave
      const existingEntitlement = await tx.leaveEntitlement.findFirst({
        where: {
          employeeId: lrFull.employeeId,
          eventCategoryId: lrFull.eventCategoryId,
        },
      });
      
      // If no LeaveEntitlement exists, check if they have futureAnnualLeaveEntitlement
      // This indicates they are pre-12-month and should use leave in advance tracking
      if (!existingEntitlement) {
        const employeeWithFutureEntitlement = await tx.employee.findUnique({
          where: { id: lrFull.employeeId },
          select: { 
            futureAnnualLeaveEntitlement: true,
            annualLeaveEntitlementDate: true,
          },
        });
        
        // Employee is pre-12-month if they have a futureAnnualLeaveEntitlement stored
        // or their annualLeaveEntitlementDate is in the future
        if (employeeWithFutureEntitlement?.futureAnnualLeaveEntitlement !== null ||
            (employeeWithFutureEntitlement?.annualLeaveEntitlementDate && 
             new Date(employeeWithFutureEntitlement.annualLeaveEntitlementDate) > new Date())) {
          isPreTwelveMonthEmployee = true;
          console.log("📋 NZ Compliance: Employee is pre-12-month, will track as leave in advance", {
            employeeId: lrFull.employeeId,
            futureEntitlement: employeeWithFutureEntitlement?.futureAnnualLeaveEntitlement,
            entitlementDate: employeeWithFutureEntitlement?.annualLeaveEntitlementDate,
          });
        }
      }
    }

    // NZ SICK LEAVE: Handle sick leave via ledger system (Holidays Act 2003)
    if (isSickLeave && lrFull.approvalStatus !== "APPROVED") {
      const totalDays: number[] = [];
      let currentDate = new Date(lrFull.startDate);
      const endDate = new Date(lrFull.endDate);
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

      const totalDeductionDays = roundToTwoDecimals(totalDays.reduce((sum, val) => sum + val, 0));
      
      if (totalDeductionDays > 0) {
        // Record usage (grants already applied outside transaction)
        try {
          await recordSickLeaveUsage(
            tx as any,
            lrFull.employeeId,
            daysToHours(totalDeductionDays),
            lrFull.id,
            actorUserId
          );
          console.log(`✅ Sick leave usage recorded via ledger: ${totalDeductionDays} days`);
        } catch (sickLeaveError: any) {
          console.error("❌ Failed to record sick leave usage:", sickLeaveError);
          throw new Error(sickLeaveError.message || "Failed to deduct sick leave balance.");
        }
      }
    }
    // Only perform deduction if the request is not already approved AND entitlement is enforced
    else if (lrFull.approvalStatus !== "APPROVED" && enforceEntitlement) {
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

      // Round total deduction to 2 decimal places (NZ HRIS requirement)
      const totalDeduction = roundToTwoDecimals(totalDays.reduce((sum, val) => sum + val, 0));

      if (totalDeduction > 0) {
        // ── NZ HOLIDAYS ACT 2003: LEAVE IN ADVANCE TRACKING ──────────────────
        // For pre-12-month employees (no LeaveEntitlement record), we track leave usage
        // in the Employee.leaveInAdvanceUsed field instead of LeaveEntitlement.usedDays.
        // This leave will be deducted from their entitlement when it crystallises at
        // the 12-month anniversary.
        if (isPreTwelveMonthEmployee && isAnnualLeave) {
          // Pre-12-month employee: increment leaveInAdvanceUsed instead of LeaveEntitlement.usedDays
          const employee = await tx.employee.findUnique({
            where: { id: lrFull.employeeId },
            select: { 
              leaveInAdvanceUsed: true,
              futureAnnualLeaveEntitlement: true,
            },
          });

          if (!employee) {
            throw new Error("Employee not found.");
          }

          const currentLeaveInAdvance = Number(employee.leaveInAdvanceUsed || 0);
          const futureEntitlement = Number(employee.futureAnnualLeaveEntitlement || 0);
          
          // Check if the total leave in advance would exceed future entitlement
          // Note: This is a soft check - validation should have already caught this
          const newLeaveInAdvanceTotal = addWithPrecision(currentLeaveInAdvance, totalDeduction);
          
          if (newLeaveInAdvanceTotal > futureEntitlement) {
            console.warn("⚠️ NZ Compliance: Leave in advance exceeds future entitlement", {
              employeeId: lrFull.employeeId,
              currentLeaveInAdvance,
              totalDeduction,
              newLeaveInAdvanceTotal,
              futureEntitlement,
            });
            // Allow the request but log warning - HR should review at anniversary
          }

          // Update leaveInAdvanceUsed on the Employee record
          await tx.employee.update({
            where: { id: lrFull.employeeId },
            data: { leaveInAdvanceUsed: newLeaveInAdvanceTotal },
          });

          console.log("✅ NZ Compliance: Leave in advance recorded", {
            employeeId: lrFull.employeeId,
            previousLeaveInAdvance: currentLeaveInAdvance,
            deduction: totalDeduction,
            newLeaveInAdvanceTotal,
          });
        } else {
          // Post-12-month employee: use existing LeaveEntitlement deduction logic
          const entitlement = await tx.leaveEntitlement.findFirst({
            where: {
              employeeId: lrFull.employeeId,
              eventCategoryId: lrFull.eventCategoryId,
            },
          });

          if (!entitlement || subtractWithPrecision(entitlement.totalDays, entitlement.usedDays) < totalDeduction) {
            throw new Error("Insufficient leave balance.");
          }

          // Round usedDays to 2 decimal places (NZ HRIS requirement)
          await tx.leaveEntitlement.update({
            where: { id: entitlement.id },
            data: { usedDays: addWithPrecision(entitlement.usedDays, totalDeduction) },
          });
        }
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


