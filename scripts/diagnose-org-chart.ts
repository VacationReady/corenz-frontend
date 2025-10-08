/**
 * Diagnostic script to check org chart manager relationships
 * Run with: COMPANY_ID=your-company-id npx tsx scripts/diagnose-org-chart.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const COMPANY_ID = process.env.COMPANY_ID;
  
  if (!COMPANY_ID) {
    console.error("Please set COMPANY_ID environment variable");
    console.error("Example: COMPANY_ID=your-company-id npx tsx scripts/diagnose-org-chart.ts");
    process.exit(1);
  }

  console.log("🔍 Diagnosing org chart for company:", COMPANY_ID);
  console.log("=".repeat(70));

  // Get all users
  const allUsers = await prisma.user.findMany({
    where: { companyId: COMPANY_ID },
    include: { Employee: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n📊 Total Users: ${allUsers.length}`);

  // Count by activation status
  const activated = allUsers.filter(u => u.isActivated);
  const notActivated = allUsers.filter(u => !u.isActivated);
  
  console.log(`   ✅ Activated: ${activated.length}`);
  console.log(`   ❌ Not Activated: ${notActivated.length}`);

  // Count employees with/without managers
  const withManager = allUsers.filter(u => u.managerId);
  const withoutManager = allUsers.filter(u => !u.managerId);
  
  console.log(`\n👔 Manager Relationships:`);
  console.log(`   ✅ Has Manager: ${withManager.length}`);
  console.log(`   ❌ No Manager: ${withoutManager.length}`);

  // Show employees without managers
  if (withoutManager.length > 0) {
    console.log(`\n⚠️  Employees Without Manager (these appear as separate trees):`);
    withoutManager.forEach((user, index) => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      console.log(`   ${index + 1}. ${name} (${user.email}) - Role: ${user.role}`);
    });
  }

  // Check for employees with Employee record
  const withEmployeeRecord = allUsers.filter(u => u.Employee);
  const withoutEmployeeRecord = allUsers.filter(u => !u.Employee);
  
  console.log(`\n👥 Employee Records:`);
  console.log(`   ✅ Has Employee Record: ${withEmployeeRecord.length}`);
  console.log(`   ❌ User Only (no Employee): ${withoutEmployeeRecord.length}`);

  // Show recent audit logs for CSV imports
  const recentAudits = await prisma.globalAuditLog.findMany({
    where: {
      companyId: COMPANY_ID,
      entityType: "CSV_IMPORT",
    },
    orderBy: { timestamp: "desc" },
    take: 5,
  });

  if (recentAudits.length > 0) {
    console.log(`\n📋 Recent CSV Imports:`);
    for (const audit of recentAudits) {
      const meta = audit.metadata as any;
      console.log(`\n   Import: ${new Date(audit.timestamp).toLocaleString()}`);
      if (meta?.errors && Array.isArray(meta.errors)) {
        const managerErrors = meta.errors.filter((e: any) => 
          e.errors?.some((msg: string) => msg.includes('Manager') || msg.includes('manager'))
        );
        if (managerErrors.length > 0) {
          console.log(`   ⚠️  Manager warnings: ${managerErrors.length}`);
          managerErrors.slice(0, 5).forEach((err: any) => {
            console.log(`      Row ${err.row}: ${err.errors.join(', ')}`);
          });
          if (managerErrors.length > 5) {
            console.log(`      ... and ${managerErrors.length - 5} more`);
          }
        }
      }
    }
  }

  // Find potential circular references
  const circularRefs = [];
  for (const user of allUsers) {
    if (user.managerId) {
      const manager = allUsers.find(u => u.id === user.managerId);
      if (manager?.managerId === user.id) {
        circularRefs.push({ user, manager });
      }
    }
  }

  if (circularRefs.length > 0) {
    console.log(`\n🔄 Circular Manager References Found: ${circularRefs.length}`);
    circularRefs.forEach(({ user, manager }) => {
      console.log(`   ${user.email} ↔️  ${manager.email}`);
    });
  }

  // Suggest fixes
  console.log("\n" + "=".repeat(70));
  console.log("💡 RECOMMENDATIONS:");
  console.log("=".repeat(70));

  if (withoutManager.length > 1) {
    const topLevelUsers = withoutManager.filter(u => 
      u.role === "ADMIN" || u.role === "SUPER_ADMIN"
    );
    
    if (topLevelUsers.length > 0) {
      console.log("\n1️⃣  Set a default manager for employees:");
      console.log("   Run: COMPANY_ID=" + COMPANY_ID + " npx tsx scripts/fix-org-chart-managers.ts");
    } else {
      console.log("\n1️⃣  All employees need a manager assigned.");
      console.log("   You can manually set managers in the UI or re-import with manager data.");
    }
  }

  if (notActivated.length > 0) {
    console.log("\n2️⃣  Activate pending users:");
    console.log(`   ${notActivated.length} users need activation.`);
  }

  console.log("\n3️⃣  Check your CSV import:");
  console.log("   - Ensure managerEmail matches exact email addresses in system");
  console.log("   - Import managers BEFORE their direct reports");
  console.log("   - Check for typos in email addresses or names");

  console.log("\n");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
