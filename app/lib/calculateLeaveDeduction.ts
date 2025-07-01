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
        console.log(`[Deduction] No pattern assigned for ${leaveDate.toISOString()}. Returning 1.`);
        return 1;
    }

    const workingPattern = assignment.workingPattern;
    const firstEffectiveDate = assignment.effectiveDate;
    const diffInDays = Math.floor(
        (leaveDate.getTime() - firstEffectiveDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekCount = workingPattern.weeks.length;
    const weekIndex = diffInDays >= 0 ? Math.floor(diffInDays / 7) % weekCount : 0;

    const sortedWeeks = workingPattern.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
    const applicableWeek = sortedWeeks[weekIndex];

    const dayOfWeek = leaveDate.toLocaleDateString("en-GB", { weekday: "short" });
    const dayEntry = applicableWeek?.days.find(day => day.day === dayOfWeek);

    console.log(`-----------------------------`);
    console.log(`[Deduction] Leave Date: ${leaveDate.toISOString()} (${dayOfWeek})`);
    console.log(`[Deduction] Effective From: ${firstEffectiveDate.toISOString()}`);
    console.log(`[Deduction] Days Since Effective: ${diffInDays}`);
    console.log(`[Deduction] Week Count: ${weekCount}`);
    console.log(`[Deduction] Week Index Used: ${weekIndex}`);
    console.log(`[Deduction] Applicable Week Number: ${applicableWeek?.weekNumber}`);
    console.log(`[Deduction] Applicable Week Days:`, applicableWeek?.days);
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
        default:
            console.log(`[Deduction] NON_WORKING or unknown detected. Returning 0.`);
            return 0;
    }
}
