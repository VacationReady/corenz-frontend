import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { sendLeaveStatusUpdate } from "@/lib/sendLeaveStatusUpdate";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { z } from "zod";
import { processDecision } from "@/lib/advanceLeaveApproval";
import { roundToTwoDecimals, addWithPrecision } from "@/lib/decimalPrecision";
import { hasPermission, UserWithProfile } from "@/lib/permissions";
import { recordSickLeaveUsage, reverseSickLeaveUsage, daysToHours } from "@/lib/leave/nz-sick-leave-ledger";

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
  const session = await auth();

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
  const session = await auth();

  if (!session?.user || !session.user.companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: leaveId } = await context.params;

  // Fetch user with permission profile for centralized authorization
  const userWithProfile = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { PermissionProfile: true },
  });

  if (!userWithProfile) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 401 },
    );
  }

  const permissionUser: UserWithProfile = {
    ...userWithProfile,
    permissionProfile: userWithProfile.PermissionProfile,
  };

  // Check leave approval permission via centralized permission system
  if (!hasPermission(permissionUser, "leave-requests", "approve")) {
    return NextResponse.json(
      { success: false, error: "You do not have permission to approve or decline leave requests" },
      { status: 403 },
    );
  }

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
      // Check if entitlement is enforced for this event category
      const eventRule = await prisma.eventRule.findUnique({
        where: {
          companyId_eventCategoryId: {
            companyId: leave.companyId,
            eventCategoryId: leave.eventCategoryId,
          },
        },
        select: { enforceEntitlement: true },
      });

      // Only enforce entitlement for Annual Leave by default (unless explicitly configured)
      const isAnnualLeave = leave.EventCategory?.name?.toLowerCase().includes("annual leave") ?? false;
      const enforceEntitlement = eventRule?.enforceEntitlement ?? isAnnualLeave;

      let updatedLeaveRequest;

      if (enforceEntitlement) {
        // Calculate deduction and enforce entitlement check
        const totalDays: number[] = [];
        let currentDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        // End date is the last day away (inclusive) - UI instructs user not to include return-to-work day

        while (currentDate <= endDate) {
          const deduction = await calculateLeaveDeduction(
            leave.employeeId,
            currentDate,
          );
          totalDays.push(deduction);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Round total deduction to 2 decimal places (NZ HRIS requirement)
        const totalDeduction = roundToTwoDecimals(totalDays.reduce((sum, val) => sum + val, 0));

        updatedLeaveRequest = await prisma.$transaction(async (tx) => {
          const entitlement = await tx.leaveEntitlement.findFirst({
            where: {
              employeeId: leave.employeeId,
              eventCategoryId: leave.eventCategoryId,
            },
          });

          if (!entitlement || entitlement.totalDays - entitlement.usedDays < totalDeduction) {
            throw new Error("Insufficient leave balance.");
          }

          // Round usedDays to 2 decimal places (NZ HRIS requirement)
          await tx.leaveEntitlement.update({
            where: { id: entitlement.id },
            data: { usedDays: addWithPrecision(entitlement.usedDays, totalDeduction) },
          });

          return tx.leaveRequest.update({
            where: { id: leaveId },
            data: { approvalStatus: "APPROVED", approvedById: session.user.id },
          });
        });
      } else {
        // Entitlement not enforced - check if this is sick leave to deduct from sick leave balance
        const isSickLeave = (leave as any).leaveType === "SICK" || 
          leave.EventCategory?.name?.toLowerCase().includes("sick");
        
        if (isSickLeave) {
          // Calculate sick leave days to deduct
          let sickDays = 0;
          let currentDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          // End date is the last day away (inclusive) - UI instructs user not to include return-to-work day

          while (currentDate <= endDate) {
            const deduction = await calculateLeaveDeduction(leave.employeeId, currentDate);
            sickDays += deduction;
            currentDate.setDate(currentDate.getDate() + 1);
          }

          sickDays = roundToTwoDecimals(sickDays);
          
          if (sickDays > 0) {
            const sickHours = daysToHours(sickDays);
            
            // NZ Holidays Act 2003: Validate balance BEFORE approving to prevent negative balances
            const employeeBalance = await prisma.employee.findUnique({
              where: { id: leave.employeeId },
              select: { sickLeaveBalance: true },
            });
            const currentBalance = Number(employeeBalance?.sickLeaveBalance || 0);
            
            if (currentBalance < sickHours) {
              const availableDays = roundToTwoDecimals(currentBalance / 8); // HOURS_PER_DAY
              return NextResponse.json(
                { 
                  success: false, 
                  error: `Cannot approve: Insufficient sick leave balance. Employee has ${availableDays} days available, but ${sickDays} days requested.` 
                },
                { status: 400 }
              );
            }
            
            // Balance is sufficient - record the usage
            try {
              await recordSickLeaveUsage(
                prisma as any,
                leave.employeeId,
                sickHours,
                leaveId,
                session.user.id
              );
            } catch (sickLeaveError: any) {
              console.error("Failed to record sick leave usage:", sickLeaveError);
              // If recording fails, reject the approval to maintain data consistency
              return NextResponse.json(
                { 
                  success: false, 
                  error: "Failed to process sick leave balance. Please try again or contact support." 
                },
                { status: 500 }
              );
            }
          }
        }
        
        updatedLeaveRequest = await prisma.leaveRequest.update({
          where: { id: leaveId },
          data: { approvalStatus: "APPROVED", approvedById: session.user.id },
        });
      }

      // Complete associated action items
      try {
        await prisma.actionItem.updateMany({
          where: {
            type: "LEAVE_APPROVAL",
            metadata: {
              path: ["leaveRequestId"],
              equals: leaveId,
            },
            status: "PENDING",
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      } catch (actionItemError) {
        console.error("Failed to complete leave approval action items:", actionItemError);
      }

      return NextResponse.json({ success: true, data: updatedLeaveRequest });
    }

    // Decline
    const declined = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { approvalStatus: "DECLINED", approvedById: session.user.id },
    });

    // Complete associated action items
    try {
      await prisma.actionItem.updateMany({
        where: {
          type: "LEAVE_APPROVAL",
          metadata: {
            path: ["leaveRequestId"],
            equals: leaveId,
          },
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
          completedAt: new Date(),
        },
      });
    } catch (actionItemError) {
      console.error("Failed to complete leave approval action items:", actionItemError);
    }

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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user || !session.user.companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: leaveId } = await context.params;

  try {
    await ensurePrismaConnected();

    // Fetch the leave request with related data
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        Employee: {
          include: { User: true },
        },
        EventCategory: true,
        LeaveApprovalStage: true,
      },
    });

    if (!leave || leave.companyId !== session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Leave request not found" },
        { status: 404 },
      );
    }

    // Fetch user with permission profile for centralized authorization
    const userWithProfile = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { PermissionProfile: true },
    });

    const permissionUser: UserWithProfile = userWithProfile
      ? { ...userWithProfile, permissionProfile: userWithProfile.PermissionProfile }
      : { id: session.user.id, role: session.user.role } as UserWithProfile;

    const canDeleteAny = hasPermission(permissionUser, "leave-requests", "delete");
    const isOwnRequest = leave.Employee?.User?.id === session.user.id;

    // Users without delete permission can only delete their own PENDING requests
    if (!canDeleteAny) {
      if (!isOwnRequest) {
        return NextResponse.json(
          { success: false, error: "You can only delete your own leave requests" },
          { status: 403 },
        );
      }
      if (leave.approvalStatus !== "PENDING") {
        return NextResponse.json(
          { success: false, error: "You can only cancel pending leave requests" },
          { status: 400 },
        );
      }
    }

    // If the leave was APPROVED, we need to return the deducted days to entitlement
    if (leave.approvalStatus === "APPROVED") {
      // Check if this is sick leave
      const isSickLeave = (leave as any).leaveType === "SICK" || 
        leave.EventCategory?.name?.toLowerCase().includes("sick");
      
      if (isSickLeave) {
        // Reverse sick leave usage from the ledger
        // NZ Holidays Act 2003: Balance accuracy is critical for compliance
        // If reversal fails, we must not delete the leave request to prevent data loss
        try {
          await reverseSickLeaveUsage(
            prisma as any,
            leave.employeeId,
            leaveId,
            session.user.id
          );
        } catch (sickLeaveError: any) {
          console.error("Failed to reverse sick leave usage:", sickLeaveError);
          return NextResponse.json(
            { 
              success: false, 
              error: "Failed to reverse sick leave balance. The leave request cannot be deleted to prevent data loss. Please contact support." 
            },
            { status: 500 }
          );
        }
      } else {
        // Calculate how many days were deducted for regular leave
        const totalDays: number[] = [];
        let currentDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        // End date is the last day away (inclusive) - UI instructs user not to include return-to-work day

        while (currentDate <= endDate) {
          const deduction = await calculateLeaveDeduction(
            leave.employeeId,
            currentDate,
          );
          totalDays.push(deduction);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const totalDeduction = roundToTwoDecimals(totalDays.reduce((sum, val) => sum + val, 0));

        // Return the days to the entitlement
        const entitlement = await prisma.leaveEntitlement.findFirst({
          where: {
            employeeId: leave.employeeId,
            eventCategoryId: leave.eventCategoryId,
          },
        });

        if (entitlement && totalDeduction > 0) {
          await prisma.leaveEntitlement.update({
            where: { id: entitlement.id },
            data: { 
              usedDays: Math.max(0, roundToTwoDecimals(entitlement.usedDays - totalDeduction))
            },
          });
        }
      }
    }

    // Cancel associated action items
    await prisma.actionItem.updateMany({
      where: {
        type: "LEAVE_APPROVAL",
        metadata: {
          path: ["leaveRequestId"],
          equals: leaveId,
        },
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    // Delete approval stages and decisions if any
    if (leave.LeaveApprovalStage && leave.LeaveApprovalStage.length > 0) {
      await prisma.leaveApprovalDecision.deleteMany({
        where: {
          stage: {
            leaveRequestId: leaveId,
          },
        },
      });
      await prisma.leaveApprovalStage.deleteMany({
        where: { leaveRequestId: leaveId },
      });
    }

    // Store details before deletion for audit log
    const auditDetails = {
      employeeId: leave.employeeId,
      employeeName: leave.Employee?.User?.name || leave.Employee?.User?.email,
      categoryName: leave.EventCategory?.name,
      startDate: leave.startDate,
      endDate: leave.endDate,
      approvalStatus: leave.approvalStatus,
    };

    // Delete the leave request
    await prisma.leaveRequest.delete({
      where: { id: leaveId },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        action: "DELETED",
        entityType: "LEAVE_REQUEST",
        entityId: leaveId,
        companyId: session.user.companyId,
        actorId: session.user.id,
        actorType: "USER",
        changes: auditDetails,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Leave request deleted successfully" 
    });
  } catch (error: any) {
    console.error("[LEAVE_REQUEST_DELETE]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete leave request" },
      { status: 500 },
    );
  }
}
