// lib/calculateLeaveDeductionBatchEnhanced.ts

import { prisma } from "@/lib/prisma";
import { DayType, Prisma } from "@prisma/client";
import { 
  DEFAULT_HOURS_PER_DAY,
  decimalToNumber,
} from "@/lib/leave/hours-conversion";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

interface DeductionResult {
  date: string;
  /** Deduction in days (1, 0.5, 0) - for backward compatibility */
  deduction: number;
  /** Deduction in hours - based on working pattern hoursPerDay */
  deductionHours: number;
  /** Hours per day for this specific date */
  hoursPerDay: number;
  isNonWorkingDay: boolean;
  isPublicHoliday: boolean;
  notes?: string;
}

/**
 * Enhanced batch version that maintains exact same logic as original calculateLeaveDeduction
 * @param employeeId - Employee ID (string)
 * @param dates - Array of dates to calculate deductions for
 * @param options - Additional options (currently unused, for future extensibility)
 * @returns Array of detailed deduction results
 */
export async function calculateLeaveDeductionBatchEnhanced(
  employeeId: string,
  dates: Date[],
  options: {
    prismaClient?: PrismaClientLike;
  } = {}
): Promise<DeductionResult[]> {
  if (dates.length === 0) return [];

  const { prismaClient = prisma } = options;

  // Fetch employee to get company default hours
  const employee = await prismaClient.employee.findUnique({
    where: { id: employeeId },
    select: { companyId: true },
  });

  // Get company default hours per day
  let companyDefaultHours = DEFAULT_HOURS_PER_DAY;
  if (employee?.companyId) {
    try {
      const company = await prismaClient.company.findUnique({
        where: { id: employee.companyId },
      });
      const companyWithHours = company as typeof company & { defaultHoursPerDay?: any };
      if (companyWithHours?.defaultHoursPerDay) {
        companyDefaultHours = decimalToNumber(companyWithHours.defaultHoursPerDay, DEFAULT_HOURS_PER_DAY);
      }
    } catch {
      // Field doesn't exist yet, use default
    }
  }

  const toShortDay = (name: string): string => {
    if (!name) return name;
    const normalized = name.toLowerCase();
    const map: Record<string, string> = {
      monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", 
      friday: "Fri", saturday: "Sat", sunday: "Sun",
      mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
    };
    return map[normalized] || name;
  };

  // Find the earliest date to use for working pattern lookup
  const earliestDate = dates.reduce((min, date) => date < min ? date : min, dates[0]);

  // Fetch working pattern once for all dates (same as original)
  const assignment = await prismaClient.employeeWorkingPatternAssignment.findFirst({
    where: { employeeId, effectiveDate: { lte: earliestDate } },
    orderBy: { effectiveDate: "desc" },
    include: {
      WorkingPattern: {
        include: {
          WorkingPatternWeek: {
            include: { WorkingPatternDay: true },
          },
        },
      },
    },
  });

  if (!assignment || !assignment.WorkingPattern) {
    console.log(
      `[Deduction Batch Enhanced] No pattern assigned for ${earliestDate.toISOString()}. Returning 1 for all dates.`
    );
    return dates.map(date => ({
      date: date.toISOString().split('T')[0],
      deduction: 1,
      deductionHours: companyDefaultHours,
      hoursPerDay: companyDefaultHours,
      isNonWorkingDay: false,
      isPublicHoliday: false,
      notes: 'Default pattern (no assignment)',
    }));
  }

  const workingPattern = assignment.WorkingPattern;
  const firstEffectiveDate = assignment.effectiveDate;
  const weeks = workingPattern.WorkingPatternWeek;
  const weekCount = weeks.length;

  if (weekCount === 0) {
    console.log(`[Deduction Batch Enhanced] Pattern has 0 weeks. Returning 1 for all dates.`);
    return dates.map(date => ({
      date: date.toISOString().split('T')[0],
      deduction: 1,
      deductionHours: companyDefaultHours,
      hoursPerDay: companyDefaultHours,
      isNonWorkingDay: false,
      isPublicHoliday: false,
      notes: 'Default pattern (no weeks)',
    }));
  }

  const sortedWeeks = weeks.sort((a, b) => a.weekNumber - b.weekNumber);

  // Calculate deduction for each date using exact same logic as original
  return dates.map((leaveDate) => {
    const dateStr = leaveDate.toISOString().split('T')[0];
    
    const diffInDays = Math.floor(
      (leaveDate.getTime() - firstEffectiveDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const weekIndex = diffInDays >= 0 ? Math.floor(diffInDays / 7) % weekCount : 0;
    const applicableWeek = sortedWeeks[weekIndex];

    const dayOfWeek = leaveDate.toLocaleDateString("en-GB", { weekday: "short" });
    const days = applicableWeek.WorkingPatternDay;
    const dayEntry = days.find((day) => toShortDay(day.day) === dayOfWeek);

    if (!dayEntry) {
      return {
        date: dateStr,
        deduction: 0,
        deductionHours: 0,
        hoursPerDay: companyDefaultHours,
        isNonWorkingDay: true,
        isPublicHoliday: false,
        notes: `No working pattern entry for ${dayOfWeek}`,
      };
    }

    // Get hours for this specific day from the working pattern
    const hoursForDay = dayEntry.hoursPerDay 
      ? decimalToNumber(dayEntry.hoursPerDay, companyDefaultHours)
      : companyDefaultHours;

    // Get break minutes for TIMED days (NZ Holidays Act compliance)
    // Break time should be deducted from the hours worked
    const breakMinutes = dayEntry.breakMinutes ?? 0;
    const breakHours = breakMinutes / 60;

    let deduction = 0;
    let deductionHours = 0;
    let notes = '';

    switch (dayEntry.type) {
      case DayType.FULL_DAY:
        deduction = 1;
        deductionHours = hoursForDay;
        notes = 'Full working day';
        break;
      case DayType.HALF_DAY_AM:
      case DayType.HALF_DAY_PM:
        deduction = 0.5;
        deductionHours = hoursForDay / 2;
        notes = `Half day (${dayEntry.type === DayType.HALF_DAY_AM ? 'AM' : 'PM'})`;
        break;
      case DayType.TIMED:
        // TIMED days: Use actual hours worked minus break time
        // This is critical for NZ Holidays Act compliance for variable-hour employees
        // Example: 8h scheduled with 30min break = 7.5h deduction
        const actualHoursWorked = Math.max(0, hoursForDay - breakHours);
        deduction = actualHoursWorked / companyDefaultHours; // Proportional day deduction
        deductionHours = actualHoursWorked;
        notes = breakMinutes > 0 
          ? `Timed: ${hoursForDay}h - ${breakMinutes}min break = ${actualHoursWorked}h`
          : `Timed: ${hoursForDay}h`;
        break;
      default:
        deduction = 0;
        deductionHours = 0;
        notes = 'Non-working day';
        break;
    }

    return {
      date: dateStr,
      deduction,
      deductionHours,
      hoursPerDay: hoursForDay,
      isNonWorkingDay: deduction === 0,
      isPublicHoliday: false,
      notes,
    };
  });
}

/**
 * Simplified version that returns just the deduction amounts (backward compatibility)
 */
export async function calculateLeaveDeductionBatch(
  employeeId: string,
  dates: Date[],
  prismaClient: PrismaClientLike = prisma
): Promise<number[]> {
  const results = await calculateLeaveDeductionBatchEnhanced(employeeId, dates, { 
    prismaClient 
  });
  return results.map(r => r.deduction);
}
