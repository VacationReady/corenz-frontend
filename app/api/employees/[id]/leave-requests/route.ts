import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveNotification } from "@/lib/sendLeaveNotification";
import { resolveApprovalWorkflow } from "@/lib/resolveApprovalWorkflow";
import { createLeaveApprovalPlan } from "@/lib/createLeaveApprovalPlan";
import { notifyApproversForStage } from "@/lib/approvalNotifications";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { validateLeaveRequest } from "@/lib/validateLeaveRequest";
import { createLeaveApprovalActionItem } from "@/lib/action-items-helper";
import {
  canAccessLeaveRequests,
  canCreateLeaveRequest,
  createAuthContext,
} from "@/lib/authz";
import { z } from "zod";

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return undefined;
  });

const leaveRequestCreateSchema = z.object({
  // Accept both keys for compatibility; prefer lowerCamel in code
  eventCategoryId: z
    .string({ required_error: "eventCategoryId is required" })
    .trim()
    .min(1, "eventCategoryId is required")
    .optional(),
  EventCategoryId: z
    .string()
    .trim()
    .min(1, "EventCategoryId is required")
    .optional(),
  startDate: z
    .string({ required_error: "startDate is required" })
    .trim()
    .min(1, "startDate is required"),
  endDate: z
    .string({ required_error: "endDate is required" })
    .trim()
    .min(1, "endDate is required"),
  reason: optionalTrimmedString,
  sickReason: optionalTrimmedString,
  paidStatus: z
    .enum(["PAID", "UNPAID"])
    .or(z.null())
    .or(z.undefined())
    .transform((val) => (typeof val === "string" ? val : undefined)),
  dayType: z
    .enum(["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"])
    .or(z.null())
    .or(z.undefined())
    .transform((val) => (typeof val === "string" ? val : undefined)),
});

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: employeeId } = await context.params;
    await ensurePrismaConnected();
    
    // 1. ✅ Authentication: Verify session exists
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    // 2. ✅ Create auth context for authorization checks
    const authContext = createAuthContext(session);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    // 3. ✅ Verify employee exists and belongs to same company (tenant isolation)
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true, userId: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    if (employee.companyId !== session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Cross-tenant access denied" },
        { status: 403 },
      );
    }

    // 4. ✅ Authorization: Check if user can access this employee's leave requests
    const hasAccess = await canAccessLeaveRequests(authContext, employeeId);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden: You do not have permission to view these leave requests" 
        },
        { status: 403 },
      );
    }

    // 5. ✅ Parse query parameters
    const { searchParams } = new URL(req.url);
    const upcoming = searchParams.get("upcoming") === "true";
    const limitParam = searchParams.get("limit");
    const take = limitParam
      ? Math.max(1, Math.min(1000, parseInt(limitParam, 10) || 0))
      : 3;

    const now = new Date();

    // 6. ✅ Query leave requests with multi-tenant filtering
    const where: any = {
      employeeId,
      // Multi-tenant isolation: only fetch from user's company
      Employee: { companyId: session.user.companyId },
      approvalStatus: "APPROVED",
      ...(upcoming
        ? {
            OR: [
              { startDate: { gte: now } },
              { AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }] }, // ongoing
            ],
          }
        : {}),
    };

    const leaves = await prisma.leaveRequest.findMany({
      where,
      orderBy: { startDate: "asc" },
      take,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        dayType: true,
        EventCategory: { select: { id: true, name: true, iconKey: true } },
        approvalStatus: true,
      },
    });

    return NextResponse.json(leaves);
  } catch (error) {
    console.error("[EMPLOYEE_LEAVE_REQUESTS_GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: employeeId } = await context.params;
    await ensurePrismaConnected();
    
    // 1. ✅ Authentication: Verify session exists
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      console.log("❌ Unauthenticated attempt to submit leave request");
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    // 2. ✅ Create auth context for authorization checks
    const authContext = createAuthContext(session);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
  const body = leaveRequestCreateSchema.parse(await req.json());
  const EventCategoryId = body.eventCategoryId || body.EventCategoryId;
  const { startDate, endDate, reason, sickReason, paidStatus, dayType } = body;
  if (!EventCategoryId) {
    return NextResponse.json(
      { success: false, error: "Event category is required" },
      { status: 400 },
    );
  }

    // 3. ✅ Verify employee exists and belongs to same company (tenant isolation)
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            managerId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!employee) {
      console.log("❌ Employee not found for leave request");
      return NextResponse.json(
        { success: false, error: "Employee not found." },
        { status: 404 },
      );
    }

    // 4. ✅ Authorization: Check if user can create leave request for this employee
    const canCreate = await canCreateLeaveRequest(authContext, employeeId);
    if (!canCreate) {
      console.log("❌ Unauthorized leave request submission attempt");
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden: You do not have permission to create leave requests for this employee" 
        },
        { status: 403 },
      );
    }

    const eventCategory = await prisma.eventCategory.findFirst({
      where: { id: EventCategoryId, companyId: session.user.companyId },
      select: { name: true },
    });

    if (!eventCategory) {
      console.log("❌ Invalid event category");
      return NextResponse.json(
        { success: false, error: "Invalid event category." },
        { status: 400 },
      );
    }

    const EventCategoryName = eventCategory.name;

    // Validate entitlement and overlap using the updated validateLeaveRequest
    await validateLeaveRequest({
      employeeId,
      eventCategoryId: EventCategoryId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAdmin:
        session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN",
      companyId: session.user.companyId,
    });

    const newLeaveRequest = await prisma.leaveRequest.create({
      data: {
        id: crypto.randomUUID(),
        Employee: { connect: { id: employeeId } },
        User_LeaveRequest_requesterIdToUser: { connect: { id: userId } },
        EventCategory: { connect: { id: EventCategoryId } },
        Company: { connect: { id: session.user.companyId } },
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        dayType: dayType ?? "FULL_DAY",
        reason: reason ?? "",
        paidStatus:
          EventCategoryName === "Sick Leave" ? (paidStatus ?? "PAID") : null,
        updatedAt: new Date(),
      },
    });
    
    // Auto-approve immediately when created by ADMIN or SUPER_ADMIN
    if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
      try {
        // Check if entitlement is enforced for this event category
        const eventRule = await prisma.eventRule.findUnique({
          where: {
            companyId_eventCategoryId: {
              companyId: session.user.companyId,
              eventCategoryId: EventCategoryId,
            },
          },
          select: { enforceEntitlement: true },
        });

        // Only enforce entitlement for Annual Leave by default (unless explicitly configured)
        const isAnnualLeave = EventCategoryName.toLowerCase().includes("annual leave");
        const enforceEntitlement = eventRule?.enforceEntitlement ?? isAnnualLeave;

        if (enforceEntitlement) {
          // Calculate deduction and enforce entitlement check
          const totalDays: number[] = [];
          let currentDate = new Date(newLeaveRequest.startDate);
          const endInclusive = new Date(newLeaveRequest.endDate);
          // Deduction uses inclusive range of away days (return-to-work exclusive)
          const exclusiveEnd = new Date(endInclusive);
          exclusiveEnd.setDate(exclusiveEnd.getDate() - 1);

          while (currentDate <= exclusiveEnd) {
            const deduction = await calculateLeaveDeduction(employeeId, currentDate);
            totalDays.push(deduction);
            currentDate.setDate(currentDate.getDate() + 1);
          }

          const totalDeduction = totalDays.reduce((sum, d) => sum + d, 0);

          const approved = await prisma.$transaction(async (tx) => {
            const entitlement = await tx.leaveEntitlement.findFirst({
              where: { employeeId, eventCategoryId: EventCategoryId },
            });

            if (!entitlement || entitlement.totalDays - entitlement.usedDays < totalDeduction) {
              throw new Error("Insufficient leave balance.");
            }

            await tx.leaveEntitlement.update({
              where: { id: entitlement.id },
              data: { usedDays: entitlement.usedDays + totalDeduction },
            });

            return tx.leaveRequest.update({
              where: { id: newLeaveRequest.id },
              data: { approvalStatus: "APPROVED", approvedById: session.user.id },
            });
          });

          return NextResponse.json({ success: true, data: approved });
        } else {
          // Entitlement not enforced - just approve without balance check/deduction
          console.log("ℹ️ Entitlement enforcement disabled for this event type. Auto-approving without balance check.");
          const approved = await prisma.leaveRequest.update({
            where: { id: newLeaveRequest.id },
            data: { approvalStatus: "APPROVED", approvedById: session.user.id },
          });

          return NextResponse.json({ success: true, data: approved });
        }
      } catch (e: any) {
        console.error("Auto-approve by admin failed:", e);
        // Fall through to workflow path if deduction failed for any reason
      }
    }

    // Resolve workflow for this request
    const employeeLite = {
      id: employee.id,
      departmentId: employee.departmentId ?? null,
      jobRoleId: employee.jobRoleId ?? null,
      companyId: session.user.companyId,
    } as any;

    const workflow = await resolveApprovalWorkflow({
      companyId: session.user.companyId,
      employee: employeeLite,
      eventCategoryId: EventCategoryId,
    });

    if (workflow) {
      const stages = await createLeaveApprovalPlan({
        prismaTx: prisma,
        leaveRequestId: newLeaveRequest.id,
        workflow: {
          ...workflow,
          context: {
            requesterUserId: employee.User.id,
            managerUserId: employee.User.managerId ?? null,
            findFallbackAdminUserId: () => null,
          },
        } as any,
      });

      // If manager was missing and no decisions created, fallback to an ADMIN, rebuild plan
      if (stages.some((s: any) => (s.decisions || []).length === 0)) {
        const admin = await prisma.user.findFirst({
          where: { companyId: session.user.companyId, role: "ADMIN" },
          select: { id: true },
        });
        if (admin?.id) {
          await prisma.leaveApprovalStage.deleteMany({ where: { leaveRequestId: newLeaveRequest.id } });
          await createLeaveApprovalPlan({
            prismaTx: prisma,
            leaveRequestId: newLeaveRequest.id,
            workflow: {
              ...workflow,
              context: {
                requesterUserId: employee.User.id,
                managerUserId: employee.User.managerId ?? null,
                findFallbackAdminUserId: () => admin.id,
              },
            } as any,
          });
        }
      }

      // Notify active approvers on first stage and create action items
      const first = stages.find((s: any) => s.isActive);
      if (first) {
        const lrFull = await prisma.leaveRequest.findUnique({
          where: { id: newLeaveRequest.id },
          include: { Employee: { include: { User: true } } },
        });
        
        // Create action items for all active approvers in the first stage
        const decisions = await prisma.leaveApprovalDecision.findMany({ 
          where: { stageId: first.id, isActive: true }, 
          include: { approver: true } 
        });
        
        for (const decision of decisions) {
          try {
            await createLeaveApprovalActionItem(
              newLeaveRequest.id,
              employeeId,
              decision.approverId,
              session.user.companyId,
              {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                typeName: EventCategoryName,
              }
            );
          } catch (actionItemError) {
            console.error("Failed to create leave approval action item:", actionItemError);
            // Don't fail the whole request if action item creation fails
          }
        }
        
        await notifyApproversForStage({
          stage: { ...first, decisions } as any,
          leaveRequest: lrFull as any,
          eventCategoryName: EventCategoryName,
        });
      }
    } else {
      // Fallback: if no workflow exists, create a single-stage plan to Manager
      let approverUserId: string | null = employee.User.managerId ?? null;

      // If no manager, fallback to any ADMIN in the same company
      if (!approverUserId) {
        const admin = await prisma.user.findFirst({
          where: { companyId: session.user.companyId, role: "ADMIN" },
          select: { id: true },
        });
        approverUserId = admin?.id ?? null;
      }

      if (approverUserId) {
        // Create a synthetic one-stage approval directly on the leave request
        const stage = await prisma.leaveApprovalStage.create({
          data: {
            leaveRequestId: newLeaveRequest.id,
            name: null,
            order: 0,
            mode: "SEQUENTIAL",
            status: "PENDING",
            isActive: true,
          },
        });

        await prisma.leaveApprovalDecision.create({
          data: {
            stageId: stage.id,
            approverId: approverUserId,
            order: 0,
            status: "PENDING",
            isActive: true,
          },
        });

        // Create action item for the approver
        try {
          await createLeaveApprovalActionItem(
            newLeaveRequest.id,
            employeeId,
            approverUserId,
            session.user.companyId,
            {
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              typeName: EventCategoryName,
            }
          );
        } catch (actionItemError) {
          console.error("Failed to create leave approval action item:", actionItemError);
          // Don't fail the whole request if action item creation fails
        }

        // Notify the approver
        const lrFull = await prisma.leaveRequest.findUnique({
          where: { id: newLeaveRequest.id },
          include: { Employee: { include: { User: true } } },
        });
        await notifyApproversForStage({
          stage: { ...stage, decisions: await prisma.leaveApprovalDecision.findMany({ where: { stageId: stage.id }, include: { approver: true } }) } as any,
          leaveRequest: lrFull as any,
          eventCategoryName: EventCategoryName,
        });
      } else {
        // As a last resort, send an email to the manager if any (legacy behavior)
        if (employee.User.managerId) {
          const manager = await prisma.user.findFirst({
            where: { id: employee.User.managerId, companyId: session.user.companyId },
            select: { email: true, name: true },
          });
          if (manager?.email) {
            const employeeFullName =
              `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
              "Employee";
            await sendLeaveNotification({
              to: manager.email,
              subject: `New Leave Request from ${employeeFullName}`,
              employeeName: employeeFullName,
              type: EventCategoryName,
              startDate,
              endDate,
              approverName: manager.name || undefined,
            });
          }
        }
      }
    }

    console.log("✅ Leave request submitted successfully");
    // Return with approval stages when present
    const full = await prisma.leaveRequest.findUnique({
      where: { id: newLeaveRequest.id },
      include: {
        LeaveApprovalStage: {
          orderBy: { order: "asc" },
          include: { decisions: { orderBy: { order: "asc" }, include: { approver: true } } },
        },
      },
    });

    const response = full
      ? {
          ...newLeaveRequest,
          approvalStages: (full.LeaveApprovalStage || []).map((s: any) => ({
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
        }
      : newLeaveRequest;

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("❌ Error submitting leave request:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to submit leave request.",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
