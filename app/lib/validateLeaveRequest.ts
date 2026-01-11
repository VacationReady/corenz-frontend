// lib/validateLeaveRequest.ts

import { prisma } from "@/lib/prisma";
import { eachDayOfInterval, subMonths, format, differenceInMonths } from "date-fns";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { checkNegativeBalanceAllowed } from "@/lib/accrualEngine";
import { getNZPublicHolidayInfo } from "@/lib/public-holiday-checker";
import { isEligibleForSickLeave, getSickLeaveStatus, applySickLeaveGrants } from "@/lib/leave/nz-sick-leave-ledger";

/**
 * NZ Holidays Act 2003 - Leave In Advance Classification
 * 
 * Determines if an employee is pre-12-month (not yet entitled to annual leave).
 * An employee is classified as pre-12-month if:
 * 1. They have a futureAnnualLeaveEntitlement stored (entitlement not yet crystallised), OR
 * 2. Their annualLeaveEntitlementDate is in the future relative to the request date
 * 
 * @param employee - Employee data with tenure fields
 * @param requestDate - The date of the leave request
 * @returns Object with isPreTwelveMonth flag and tenureMonths
 */
export function classifyLeaveInAdvance(
  employee: {
    employmentStartDate?: Date | null;
    startDate?: Date | null;
    annualLeaveEntitlementDate?: Date | null;
    futureAnnualLeaveEntitlement?: number | null;
    isCasualEmployee?: boolean;
  },
  requestDate: Date
): { isLeaveInAdvance: boolean; tenureMonths: number } {
  // Casual employees cannot request annual leave
  if (employee.isCasualEmployee) {
    return { isLeaveInAdvance: false, tenureMonths: 0 };
  }

  // Determine the effective start date for tenure calculation
  const effectiveStartDate = employee.employmentStartDate || employee.startDate;
  
  if (!effectiveStartDate) {
    // No start date available, cannot determine tenure
    return { isLeaveInAdvance: false, tenureMonths: 0 };
  }

  // Calculate tenure in months using date-fns for accuracy
  const tenureMonths = differenceInMonths(requestDate, new Date(effectiveStartDate));

  // Check if employee is pre-12-month (has not yet reached entitlement crystallisation)
  // An employee is pre-12-month if:
  // 1. They have a futureAnnualLeaveEntitlement stored (entitlement not yet crystallised), OR
  // 2. Their annualLeaveEntitlementDate is in the future
  const hasFutureEntitlement = employee.futureAnnualLeaveEntitlement !== null && 
                               employee.futureAnnualLeaveEntitlement !== undefined;
  const entitlementDateInFuture = employee.annualLeaveEntitlementDate && 
    new Date(employee.annualLeaveEntitlementDate) > requestDate;
  
  const isLeaveInAdvance = hasFutureEntitlement || !!entitlementDateInFuture;

  return { isLeaveInAdvance, tenureMonths };
}

/**
 * Validates a leave request against entitlement, business rules, blackout days, working pattern, and concurrency.
 * 
 * NOTE: Entitlement validation only applies when enforceEntitlement is true (typically only for Annual Leave).
 * For other event types (e.g., Compassionate Leave, Sick Leave), entitlement is NOT enforced.
 * Instead, they may have a maxDaysPerPeriod limit (e.g., max 5 days over 12 months).
 * 
 * NZ HOLIDAYS ACT 2003 COMPLIANCE:
 * For employees with less than 12 months of continuous employment, annual leave requests
 * are classified as "leave in advance". This is tracked separately and deducted from
 * the employee's entitlement when it crystallises at the 12-month anniversary.
 */
export interface LeaveValidationWarning {
  code: string;
  message: string;
  severity: "warning" | "error";
  ruleType: "notice_period" | "max_booking_length" | "blackout_day" | "entitlement" | "overlap" | "sick_leave_eligibility" | "public_holiday" | "max_days_per_period" | "leave_in_advance";
}

/**
 * Result of leave request validation including NZ compliance classification.
 */
export interface LeaveValidationResult {
  /** Validation warnings (non-blocking issues) */
  warnings: LeaveValidationWarning[];
  /** Whether this is a "leave in advance" request (NZ Holidays Act 2003) */
  isLeaveInAdvance: boolean;
  /** Employee's tenure in months (for pre-12-month employees) */
  tenureMonths?: number;
}

export async function validateLeaveRequest({
  employeeId,
  eventCategoryId,
  startDate,
  endDate,
  dayType,
  isAdmin = false,
  companyId,
  bypassWarnings = false,
}: {
  employeeId: string;
  eventCategoryId: string;
  startDate: Date;
  endDate: Date;
  dayType?: "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM";
  isAdmin?: boolean;
  companyId: string;
  bypassWarnings?: boolean;
}): Promise<LeaveValidationResult> {
  console.log("🛠️ [validateLeaveRequest] START:", {
    employeeId,
    eventCategoryId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    dayType,
    isAdmin,
    bypassWarnings,
  });

  const warnings: LeaveValidationWarning[] = [];
  const effectiveDayType = dayType ?? "FULL_DAY";
  
  // NZ Holidays Act 2003: Track if this is a "leave in advance" request
  let isLeaveInAdvance = false;
  let tenureMonths: number | undefined = undefined;

  const eventCategory = await prisma.eventCategory.findFirst({
    where: { id: eventCategoryId, companyId },
    select: { name: true },
  });

  if (!eventCategory) {
    console.error("❌ Invalid eventCategoryId provided.");
    throw new Error(`Invalid event category.`);
  }

  // ── NZ HOLIDAYS ACT 2003: LEAVE IN ADVANCE CLASSIFICATION ──────────────────
  // For annual leave requests, check if the employee has less than 12 months of
  // continuous employment. If so, classify the request as "leave in advance".
  // This leave will be tracked separately and deducted from entitlement at the
  // 12-month anniversary.
  const isAnnualLeaveRequest = eventCategory.name.toLowerCase().includes("annual leave");
  
  if (isAnnualLeaveRequest) {
    // Fetch employee's tenure information
    const employeeForTenure = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        employmentStartDate: true,
        startDate: true,
        annualLeaveEntitlementDate: true,
        futureAnnualLeaveEntitlement: true,
        isCasualEmployee: true,
      },
    });

    if (employeeForTenure) {
      // Casual employees cannot request annual leave (they receive 8% holiday pay instead)
      if (employeeForTenure.isCasualEmployee) {
        console.error("❌ Casual employee cannot request annual leave");
        const error = new Error(
          "Casual employees receive 8% holiday pay instead of annual leave. Please contact HR for assistance."
        );
        (error as any).code = "CASUAL_EMPLOYEE_NO_ANNUAL_LEAVE";
        throw error;
      }

      // Determine the effective start date for tenure calculation
      const effectiveStartDate = employeeForTenure.employmentStartDate || employeeForTenure.startDate;
      
      if (effectiveStartDate) {
        // Calculate tenure in months
        const startTime = new Date(effectiveStartDate).getTime();
        const requestTime = startDate.getTime();
        const monthsDiff = (requestTime - startTime) / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
        tenureMonths = Math.floor(monthsDiff);

        // Check if employee is pre-12-month (has not yet reached entitlement crystallisation)
        // An employee is pre-12-month if:
        // 1. They have a futureAnnualLeaveEntitlement stored (entitlement not yet crystallised), OR
        // 2. Their annualLeaveEntitlementDate is in the future
        const hasFutureEntitlement = employeeForTenure.futureAnnualLeaveEntitlement !== null;
        const entitlementDateInFuture = employeeForTenure.annualLeaveEntitlementDate && 
          new Date(employeeForTenure.annualLeaveEntitlementDate) > startDate;
        
        if (hasFutureEntitlement || entitlementDateInFuture) {
          isLeaveInAdvance = true;
          console.log("📋 NZ Compliance: Leave in advance classification", {
            employeeId,
            tenureMonths,
            hasFutureEntitlement,
            entitlementDateInFuture,
            annualLeaveEntitlementDate: employeeForTenure.annualLeaveEntitlementDate,
          });

          // Add informational warning about leave in advance
          if (!bypassWarnings) {
            warnings.push({
              code: "LEAVE_IN_ADVANCE",
              message: `This is a "leave in advance" request. The employee has ${tenureMonths} months of service and has not yet reached their 12-month anniversary. This leave will be deducted from their entitlement when it crystallises.`,
              severity: "warning",
              ruleType: "leave_in_advance",
            });
          }
        }
      }
    }
  }

  // ── FULL-DAY OVERLAP CHECK ──────────────────────────────
  // Employees must not have overlapping full-day leave events (e.g. holiday + sickness) on the same date(s).
  // Rules:
  // - If creating a FULL_DAY event: it must not overlap ANY other leave event (full or half day)
  // - If creating a HALF_DAY event: it must not overlap an existing FULL_DAY event
  // We enforce this regardless of role/admin status.
  //
  // IMPORTANT: We compare by calendar date, not timestamp, to handle both old (UTC) and new (local) date formats
  {
    // Helper function to normalize a date to calendar day (ignoring time/timezone)
    const toCalendarDate = (d: Date): string => {
      // Use local date components to get the calendar date
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Get calendar dates for the requested range
    const requestStartCal = toCalendarDate(startDate);
    const requestEndCal = toCalendarDate(endDate);

    const dayTypeFilter =
      effectiveDayType === "FULL_DAY"
        ? undefined
        : { dayType: "FULL_DAY" as const };

    // Find all potentially overlapping leave requests
    // We'll filter by calendar date in memory since DB dates may be in different formats
    const potentialOverlaps = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        approvalStatus: { in: ["PENDING", "APPROVED"] },
        ...(dayTypeFilter ?? {}),
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        dayType: true,
        EventCategory: { select: { name: true } },
      },
    });

    // Check for actual calendar date overlaps
    const overlapping = potentialOverlaps.find((existing) => {
      const existingStartCal = toCalendarDate(new Date(existing.startDate));
      const existingEndCal = toCalendarDate(new Date(existing.endDate));

      // Check if date ranges overlap
      // Range A overlaps Range B if: A.start <= B.end AND A.end >= B.start
      return requestStartCal <= existingEndCal && requestEndCal >= existingStartCal;
    });

    if (overlapping) {
      // Format dates for error message using calendar dates
      const existingStartCal = toCalendarDate(new Date(overlapping.startDate));
      const existingEndCal = toCalendarDate(new Date(overlapping.endDate));
      
      const error: any = new Error(
        `Cannot book leave: this employee already has a leave event (${overlapping.EventCategory?.name ?? "Leave"}) overlapping ${existingStartCal} to ${existingEndCal}.`,
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

  // Calculate days notice given (using calendar dates, not timestamps)
  const leaveStartTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const todayTime = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const daysNoticeGiven = Math.floor((leaveStartTime - todayTime) / (1000 * 60 * 60 * 24));

  if (daysNoticeGiven < requiredNoticeDays) {
    const message = `This leave requires at least ${requiredNoticeDays} days notice. Only ${Math.max(0, daysNoticeGiven)} days notice given.`;
    
    if (isAdmin) {
      // Admins/Managers get a warning but can proceed
      if (!bypassWarnings) {
        console.warn(`⚠️ Notice period not met (admin override available): ${message}`);
        warnings.push({
          code: "NOTICE_PERIOD_NOT_MET",
          message,
          severity: "warning",
          ruleType: "notice_period",
        });
      }
    } else {
      // Regular employees get blocked
      console.error(`❌ Notice period not met: ${message}`);
      throw new Error(message);
    }
  }

  // ── MAX BOOKING LENGTH ENFORCEMENT ───────────────
  // Calculate days requested (using calendar dates)
  const leaveEndTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  const daysRequested = Math.floor((leaveEndTime - leaveStartTime) / (1000 * 60 * 60 * 24)) + 1;
  const maxBookingLength = eventRule?.maxBookingLength ?? 14;

  if (daysRequested > maxBookingLength) {
    const message = `You can only book up to ${maxBookingLength} days at a time for this leave type. Requested ${daysRequested} days.`;
    
    if (isAdmin) {
      // Admins/Managers get a warning but can proceed
      if (!bypassWarnings) {
        console.warn(`⚠️ Max booking length exceeded (admin override available): ${message}`);
        warnings.push({
          code: "MAX_BOOKING_LENGTH_EXCEEDED",
          message,
          severity: "warning",
          ruleType: "max_booking_length",
        });
      }
    } else {
      // Regular employees get blocked
      console.error(`❌ Max booking length exceeded: ${message}`);
      throw new Error(message);
    }
  }

  // ── BLACKOUT DAY CHECK ────────────────────────────
  // BUG FIX: Use local date formatting consistently to avoid timezone mismatch
  // Previously used toISOString() which converts to UTC, causing issues in non-UTC timezones
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const blackoutDays = await prisma.blackoutDay.findMany({
    where: {
      companyId,
      OR: [
        { allEvents: true },
        { eventCategoryIds: { has: eventCategoryId } },
      ],
    },
  });

  // Convert blackout dates to local date strings for consistent comparison
  const blackoutDates = blackoutDays.map((b) => formatLocalDate(new Date(b.date)));
  const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });

  for (const date of datesInRange) {
    const dateString = formatLocalDate(date);
    if (blackoutDates.includes(dateString)) {
      const message = `The date ${dateString} is blocked due to a company blackout.`;
      
      if (isAdmin) {
        // Admins/Managers get a warning but can proceed
        if (!bypassWarnings) {
          console.warn(`⚠️ Blackout day detected (admin override available): ${dateString}`);
          warnings.push({
            code: "BLACKOUT_DAY_CONFLICT",
            message,
            severity: "warning",
            ruleType: "blackout_day",
          });
        }
      } else {
        // Regular employees get blocked
        console.error(`❌ Blackout day detected on ${dateString}, throwing error.`);
        throw new Error(message);
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
  const datesForDeduction = eachDayOfInterval({ start: startDate, end: endDate });
  let daysRequestedForDeduction = 0;

  for (const date of datesForDeduction) {
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
      const message = `This exceeds the maximum of ${maxDaysPerPeriod} days allowed for ${eventCategory.name} over a ${periodMonths}-month period. You have ${remainingAllowed} day(s) remaining.`;
      
      if (isAdmin) {
        // Admins/Managers get a warning but can proceed
        if (!bypassWarnings) {
          console.warn(`⚠️ Max days per period exceeded (admin override available): ${message}`);
          warnings.push({
            code: "MAX_DAYS_PER_PERIOD_EXCEEDED",
            message,
            severity: "warning",
            ruleType: "max_days_per_period",
          });
        }
      } else {
        // Regular employees get blocked
        console.error(`❌ Exceeds maximum ${maxDaysPerPeriod} days over ${periodMonths} months.`);
        throw new Error(message);
      }
    }
  }

  // ── ENTITLEMENT & CARRYOVER LOGIC ────────────────
  // Only enforce entitlement for event types that have enforceEntitlement=true (typically Annual Leave)
  if (!enforceEntitlement) {
    console.log("ℹ️ Entitlement enforcement is disabled for this event type. Skipping entitlement check.");
    console.log("✅ [validateLeaveRequest] Validation passed successfully.");
    return { warnings, isLeaveInAdvance, tenureMonths };
  }

  // ── NZ HOLIDAYS ACT 2003: LEAVE IN ADVANCE ENTITLEMENT CHECK ──────────────
  // For pre-12-month employees requesting annual leave (leave in advance),
  // we check against their futureAnnualLeaveEntitlement instead of LeaveEntitlement.
  // This allows them to request leave before their entitlement crystallises.
  if (isLeaveInAdvance) {
    console.log("📋 NZ Compliance: Checking leave in advance against future entitlement");
    
    const employeeForAdvance = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        futureAnnualLeaveEntitlement: true,
        leaveInAdvanceUsed: true,
      },
    });

    if (employeeForAdvance) {
      const futureEntitlement = Number(employeeForAdvance.futureAnnualLeaveEntitlement || 0);
      const alreadyUsedInAdvance = Number(employeeForAdvance.leaveInAdvanceUsed || 0);
      
      // Calculate pending leave in advance requests
      const pendingAdvanceRequests = await prisma.leaveRequest.findMany({
        where: {
          employeeId,
          eventCategoryId,
          approvalStatus: "PENDING",
        },
        select: { startDate: true, endDate: true },
      });

      let pendingAdvanceDays = 0;
      for (const leave of pendingAdvanceRequests) {
        const leaveDates = eachDayOfInterval({ 
          start: new Date(leave.startDate), 
          end: new Date(leave.endDate) 
        });
        for (const date of leaveDates) {
          const deduction = await calculateLeaveDeduction(employeeId, date);
          pendingAdvanceDays += deduction;
        }
      }

      const availableAdvance = futureEntitlement - alreadyUsedInAdvance - pendingAdvanceDays;
      
      console.log("📊 Leave in advance check:", {
        futureEntitlement,
        alreadyUsedInAdvance,
        pendingAdvanceDays,
        availableAdvance,
        daysRequestedForDeduction,
      });

      // Check if negative balance is allowed via Leave Policies
      const negativeBalanceAllowed = await checkNegativeBalanceAllowed({
        employeeId,
        eventCategoryId,
        companyId,
      });

      if (daysRequestedForDeduction > availableAdvance && !negativeBalanceAllowed) {
        const message = `Insufficient future entitlement: Requested ${daysRequestedForDeduction} days, but only ${Math.max(0, availableAdvance)} days available for leave in advance.`;
        
        if (isAdmin) {
          if (!bypassWarnings) {
            console.warn(`⚠️ Insufficient future entitlement (admin override available): ${message}`);
            warnings.push({
              code: "INSUFFICIENT_FUTURE_ENTITLEMENT",
              message,
              severity: "warning",
              ruleType: "entitlement",
            });
          }
        } else {
          console.error("❌ Insufficient future entitlement for leave in advance.");
          throw new Error(message);
        }
      }
    }

    console.log("✅ [validateLeaveRequest] Leave in advance validation passed.");
    return { warnings, isLeaveInAdvance, tenureMonths };
  }

  // ── STANDARD ENTITLEMENT CHECK (for employees with crystallised entitlement) ──
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

  // BUG FIX: Calculate pending leave days to prevent over-booking
  // Previously, only approved leave was counted in usedDays, allowing employees
  // to submit multiple requests that collectively exceed their entitlement
  const pendingLeaveRequests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      eventCategoryId,
      approvalStatus: "PENDING",
    },
    select: { startDate: true, endDate: true },
  });

  let pendingDays = 0;
  for (const leave of pendingLeaveRequests) {
    const leaveDates = eachDayOfInterval({ 
      start: new Date(leave.startDate), 
      end: new Date(leave.endDate) 
    });
    for (const date of leaveDates) {
      const deduction = await calculateLeaveDeduction(employeeId, date);
      pendingDays += deduction;
    }
  }

  console.log("📊 Pending leave days calculated:", pendingDays);

  const availableCarryover = entitlement.carryoverDays ?? 0;
  // Subtract both used days AND pending days from available entitlement
  const availableEntitlement = entitlement.totalDays - entitlement.usedDays - pendingDays;

  const combinedAvailable = availableCarryover + availableEntitlement;

  console.log("📊 Leave deduction check:", {
    daysRequestedForDeduction,
    availableCarryover,
    usedDays: entitlement.usedDays,
    pendingDays,
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
  if (daysRequestedForDeduction > combinedAvailable && !negativeBalanceAllowed) {
    const message = `Insufficient entitlement: Requested ${daysRequestedForDeduction} days, but only ${combinedAvailable} days available (including carryover).`;
    
    if (isAdmin) {
      // Admins/Managers get a warning but can proceed
      if (!bypassWarnings) {
        console.warn(`⚠️ Insufficient entitlement (admin override available): ${message}`);
        warnings.push({
          code: "INSUFFICIENT_ENTITLEMENT",
          message,
          severity: "warning",
          ruleType: "entitlement",
        });
      }
    } else {
      // Regular employees get blocked
      console.error("❌ Insufficient entitlement including carryover.");
      throw new Error(message);
    }
  }

  if (negativeBalanceAllowed && daysRequestedForDeduction > combinedAvailable) {
    console.log("⚠️ Allowing negative balance due to Leave Policy setting.");
  }

  console.log("✅ [validateLeaveRequest] Validation passed successfully.");
  return { warnings, isLeaveInAdvance, tenureMonths };
}

