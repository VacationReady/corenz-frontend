// lib/validateLeaveRequest.ts

import { prisma } from "@/lib/prisma";
import { eachDayOfInterval, subMonths, format } from "date-fns";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { checkNegativeBalanceAllowed } from "@/lib/accrualEngine";
import { getNZPublicHolidayInfo } from "@/lib/public-holiday-checker";
import { isEligibleForSickLeave, getSickLeaveStatus, applySickLeaveGrants } from "@/lib/leave/nz-sick-leave-ledger";
import dayjs from "dayjs";

/**
 * Validates a leave request against entitlement, business rules, blackout days, working pattern, and concurrency.
 * 
 * NOTE: Entitlement validation only applies when enforceEntitlement is true (typically only for Annual Leave).
 * For other event types (e.g., Compassionate Leave, Sick Leave), entitlement is NOT enforced.
 * Instead, they may have a maxDaysPerPeriod limit (e.g., max 5 days over 12 months).
 */
export async function validateLeaveRequest({
  employeeId,
  eventCategoryId,
  startDate,
  endDate,
  dayType,
  isAdmin = false,
  companyId,
}: {
  employeeId: string;
  eventCategoryId: string;
  startDate: Date;
  endDate: Date;
  dayType?: "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM";
  isAdmin?: boolean;
  companyId: string;
}) {
  console.log("🛠️ [validateLeaveRequest] START:", {
    employeeId,
    eventCategoryId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    dayType,
    isAdmin,
  });

  const effectiveDayType = dayType ?? "FULL_DAY";

  const eventCategory = await prisma.eventCategory.findFirst({
    where: { id: eventCategoryId, companyId },
    select: { name: true },
  });

  if (!eventCategory) {
    console.error("❌ Invalid eventCategoryId provided.");
    throw new Error(`Invalid event category.`);
  }

  // ── FULL-DAY OVERLAP CHECK ──────────────────────────────
  // Employees must not have overlapping full-day leave events (e.g. holiday + sickness) on the same date(s).
  // Rules:
  // - If creating a FULL_DAY event: it must not overlap ANY other leave event (full or half day)
  // - If creating a HALF_DAY event: it must not overlap an existing FULL_DAY event
  // We enforce this regardless of role/admin status.
  {
    // Use UTC to avoid timezone shifts when comparing dates
    const rangeStart = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0));
    const rangeEnd = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999));

    const dayTypeFilter =
      effectiveDayType === "FULL_DAY"
        ? undefined
        : { dayType: "FULL_DAY" as const };

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        approvalStatus: { in: ["PENDING", "APPROVED"] },
        ...(dayTypeFilter ?? {}),
        AND: [{ startDate: { lte: rangeEnd } }, { endDate: { gte: rangeStart } }],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        dayType: true,
        EventCategory: { select: { name: true } },
      },
    });

    if (overlapping) {
      const error: any = new Error(
        `Cannot book leave: this employee already has a leave event (${overlapping.EventCategory?.name ?? "Leave"}) overlapping ${format(rangeStart, "yyyy-MM-dd")} to ${format(rangeEnd, "yyyy-MM-dd")}.`,
      );
      error.code = "LEAVE_OVERLAP_FULL_DAY";
      error.conflict = {
        leaveRequestId: overlapping.id,
        startDate: overlapping.startDate,
        endDate: overlapping.endDate,
        dayType: overlapping.dayType,
        eventCategoryName: overlapping.EventCategory?.name ?? null,
      };
      throw error;
    }
  }

  // ── FETCH EVENT RULE ──────────────────────────────
  const eventRule = await prisma.eventRule.findUnique({
    where: {
      companyId_eventCategoryId: {
        companyId,
        eventCategoryId,
      },
    },
    select: {
      enforceEntitlement: true,
      noticePeriodDays: true,
      maxConcurrent: true,
      maxBookingLength: true,
      maxDaysPerPeriod: true,
      periodMonths: true,
    },
  });

  // ── CHECK IF CATEGORY HAS BALANCE REQUIRED ──────────────────────────────
  // Categories with balanceRequired=true should always enforce their balance
  const eventCategoryFull = await prisma.eventCategory.findFirst({
    where: { id: eventCategoryId, companyId },
    select: { name: true, balanceRequired: true },
  });
  const isBalanceRequired = (eventCategoryFull as any)?.balanceRequired === true;

  // Determine if entitlement should be enforced:
  // - If explicitly configured in EventRule, use that setting
  // - If category has balanceRequired=true, always enforce
  // - If no rule exists, only enforce for "Annual Leave" (case-insensitive)
  // - All other event types default to NOT enforcing entitlement
  const isAnnualLeave = eventCategory.name.toLowerCase().includes("annual leave");
  const enforceEntitlement = eventRule?.enforceEntitlement ?? (isBalanceRequired || isAnnualLeave);
  
  console.log("📋 Entitlement enforcement:", { 
    eventType: eventCategory.name, 
    isAnnualLeave,
    isBalanceRequired,
    hasExplicitRule: eventRule !== null,
    enforceEntitlement 
  });
  const requiredNoticeDays = eventRule?.noticePeriodDays ?? 0;

  const leaveStart = dayjs(startDate).startOf("day");
  const leaveEnd = dayjs(endDate).startOf("day");
  const today = dayjs().startOf("day");
  const daysNoticeGiven = leaveStart.diff(today, "day");

  if (daysNoticeGiven < requiredNoticeDays && !isAdmin) {
    console.error(
      `❌ Notice period not met: required ${requiredNoticeDays}, given ${daysNoticeGiven}`,
    );
    throw new Error(
      `This leave requires at least ${requiredNoticeDays} days notice.`,
    );
  }

  // ── MAX BOOKING LENGTH ENFORCEMENT ───────────────
  const daysRequested = leaveEnd.diff(leaveStart, "day") + 1;
  const maxBookingLength = eventRule?.maxBookingLength ?? 14;

  if (daysRequested > maxBookingLength && !isAdmin) {
    console.error(
      `❌ Max booking length exceeded: requested ${daysRequested}, allowed ${maxBookingLength}`,
    );
    throw new Error(
      `You can only book up to ${maxBookingLength} days at a time for this leave type.`,
    );
  }

  // ── BLACKOUT DAY CHECK ────────────────────────────
  if (!isAdmin) {
    const blackoutDays = await prisma.blackoutDay.findMany({
      where: {
        companyId,
        OR: [
          { allEvents: true },
          { eventCategoryIds: { has: eventCategoryId } },
        ],
      },
    });

    const blackoutDates = blackoutDays.map(
      (b) => b.date.toISOString().split("T")[0],
    );
    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });

    for (const date of datesInRange) {
      const dateString = date.toISOString().split("T")[0];
      if (blackoutDates.includes(dateString)) {
        console.error(
          `❌ Blackout day detected on ${dateString}, throwing error.`,
        );
        throw new Error(
          `The date ${dateString} is blocked due to a company blackout.`,
        );
      }
    }
  }

  // ── NZ SICK LEAVE ELIGIBILITY CHECK (Holidays Act 2003) ────────────────
  // Sick leave requires 6 months continuous employment before eligibility
  const isSickLeave = eventCategory.name.toLowerCase().includes("sick");
  
  if (isSickLeave) {
    const employeeForSickLeave = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { 
        id: true,
        companyId: true,
        employmentStartDate: true, 
        startDate: true,
        sickLeaveBalance: true,
        sickLeaveEligibilityDate: true,
        sickLeaveLastGrantDate: true,
      },
    });

    if (employeeForSickLeave) {
      // Apply any pending grants before checking eligibility
      try {
        await applySickLeaveGrants(prisma as any, employeeId, startDate);
      } catch (grantError) {
        console.error("Failed to apply sick leave grants:", grantError);
        // Continue with validation even if grants fail
      }

      const isEligible = isEligibleForSickLeave(employeeForSickLeave as any, startDate);
      
      if (!isEligible) {
        const status = getSickLeaveStatus(employeeForSickLeave as any, startDate);
        const eligibleFromDate = status.eligibilityDate 
          ? format(status.eligibilityDate, 'yyyy-MM-dd')
          : 'unknown';
        
        console.error(`❌ Employee not eligible for sick leave until ${eligibleFromDate}`);
        
        // Return structured error for UI handling
        const error = new Error(
          `You are not yet eligible for sick leave. Eligibility begins on ${eligibleFromDate} after 6 months of continuous employment.`
        );
        (error as any).code = 'SICK_LEAVE_NOT_ELIGIBLE';
        (error as any).eligibleFrom = eligibleFromDate;
        throw error;
      }
      
      console.log("✅ Employee is eligible for sick leave.");
    }
  }

  // ── PUBLIC HOLIDAY CHECK ────────────────────────────
  // Check if employee is allowed to book leave on public holidays
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { canBookPublicHolidays: true },
  });

  // Default: employees cannot book leave on public holidays
  const canBookPublicHolidays = employee?.canBookPublicHolidays ?? false;

  if (!canBookPublicHolidays) {
    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    for (const date of datesInRange) {
      const holidayInfo = await getNZPublicHolidayInfo(date, companyId);
      
      if (holidayInfo) {
        const dateString = format(date, 'yyyy-MM-dd');
        console.error(
          `❌ Public holiday detected on ${dateString} (${holidayInfo.holidayName}), throwing error.`,
        );
        throw new Error(
          `Cannot book leave on ${dateString} - this is a public holiday (${holidayInfo.holidayName}). Public holidays are already paid time off.`,
        );
      }
    }
  } else {
    console.log("ℹ️ Employee is allowed to book leave on public holidays (canBookPublicHolidays=true).");
  }

  // ── CALCULATE DAYS FOR THIS REQUEST ────────────────
  const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
  let daysRequestedForDeduction = 0;

  for (const date of datesInRange) {
    const deduction = await calculateLeaveDeduction(employeeId, date);
    daysRequestedForDeduction += deduction;
  }

  console.log("📊 Days requested for this leave:", daysRequestedForDeduction);

  // ── MAX DAYS PER PERIOD CHECK (Rolling Limit) ────────────────
  // This applies regardless of enforceEntitlement (e.g., compassionate leave max 5 days per 12 months)
  const maxDaysPerPeriod = eventRule?.maxDaysPerPeriod;
  const periodMonths = eventRule?.periodMonths;

  if (maxDaysPerPeriod != null && periodMonths != null && !isAdmin) {
    console.log("🔍 Checking rolling max days limit:", { maxDaysPerPeriod, periodMonths });
    
    // Calculate the rolling period start date
    const periodStart = subMonths(startDate, periodMonths);
    
    // Find all approved leave requests for this event category within the rolling period
    const existingLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        eventCategoryId,
        approvalStatus: "APPROVED",
        startDate: { gte: periodStart },
        endDate: { lte: endDate },
      },
      select: { startDate: true, endDate: true },
    });

    // Calculate total days already used in the period
    let daysAlreadyUsed = 0;
    for (const leave of existingLeaves) {
      const leaveDates = eachDayOfInterval({ 
        start: new Date(leave.startDate), 
        end: new Date(leave.endDate) 
      });
      for (const date of leaveDates) {
        const deduction = await calculateLeaveDeduction(employeeId, date);
        daysAlreadyUsed += deduction;
      }
    }

    const totalDaysWithNewRequest = daysAlreadyUsed + daysRequestedForDeduction;
    
    console.log("📊 Rolling period check:", {
      periodStart: periodStart.toISOString(),
      daysAlreadyUsed,
      daysRequestedForDeduction,
      totalDaysWithNewRequest,
      maxDaysPerPeriod,
    });

    if (totalDaysWithNewRequest > maxDaysPerPeriod) {
      const remainingAllowed = Math.max(0, maxDaysPerPeriod - daysAlreadyUsed);
      console.error(`❌ Exceeds maximum ${maxDaysPerPeriod} days over ${periodMonths} months.`);
      throw new Error(
        `This exceeds the maximum of ${maxDaysPerPeriod} days allowed for ${eventCategory.name} over a ${periodMonths}-month period. You have ${remainingAllowed} day(s) remaining.`,
      );
    }
  }

  // ── ENTITLEMENT & CARRYOVER LOGIC ────────────────
  // Only enforce entitlement for event types that have enforceEntitlement=true (typically Annual Leave)
  if (!enforceEntitlement) {
    console.log("ℹ️ Entitlement enforcement is disabled for this event type. Skipping entitlement check.");
    console.log("✅ [validateLeaveRequest] Validation passed successfully.");
    return;
  }

  const entitlement = await prisma.leaveEntitlement.findFirst({
    where: {
      employeeId,
      eventCategoryId,
      companyId,
    },
  });

  console.log("🔍 Entitlement fetched:", entitlement);

  if (!entitlement) {
    console.error("❌ No entitlement found for employee, throwing.");
    throw new Error(
      `No entitlement found for event category: ${eventCategory.name}`,
    );
  }

  const availableCarryover = entitlement.carryoverDays ?? 0;
  const availableEntitlement = entitlement.totalDays - entitlement.usedDays;

  const combinedAvailable = availableCarryover + availableEntitlement;

  console.log("📊 Leave deduction check:", {
    daysRequestedForDeduction,
    availableCarryover,
    availableEntitlement,
    combinedAvailable,
  });

  // Check if negative balance is allowed via Leave Policies
  const negativeBalanceAllowed = await checkNegativeBalanceAllowed({
    employeeId,
    eventCategoryId,
    companyId,
  });

  console.log("🏦 Negative balance allowed:", negativeBalanceAllowed);

  // If negative balance is allowed, skip entitlement check but still enforce Event Rules
  if (
    daysRequestedForDeduction > combinedAvailable &&
    !isAdmin &&
    !negativeBalanceAllowed
  ) {
    console.error("❌ Insufficient entitlement including carryover.");
    throw new Error(
      `Insufficient entitlement: Requested ${daysRequestedForDeduction} days, but only ${combinedAvailable} days available (including carryover).`,
    );
  }

  if (negativeBalanceAllowed && daysRequestedForDeduction > combinedAvailable) {
    console.log("⚠️ Allowing negative balance due to Leave Policy setting.");
  }

  console.log("✅ [validateLeaveRequest] Validation passed successfully.");
}

