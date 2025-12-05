// lib/calculateLeaveDeduction.ts

import { prisma } from "@/lib/prisma";
import { DayType, Prisma } from "@prisma/client";
import { calculateHoursForDay } from "@/lib/working-pattern-utils";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

/**
 * Calculates leave deduction based on employee working pattern.
 * @param employeeId - Employee ID (string)
 * @param leaveDate - Date of leave (Date object)
 * @returns For FULL_DAY: 1, HALF_DAY: 0.5, TIMED: actual hours worked, NON_WORKING: 0
 * 
 * Note: For TIMED day types, this returns the actual hours (e.g., 7.5) rather than
 * day fractions. Calling code should normalize if needed by dividing by standard day hours.
 */
export async function calculateLeaveDeduction(
  employeeId: string,
  leaveDate: Date,
  prismaClient: PrismaClientLike = prisma,
): Promise<number> {
  const toShortDay = (name: string): string => {
    const map: Record<string, string> = {
      Monday: "Mon",
      Tuesday: "Tue",
      Wednesday: "Wed",
      Thursday: "Thu",
      Friday: "Fri",
      Saturday: "Sat",
      Sunday: "Sun",
    };
    if (!name) return name;
    // If already short (Mon, Tue, ...), return as-is
    if (name.length <= 3) return name;
    return map[name] || name;
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
      // For TIMED type, return actual hours from the pattern
      const hours = calculateHoursForDay({
        type: dayEntry.type,
        hoursPerDay: dayEntry.hoursPerDay ? parseFloat(dayEntry.hoursPerDay.toString()) : null,
        startTime: dayEntry.startTime ?? undefined,
        endTime: dayEntry.endTime ?? undefined,
        breakMinutes: dayEntry.breakMinutes ?? undefined,
      }, workingPattern.defaultBreakMinutes ?? 30);
      console.log(`[Deduction] TIMED detected. Hours: ${hours}. Returning ${hours}.`);
      return hours;
    default:
      console.log(`[Deduction] NON_WORKING or unknown detected. Returning 0.`);
      return 0;
  }
}

