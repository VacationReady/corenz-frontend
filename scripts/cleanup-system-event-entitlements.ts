/**
 * Cleanup Script: Configure balance tracking for system-defined event categories
 * 
 * Background:
 * - Only Annual Leave and Sickness should show as balance cards on the leave page
 * - Other system-defined categories (Bereavement, Compassionate, etc.) can be booked
 *   without balance tracking
 * - The UI doesn't allow toggling balanceRequired for system-defined categories
 * 
 * This script:
 * 1. Sets balanceRequired = true for Annual Leave and Sickness
 * 2. Sets balanceRequired = false for all other system-defined categories
 * 3. Optionally deletes unused LeaveEntitlement records for non-balance categories
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
  console.log("🧹 CLEANUP: System Event Category Balance Settings");
  console.log("═".repeat(70));
  console.log(isDryRun ? "📝 DRY RUN MODE - No changes will be made\n" : "");

  // Categories that SHOULD have balance tracking
  const balanceTrackedCategories = ["Annual Leave", "Sickness", "Sick Leave"];

  // Build company filter
  const companyFilter = targetCompanyId ? { companyId: targetCompanyId } : {};

  // ========== STEP 1: Enable balance for Annual Leave / Sickness ==========
  console.log("STEP 1: Ensuring Annual Leave & Sickness have balanceRequired=true...\n");

  const coreCategories = await prisma.eventCategory.findMany({
    where: {
      ...companyFilter,
      name: { in: balanceTrackedCategories },
      isActive: true,
    },
    select: { id: true, name: true, balanceRequired: true },
  });

  for (const cat of coreCategories) {
    const status = cat.balanceRequired ? "✓ already true" : "⚠️  will set to true";
    console.log(`  - ${cat.name}: ${status}`);
  }

  const coreNeedingUpdate = coreCategories.filter(c => !c.balanceRequired);
  if (coreNeedingUpdate.length > 0 && !isDryRun) {
    await prisma.eventCategory.updateMany({
      where: { id: { in: coreNeedingUpdate.map(c => c.id) } },
      data: { balanceRequired: true, updatedAt: new Date() },
    });
    console.log(`\n✅ Updated ${coreNeedingUpdate.length} core categories to balanceRequired=true`);
  } else if (coreNeedingUpdate.length > 0) {
    console.log(`\n📝 DRY RUN: Would update ${coreNeedingUpdate.length} core categories`);
  }

  // ========== STEP 2: Disable balance for other system categories ==========
  console.log("\n" + "─".repeat(70));
  console.log("STEP 2: Setting balanceRequired=false for other system categories...\n");

  const otherCategories = await prisma.eventCategory.findMany({
    where: {
      ...companyFilter,
      systemDefined: true,
      isActive: true,
      name: { notIn: balanceTrackedCategories },
    },
    select: { id: true, name: true, balanceRequired: true },
  });

  console.log(`Found ${otherCategories.length} other system categories:\n`);
  for (const cat of otherCategories) {
    const status = cat.balanceRequired ? "⚠️  balanceRequired=true (will fix)" : "✓ already false";
    console.log(`  - ${cat.name}: ${status}`);
  }

  const othersNeedingUpdate = otherCategories.filter(c => c.balanceRequired);
  
  if (othersNeedingUpdate.length > 0 && !isDryRun) {
    const updateResult = await prisma.eventCategory.updateMany({
      where: { id: { in: othersNeedingUpdate.map(c => c.id) } },
      data: {
        balanceRequired: false,
        defaultBalance: null,
        balanceRefreshMonths: null,
        updatedAt: new Date(),
      },
    });
    console.log(`\n✅ Updated ${updateResult.count} categories to balanceRequired=false`);
  } else if (othersNeedingUpdate.length > 0) {
    console.log(`\n📝 DRY RUN: Would update ${othersNeedingUpdate.length} categories`);
  } else {
    console.log(`\n✅ All other system categories already have balanceRequired=false`);
  }

  // ========== STEP 3: Clean up LeaveEntitlement records (optional) ==========
  console.log("\n" + "─".repeat(70));
  console.log("STEP 3: Cleaning up unused LeaveEntitlement records...\n");

  const categoryIds = otherCategories.map((c) => c.id);

  if (categoryIds.length === 0) {
    console.log("✅ No categories to clean up.");
    return { 
      coreUpdated: isDryRun ? 0 : coreNeedingUpdate.length,
      othersUpdated: isDryRun ? 0 : othersNeedingUpdate.length, 
      entitlementsDeleted: 0, 
      entitlementsPreserved: 0 
    };
  }

  // Find entitlements to delete (only those with 0 used days)
  const entitlementsToDelete = await prisma.leaveEntitlement.findMany({
    where: {
      eventCategoryId: { in: categoryIds },
      usedDays: 0,
    },
    include: {
      EventCategory: { select: { name: true } },
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
    },
  });

  console.log(`📊 LeaveEntitlement Summary:`);
  console.log(`   To DELETE (unused, usedDays=0): ${entitlementsToDelete.length}`);
  console.log(`   To PRESERVE (has usage): ${entitlementsToPreserve.length}`);

  if (entitlementsToPreserve.length > 0) {
    console.log(`\n⚠️  Preserving ${entitlementsToPreserve.length} entitlements with usage:`);
    const byCategory: Record<string, number> = {};
    for (const ent of entitlementsToPreserve) {
      byCategory[ent.EventCategory.name] = (byCategory[ent.EventCategory.name] || 0) + 1;
    }
    for (const [catName, count] of Object.entries(byCategory)) {
      console.log(`   - ${catName}: ${count} entitlements`);
    }
  }

  let deletedCount = 0;
  if (entitlementsToDelete.length > 0) {
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
      const result = await prisma.leaveEntitlement.deleteMany({
        where: {
          eventCategoryId: { in: categoryIds },
          usedDays: 0,
        },
      });
      deletedCount = result.count;
      console.log(`\n✅ Deleted ${result.count} LeaveEntitlement records.`);
    } else {
      console.log(`\n📝 DRY RUN: Would delete ${entitlementsToDelete.length} entitlements.`);
    }
  } else {
    console.log("\n✅ No unused entitlements to delete.");
  }

  return { 
    coreUpdated: isDryRun ? 0 : coreNeedingUpdate.length,
    othersUpdated: isDryRun ? 0 : othersNeedingUpdate.length, 
    entitlementsDeleted: deletedCount, 
    entitlementsPreserved: entitlementsToPreserve.length 
  };
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
    console.log(`   Core categories (Annual/Sick) updated: ${result.coreUpdated}`);
    console.log(`   Other categories updated: ${result.othersUpdated}`);
    console.log(`   Entitlements deleted: ${result.entitlementsDeleted}`);
    console.log(`   Entitlements preserved: ${result.entitlementsPreserved}`);
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
