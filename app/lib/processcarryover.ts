// lib/processCarryover.ts

import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";

/**
 * Processes annual carryover for leave entitlements across all employees.
 * Run manually or via CRON at the end/start of the leave year.
 */
export async function processCarryover() {
    console.log("🚀 Starting carryover processing...");

    const today = dayjs();
    const leaveYearEnd = dayjs(`${today.year() - 1}-12-31`); // last calendar year end

    const entitlements = await prisma.leaveEntitlement.findMany({
        include: {
            employee: true,
            eventCategory: true,
        },
    });

    for (const entitlement of entitlements) {
        try {
            const eventRule = await prisma.eventRule.findUnique({
                where: {
                    companyId_eventCategoryId: {
                        companyId: "default-company-id",
                        eventCategoryId: entitlement.eventCategoryId,
                    },
                },
                select: {
                    maxCarryoverDays: true,
                    carryoverExpiryMonths: true,
                },
            });

            if (!eventRule || eventRule.maxCarryoverDays === null) {
                console.log(
                    `⏩ Skipping ${entitlement.employeeId} (${entitlement.eventCategoryId}): Carryover not enabled.`
                );
                continue;
            }

            const remainingDays = entitlement.totalDays - entitlement.usedDays;
            const carryoverDays = Math.max(
                0,
                Math.min(remainingDays, eventRule.maxCarryoverDays)
            );

            let carryoverExpiryDate: Date | null = null;
            if (eventRule.carryoverExpiryMonths !== null) {
                carryoverExpiryDate = leaveYearEnd
                    .add(eventRule.carryoverExpiryMonths, "month")
                    .toDate();
            }

            await prisma.leaveEntitlement.update({
                where: { id: entitlement.id },
                data: {
                    carryoverDays: carryoverDays,
                    usedDays: 0, // reset for the new leave year
                    carryoverExpiry: carryoverExpiryDate,
                    // Optional: uncomment below if you want to add the annual entitlement automatically
                    // totalDays: entitlement.totalDays + (your_default_annual_days_value),
                },
            });

            console.log(
                `✅ Processed carryover for employee ${entitlement.employeeId} (${entitlement.eventCategoryId}): carried over ${carryoverDays} days, expires ${carryoverExpiryDate ?? "never"}`
            );
        } catch (error) {
            console.error(
                `❌ Error processing carryover for ${entitlement.employeeId} (${entitlement.eventCategoryId}):`,
                error
            );
        }
    }

    console.log("🎉 Carryover processing complete.");
}
