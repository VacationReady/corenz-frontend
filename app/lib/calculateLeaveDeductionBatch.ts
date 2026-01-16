// lib/calculateLeaveDeductionBatch.ts

import { prisma } from "@/lib/prisma";
import { DayType, Prisma } from "@prisma/client";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

/**
 * Optimized batch version of calculateLeaveDeduction.
 * Fetches working pattern once and calculates deductions for all dates.
 * @param employeeId - Employee ID (string)
 * @param dates - Array of dates to calculate deductions for
 * @returns Array of deductions corresponding to each date
 */
export async function calculateLeaveDeductionBatch(
  employeeId: string,
  dates: Date[],
  prismaClient: PrismaClientLike = prisma,
): Promise<number[]> {
  if (dates.length === 0) return [];

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

  // Find the earliest date to use for working pattern lookup
  const earliestDate = dates.reduce((min, date) => date < min ? date : min, dates[0]);

  // Fetch working pattern once for all dates
  const assignment = await prismaClient.employeeWorkingPatternAssignment.findFirst({
    where: {
      employeeId,
      effectiveDate: { lte: earliestDate },
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
      `[Deduction Batch] No pattern assigned for ${earliestDate.toISOString()}. Returning 1 for all dates.`,
    );
    return dates.map(() => 1);
  }

  const workingPattern = assignment.WorkingPattern;
  const firstEffectiveDate = assignment.effectiveDate;
  const weeks = workingPattern.WorkingPatternWeek;
  const weekCount = weeks.length;

  if (weekCount === 0) {
    console.log(`[Deduction Batch] Pattern has 0 weeks. Returning 1 for all dates.`);
    return dates.map(() => 1);
  }

  const sortedWeeks = weeks.sort((a, b) => a.weekNumber - b.weekNumber);

  // Calculate deduction for each date
  return dates.map((leaveDate) => {
    const diffInDays = Math.floor(
      (leaveDate.getTime() - firstEffectiveDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const weekIndex =
      diffInDays >= 0 ? Math.floor(diffInDays / 7) % weekCount : 0;
    const applicableWeek = sortedWeeks[weekIndex];

    const dayOfWeek = leaveDate.toLocaleDateString("en-GB", {
      weekday: "short",
    });
    const days = applicableWeek.WorkingPatternDay;
    const dayEntry = days.find((day) => toShortDay(day.day) === dayOfWeek);

    if (!dayEntry) {
      return 0;
    }

    switch (dayEntry.type) {
      case DayType.FULL_DAY:
        return 1;
      case DayType.HALF_DAY_AM:
      case DayType.HALF_DAY_PM:
        return 0.5;
      case DayType.TIMED:
        // For TIMED type, count as 1 full working day for leave deduction purposes
        return 1;
      default:
        return 0;
    }
  });
}
