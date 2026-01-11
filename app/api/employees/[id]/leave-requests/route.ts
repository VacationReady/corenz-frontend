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
  // Other entitlement ID for custom employee-specific entitlements (admin-only)
  otherEntitlementId: z.string().trim().min(1).optional(),
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

    // Build status filter - supports comma-separated values (e.g., "APPROVED,PENDING")
    let statusFilter: string[] | undefined;
    if (statusParam) {
      const statuses = statusParam.split(",").map(s => s.trim().toUpperCase());
      const validStatuses = statuses.filter(s => ["PENDING", "APPROVED", "DECLINED"].includes(s));
      if (validStatuses.length > 0) {
        statusFilter = validStatuses;
      }
    }

    // 6. ✅ Query leave requests with multi-tenant filtering
    const where: any = {
      employeeId,
      // Multi-tenant isolation: only fetch from user's company
      Employee: { companyId: session.user.companyId },
      // Default to APPROVED if no status filter and using legacy upcoming mode
      ...(statusFilter
        ? { approvalStatus: { in: statusFilter } }
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
            leaveType: true,
            otherEntitlementId: true,
            EventCategory: { select: { id: true, name: true, iconKey: true } },
            OtherEntitlement: { select: { id: true, name: true } },
            approvalStatus: true,
            reason: true,
          }
        : {
            id: true,
            startDate: true,
            endDate: true,
            dayType: true,
            leaveType: true,
            otherEntitlementId: true,
            EventCategory: { select: { id: true, name: true, iconKey: true } },
            OtherEntitlement: { select: { id: true, name: true } },
            approvalStatus: true,
            reason: true,
            sickReason: true,
            paidStatus: true,
            EventSubcategory: { select: { id: true, name: true } },
          },
    });

    if (calendarMode) {
      // For calendar mode, include other entitlement name in the response
      const calendarLeaves = leaves.map((leave) => ({
        ...leave,
        categoryName: leave.leaveType === "OTHER_ENTITLEMENT" && leave.OtherEntitlement?.name
          ? leave.OtherEntitlement.name
          : leave.EventCategory?.name,
        isOtherEntitlement: leave.leaveType === "OTHER_ENTITLEMENT" || Boolean(leave.otherEntitlementId),
      }));
      return NextResponse.json(calendarLeaves);
    }

    // Transform response to include isSick flag based on leaveType
    // leaveType = "SICK" indicates sick leave (first-class field)
    // For backward compatibility, also check EventCategory name for legacy data
    const transformedLeaves = leaves.map((leave) => {
      const isSick = leave.leaveType === "SICK" || 
        (leave.EventCategory?.name?.toLowerCase().includes("sick") ?? false);
      const isOtherEntitlement = leave.leaveType === "OTHER_ENTITLEMENT" || Boolean(leave.otherEntitlementId);

      const resolvedSickReason =
        (leave.sickReason ?? null) ||
        ((leave as any).EventSubcategory?.name ?? null);
      
      return {
        ...leave,
        isSick,
        isOtherEntitlement,
        otherEntitlementName: leave.OtherEntitlement?.name ?? null,
        // Ensure leaveType is set for UI consumption
        leaveType: leave.leaveType || (isSick ? "SICK" : leave.EventCategory?.name || "LEAVE"),
        // Use other entitlement name as category name if applicable
        categoryName: isOtherEntitlement && leave.OtherEntitlement?.name
          ? leave.OtherEntitlement.name
          : leave.EventCategory?.name,
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
    const { startDate, endDate, reason, sickReasonId, sickReason, paidStatus, dayType, isSick, bypassWarnings, otherEntitlementId } = body;
    
    // DEBUG: Log incoming request details for sick leave troubleshooting
    console.log("🔍 [LEAVE_REQUEST_DEBUG] Incoming request:", {
      employeeId,
      isSick,
      otherEntitlementId,
      startDate,
      endDate,
      sessionUserRole: session.user.role,
      sessionUserId: session.user.id,
      sickReasonId,
      sickReason,
      paidStatus,
    });

  // ============================================================================
  // OTHER ENTITLEMENT BOOKING (Admin-only, no self-service)
  // ============================================================================
  if (otherEntitlementId) {
    // Only admins can book against other entitlements
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only administrators can book against custom entitlements." },
        { status: 403 },
      );
    }

    // Verify the other entitlement exists and belongs to this employee
    const otherEntitlement = await prisma.employeeOtherEntitlement.findFirst({
      where: {
        id: otherEntitlementId,
        employeeId,
        companyId: session.user.companyId,
      },
    });

    if (!otherEntitlement) {
      return NextResponse.json(
        { success: false, error: "Custom entitlement not found." },
        { status: 404 },
      );
    }

    // Parse dates
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    };
    const startDateObj = parseLocalDate(startDate);
    const endDateObj = parseLocalDate(endDate);

    // Calculate deduction based on working days
    const totalDays: number[] = [];
    let currentDate = new Date(startDateObj);
    while (currentDate <= endDateObj) {
      const deduction = await calculateLeaveDeduction(employeeId, currentDate);
      totalDays.push(deduction);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    const totalDeduction = roundToTwoDecimals(totalDays.reduce((sum, d) => sum + d, 0));

    // Check balance (convert to number for comparison)
    const currentBalance = Number(otherEntitlement.balance);
    if (currentBalance < totalDeduction) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient balance. Available: ${currentBalance} ${otherEntitlement.unit}, Required: ${totalDeduction} ${otherEntitlement.unit}` 
        },
        { status: 400 },
      );
    }

    // Find a placeholder category for "Other" leave or use the first available
    let placeholderCategoryId = body.eventCategoryId || body.EventCategoryId;
    if (!placeholderCategoryId) {
      const otherCategory = await prisma.eventCategory.findFirst({
        where: {
          companyId: session.user.companyId,
          OR: [
            { name: { contains: "other", mode: "insensitive" } },
            { name: { contains: "annual", mode: "insensitive" } },
          ],
        },
        select: { id: true },
        orderBy: { name: "asc" },
      });
      
      if (!otherCategory) {
        // Fallback to any active category
        const anyCategory = await prisma.eventCategory.findFirst({
          where: { companyId: session.user.companyId, isActive: true },
          select: { id: true },
        });
        placeholderCategoryId = anyCategory?.id;
      } else {
        placeholderCategoryId = otherCategory.id;
      }
    }

    if (!placeholderCategoryId) {
      return NextResponse.json(
        { success: false, error: "No event category available. Please contact your administrator." },
        { status: 400 },
      );
    }

    // Create leave request and deduct balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the leave request (auto-approved, no workflow)
      const newLeaveRequest = await (tx.leaveRequest as any).create({
        data: {
          id: crypto.randomUUID(),
          Employee: { connect: { id: employeeId } },
          User_LeaveRequest_requesterIdToUser: { connect: { id: userId } },
          EventCategory: { connect: { id: placeholderCategoryId } },
          Company: { connect: { id: session.user.companyId } },
          OtherEntitlement: { connect: { id: otherEntitlementId } },
          startDate: startDateObj,
          endDate: endDateObj,
          dayType: dayType ?? "FULL_DAY",
          reason: reason ?? `${otherEntitlement.name} booking`,
          leaveType: "OTHER_ENTITLEMENT",
          approvalStatus: "APPROVED",
          User_LeaveRequest_approvedByIdToUser: { connect: { id: session.user.id } },
          updatedAt: new Date(),
        },
      });

      // Deduct from the other entitlement balance
      await tx.employeeOtherEntitlement.update({
        where: { id: otherEntitlementId },
        data: {
          balance: { decrement: totalDeduction },
        },
      });

      return newLeaveRequest;
    });

    console.log("✅ [OTHER_ENTITLEMENT_DEBUG] Leave request created:", {
      id: result.id,
      otherEntitlementId,
      entitlementName: otherEntitlement.name,
      deduction: totalDeduction,
      previousBalance: currentBalance,
      newBalance: currentBalance - totalDeduction,
    });

    return NextResponse.json({ 
      success: true, 
      data: result,
      isOtherEntitlement: true,
      entitlementName: otherEntitlement.name,
      deduction: totalDeduction,
    });
  }
  
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
    // NZ Holidays Act 2003: This also classifies if the request is "leave in advance"
    const validationResult = await validateLeaveRequest({
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
    
    const { warnings, isLeaveInAdvance } = validationResult;

    console.log("🔍 [LEAVE_REQUEST_DEBUG] Validation result:", {
      warningsCount: warnings.length,
      warnings: warnings.map(w => ({ code: w.code, message: w.message })),
      bypassWarnings,
      isLeaveInAdvance,
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
          isLeaveInAdvance, // Include for UI awareness
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
        // Uses atomic transaction to ensure data consistency between leave request and ledger
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
          
          // Calculate deduction for sick leave BEFORE transaction
          const totalDays: number[] = [];
          let currentDate = new Date(startDateObj);

          while (currentDate <= endDateObj) {
            const deduction = await calculateLeaveDeduction(employeeId, currentDate);
            totalDays.push(deduction);
            currentDate.setDate(currentDate.getDate() + 1);
          }

          const totalDeductionDays = roundToTwoDecimals(totalDays.reduce((sum, d) => sum + d, 0));

          // Apply any pending grants BEFORE creating the leave request
          // This ensures the balance is up-to-date for validation
          // Note: This is done outside the main transaction as it has its own transaction
          if (totalDeductionDays > 0) {
            try {
              await applySickLeaveGrants(prisma as any, employeeId, new Date(), session.user.id);
              console.log("✅ [SICK_LEAVE_DEBUG] Grants applied successfully before leave creation");
            } catch (grantError: any) {
              console.error("❌ Failed to apply sick leave grants:", grantError?.message || grantError);
              // Continue - grants may already be applied or employee may not be eligible yet
            }
          }

          // Verify subcategory exists before transaction (if provided)
          let subcategoryExists = false;
          if (sickReasonId) {
            const subcategory = await prisma.eventSubcategory.findFirst({
              where: { id: sickReasonId },
              select: { id: true },
            });
            subcategoryExists = !!subcategory;
            if (!subcategoryExists) {
              console.warn(`⚠️ [LEAVE_REQUEST_DEBUG] Subcategory ${sickReasonId} not found, skipping connection`);
            }
          }

          // Generate leave request ID upfront for idempotency
          const leaveRequestId = crypto.randomUUID();
          const hoursToDeduct = daysToHours(totalDeductionDays);

          // Validate balance BEFORE creating leave request
          // This prevents creating a leave request that would fail on ledger update
          if (totalDeductionDays > 0) {
            const employeeBalance = await prisma.employee.findUnique({
              where: { id: employeeId },
              select: { sickLeaveBalance: true },
            });
            const currentBalance = Number(employeeBalance?.sickLeaveBalance || 0);
            
            if (currentBalance < hoursToDeduct) {
              const availableDays = currentBalance / 8; // HOURS_PER_DAY
              return NextResponse.json(
                { 
                  success: false, 
                  error: `Insufficient sick leave balance. Available: ${availableDays.toFixed(1)} days, Requested: ${totalDeductionDays} days` 
                },
                { status: 400 },
              );
            }
          }

          try {
            // Execute leave request creation and ledger update atomically
            // We use a two-step approach:
            // 1. Create leave request in a transaction
            // 2. Record ledger usage (has its own transaction with idempotency)
            // If step 2 fails, we rollback step 1
            
            const newLeaveRequest = await prisma.$transaction(async (tx) => {
              // Build the data object for leave request creation
              const leaveRequestData: any = {
                id: leaveRequestId,
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
                User_LeaveRequest_approvedByIdToUser: { connect: { id: session.user.id } },
              };

              // Only connect EventSubcategory if sickReasonId is provided and valid
              if (sickReasonId && subcategoryExists) {
                leaveRequestData.EventSubcategory = { connect: { id: sickReasonId } };
              }

              // Create leave request inside transaction
              return (tx.leaveRequest as any).create({
                data: leaveRequestData,
              });
            });

            console.log("✅ [LEAVE_REQUEST_DEBUG] Sick leave request created:", {
              id: newLeaveRequest.id,
              approvalStatus: newLeaveRequest.approvalStatus,
              totalDeductionDays,
            });

            // Record sick leave usage via ledger system
            // The ledger has its own transaction with idempotency (keyed by leaveRequestId)
            // If this fails, we must delete the leave request
            if (totalDeductionDays > 0) {
              try {
                console.log(`🔍 [SICK_LEAVE_DEBUG] Recording usage: ${totalDeductionDays} days = ${hoursToDeduct} hours`);
                
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
                
                // Rollback: Delete the leave request to maintain data consistency
                // Use a separate try-catch to ensure we always return an error to the user
                try {
                  await prisma.leaveRequest.delete({
                    where: { id: newLeaveRequest.id },
                  });
                  console.log(`🗑️ [SICK_LEAVE_DEBUG] Rolled back leave request ${newLeaveRequest.id} due to ledger failure`);
                } catch (deleteError: any) {
                  // Log but don't throw - the original error is more important
                  console.error("❌ CRITICAL: Failed to rollback leave request:", deleteError?.message || deleteError);
                  console.error("❌ Orphaned leave request ID:", newLeaveRequest.id);
                }
                
                // Return error to user
                return NextResponse.json(
                  { 
                    success: false, 
                    error: sickLeaveError?.message || "Failed to record sick leave usage. Please try again or contact your administrator." 
                  },
                  { status: 400 },
                );
              }
            } else {
              console.log(`⚠️ [SICK_LEAVE_DEBUG] No deduction needed: totalDeductionDays = ${totalDeductionDays}`);
            }

            return NextResponse.json({ success: true, data: newLeaveRequest });
          } catch (txError: any) {
            console.error("❌ Failed to create sick leave request:", txError?.message || txError);
            return NextResponse.json(
              { 
                success: false, 
                error: txError?.message || "Failed to create sick leave request. Please try again." 
              },
              { status: 400 },
            );
          }
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
