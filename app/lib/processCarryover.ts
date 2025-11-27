// lib/processCarryover.ts

import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";
import { roundToTwoDecimals, addWithPrecision, subtractWithPrecision } from "@/lib/decimalPrecision";

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
      EventCategory: {
        EventRule: {
          some: {
            maxCarryoverDays: { gt: 0 },
          },
        },
      },
    },
    include: {
      Employee: {
        include: {
          Department: {
            select: { companyId: true },
          },
        },
      },
      EventCategory: true,
    },
  });

  console.log(`🔍 Found ${entitlements.length} entitlements to process.`);

  for (const entitlement of entitlements) {
    try {
      const companyId = entitlement.Employee.Department?.companyId;
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

      if (
        !eventRule ||
        !eventRule.maxCarryoverDays ||
        eventRule.maxCarryoverDays === 0
      ) {
        console.log(
          `⏩ Skipping ${entitlement.id} - No carryover allowed or no event rule found.`,
        );
        continue;
      }

      // Round all calculations to 2 decimal places (NZ HRIS requirement)
      const remainingDays = roundToTwoDecimals(subtractWithPrecision(entitlement.totalDays, entitlement.usedDays));
      const carryoverDays = roundToTwoDecimals(Math.min(remainingDays, eventRule.maxCarryoverDays));

      console.log({
        entitlementId: entitlement.id,
        employeeId: entitlement.employeeId,
        companyId: companyId,
        eventCategoryId: entitlement.eventCategoryId,
        maxCarryoverDays: eventRule.maxCarryoverDays,
        remainingDays: remainingDays,
        calculatedCarryoverDays: carryoverDays,
        previousTotalDays: entitlement.totalDays,
        usedDays: entitlement.usedDays,
      });

      if (carryoverDays <= 0) {
        console.log(
          `⏩ Skipping ${entitlement.id} - No remaining days to carry over.`,
        );
        continue;
      }

      let carryoverExpiry: Date | null = null;
      if (eventRule.carryoverExpiryMonths) {
        carryoverExpiry = leaveYearEnd
          .add(eventRule.carryoverExpiryMonths, "month")
          .toDate();
      }

      // Round new totalDays to 2 decimal places (NZ HRIS requirement)
      const newTotalDays = addWithPrecision(entitlement.totalDays, carryoverDays);

      await prisma.leaveEntitlement.update({
        where: { id: entitlement.id },
        data: {
          carryoverDays: carryoverDays,
          carryoverExpiry: carryoverExpiry,
          usedDays: 0,
          totalDays: newTotalDays,
        },
      });

      console.log(
        `✅ Processed ${entitlement.id}: +${carryoverDays} carryover, new total: ${newTotalDays}, expires ${carryoverExpiry ?? "never"}.`,
      );
    } catch (error) {
      console.error(`❌ Error on entitlement ${entitlement.id}:`, error);
    }
  }

  console.log("🎉 Carryover processing complete.");
}

