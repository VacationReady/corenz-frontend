// lib/calculateLeaveDeduction.ts

import { prisma } from "@/lib/prisma";
import { DayType } from "@prisma/client";

/**
 * Calculates leave deduction based on employee working pattern.
 * @param employeeId - Employee ID (string)
 * @param leaveDate - Date of leave (Date object)
 * @returns 0 | 0.5 | 1
 */
export async function calculateLeaveDeduction(employeeId: string, leaveDate: Date): Promise<number> {
    // Get the effective working pattern assignment for the employee as of leaveDate
    const assignment = await prisma.employeeWorkingPatternAssignment.findFirst({
        where: {
            employeeId,
            effectiveDate: { lte: leaveDate },
        },
        orderBy: { effectiveDate: "desc" },
        include: {
            workingPattern: {
                include: {
                    weeks: {
                        include: {
                            days: true,
                        },
                    },
                },
            },
        },
    });

    if (!assignment || !assignment.workingPattern) {
        console.log(`[Deduction] No pattern assigned. Defaulting to 1.`);
        return 1;
    }

    const workingPattern = assignment.workingPattern;

    // Determine which week in the pattern applies based on the leaveDate
    const firstEffectiveDate = assignment.effectiveDate;
    const diffInDays = Math.floor((leaveDate.getTime() - firstEffectiveDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekCount = workingPattern.weeks.length;

    const weekIndex = diffInDays >= 0 ? Math.floor(diffInDays / 7) % weekCount : 0;
    const applicableWeek = workingPattern.weeks.sort((a, b) => a.weekNumber - b.weekNumber)[weekIndex];

    if (!applicableWeek) {
        console.log(`[Deduction] No applicable week found. Defaulting to 1.`);
        return 1; // Fallback if something goes wrong
    }

    const dayOfWeek = leaveDate.toLocaleDateString("en-GB", { weekday: "long" }); // "Monday", "Tuesday", etc.
    const dayEntry = applicableWeek.days.find(day => day.day === dayOfWeek);

    console.log(`[Deduction] Leave Date: ${leaveDate.toISOString()} | DayOfWeek: ${dayOfWeek}`);
    console.log(`[Deduction] Applicable Week:`, applicableWeek);
    console.log(`[Deduction] Week Days:`, applicableWeek.days);
    console.log(`[Deduction] Matching Day Entry:`, dayEntry);

    if (!dayEntry) {
        console.log(`[Deduction] No day entry found for ${dayOfWeek}. Returning 0.`);
        return 0; // No deduction if the day is not in the pattern
    }

    switch (dayEntry.type) {
        case DayType.FULL_DAY:
            console.log(`[Deduction] FULL_DAY detected. Returning 1.`);
            return 1;
        case DayType.HALF_DAY_AM:
        case DayType.HALF_DAY_PM:
            console.log(`[Deduction] HALF_DAY detected. Returning 0.5.`);
            return 0.5;
        default:
            console.log(`[Deduction] NON_WORKING or unknown detected. Returning 0.`);
            return 0;
    }
}
