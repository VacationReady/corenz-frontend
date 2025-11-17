import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local so the script can connect to the database
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { prisma } from "@/lib/prisma";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

/**
 * Backfill script to recalculate LeaveEntitlement.usedDays from approved LeaveRequest rows.
 *
 * Behaviour / assumptions
 * - For each (employeeId, eventCategoryId) entitlement, we:
 *   - Find all APPROVED leave requests for that employee & category.
 *   - For each request, iterate from startDate to endDate - 1 (return-to-work exclusive),
 *     using calculateLeaveDeduction so working patterns and half days are respected.
 *   - Sum all deductions to get the canonical usedDays.
 *   - Overwrite LeaveEntitlement.usedDays with this value.
 *
 * Idempotence
 * - This script is deterministic: running it multiple times produces the same usedDays
 *   values as long as the underlying leave requests and working patterns do not change.
 */
async function backfillLeaveEntitlementUsedDays() {
  console.log("\n🔧 Starting LeaveEntitlement.usedDays backfill...\n");

  const entitlements = await prisma.leaveEntitlement.findMany({
    select: {
      id: true,
      employeeId: true,
      eventCategoryId: true,
      companyId: true,
      usedDays: true,
    },
  });

  console.log(`📊 Found ${entitlements.length} leave entitlements to process`);

  // Fetch all approved leave requests once and group by (employeeId, eventCategoryId)
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      approvalStatus: "APPROVED",
    },
    select: {
      id: true,
      employeeId: true,
      eventCategoryId: true,
      startDate: true,
      endDate: true,
      companyId: true,
    },
  });

  console.log(`📄 Found ${approvedLeaves.length} approved leave requests to use for reconstruction`);

  type LeaveKey = string;
  type LeaveLite = (typeof approvedLeaves)[number];

  const leavesByKey = new Map<LeaveKey, LeaveLite[]>();

  for (const lr of approvedLeaves) {
    const key: LeaveKey = `${lr.employeeId}:${lr.eventCategoryId}`;
    const list = leavesByKey.get(key);
    if (list) {
      list.push(lr);
    } else {
      leavesByKey.set(key, [lr]);
    }
  }

  let processed = 0;
  let updated = 0;
  let unchanged = 0;
  let totalDiff = 0;

  for (const ent of entitlements) {
    processed++;
    const key: LeaveKey = `${ent.employeeId}:${ent.eventCategoryId}`;
    const leaves = leavesByKey.get(key) ?? [];

    let computedUsed = 0;

    for (const lr of leaves) {
      let currentDate = new Date(lr.startDate);
      const exclusiveEnd = new Date(lr.endDate);
      // End date is return-to-work (exclusive) for deduction purposes
      exclusiveEnd.setDate(exclusiveEnd.getDate() - 1);

      while (currentDate <= exclusiveEnd) {
        // Use the same calculation logic as live approval flows
        // eslint-disable-next-line no-await-in-loop
        const deduction = await calculateLeaveDeduction(ent.employeeId, currentDate, prisma);
        computedUsed += deduction;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Reduce floating point noise
    const newUsedDays = Number(computedUsed.toFixed(4));

    if (newUsedDays !== ent.usedDays) {
      const diff = newUsedDays - ent.usedDays;
      totalDiff += diff;
      updated++;

      console.log(
        `🔁 Entitlement ${ent.id} (employee=${ent.employeeId}, eventCategory=${ent.eventCategoryId}) ` +
          `usedDays: ${ent.usedDays} → ${newUsedDays} (Δ=${diff.toFixed(4)})`,
      );

      await prisma.leaveEntitlement.update({
        where: { id: ent.id },
        data: {
          usedDays: newUsedDays,
          updatedAt: new Date(),
        },
      });
    } else {
      unchanged++;
    }

    if (processed % 100 === 0) {
      console.log(`...processed ${processed}/${entitlements.length} entitlements`);
    }
  }

  console.log("\n📈 Backfill Summary:");
  console.log("━".repeat(50));
  console.log(`   Total entitlements:  ${entitlements.length}`);
  console.log(`   Updated entitlements: ${updated}`);
  console.log(`   Unchanged:            ${unchanged}`);
  console.log(`   Total usedDays delta: ${totalDiff.toFixed(4)}`);
  console.log("━".repeat(50));

  console.log("\n✨ LeaveEntitlement.usedDays backfill complete!\n");
}

backfillLeaveEntitlementUsedDays()
  .catch((error) => {
    console.error("❌ Fatal error during leave entitlement backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
