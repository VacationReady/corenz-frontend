/**
 * Simple org chart diagnostic
 * Run with: COMPANY_ID=your-company-id npx tsx scripts/simple-org-check.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const COMPANY_ID = process.env.COMPANY_ID;
  
  if (!COMPANY_ID) {
    console.error("Set COMPANY_ID environment variable");
    process.exit(1);
  }

  console.log("🔍 Simple Org Chart Check\n");

  // Get users exactly like the API does
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

  console.log(`Total users in API response: ${users.length}`);
  
  // Create a map of all user IDs
  const userIds = new Set(users.map(u => u.id));
  
  // Check manager references
  let validRefs = 0;
  let invalidRefs = 0;
  const broken = [];
  
  for (const user of users) {
    if (user.managerId) {
      if (userIds.has(user.managerId)) {
        validRefs++;
      } else {
        invalidRefs++;
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        broken.push({
          employee: name,
          email: user.email,
          managerId: user.managerId,
        });
      }
    }
  }
  
  console.log(`\nManager Reference Check:`);
  console.log(`  ✅ Valid: ${validRefs}`);
  console.log(`  ❌ Invalid (points to non-existent user): ${invalidRefs}`);
  
  if (invalidRefs > 0) {
    console.log(`\n⚠️  PROBLEM FOUND! ${invalidRefs} users have managerIds that don't exist in the dataset.`);
    console.log(`\nThese users will appear as separate root nodes:\n`);
    broken.slice(0, 10).forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.employee}`);
      console.log(`     Email: ${b.email}`);
      console.log(`     Manager ID: ${b.managerId} (doesn't exist!)\n`);
    });
    
    if (broken.length > 10) {
      console.log(`  ... and ${broken.length - 10} more\n`);
    }
    
    console.log(`💡 SOLUTION: These manager IDs point to users that either:`);
    console.log(`   - Don't exist in the database`);
    console.log(`   - Are in a different company`);
    console.log(`   - Have been deleted`);
    console.log(`   - Have @reset.peoplecore.invalid email (filtered out)\n`);
    
    // Check if these IDs exist in the database at all
    const missingIds = [...new Set(broken.map(b => b.managerId))];
    console.log(`Checking if these ${missingIds.length} manager IDs exist in database...`);
    
    const foundInDb = await prisma.user.findMany({
      where: { id: { in: missingIds } },
      select: { id: true, email: true, companyId: true },
    });
    
    if (foundInDb.length > 0) {
      console.log(`\nFound ${foundInDb.length} of them in database:`);
      foundInDb.forEach(u => {
        const inDifferentCompany = u.companyId !== COMPANY_ID;
        const isDeleted = u.email.includes('@reset.peoplecore.invalid');
        console.log(`  - ${u.email}${inDifferentCompany ? ' (DIFFERENT COMPANY!)' : ''}${isDeleted ? ' (DELETED!)' : ''}`);
      });
    } else {
      console.log(`\nNone found in database - these IDs don't exist at all!`);
    }
    
    console.log(`\n🔧 To fix: Run this SQL to set these employees to report to your admin:`);
    console.log(`\nUPDATE "User"`);
    console.log(`SET "managerId" = (SELECT id FROM "User" WHERE "companyId" = '${COMPANY_ID}' AND role IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1)`);
    console.log(`WHERE id IN (${broken.slice(0, 5).map(b => `'${users.find(u => u.email === b.email)?.id}'`).join(', ')});\n`);
    
  } else {
    console.log(`\n✅ All manager references are valid!`);
    console.log(`\nThe issue must be something else. Checking other possibilities...\n`);
    
    // Count root nodes
    const roots = users.filter(u => !u.managerId);
    console.log(`Root nodes (no manager): ${roots.length}`);
    
    if (roots.length > 0) {
      console.log(`\nRoot nodes (these start separate trees):`);
      roots.forEach(u => {
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
        console.log(`  - ${name} (${u.email}) - ${u.role}`);
      });
    }
    
    if (roots.length > 5) {
      console.log(`\n⚠️  You have ${roots.length} root nodes! This could be the problem.`);
      console.log(`   Expected: 1-2 (CEO/top-level)`);
      console.log(`   Actual: ${roots.length}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
