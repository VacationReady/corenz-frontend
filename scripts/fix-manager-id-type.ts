/**
 * Fix script for when User.managerId contains Employee IDs instead of User IDs
 * This is a common issue after CSV imports
 * 
 * Run with: COMPANY_ID=your-company-id npx tsx scripts/fix-manager-id-type.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const COMPANY_ID = process.env.COMPANY_ID;
  
  if (!COMPANY_ID) {
    console.error("❌ Please set COMPANY_ID environment variable");
    console.error("Example: COMPANY_ID=your-company-id npx tsx scripts/fix-manager-id-type.ts");
    process.exit(1);
  }

  console.log("🔧 Fixing Manager ID Type Mismatch");
  console.log("Company ID:", COMPANY_ID);
  console.log("=".repeat(70));

  // Get all users
  const allUsers = await prisma.user.findMany({
    where: { companyId: COMPANY_ID },
    include: { Employee: true },
  });

  console.log(`\n📊 Found ${allUsers.length} users`);

  // Check if managerId values match Employee IDs instead of User IDs
  const userIds = new Set(allUsers.map(u => u.id));
  const employeeIds = new Set(allUsers.filter(u => u.Employee).map(u => u.Employee!.id));
  
  let matchesUserIds = 0;
  let matchesEmployeeIds = 0;
  let matchesNeither = 0;
  const problematicUsers = [];

  for (const user of allUsers) {
    if (!user.managerId) continue;
    
    const matchesUser = userIds.has(user.managerId);
    const matchesEmployee = employeeIds.has(user.managerId);
    
    if (matchesUser && !matchesEmployee) {
      matchesUserIds++;
    } else if (matchesEmployee && !matchesUser) {
      matchesEmployeeIds++;
      problematicUsers.push(user);
    } else if (!matchesUser && !matchesEmployee) {
      matchesNeither++;
      problematicUsers.push(user);
    }
  }

  console.log(`\n🔍 Manager ID Analysis:`);
  console.log(`   ✅ Correctly points to User IDs: ${matchesUserIds}`);
  console.log(`   ⚠️  Points to Employee IDs (wrong!): ${matchesEmployeeIds}`);
  console.log(`   ❌ Points to non-existent IDs: ${matchesNeither}`);

  if (matchesEmployeeIds === 0 && matchesNeither === 0) {
    console.log(`\n✅ All manager IDs are correct! The org chart should work.`);
    console.log(`   If it still doesn't, try refreshing the page or clearing cache.`);
    return;
  }

  if (matchesEmployeeIds > 0) {
    console.log(`\n🔧 Found ${matchesEmployeeIds} users with Employee ID in managerId field`);
    console.log(`   This is the org chart problem! Fixing now...\n`);

    // Create a map from Employee ID to User ID
    const employeeToUserMap = new Map<string, string>();
    for (const user of allUsers) {
      if (user.Employee) {
        employeeToUserMap.set(user.Employee.id, user.id);
      }
    }

    console.log(`   Sample problematic users:`);
    problematicUsers.slice(0, 5).forEach((user, i) => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const correctUserId = employeeToUserMap.get(user.managerId!);
      const manager = allUsers.find(u => u.Employee?.id === user.managerId);
      const managerName = manager ? 
        `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email : 
        'Unknown';
      
      console.log(`   ${i + 1}. ${name}`);
      console.log(`      Current managerId: ${user.managerId} (Employee ID)`);
      console.log(`      Should be: ${correctUserId} (User ID)`);
      console.log(`      Manager: ${managerName}`);
    });

    if (problematicUsers.length > 5) {
      console.log(`   ... and ${problematicUsers.length - 5} more`);
    }

    console.log(`\n⏳ Waiting 5 seconds before applying fixes...`);
    console.log(`   Press Ctrl+C to cancel\n`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fix each user
    let fixed = 0;
    for (const user of problematicUsers) {
      const correctUserId = employeeToUserMap.get(user.managerId!);
      
      if (correctUserId) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { managerId: correctUserId },
          });
          fixed++;
        } catch (error) {
          console.error(`   Failed to fix ${user.email}:`, error);
        }
      } else if (matchesNeither) {
        // managerId doesn't match anything - set to null
        console.log(`   ⚠️  ${user.email}: managerId "${user.managerId}" doesn't exist anywhere, setting to null`);
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { managerId: null },
          });
        } catch (error) {
          console.error(`   Failed to fix ${user.email}:`, error);
        }
      }
    }

    console.log(`\n✅ Fixed ${fixed} manager references!`);
  }

  // Verify the fix
  const verification = await prisma.user.findMany({
    where: { companyId: COMPANY_ID },
  });

  const verifyUserIds = new Set(verification.map(u => u.id));
  let stillBroken = 0;
  
  for (const user of verification) {
    if (user.managerId && !verifyUserIds.has(user.managerId)) {
      stillBroken++;
    }
  }

  console.log(`\n📊 Verification:`);
  console.log(`   Total users: ${verification.length}`);
  console.log(`   Invalid manager references remaining: ${stillBroken}`);
  
  if (stillBroken === 0) {
    console.log(`\n🎉 SUCCESS! All manager references are now valid!`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Refresh your org chart page (hard refresh: Ctrl+Shift+R)`);
    console.log(`   2. All 76 employees should now be visible in a proper hierarchy`);
    console.log(`   3. Clear browser cache if still having issues`);
  } else {
    console.log(`\n⚠️  ${stillBroken} manager references still need manual fixing`);
    console.log(`   Run: COMPANY_ID=${COMPANY_ID} npx tsx scripts/connect-orphaned-employees.ts`);
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
