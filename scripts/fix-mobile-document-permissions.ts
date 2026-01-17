import { prisma } from "../app/lib/prisma";

async function fixMobileDocumentPermissions() {
  console.log("=== Fixing Mobile Document Permissions ===\n");

  // Find all employee documents with canViewEmployee = false
  const problematicDocs = await prisma.document.findMany({
    where: {
      employeeId: { not: null },
      canViewEmployee: false,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      employeeId: true,
      canViewEmployee: true,
    },
  });

  console.log(`Found ${problematicDocs.length} employee documents with canViewEmployee=false\n`);

  if (problematicDocs.length === 0) {
    console.log("✓ All employee documents already have canViewEmployee=true");
    console.log("  No fixes needed!");
    await prisma.$disconnect();
    return;
  }

  console.log("Documents to fix:");
  problematicDocs.forEach((doc, index) => {
    console.log(`  ${index + 1}. ${doc.name} (Employee: ${doc.employeeId})`);
  });

  console.log("\nApplying fix...");

  // Update all employee documents to have canViewEmployee = true
  const result = await prisma.document.updateMany({
    where: {
      employeeId: { not: null },
      canViewEmployee: false,
      deletedAt: null,
    },
    data: {
      canViewEmployee: true,
    },
  });

  console.log(`\n✓ Updated ${result.count} documents`);
  console.log("  All employee documents now have canViewEmployee=true");
  console.log("\n✓ Mobile app should now show documents correctly!");

  await prisma.$disconnect();
}

fixMobileDocumentPermissions().catch((error) => {
  console.error("Error fixing permissions:", error);
  process.exit(1);
});
