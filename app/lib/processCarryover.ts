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

    // Fetch only entitlements tied to event categories with carryover enabled
    const entitlements = await prisma.leaveEntitlement.findMany({
        where: {
            eventCategory: {
                eventRules: {
                    some: {
                        maxCarryoverDays: {
                            gt: 0
                        }
                    }
                }
            }
        },
        include: {
            employee: {
                include: {
                    department: true, // ✅ fetch department to get companyId
                },
            },
            eventCategory: true,
        },
    });

    for (const entitlement of entitlements) {
        try {
            const companyId = entitlement.employee.department?.companyId ?? "default-company-id";
            const eventRule = await prisma.eventRule.findUnique({
                where: {
                    companyId_eventCategoryId: {
                        companyId: companyId,
                        eventCategoryId: entitlement.eventCategoryId,
                    },
                },
                select: {
                    maxCarryoverDays: true,
                    carryoverExpiryMonths: true,
                },
            });

            if (!eventRule || eventRule.maxCarryoverDays === null || eventRule.maxCarryoverDays === 0) {
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

            // Update entitlement to add carryover without resetting standard entitlement
            await prisma.leaveEntitlement.update({
                where: { id: entitlement.id },
                data: {
                    carryoverDays: carryoverDays,
                    carryoverExpiry: carryoverExpiryDate,
                    usedDays: 0, // reset used days for new year
                    totalDays: entitlement.totalDays + carryoverDays // correctly add carryover
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
