import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { sendLeaveNotification } from "@/lib/sendLeaveNotification";
import { resolveApprovalWorkflow } from "@/lib/resolveApprovalWorkflow";
import { createLeaveApprovalPlan } from "@/lib/createLeaveApprovalPlan";
import { notifyApproversForStage } from "@/lib/approvalNotifications";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { validateLeaveRequest } from "@/lib/validateLeaveRequest";
import {
  canAccessLeaveRequests,
  canCreateLeaveRequest,
  createAuthContext,
} from "@/lib/authz";
import { z } from "zod";
import {
  recordSickLeaveUsage,
  applySickLeaveGrants,
  daysToHours,
} from "@/lib/leave/nz-sick-leave-ledger";
import { roundToTwoDecimals } from "@/lib/decimalPrecision";

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
  // First-class sick leave toggle - when true, this is sick leave
  // When isSick === true, eventCategoryId is ignored
  isSick: z.boolean().optional().default(false),
  // Accept both keys for compatibility; prefer lowerCamel in code
  // Required when isSick === false, optional when isSick === true
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
  sickReasonId: optionalTrimmedString,
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
  // Admin/Manager override flag - when true, bypasses validation warnings
  bypassWarnings: z.boolean().optional().default(false),
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
    const session = await auth();
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
    const modeParam = searchParams.get("mode");

    // New query params for filtering
    // from: YYYY-MM-DD (inclusive) - start of date range
    // to: YYYY-MM-DD (inclusive) - end of date range
    // isSick: "true" | "false" - filter by sick leave type
    // status: "pending" | "approved" | "declined" - filter by approval status
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const isSickParam = searchParams.get("isSick");
    const statusParam = searchParams.get("status");

    const take = limitParam
      ? Math.max(1, Math.min(5000, parseInt(limitParam, 10) || 0))
      : fromParam || toParam
        ? 500
        : 3;

    const now = new Date();

    // Build date range filter (inclusive semantics: from <= startDate AND endDate <= to)
    const dateRangeFilter: any = {};
    if (fromParam) {
      const fromDate = new Date(fromParam);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        dateRangeFilter.endDate = { gte: fromDate };
      }
    }
    if (toParam) {
      const toDate = new Date(toParam);
      if (!isNaN(toDate.getTime())) {
        // Inclusive: set to end of day
        toDate.setHours(23, 59, 59, 999);
        dateRangeFilter.startDate = { lte: toDate };
      }
    }

    // Build status filter
    let statusFilter: string | undefined;
    if (statusParam) {
      const normalizedStatus = statusParam.toUpperCase();
      if (["PENDING", "APPROVED", "DECLINED"].includes(normalizedStatus)) {
        statusFilter = normalizedStatus;
      }
    }

    // 6. ✅ Query leave requests with multi-tenant filtering
    const where: any = {
      employeeId,
      // Multi-tenant isolation: only fetch from user's company
      Employee: { companyId: session.user.companyId },
      // Default to APPROVED if no status filter and using legacy upcoming mode
      ...(statusFilter
        ? { approvalStatus: statusFilter }
        : !fromParam && !toParam
          ? { approvalStatus: "APPROVED" }
          : {}),
      ...dateRangeFilter,
      ...(upcoming && !fromParam && !toParam
        ? {
            OR: [
              { startDate: { gte: now } },
              { AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }] }, // ongoing
            ],
          }
        : {}),
    };

    const calendarMode = modeParam === "calendar" && isSickParam === null;

    const leaves: any[] = await (prisma.leaveRequest as any).findMany({
      where,
      orderBy: { startDate: "asc" },
      take,
      select: calendarMode
        ? {
            id: true,
            startDate: true,
            endDate: true,
            EventCategory: { select: { id: true, name: true, iconKey: true } },
            approvalStatus: true,
            reason: true,
          }
        : {
            id: true,
            startDate: true,
            endDate: true,
            dayType: true,
            leaveType: true,
            EventCategory: { select: { id: true, name: true, iconKey: true } },
            approvalStatus: true,
            reason: true,
            sickReason: true,
            paidStatus: true,
            EventSubcategory: { select: { id: true, name: true } },
          },
    });

    if (calendarMode) {
      return NextResponse.json(leaves);
    }

    // Transform response to include isSick flag based on leaveType
    // leaveType = "SICK" indicates sick leave (first-class field)
    // For backward compatibility, also check EventCategory name for legacy data
    const transformedLeaves = leaves.map((leave) => {
      const isSick = leave.leaveType === "SICK" || 
        (leave.EventCategory?.name?.toLowerCase().includes("sick") ?? false);

      const resolvedSickReason =
        (leave.sickReason ?? null) ||
        ((leave as any).EventSubcategory?.name ?? null);
      
      return {
        ...leave,
        isSick,
        // Ensure leaveType is set for UI consumption
        leaveType: leave.leaveType || (isSick ? "SICK" : leave.EventCategory?.name || "LEAVE"),
        sickReason: resolvedSickReason,
        sickReasonId: ((leave as any).EventSubcategory?.id ?? null),
      };
    });

    // Apply isSick filter if specified (post-query filter for flexibility)
    let filteredLeaves = transformedLeaves;
    if (isSickParam !== null) {
      const filterSick = isSickParam === "true";
      filteredLeaves = transformedLeaves.filter((leave) => leave.isSick === filterSick);
    }

    return NextResponse.json(filteredLeaves);
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
    const session = await auth();
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
    const { startDate, endDate, reason, sickReasonId, sickReason, paidStatus, dayType, isSick, bypassWarnings } = body;
    
    // DEBUG: Log incoming request details for sick leave troubleshooting
    console.log("🔍 [LEAVE_REQUEST_DEBUG] Incoming request:", {
      employeeId,
      isSick,
      startDate,
      endDate,
      sessionUserRole: session.user.role,
      sessionUserId: session.user.id,
      sickReasonId,
      sickReason,
      paidStatus,
    });
  
  // First-class sick leave: isSick === true means this is sick leave
  // When sick, eventCategoryId is ignored - we use a placeholder or the company's sick leave category
  let EventCategoryId = body.eventCategoryId || body.EventCategoryId;

  let resolvedSickReason: string | undefined = sickReason;
  
  // For sick leave, we need to find or use a sick leave category
  // This maintains backward compatibility with existing category-based leave system
  if (isSick) {
    // Find or use the company's sick leave category
    const sickCategory = await prisma.eventCategory.findFirst({
      where: {
        companyId: session.user.companyId,
        name: { contains: "sick", mode: "insensitive" },
      },
      select: { id: true },
    });
    
    if (sickCategory) {
      EventCategoryId = sickCategory.id;
    } else {
      // If no sick category exists, require one to be specified
      if (!EventCategoryId) {
        return NextResponse.json(
          { success: false, error: "No sick leave category configured. Please contact your administrator." },
          { status: 400 },
        );
      }
    }
    
    if (sickReasonId) {
      const sub = await prisma.eventSubcategory.findFirst({
        where: {
          id: sickReasonId,
          companyId: session.user.companyId,
          isActive: true,
          eventCategoryId: EventCategoryId,
        },
        select: { id: true, name: true },
      });

      if (!sub) {
        return NextResponse.json(
          { success: false, error: "Invalid sick reason selected." },
          { status: 400 },
        );
      }

      resolvedSickReason = sub.name;
    }

    // Validate sick leave requirements
    if (!resolvedSickReason) {
      return NextResponse.json(
        { success: false, error: "Sick reason is required for sick leave." },
        { status: 400 },
      );
    }
  } else if (!EventCategoryId) {
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

    // Parse dates as local dates (not UTC) to avoid timezone shifts
    // When user selects "2025-12-23", we want exactly that date, not UTC midnight
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    };

    const startDateObj = parseLocalDate(startDate);
    const endDateObj = parseLocalDate(endDate);

    console.log("🔍 [LEAVE_REQUEST_DEBUG] Parsed dates:", {
      startDateObj: startDateObj.toISOString(),
      endDateObj: endDateObj.toISOString(),
      EventCategoryId,
    });

    // Validate entitlement and overlap using the updated validateLeaveRequest
    const warnings = await validateLeaveRequest({
      employeeId,
      eventCategoryId: EventCategoryId,
      startDate: startDateObj,
      endDate: endDateObj,
      dayType: dayType ?? "FULL_DAY",
      isAdmin:
        session.user.role === "ADMIN" || 
        session.user.role === "SUPER_ADMIN" ||
        session.user.role === "MANAGER",
      companyId: session.user.companyId,
      bypassWarnings: bypassWarnings === true,
    });

    console.log("🔍 [LEAVE_REQUEST_DEBUG] Validation result:", {
      warningsCount: warnings.length,
      warnings: warnings.map(w => ({ code: w.code, message: w.message })),
      bypassWarnings,
    });

    // If there are warnings and user hasn't confirmed bypass, return warnings for confirmation
    if (warnings.length > 0 && !bypassWarnings) {
      console.log("⚠️ Validation warnings detected, requesting user confirmation");
      return NextResponse.json(
        { 
          success: false, 
          requiresConfirmation: true,
          warnings: warnings.map(w => ({
            code: w.code,
            message: w.message,
            severity: w.severity,
            ruleType: w.ruleType,
          })),
        },
        { status: 200 },
      );
    }

    // Determine if the current user is booking leave for someone else (not themselves)
    // If employee has no linked User, assume it's for someone else
    const isBookingForSomeoneElse = !employee.User?.id || employee.User.id !== session.user.id;
    
    // Determine if the current user is a manager of this employee
    const isManagerOfEmployee = 
      session.user.role === "MANAGER" && 
      employee.User?.managerId === session.user.id;

    // Auto-approve immediately when:
    // 1. Created by ADMIN or SUPER_ADMIN (for anyone)
    // 2. Created by a MANAGER for their direct reports (not for themselves)
    // 3. SICK LEAVE: Any admin or manager booking sick leave for someone else always auto-approves
    //    (sick leave doesn't need approval workflow - it's recorded and reviewed at reporting stage)
    // Managers booking their OWN leave should follow normal approval workflow
    const canAutoApprove = 
      (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") ||
      (session.user.role === "MANAGER" && isManagerOfEmployee && isBookingForSomeoneElse) ||
      // Sick leave special case: any manager can auto-approve sick leave for any employee
      (isSick && session.user.role === "MANAGER" && isBookingForSomeoneElse);

    // DEBUG: Log auto-approve decision
    console.log("🔍 [LEAVE_REQUEST_DEBUG] Auto-approve check:", {
      sessionUserRole: session.user.role,
      isBookingForSomeoneElse,
      isManagerOfEmployee,
      canAutoApprove,
      isSick,
      employeeUserId: employee.User?.id,
      sessionUserId: session.user.id,
    });

    if (canAutoApprove) {
      console.log("🔍 [LEAVE_REQUEST_DEBUG] Entering canAutoApprove block");
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

        // NZ SICK LEAVE: Handle sick leave via ledger system (Holidays Act 2003)
        // Sick leave uses a separate balance tracking system from regular leave entitlements
        if (isSick) {
          console.log("🔍 [LEAVE_REQUEST_DEBUG] Entering sick leave handling block");
          console.log("🔍 [LEAVE_REQUEST_DEBUG] Sick leave params:", {
            EventCategoryId,
            sickReasonId,
            resolvedSickReason,
            paidStatus,
            startDateObj: startDateObj.toISOString(),
            endDateObj: endDateObj.toISOString(),
          });
          
          // Calculate deduction for sick leave
          const totalDays: number[] = [];
          let currentDate = new Date(startDateObj);

          while (currentDate <= endDateObj) {
            const deduction = await calculateLeaveDeduction(employeeId, currentDate);
            totalDays.push(deduction);
            currentDate.setDate(currentDate.getDate() + 1);
          }

          const totalDeductionDays = roundToTwoDecimals(totalDays.reduce((sum, d) => sum + d, 0));

          // Build the data object for leave request creation
          const leaveRequestData: any = {
            id: crypto.randomUUID(),
            Employee: { connect: { id: employeeId } },
            User_LeaveRequest_requesterIdToUser: { connect: { id: userId } },
            EventCategory: { connect: { id: EventCategoryId } },
            Company: { connect: { id: session.user.companyId } },
            startDate: startDateObj,
            endDate: endDateObj,
            dayType: dayType ?? "FULL_DAY",
            reason: reason ?? "",
            leaveType: "SICK",
            sickReason: resolvedSickReason,
            paidStatus: paidStatus ?? "PAID",
            updatedAt: new Date(),
            approvalStatus: "APPROVED",
            // Use relation connect for approvedById
            User_LeaveRequest_approvedByIdToUser: { connect: { id: session.user.id } },
          };

          // Only connect EventSubcategory if sickReasonId is provided and valid
          if (sickReasonId) {
            // Verify the subcategory exists before trying to connect
            const subcategoryExists = await prisma.eventSubcategory.findFirst({
              where: { id: sickReasonId },
              select: { id: true },
            });
            if (subcategoryExists) {
              leaveRequestData.EventSubcategory = { connect: { id: sickReasonId } };
            } else {
              console.warn(`⚠️ [LEAVE_REQUEST_DEBUG] Subcategory ${sickReasonId} not found, skipping connection`);
            }
          }

          // Create leave request
          const newLeaveRequest = await (prisma.leaveRequest as any).create({
            data: leaveRequestData,
          });

          console.log("✅ [LEAVE_REQUEST_DEBUG] Sick leave request created:", {
            id: newLeaveRequest.id,
            approvalStatus: newLeaveRequest.approvalStatus,
            totalDeductionDays,
          });

          // Record sick leave usage via ledger system
          if (totalDeductionDays > 0) {
            try {
              const hoursToDeduct = daysToHours(totalDeductionDays);
              console.log(`🔍 [SICK_LEAVE_DEBUG] Recording usage: ${totalDeductionDays} days = ${hoursToDeduct} hours`);
              
              // Apply any pending grants first
              await applySickLeaveGrants(prisma as any, employeeId, new Date(), session.user.id);
              // Record the usage
              await recordSickLeaveUsage(
                prisma as any,
                employeeId,
                hoursToDeduct,
                newLeaveRequest.id,
                session.user.id
              );
              console.log(`✅ Sick leave usage recorded via ledger: ${totalDeductionDays} days (${hoursToDeduct} hours) for request ${newLeaveRequest.id}`);
            } catch (sickLeaveError: any) {
              console.error("❌ Failed to record sick leave usage:", sickLeaveError?.message || sickLeaveError);
              // Log more details for debugging
              console.error("❌ Sick leave error details:", {
                employeeId,
                totalDeductionDays,
                hoursToDeduct: daysToHours(totalDeductionDays),
                leaveRequestId: newLeaveRequest.id,
                errorStack: sickLeaveError?.stack,
              });
              // Don't fail the request - the leave is booked, balance tracking can be reconciled
              // This matches the behavior in advanceLeaveApproval.ts
            }
          } else {
            console.log(`⚠️ [SICK_LEAVE_DEBUG] No deduction needed: totalDeductionDays = ${totalDeductionDays}`);
          }

          return NextResponse.json({ success: true, data: newLeaveRequest });
        }

        if (enforceEntitlement) {
          // Calculate deduction before transaction
          // startDateObj and endDateObj are already parsed above
          const totalDays: number[] = [];
          let currentDate = new Date(startDateObj);
          // End date is the last day away (inclusive) - UI instructs user not to include return-to-work day

          while (currentDate <= endDateObj) {
            const deduction = await calculateLeaveDeduction(employeeId, currentDate);
            totalDays.push(deduction);
            currentDate.setDate(currentDate.getDate() + 1);
          }

          const totalDeduction = totalDays.reduce((sum, d) => sum + d, 0);

          // Execute entire operation in a single transaction to prevent orphaned records
          const approved = await prisma.$transaction(async (tx) => {
            const entitlement = await tx.leaveEntitlement.findFirst({
              where: { employeeId, eventCategoryId: EventCategoryId },
            });

            if (!entitlement || entitlement.totalDays - entitlement.usedDays < totalDeduction) {
              throw new Error("Insufficient leave balance.");
            }

            // Create leave request inside transaction
            const newLeaveRequest = await (tx.leaveRequest as any).create({
              data: {
                id: crypto.randomUUID(),
                Employee: { connect: { id: employeeId } },
                User_LeaveRequest_requesterIdToUser: { connect: { id: userId } },
                EventCategory: { connect: { id: EventCategoryId } },
                Company: { connect: { id: session.user.companyId } },
                startDate: startDateObj,
                endDate: endDateObj,
                dayType: dayType ?? "FULL_DAY",
                reason: reason ?? "",
                // First-class sick leave fields
                leaveType: isSick ? "SICK" : null,
                sickReason: isSick ? resolvedSickReason : null,
                paidStatus: isSick ? (paidStatus ?? "PAID") : null,
                ...(isSick && sickReasonId
                  ? { EventSubcategory: { connect: { id: sickReasonId } } }
                  : {}),
                updatedAt: new Date(),
              },
            });

            // Update entitlement
            await tx.leaveEntitlement.update({
              where: { id: entitlement.id },
              data: { usedDays: entitlement.usedDays + totalDeduction },
            });

            // Approve leave request
            return (tx.leaveRequest as any).update({
              where: { id: newLeaveRequest.id },
              data: { 
                approvalStatus: "APPROVED", 
                User_LeaveRequest_approvedByIdToUser: { connect: { id: session.user.id } },
              },
            });
          });

          return NextResponse.json({ success: true, data: approved });
        } else {
          // Entitlement not enforced - create and approve in single transaction
          console.log("ℹ️ Entitlement enforcement disabled for this event type. Auto-approving without balance check.");
          const approved = await prisma.$transaction(async (tx) => {
            const newLeaveRequest = await (tx.leaveRequest as any).create({
              data: {
                id: crypto.randomUUID(),
                Employee: { connect: { id: employeeId } },
                User_LeaveRequest_requesterIdToUser: { connect: { id: userId } },
                EventCategory: { connect: { id: EventCategoryId } },
                Company: { connect: { id: session.user.companyId } },
                startDate: startDateObj,
                endDate: endDateObj,
                dayType: dayType ?? "FULL_DAY",
                reason: reason ?? "",
                // First-class sick leave fields
                leaveType: isSick ? "SICK" : null,
                sickReason: isSick ? resolvedSickReason : null,
                paidStatus: isSick ? (paidStatus ?? "PAID") : null,
                ...(isSick && sickReasonId
                  ? { EventSubcategory: { connect: { id: sickReasonId } } }
                  : {}),
                updatedAt: new Date(),
              },
            });

            return (tx.leaveRequest as any).update({
              where: { id: newLeaveRequest.id },
              data: { 
                approvalStatus: "APPROVED", 
                User_LeaveRequest_approvedByIdToUser: { connect: { id: session.user.id } },
              },
            });
          });

          return NextResponse.json({ success: true, data: approved });
        }
      } catch (e: any) {
        console.error("❌ [LEAVE_REQUEST_DEBUG] Auto-approve by admin/manager failed:", e?.message || e);
        console.error("❌ [LEAVE_REQUEST_DEBUG] Full error:", e);
        // Re-throw the error instead of falling through to workflow path
        // This ensures admins see the actual error instead of silent failure
        return NextResponse.json(
          { success: false, error: e?.message || "Failed to create leave request" },
          { status: 500 },
        );
      }
    }

    console.log("🔍 [LEAVE_REQUEST_DEBUG] Falling through to workflow path (non-admin or error occurred)");
    
    // Non-admin/non-manager path: create leave request for workflow approval
    const newLeaveRequest = await (prisma.leaveRequest as any).create({
      data: {
        id: crypto.randomUUID(),
        Employee: { connect: { id: employeeId } },
        User_LeaveRequest_requesterIdToUser: { connect: { id: userId } },
        EventCategory: { connect: { id: EventCategoryId } },
        Company: { connect: { id: session.user.companyId } },
        startDate: startDateObj,
        endDate: endDateObj,
        dayType: dayType ?? "FULL_DAY",
        reason: reason ?? "",
        // First-class sick leave fields
        leaveType: isSick ? "SICK" : null,
        sickReason: isSick ? resolvedSickReason : null,
        paidStatus: isSick ? (paidStatus ?? "PAID") : null,
        ...(isSick && sickReasonId
          ? { EventSubcategory: { connect: { id: sickReasonId } } }
          : {}),
        updatedAt: new Date(),
      },
    });

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

      // Notify active approvers on first stage
      // Note: We do NOT create separate ActionItem records here because
      // LeaveApprovalDecision records are already created and fetched by /api/approvals
      const first = stages.find((s: any) => s.isActive);
      if (first) {
        const lrFull = await prisma.leaveRequest.findUnique({
          where: { id: newLeaveRequest.id },
          include: { Employee: { include: { User: true } } },
        });
        
        const decisions = await prisma.leaveApprovalDecision.findMany({ 
          where: { stageId: first.id, isActive: true }, 
          include: { approver: true } 
        });
        
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

        // Note: We do NOT create separate ActionItem records here because
        // LeaveApprovalDecision records are already fetched by /api/approvals
        // and displayed in the action items widget via the approvals flow

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

    // Known validation failures should be treated as 400 (client error), not 500.
    if (error?.code === "LEAVE_OVERLAP_FULL_DAY") {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "This employee already has a leave event on those dates.",
          code: error.code,
          conflict: error.conflict ?? null,
        },
        { status: 400 },
      );
    }

    if (error?.code === "SICK_LEAVE_NOT_ELIGIBLE") {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Employee is not eligible for sick leave.",
          code: error.code,
          eligibleFrom: error.eligibleFrom ?? null,
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
