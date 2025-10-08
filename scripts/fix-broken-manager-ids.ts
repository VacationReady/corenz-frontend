/**
 * Fix broken manager IDs that don't match existing User IDs
 *
 * Run with: $env:COMPANY_ID = "your-company-id"; npx tsx scripts/fix-broken-manager-ids.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const COMPANY_ID = process.env.COMPANY_ID;

  if (!COMPANY_ID) {
    console.error("❌ Please set COMPANY_ID environment variable");
    console.error("Example: $env:COMPANY_ID = 'your-company-id'; npx tsx scripts/fix-broken-manager-ids.ts");
    process.exit(1);
  }

  console.log("🔧 Fixing Broken Manager IDs");
  console.log("Company ID:", COMPANY_ID);
  console.log("=".repeat(70));

  // Get all users for the company
  const allUsers = await prisma.user.findMany({
    where: { companyId: COMPANY_ID },
    include: { Employee: true },
  });

  console.log(`\n📊 Found ${allUsers.length} users`);

  // Create maps for lookup
  const userIdMap = new Map(allUsers.map(u => [u.id, u]));
  const emailToUserMap = new Map(allUsers.map(u => [u.email?.toLowerCase(), u]));

  // Find users with broken manager references
  const brokenUsers = [];
  const validUsers = [];

  for (const user of allUsers) {
    if (user.managerId) {
      if (userIdMap.has(user.managerId)) {
        validUsers.push(user);
      } else {
        brokenUsers.push(user);
      }
    }
  }

  console.log(`\n🔍 Manager Reference Analysis:`);
  console.log(`   ✅ Valid manager references: ${validUsers.length}`);
  console.log(`   ❌ Broken manager references: ${brokenUsers.length}`);

  if (brokenUsers.length === 0) {
    console.log(`\n✅ All manager references are valid!`);
    console.log(`The org chart should work correctly. Try refreshing the page.`);
    return;
  }

  console.log(`\n⚠️  Found ${brokenUsers.length} users with broken manager references:`);

  // Show sample broken users
  brokenUsers.slice(0, 5).forEach((user, i) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    console.log(`   ${i + 1}. ${name}`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Current managerId: ${user.managerId}`);
    console.log(`      Manager not found in database`);
  });

  if (brokenUsers.length > 5) {
    console.log(`   ... and ${brokenUsers.length - 5} more`);
  }

  // Find the best default manager (admin or first user)
  const defaultManager = allUsers.find(u =>
    u.role === "ADMIN" || u.role === "SUPER_ADMIN"
  ) || allUsers.find(u => u.isActivated);

  if (!defaultManager) {
    console.error("\n❌ No suitable default manager found!");
    console.error("You need at least one admin user to fix this.");
    return;
  }

  const managerName = `${defaultManager.firstName || ''} ${defaultManager.lastName || ''}`.trim() || defaultManager.email;
  console.log(`\n👔 Will use as default manager: ${managerName} (${defaultManager.email})`);

  console.log(`\n⏳ Waiting 5 seconds before applying fixes...`);
  console.log(`   Press Ctrl+C to cancel\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Fix broken manager references
  let fixed = 0;
  for (const user of brokenUsers) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { managerId: defaultManager.id },
      });
      fixed++;
    } catch (error) {
      console.error(`   Failed to fix ${user.email}:`, error);
    }
  }

  console.log(`\n✅ Successfully fixed ${fixed} broken manager references!`);

  // Verify the fix
  const verification = await prisma.user.count({
    where: {
      companyId: COMPANY_ID,
      managerId: {
        notIn: Array.from(userIdMap.keys())
      },
      managerId: { not: null }
    },
  });

  console.log(`\n📊 Verification:`);
  console.log(`   Remaining broken references: ${verification}`);

  if (verification === 0) {
    console.log(`\n🎉 SUCCESS! All manager references are now valid!`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Refresh your org chart page (Ctrl+Shift+R)`);
    console.log(`   2. All 76 employees should now be visible in a proper hierarchy`);
    console.log(`   3. Manually reassign employees to correct managers if needed`);
  } else {
    console.log(`\n⚠️  ${verification} manager references still need fixing`);
  }

  console.log("");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
