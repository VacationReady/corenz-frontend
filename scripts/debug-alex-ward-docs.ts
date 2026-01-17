import { prisma } from "../app/lib/prisma";

async function debugAlexWardDocs() {
  console.log("=== Debugging Alex Ward Documents ===\n");

  // Find Alex Ward
  const alexWard = await prisma.employee.findFirst({
    where: {
      User: {
        OR: [
          { firstName: { contains: "Alex", mode: "insensitive" } },
          { email: { contains: "alex", mode: "insensitive" } },
        ],
        lastName: { contains: "Ward", mode: "insensitive" },
      },
    },
    include: {
      User: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!alexWard) {
    console.log("❌ Alex Ward not found in database");
    return;
  }

  console.log("✓ Found Alex Ward:");
  console.log(`  Employee ID: ${alexWard.id}`);
  console.log(`  User ID: ${alexWard.userId}`);
  console.log(`  Name: ${alexWard.User?.firstName} ${alexWard.User?.lastName}`);
  console.log(`  Email: ${alexWard.User?.email}`);
  console.log(`  Role: ${alexWard.User?.role}`);
  console.log(`  Company ID: ${alexWard.companyId}\n`);

  // Get all documents for Alex Ward
  const documents = await prisma.document.findMany({
    where: {
      employeeId: alexWard.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      category: true,
      path: true,
      canViewAdmin: true,
      canViewManager: true,
      canViewEmployee: true,
      requiresAck: true,
      requiresSignature: true,
      createdAt: true,
      companyId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(`Documents for Alex Ward: ${documents.length}\n`);

  if (documents.length === 0) {
    console.log("❌ No documents found for Alex Ward");
    await prisma.$disconnect();
    return;
  }

  documents.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.name}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Category: ${doc.category || "None"}`);
    console.log(`   Created: ${doc.createdAt.toISOString()}`);
    console.log(`   Company ID: ${doc.companyId}`);
    console.log(`   Permissions:`);
    console.log(`     - canViewAdmin: ${doc.canViewAdmin} ${doc.canViewAdmin ? "✓" : "❌"}`);
    console.log(`     - canViewManager: ${doc.canViewManager} ${doc.canViewManager ? "✓" : "❌"}`);
    console.log(`     - canViewEmployee: ${doc.canViewEmployee} ${doc.canViewEmployee ? "✓" : "❌"}`);
    console.log(`   Path: ${doc.path}`);
    console.log("");
  });

  // Check what the API would return
  console.log("=== Simulating API Filter ===\n");

  // When viewing own documents, filter is: canViewEmployee: true
  const filteredDocs = documents.filter((doc) => doc.canViewEmployee === true);
  console.log(`Documents that SHOULD show in mobile app: ${filteredDocs.length}`);

  if (filteredDocs.length !== documents.length) {
    const hidden = documents.filter((doc) => doc.canViewEmployee === false);
    console.log(`\n❌ Hidden documents (canViewEmployee=false): ${hidden.length}`);
    hidden.forEach((doc) => {
      console.log(`   - ${doc.name}`);
    });
  }

  // Check if Alex Ward's companyId matches documents
  const companyMismatch = documents.filter(
    (doc) => doc.companyId !== alexWard.companyId
  );
  if (companyMismatch.length > 0) {
    console.log(`\n❌ Company ID mismatch found: ${companyMismatch.length} documents`);
    companyMismatch.forEach((doc) => {
      console.log(`   - ${doc.name}: ${doc.companyId} vs ${alexWard.companyId}`);
    });
  }

  console.log("\n=== API Endpoint Test ===");
  console.log(`To test the API, use:`);
  console.log(`GET /api/documents/list-employee?employeeId=${alexWard.id}`);
  console.log(`\nExpected result: ${filteredDocs.length} documents`);

  await prisma.$disconnect();
}

debugAlexWardDocs().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
