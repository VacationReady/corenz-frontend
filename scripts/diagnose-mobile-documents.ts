import { prisma } from "../app/lib/prisma";

async function diagnoseMobileDocuments() {
  console.log("=== Mobile Documents Diagnostic ===\n");

  // Get a sample employee ID (you'll need to replace this with the actual employee ID you're testing with)
  const employees = await prisma.employee.findMany({
    take: 5,
    select: {
      id: true,
      User: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  console.log("Sample employees:");
  employees.forEach((emp) => {
    console.log(
      `  - ${emp.User?.firstName} ${emp.User?.lastName} (${emp.User?.email}): ${emp.id}`
    );
  });

  if (employees.length === 0) {
    console.log("No employees found in database");
    return;
  }

  // Check documents for the first employee
  const testEmployeeId = employees[0].id;
  console.log(`\nChecking documents for employee: ${testEmployeeId}`);

  const documents = await prisma.document.findMany({
    where: {
      employeeId: testEmployeeId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      category: true,
      canViewAdmin: true,
      canViewManager: true,
      canViewEmployee: true,
      requiresAck: true,
      requiresSignature: true,
      createdAt: true,
      path: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(`\nFound ${documents.length} documents for this employee:\n`);

  if (documents.length === 0) {
    console.log("❌ No documents found for this employee");
    console.log(
      "   This could be why the mobile app shows 'no documents'"
    );
  } else {
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name}`);
      console.log(`   Category: ${doc.category || "None"}`);
      console.log(`   Created: ${doc.createdAt.toISOString()}`);
      console.log(`   Permissions:`);
      console.log(`     - canViewAdmin: ${doc.canViewAdmin}`);
      console.log(`     - canViewManager: ${doc.canViewManager}`);
      console.log(`     - canViewEmployee: ${doc.canViewEmployee} ${!doc.canViewEmployee ? "❌ THIS IS THE PROBLEM!" : "✓"}`);
      console.log(`   Requires:`);
      console.log(`     - Acknowledgement: ${doc.requiresAck}`);
      console.log(`     - Signature: ${doc.requiresSignature}`);
      console.log(`   Path: ${doc.path}`);
      console.log("");
    });
  }

  // Check for documents with canViewEmployee = false
  const problematicDocs = await prisma.document.count({
    where: {
      employeeId: { not: null },
      canViewEmployee: false,
      deletedAt: null,
    },
  });

  console.log(`\n=== Summary ===`);
  console.log(
    `Documents with canViewEmployee=false: ${problematicDocs} ${problematicDocs > 0 ? "❌" : "✓"}`
  );

  if (problematicDocs > 0) {
    console.log(
      "\n⚠️  ISSUE FOUND: Some employee documents have canViewEmployee=false"
    );
    console.log(
      "   This prevents employees from seeing their own documents in the mobile app."
    );
    console.log("\n   To fix, run:");
    console.log(
      "   UPDATE Document SET canViewEmployee = true WHERE employeeId IS NOT NULL AND canViewEmployee = false;"
    );
  }

  // Check Supabase configuration
  console.log("\n=== Supabase Configuration ===");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log(`Supabase URL: ${supabaseUrl ? "✓ Configured" : "❌ Missing"}`);
  console.log(`Service Role Key: ${hasServiceKey ? "✓ Configured" : "❌ Missing"}`);
  console.log(`Anon Key: ${hasAnonKey ? "✓ Configured" : "❌ Missing"}`);

  await prisma.$disconnect();
}

diagnoseMobileDocuments().catch((error) => {
  console.error("Error running diagnostic:", error);
  process.exit(1);
});
