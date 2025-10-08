/**
 * Check manager IDs against the EXACT same data the API returns
 * This will show the real issue the frontend is seeing
 *
 * Run with: $env:COMPANY_ID = "your-company-id"; npx tsx scripts/check-api-exact-match.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const COMPANY_ID = process.env.COMPANY_ID;

  if (!COMPANY_ID) {
    console.error("❌ Please set COMPANY_ID environment variable");
    console.error("Example: $env:COMPANY_ID = 'your-company-id'; npx tsx scripts/check-api-exact-match.ts");
    process.exit(1);
  }

  console.log("🔍 Checking Manager IDs Against API Data");
  console.log("Company ID:", COMPANY_ID);
  console.log("=".repeat(70));

  // Get users EXACTLY like the API does
  const users = await prisma.user.findMany({
    where: {
      companyId: COMPANY_ID,
      NOT: {
        email: {
          contains: "@reset.peoplecore.invalid"
        }
      }
    },
  });

  console.log(`\n📊 API would return ${users.length} users`);

  // Create lookup maps exactly like the frontend does
  const byUserId = new Map<string, any>();
  const byEmployeeId = new Map<string, any>();
  const byEmail = new Map<string, any>();

  users.forEach((user) => {
    byUserId.set(user.id, user);
    if (user.email) {
      byEmail.set(user.email.toLowerCase(), user);
    }
  });

  console.log(`   User ID lookup map: ${byUserId.size} entries`);
  console.log(`   Email lookup map: ${byEmail.size} entries`);

  // Check each user's manager reference
  let validManagers = 0;
  let brokenManagers = 0;
  let noManager = 0;
  const brokenUsers = [];

  for (const user of users) {
    if (!user.managerId) {
      noManager++;
      continue;
    }

    // Try to find manager exactly like frontend does
    const managerId = typeof user.managerId === "string" ? user.managerId.trim() : "";
    let manager = null;

    if (managerId) {
      manager =
        byUserId.get(managerId) ??
        byEmployeeId.get(managerId) ??
        byEmail.get(managerId.toLowerCase());
    }

    if (manager) {
      validManagers++;
    } else {
      brokenManagers++;
      brokenUsers.push({
        employee: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        managerId: user.managerId,
      });
    }
  }

  console.log(`\n🔍 Manager Lookup Results (Frontend Perspective):`);
  console.log(`   ✅ Users with valid managers: ${validManagers}`);
  console.log(`   ❌ Users with broken managers: ${brokenManagers}`);
  console.log(`   ❓ Users with no manager: ${noManager}`);

  if (brokenManagers > 0) {
    console.log(`\n⚠️  BROKEN MANAGER REFERENCES FOUND:`);
    console.log(`   These users' managerIds don't exist in the API data!\n`);

    brokenUsers.slice(0, 10).forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.employee}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Manager ID: ${user.managerId}`);
      console.log(`      Manager not found in API data\n`);
    });

    if (brokenUsers.length > 10) {
      console.log(`   ... and ${brokenUsers.length - 10} more broken references`);
    }

    // Check if these manager IDs exist in the full database
    const brokenManagerIds = [...new Set(brokenUsers.map(u => u.managerId))];
    console.log(`\n🔍 Checking if broken manager IDs exist in full database...`);

    const foundInDb = await prisma.user.findMany({
      where: { id: { in: brokenManagerIds } },
      select: { id: true, email: true, companyId: true, isActivated: true },
    });

    if (foundInDb.length > 0) {
      console.log(`\n✅ Found ${foundInDb.length} broken manager IDs in database:`);
      foundInDb.forEach(u => {
        const wrongCompany = u.companyId !== COMPANY_ID;
        const deleted = u.email.includes('@reset.peoplecore.invalid');
        const notActivated = !u.isActivated;

        console.log(`   - ${u.email}`);
        if (wrongCompany) console.log(`     ❌ DIFFERENT COMPANY! (${u.companyId})`);
        if (deleted) console.log(`     ❌ DELETED USER!`);
        if (notActivated) console.log(`     ❌ NOT ACTIVATED!`);
      });
    } else {
      console.log(`\n❌ None of the broken manager IDs exist in the database!`);
    }
  }

  if (brokenManagers === 0 && noManager === 1) {
    console.log(`\n✅ Perfect! Only 1 user has no manager (the CEO/root).`);
    console.log(`The org chart should work correctly.`);
  } else if (brokenManagers === 0) {
    console.log(`\n✅ All manager references are valid in API data.`);
  }

  console.log("\n" + "=".repeat(70));
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
