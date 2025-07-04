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
    const leaveYearEnd = dayjs(`${today.year() - 1}-12-31`);

    const entitlements = await prisma.leaveEntitlement.findMany({
        where: {
            eventCategory: {
                eventRules: {
                    some: {
                        maxCarryoverDays: { gt: 0 },
                    },
                },
            },
        },
        include: {
            employee: {
                include: {
                    department: true, // department now has companyId
                },
            },
            eventCategory: true,
        },
    });

    for (const entitlement of entitlements) {
        try {
            const companyId = entitlement.employee.department?.companyId;
            if (!companyId) {
                console.log(`⚠️ Skipping ${entitlement.id} - No companyId found.`);
                continue;
            }

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

            if (!eventRule || !eventRule.maxCarryoverDays || eventRule.maxCarryoverDays === 0) {
                console.log(`⏩ Skipping ${entitlement.id} - No carryover allowed.`);
                continue;
            }

            const remainingDays = entitlement.totalDays - entitlement.usedDays;
            const carryoverDays = Math.min(remainingDays, eventRule.maxCarryoverDays);

            let carryoverExpiry: Date | null = null;
            if (eventRule.carryoverExpiryMonths) {
                carryoverExpiry = leaveYearEnd.add(eventRule.carryoverExpiryMonths, "month").toDate();
            }

            await prisma.leaveEntitlement.update({
                where: { id: entitlement.id },
                data: {
                    carryoverDays: carryoverDays,
                    carryoverExpiry: carryoverExpiry,
                    usedDays: 0,
                    totalDays: entitlement.totalDays + carryoverDays,
                },
            });

            console.log(
                `✅ Processed ${entitlement.id}: +${carryoverDays} carryover, expires ${carryoverExpiry ?? "never"}.`
            );
        } catch (error) {
            console.error(`❌ Error on entitlement ${entitlement.id}:`, error);
        }
    }

    console.log("🎉 Carryover processing complete.");
}
