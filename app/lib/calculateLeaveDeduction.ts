// lib/calculateLeaveDeduction.ts

import { prisma } from "@/lib/prisma";
import { DayType, Prisma } from "@prisma/client";
import { getNZPublicHolidayInfo } from "@/lib/public-holiday-checker";
import { 
  DEFAULT_HOURS_PER_DAY,
  decimalToNumber,
} from "@/lib/leave/hours-conversion";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

/**
 * Result of leave deduction calculation with both days and hours.
 */
export interface LeaveDeductionResult {
  /** Deduction in days (1, 0.5, 0) - for backward compatibility */
  days: number;
  /** Deduction in hours - based on working pattern hoursPerDay */
  hours: number;
  /** Hours per day used for this calculation */
  hoursPerDay: number;
  /** Whether this is a public holiday */
  isPublicHoliday: boolean;
  /** Whether this is a non-working day */
  isNonWorkingDay: boolean;
  /** Notes about the deduction */
  notes: string;
}

/**
 * Calculates leave deduction based on employee working pattern and public holidays.
 * @param employeeId - Employee ID (string)
 * @param leaveDate - Date of leave (Date object)
 * @param prismaClient - Prisma client or transaction
 * @returns For FULL_DAY/TIMED: 1, HALF_DAY: 0.5, NON_WORKING/not found: 0, PUBLIC_HOLIDAY (standard employees): 0
 */
export async function calculateLeaveDeduction(
  employeeId: string,
  leaveDate: Date,
  prismaClient: PrismaClientLike = prisma,
): Promise<number> {
  const toShortDay = (name: string): string => {
    if (!name) return name;
    // Normalize to lowercase for comparison
    const normalized = name.toLowerCase();
    const map: Record<string, string> = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
      // Also handle short forms
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
      sun: "Sun",
    };
    return map[normalized] || name;
  };

  // Fetch employee to check canBookPublicHolidays and companyId
  const employee = await prismaClient.employee.findUnique({
    where: { id: employeeId },
    select: { 
      canBookPublicHolidays: true,
      companyId: true,
    },
  });

  if (!employee) {
    console.log(`[Deduction] Employee ${employeeId} not found. Returning 1.`);
    return 1;
  }

  // Check if this date is a public holiday
  const holidayInfo = await getNZPublicHolidayInfo(leaveDate, employee.companyId);
  
  // Standard employees (canBookPublicHolidays=false) should NOT be deducted for public holidays
  // because public holidays are already paid time off for them
  if (holidayInfo && !employee.canBookPublicHolidays) {
    console.log(
      `[Deduction] Public holiday detected: ${holidayInfo.holidayName} on ${leaveDate.toISOString()}. ` +
      `Employee has canBookPublicHolidays=false, so no deduction (returning 0).`
    );
    return 0;
  }

  // Contractors (canBookPublicHolidays=true) should be deducted normally for public holidays
  // because they don't receive public holidays as paid time off
  if (holidayInfo && employee.canBookPublicHolidays) {
    console.log(
      `[Deduction] Public holiday detected: ${holidayInfo.holidayName} on ${leaveDate.toISOString()}. ` +
      `Employee has canBookPublicHolidays=true (contractor), so will be deducted normally.`
    );
  }

  const assignment = await prismaClient.employeeWorkingPatternAssignment.findFirst({
    where: {
      employeeId,
      effectiveDate: { lte: leaveDate },
    },
    orderBy: { effectiveDate: "desc" },
    include: {
      WorkingPattern: {
        include: {
          WorkingPatternWeek: {
            include: {
              WorkingPatternDay: true,
            },
          },
        },
      },
    },
  });

  if (!assignment || !assignment.WorkingPattern) {
    console.log(
      `[Deduction] No pattern assigned for ${leaveDate.toISOString()}. Returning 1.`,
    );
    return 1;
  }

  const workingPattern = assignment.WorkingPattern;
  const firstEffectiveDate = assignment.effectiveDate;
  const diffInDays = Math.floor(
    (leaveDate.getTime() - firstEffectiveDate.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // use the correct relation field name
  const weeks = workingPattern.WorkingPatternWeek;
  const weekCount = weeks.length;
  if (weekCount === 0) {
    console.log(`[Deduction] Pattern has 0 weeks. Returning 1.`);
    return 1;
  }
  const weekIndex =
    diffInDays >= 0 ? Math.floor(diffInDays / 7) % weekCount : 0;

  // sort by weekNumber
  const sortedWeeks = weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  const applicableWeek = sortedWeeks[weekIndex];

  // use the correct nested days field
  const dayOfWeek = leaveDate.toLocaleDateString("en-GB", {
    weekday: "short",
  });
  const days = applicableWeek.WorkingPatternDay;
  const dayEntry = days.find((day) => toShortDay(day.day) === dayOfWeek);

  console.log(`-----------------------------`);
  console.log(
    `[Deduction] Leave Date: ${leaveDate.toISOString()} (${dayOfWeek})`,
  );
  console.log(
    `[Deduction] Effective From: ${firstEffectiveDate.toISOString()}`,
  );
  console.log(`[Deduction] Days Since Effective: ${diffInDays}`);
  console.log(`[Deduction] Week Count: ${weekCount}`);
  console.log(`[Deduction] Week Index Used: ${weekIndex}`);
  console.log(
    `[Deduction] Applicable Week Number: ${applicableWeek?.weekNumber}`,
  );
  console.log(`[Deduction] Applicable Week Days:`, days);
  console.log(`[Deduction] Found Day Entry:`, dayEntry);

  if (!dayEntry) {
    console.log(`[Deduction] No matching day for ${dayOfWeek}. Returning 0.`);
    return 0;
  }

  switch (dayEntry.type) {
    case DayType.FULL_DAY:
      console.log(`[Deduction] FULL_DAY detected. Returning 1.`);
      return 1;
    case DayType.HALF_DAY_AM:
    case DayType.HALF_DAY_PM:
      console.log(`[Deduction] HALF_DAY detected. Returning 0.5.`);
      return 0.5;
    case DayType.TIMED:
      // For TIMED type, count as 1 full working day for leave deduction purposes
      // The actual hours worked are tracked separately for payroll/timesheet purposes
      console.log(`[Deduction] TIMED detected. Returning 1 (full working day).`);
      return 1;
    default:
      console.log(`[Deduction] NON_WORKING or unknown detected. Returning 0.`);
      return 0;
  }
}

/**
 * Calculates leave deduction with both days and hours.
 * 
 * This is the enhanced version that supports NZ Holidays Act 2003 compliance
 * for part-time and variable-hour employees.
 * 
 * @param employeeId - Employee ID (string)
 * @param leaveDate - Date of leave (Date object)
 * @param prismaClient - Prisma client or transaction
 * @returns LeaveDeductionResult with days, hours, and metadata
 */
export async function calculateLeaveDeductionWithHours(
  employeeId: string,
  leaveDate: Date,
  prismaClient: PrismaClientLike = prisma,
): Promise<LeaveDeductionResult> {
  const toShortDay = (name: string): string => {
    if (!name) return name;
    const normalized = name.toLowerCase();
    const map: Record<string, string> = {
      monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
      friday: "Fri", saturday: "Sat", sunday: "Sun",
      mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
      fri: "Fri", sat: "Sat", sun: "Sun",
    };
    return map[normalized] || name;
  };

  // Fetch employee with company for default hours
  const employee = await prismaClient.employee.findUnique({
    where: { id: employeeId },
    select: { 
      canBookPublicHolidays: true,
      companyId: true,
    },
  });

  // Get company default hours per day (field added in migration 20260121000000)
  let companyDefaultHours = DEFAULT_HOURS_PER_DAY;
  if (employee?.companyId) {
    try {
      const company = await prismaClient.company.findUnique({
        where: { id: employee.companyId },
      });
      // Use type assertion since field may not exist pre-migration
      const companyWithHours = company as typeof company & { defaultHoursPerDay?: any };
      if (companyWithHours?.defaultHoursPerDay) {
        companyDefaultHours = decimalToNumber(companyWithHours.defaultHoursPerDay, DEFAULT_HOURS_PER_DAY);
      }
    } catch {
      // Field doesn't exist yet, use default
    }
  }

  if (!employee) {
    console.log(`[DeductionWithHours] Employee ${employeeId} not found. Returning default.`);
    return {
      days: 1,
      hours: companyDefaultHours,
      hoursPerDay: companyDefaultHours,
      isPublicHoliday: false,
      isNonWorkingDay: false,
      notes: 'Employee not found, using default',
    };
  }

  // Check if this date is a public holiday
  const holidayInfo = await getNZPublicHolidayInfo(leaveDate, employee.companyId);
  
  // Standard employees should NOT be deducted for public holidays
  if (holidayInfo && !employee.canBookPublicHolidays) {
    return {
      days: 0,
      hours: 0,
      hoursPerDay: companyDefaultHours,
      isPublicHoliday: true,
      isNonWorkingDay: false,
      notes: `Public holiday: ${holidayInfo.holidayName}`,
    };
  }

  // Get working pattern assignment
  const assignment = await prismaClient.employeeWorkingPatternAssignment.findFirst({
    where: {
      employeeId,
      effectiveDate: { lte: leaveDate },
    },
    orderBy: { effectiveDate: "desc" },
    include: {
      WorkingPattern: {
        include: {
          WorkingPatternWeek: {
            include: {
              WorkingPatternDay: true,
            },
          },
        },
      },
    },
  });

  if (!assignment || !assignment.WorkingPattern) {
    return {
      days: 1,
      hours: companyDefaultHours,
      hoursPerDay: companyDefaultHours,
      isPublicHoliday: !!holidayInfo,
      isNonWorkingDay: false,
      notes: 'No working pattern assigned, using company default',
    };
  }

  const workingPattern = assignment.WorkingPattern;
  const firstEffectiveDate = assignment.effectiveDate;
  const diffInDays = Math.floor(
    (leaveDate.getTime() - firstEffectiveDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const weeks = workingPattern.WorkingPatternWeek;
  const weekCount = weeks.length;
  if (weekCount === 0) {
    return {
      days: 1,
      hours: companyDefaultHours,
      hoursPerDay: companyDefaultHours,
      isPublicHoliday: !!holidayInfo,
      isNonWorkingDay: false,
      notes: 'Working pattern has no weeks, using company default',
    };
  }

  const weekIndex = diffInDays >= 0 ? Math.floor(diffInDays / 7) % weekCount : 0;
  const sortedWeeks = weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  const applicableWeek = sortedWeeks[weekIndex];

  const dayOfWeek = leaveDate.toLocaleDateString("en-GB", { weekday: "short" });
  const days = applicableWeek.WorkingPatternDay;
  const dayEntry = days.find((day) => toShortDay(day.day) === dayOfWeek);

  if (!dayEntry) {
    return {
      days: 0,
      hours: 0,
      hoursPerDay: companyDefaultHours,
      isPublicHoliday: !!holidayInfo,
      isNonWorkingDay: true,
      notes: `No matching day entry for ${dayOfWeek}`,
    };
  }

  // Get hours for this specific day from the working pattern
  const hoursForDay = dayEntry.hoursPerDay 
    ? decimalToNumber(dayEntry.hoursPerDay, companyDefaultHours)
    : companyDefaultHours;

  switch (dayEntry.type) {
    case DayType.FULL_DAY:
      return {
        days: 1,
        hours: hoursForDay,
        hoursPerDay: hoursForDay,
        isPublicHoliday: !!holidayInfo,
        isNonWorkingDay: false,
        notes: 'Full working day',
      };
    case DayType.HALF_DAY_AM:
    case DayType.HALF_DAY_PM:
      return {
        days: 0.5,
        hours: hoursForDay / 2,
        hoursPerDay: hoursForDay,
        isPublicHoliday: !!holidayInfo,
        isNonWorkingDay: false,
        notes: `Half day (${dayEntry.type === DayType.HALF_DAY_AM ? 'AM' : 'PM'})`,
      };
    case DayType.TIMED:
      // TIMED days: hoursPerDay already has break time deducted when saved
      // (calculated by calculateDayHours in working-pattern-utils.ts)
      // So we use hoursForDay directly without subtracting break again
      // This is critical for NZ Holidays Act compliance for variable-hour employees
      const proportionalDays = hoursForDay / companyDefaultHours;
      return {
        days: proportionalDays,
        hours: hoursForDay,
        hoursPerDay: hoursForDay,
        isPublicHoliday: !!holidayInfo,
        isNonWorkingDay: false,
        notes: `Timed: ${hoursForDay}h`,
      };
    default:
      return {
        days: 0,
        hours: 0,
        hoursPerDay: hoursForDay,
        isPublicHoliday: !!holidayInfo,
        isNonWorkingDay: true,
        notes: 'Non-working day',
      };
  }
}

