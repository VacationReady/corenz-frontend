// lib/calculateLeaveDeductionBatchEnhanced.ts

import { prisma } from "@/lib/prisma";
import { DayType, Prisma } from "@prisma/client";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

interface DeductionResult {
  date: string;
  deduction: number;
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
        isNonWorkingDay: true,
        isPublicHoliday: false,
        notes: `No working pattern entry for ${dayOfWeek}`,
      };
    }

    let deduction = 0;
    let notes = '';

    switch (dayEntry.type) {
      case DayType.FULL_DAY:
        deduction = 1;
        notes = 'Full working day';
        break;
      case DayType.HALF_DAY_AM:
      case DayType.HALF_DAY_PM:
        deduction = 0.5;
        notes = `Half day (${dayEntry.type === DayType.HALF_DAY_AM ? 'AM' : 'PM'})`;
        break;
      case DayType.TIMED:
        deduction = 1; // Full working day for leave purposes
        notes = 'Timed hours (counted as full day)';
        break;
      default:
        deduction = 0;
        notes = 'Non-working day';
        break;
    }

    return {
      date: dateStr,
      deduction,
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
