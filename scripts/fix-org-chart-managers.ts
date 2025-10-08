/**
 * Script to fix org chart by setting a default manager for all employees without one
 * Run with: npx tsx scripts/fix-org-chart-managers.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get your company ID - replace with your actual company ID
  const COMPANY_ID = process.env.COMPANY_ID;
  
  if (!COMPANY_ID) {
    console.error("Please set COMPANY_ID environment variable");
    console.error("Example: COMPANY_ID=your-company-id npx tsx scripts/fix-org-chart-managers.ts");
    process.exit(1);
  }

  console.log(`Fixing org chart for company: ${COMPANY_ID}`);

  // Find the admin/CEO user to use as default manager
  const adminUser = await prisma.user.findFirst({
    where: {
      companyId: COMPANY_ID,
      OR: [
        { role: "SUPER_ADMIN" },
        { role: "ADMIN" }
      ]
    },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) {
    console.error("No admin user found for company");
    process.exit(1);
  }

  console.log(`Using admin as default manager: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`);

  // Find all employees without a manager (excluding the admin themselves)
  const employeesWithoutManager = await prisma.user.findMany({
    where: {
      companyId: COMPANY_ID,
      managerId: null,
      id: { not: adminUser.id },
      isActivated: true,
    },
  });

  console.log(`Found ${employeesWithoutManager.length} employees without manager`);

  if (employeesWithoutManager.length === 0) {
    console.log("All employees already have managers!");
    return;
  }

  // Ask for confirmation
  console.log("\nThis will set the admin as manager for all employees without one.");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n");
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Update employees to report to admin
  const result = await prisma.user.updateMany({
    where: {
      companyId: COMPANY_ID,
      managerId: null,
      id: { not: adminUser.id },
      isActivated: true,
    },
    data: {
      managerId: adminUser.id,
    },
  });

  console.log(`✅ Updated ${result.count} employees to report to admin`);
  console.log("\nOrg chart should now display all employees properly!");
  console.log("\nNext steps:");
  console.log("1. Refresh your org chart page");
  console.log("2. Manually reassign employees to their correct managers via the UI");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
