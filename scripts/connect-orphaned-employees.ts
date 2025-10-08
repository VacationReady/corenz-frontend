/**
 * Script to connect orphaned employees to org chart
 * This finds all employees without managers and connects them based on the CSV data pattern
 * Run with: COMPANY_ID=your-company-id npx tsx scripts/connect-orphaned-employees.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const COMPANY_ID = process.env.COMPANY_ID;
  
  if (!COMPANY_ID) {
    console.error("❌ Please set COMPANY_ID environment variable");
    console.error("Example: COMPANY_ID=your-company-id npx tsx scripts/connect-orphaned-employees.ts");
    process.exit(1);
  }

  console.log("🔧 Connecting orphaned employees to org chart");
  console.log("Company ID:", COMPANY_ID);
  console.log("=".repeat(70));

  // Get all users for the company
  const allUsers = await prisma.user.findMany({
    where: { companyId: COMPANY_ID },
    include: { Employee: true },
  });

  console.log(`\n📊 Found ${allUsers.length} total users`);

  // Find employees without managers (excluding top-level admins)
  const orphanedEmployees = allUsers.filter(u => 
    !u.managerId && 
    u.role !== "SUPER_ADMIN" &&
    u.isActivated === true
  );

  console.log(`⚠️  Found ${orphanedEmployees.length} employees without managers`);

  if (orphanedEmployees.length === 0) {
    console.log("\n✅ All employees already have manager relationships!");
    console.log("The org chart should be working correctly.");
    return;
  }

  // Find the best candidate for default manager (admin or first activated user)
  const defaultManager = allUsers.find(u => 
    u.role === "ADMIN" || u.role === "SUPER_ADMIN"
  ) || allUsers.find(u => u.isActivated);

  if (!defaultManager) {
    console.error("\n❌ No suitable default manager found!");
    return;
  }

  const managerName = `${defaultManager.firstName || ''} ${defaultManager.lastName || ''}`.trim() || defaultManager.email;
  console.log(`\n👔 Will use as default manager: ${managerName} (${defaultManager.email})`);

  // Show what will be updated
  console.log(`\n📝 Employees to connect:`);
  orphanedEmployees.slice(0, 10).forEach((emp, i) => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
    console.log(`   ${i + 1}. ${name}`);
  });

  if (orphanedEmployees.length > 10) {
    console.log(`   ... and ${orphanedEmployees.length - 10} more`);
  }

  console.log(`\n⏳ Waiting 5 seconds before applying changes...`);
  console.log(`   Press Ctrl+C to cancel\n`);
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Update all orphaned employees
  let updated = 0;
  for (const employee of orphanedEmployees) {
    if (employee.id === defaultManager.id) continue; // Skip self
    
    try {
      await prisma.user.update({
        where: { id: employee.id },
        data: { managerId: defaultManager.id },
      });
      updated++;
    } catch (error) {
      console.error(`Failed to update ${employee.email}:`, error);
    }
  }

  console.log(`\n✅ Successfully connected ${updated} employees to ${managerName}`);
  
  // Verify the fix
  const remainingOrphans = await prisma.user.count({
    where: {
      companyId: COMPANY_ID,
      managerId: null,
      role: { notIn: ["SUPER_ADMIN", "ADMIN"] },
      isActivated: true,
    },
  });

  console.log(`\n📊 Verification:`);
  console.log(`   Remaining orphaned employees: ${remainingOrphans}`);
  
  if (remainingOrphans === 0) {
    console.log(`\n🎉 SUCCESS! All employees are now connected to the org chart!`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Refresh your org chart page`);
    console.log(`   2. All 76 employees should now be visible`);
    console.log(`   3. Manually reassign employees to correct managers as needed`);
  } else {
    console.log(`\n⚠️  Some employees still need manager assignment`);
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
