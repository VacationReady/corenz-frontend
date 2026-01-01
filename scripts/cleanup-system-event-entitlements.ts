/**
 * Cleanup Script: Remove LeaveEntitlement records for system-defined event categories
 * that don't require balance tracking.
 * 
 * Background:
 * - System-defined event categories (Bereavement, Compassionate, Dentist Appointment, etc.)
 *   were seeded with LeaveEntitlement records for all employees
 * - These categories don't need balance tracking - they can be booked without limits
 * - Only Annual Leave and Sickness need balance tracking
 * - Other entitlements with balanceRequired=true go to the "Other Entitlements" card
 * 
 * This script:
 * 1. Finds all system-defined event categories that are NOT Annual Leave or Sickness
 * 2. Deletes LeaveEntitlement records for those categories (where usedDays = 0)
 * 3. Preserves entitlements that have been used (usedDays > 0) for audit purposes
 * 
 * Usage:
 *   npx ts-node scripts/cleanup-system-event-entitlements.ts [--dry-run] [--company-id=xxx]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupSystemEventEntitlements(
  isDryRun: boolean = false,
  targetCompanyId?: string
) {
  console.log("\n" + "═".repeat(70));
  console.log("🧹 CLEANUP: System Event Category Entitlements");
  console.log("═".repeat(70));
  console.log(isDryRun ? "📝 DRY RUN MODE - No changes will be made\n" : "");

  // Categories that SHOULD have balance tracking
  const balanceTrackedCategories = ["Annual Leave", "Sickness", "Sick Leave"];

  // Build company filter
  const companyFilter = targetCompanyId ? { companyId: targetCompanyId } : {};

  // Find system-defined categories that don't need balance tracking
  const categoriesToClean = await prisma.eventCategory.findMany({
    where: {
      ...companyFilter,
      systemDefined: true,
      isActive: true,
      name: {
        notIn: balanceTrackedCategories,
      },
    },
    select: {
      id: true,
      name: true,
      companyId: true,
    },
  });

  console.log(`Found ${categoriesToClean.length} system categories to clean:\n`);
  for (const cat of categoriesToClean) {
    console.log(`  - ${cat.name} (${cat.id})`);
  }
  console.log("");

  if (categoriesToClean.length === 0) {
    console.log("✅ No categories to clean up.");
    return { deletedCount: 0, preservedCount: 0 };
  }

  const categoryIds = categoriesToClean.map((c) => c.id);

  // Find entitlements to delete (only those with 0 used days)
  const entitlementsToDelete = await prisma.leaveEntitlement.findMany({
    where: {
      eventCategoryId: { in: categoryIds },
      usedDays: 0,
    },
    include: {
      EventCategory: { select: { name: true } },
      Employee: { select: { id: true } },
    },
  });

  // Find entitlements to preserve (have been used)
  const entitlementsToPreserve = await prisma.leaveEntitlement.findMany({
    where: {
      eventCategoryId: { in: categoryIds },
      usedDays: { gt: 0 },
    },
    include: {
      EventCategory: { select: { name: true } },
      Employee: { select: { id: true } },
    },
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Entitlements to DELETE (unused): ${entitlementsToDelete.length}`);
  console.log(`   Entitlements to PRESERVE (used): ${entitlementsToPreserve.length}`);

  if (entitlementsToPreserve.length > 0) {
    console.log(`\n⚠️  Preserving ${entitlementsToPreserve.length} entitlements with usage:`);
    for (const ent of entitlementsToPreserve.slice(0, 10)) {
      console.log(`   - ${ent.EventCategory.name}: ${ent.usedDays} days used`);
    }
    if (entitlementsToPreserve.length > 10) {
      console.log(`   ... and ${entitlementsToPreserve.length - 10} more`);
    }
  }

  if (entitlementsToDelete.length === 0) {
    console.log("\n✅ No unused entitlements to delete.");
    return { deletedCount: 0, preservedCount: entitlementsToPreserve.length };
  }

  // Group by category for summary
  const deleteByCat: Record<string, number> = {};
  for (const ent of entitlementsToDelete) {
    const catName = ent.EventCategory.name;
    deleteByCat[catName] = (deleteByCat[catName] || 0) + 1;
  }

  console.log(`\n🗑️  Entitlements to delete by category:`);
  for (const [catName, count] of Object.entries(deleteByCat)) {
    console.log(`   - ${catName}: ${count} entitlements`);
  }

  if (!isDryRun) {
    console.log(`\n⏳ Deleting ${entitlementsToDelete.length} entitlements...`);

    const result = await prisma.leaveEntitlement.deleteMany({
      where: {
        eventCategoryId: { in: categoryIds },
        usedDays: 0,
      },
    });

    console.log(`\n✅ Deleted ${result.count} LeaveEntitlement records.`);
    return { deletedCount: result.count, preservedCount: entitlementsToPreserve.length };
  } else {
    console.log(`\n📝 DRY RUN: Would delete ${entitlementsToDelete.length} entitlements.`);
    return { deletedCount: 0, preservedCount: entitlementsToPreserve.length };
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const companyIdArg = args.find((a) => a.startsWith("--company-id="));
const targetCompanyId = companyIdArg?.split("=")[1];

cleanupSystemEventEntitlements(isDryRun, targetCompanyId)
  .then((result) => {
    console.log("\n" + "═".repeat(70));
    console.log("✨ Cleanup complete!");
    console.log(`   Deleted: ${result.deletedCount}`);
    console.log(`   Preserved: ${result.preservedCount}`);
    console.log("═".repeat(70) + "\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error during cleanup:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
