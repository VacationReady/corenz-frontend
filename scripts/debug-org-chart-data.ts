/**
 * Debug script to see exactly what org chart data looks like
 * Run with: COMPANY_ID=your-company-id npx tsx scripts/debug-org-chart-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const COMPANY_ID = process.env.COMPANY_ID;
  
  if (!COMPANY_ID) {
    console.error("Please set COMPANY_ID environment variable");
    process.exit(1);
  }

  console.log("🔍 Debugging Org Chart Data");
  console.log("Company ID:", COMPANY_ID);
  console.log("=".repeat(70));

  // Get users exactly like the org chart API does
  const users = await prisma.user.findMany({
    where: { 
      companyId: COMPANY_ID,
      NOT: {
        email: {
          contains: "@reset.peoplecore.invalid"
        }
      }
    },
    include: {
      Employee: {
        select: {
          id: true,
          isActive: true,
          departmentId: true,
          jobRoleId: true,
          Department: { select: { id: true, name: true } },
          JobRole: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { firstName: "asc" },
      { lastName: "asc" },
      { email: "asc" },
    ],
  });

  console.log(`\n📊 Total Users Fetched: ${users.length}`);

  // Analyze the data
  const withEmployee = users.filter(u => u.Employee);
  const withoutEmployee = users.filter(u => !u.Employee);
  const withManager = users.filter(u => u.managerId);
  const withoutManager = users.filter(u => !u.managerId);

  console.log(`   Users with Employee record: ${withEmployee.length}`);
  console.log(`   Users without Employee record: ${withoutEmployee.length}`);
  console.log(`   Users with managerId: ${withManager.length}`);
  console.log(`   Users without managerId: ${withoutManager.length}`);

  // Show first 5 users with full details
  console.log(`\n📋 Sample Users (first 5):`);
  users.slice(0, 5).forEach((user, i) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    console.log(`\n${i + 1}. ${name}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Manager ID: ${user.managerId || 'NULL'}`);
    console.log(`   Has Employee Record: ${user.Employee ? 'YES' : 'NO'}`);
    if (user.Employee) {
      console.log(`   Employee ID: ${user.Employee.id}`);
      console.log(`   Employee isActive: ${user.Employee.isActive}`);
    }
    console.log(`   isActivated: ${user.isActivated}`);
    console.log(`   Role: ${user.role}`);
  });

  // Check if managers exist
  console.log(`\n🔍 Checking Manager References:`);
  let validManagerRefs = 0;
  let invalidManagerRefs = 0;
  const userIds = new Set(users.map(u => u.id));

  for (const user of users) {
    if (user.managerId) {
      if (userIds.has(user.managerId)) {
        validManagerRefs++;
      } else {
        invalidManagerRefs++;
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        console.log(`   ⚠️  ${name} has managerId "${user.managerId}" but that user doesn't exist`);
      }
    }
  }

  console.log(`   ✅ Valid manager references: ${validManagerRefs}`);
  console.log(`   ❌ Invalid manager references: ${invalidManagerRefs}`);

  // Build tree like the frontend does
  console.log(`\n🌳 Building Org Chart Tree:`);
  const byUserId = new Map(users.map(u => [u.id, u]));
  const roots = [];
  const children = new Map<string, typeof users>();

  for (const user of users) {
    const managerId = user.managerId?.trim();
    
    if (!managerId || managerId === user.id) {
      roots.push(user);
    } else {
      const manager = byUserId.get(managerId);
      if (manager && manager !== user) {
        if (!children.has(managerId)) {
          children.set(managerId, []);
        }
        children.get(managerId)!.push(user);
      } else {
        // Manager not found, becomes root
        roots.push(user);
      }
    }
  }

  console.log(`   Root nodes (no manager or manager not found): ${roots.length}`);
  
  if (roots.length > 0) {
    console.log(`\n   Root Nodes:`);
    roots.forEach((user, i) => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const childCount = children.get(user.id)?.length || 0;
      console.log(`   ${i + 1}. ${name} (${user.email}) - ${childCount} direct reports`);
    });
  }

  // Check if there are many separate trees
  if (roots.length > 5) {
    console.log(`\n⚠️  WARNING: You have ${roots.length} separate org trees!`);
    console.log(`   This will break the org chart visualization.`);
    console.log(`   Expected: 1-2 root nodes (CEO/admins)`);
    console.log(`   Actual: ${roots.length} root nodes`);
  }

  // Test what the API would return
  console.log(`\n📤 API Response Preview (what frontend receives):`);
  const apiResponse = users.map(user => ({
    id: user.Employee?.id ?? user.id,
    userId: user.id,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    email: user.email ?? "",
    managerUserId: user.managerId ?? null,
    hasEmployee: !!user.Employee,
  }));

  console.log(JSON.stringify(apiResponse.slice(0, 3), null, 2));

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
