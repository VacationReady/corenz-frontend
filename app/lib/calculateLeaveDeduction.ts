// lib/calculateLeaveDeduction.ts

import { prisma } from "@/lib/prisma";
import { DayType, Prisma } from "@prisma/client";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

/**
 * Calculates leave deduction based on employee working pattern.
 * @param employeeId - Employee ID (string)
 * @param leaveDate - Date of leave (Date object)
 * @returns For FULL_DAY/TIMED: 1, HALF_DAY: 0.5, NON_WORKING/not found: 0
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

