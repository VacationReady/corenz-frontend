import { prisma } from "../app/lib/prisma";

async function checkDocs() {
  const docs = await prisma.document.findMany({
    where: {
      employeeId: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      employeeId: true,
      name: true,
      canViewEmployee: true,
      canViewManager: true,
      canViewAdmin: true,
      Employee: {
        select: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
    take: 20,
  });

  console.log(`Total employee documents: ${docs.length}\n`);

  const byEmployee = new Map<string, any[]>();
  docs.forEach((doc) => {
    if (!byEmployee.has(doc.employeeId!)) {
      byEmployee.set(doc.employeeId!, []);
    }
    byEmployee.get(doc.employeeId!)!.push(doc);
  });

  byEmployee.forEach((docs, empId) => {
    const firstDoc = docs[0];
    const empName = firstDoc.Employee?.User
      ? `${firstDoc.Employee.User.firstName} ${firstDoc.Employee.User.lastName}`
      : "Unknown";
    console.log(`Employee: ${empName} (${empId})`);
    console.log(`  Documents: ${docs.length}`);
    docs.forEach((d) => {
      console.log(
        `    - ${d.name} (canViewEmployee: ${d.canViewEmployee ? "✓" : "❌"})`
      );
    });
    console.log("");
  });

  const problematic = docs.filter((d) => !d.canViewEmployee);
  console.log(`\nDocuments with canViewEmployee=false: ${problematic.length}`);
  if (problematic.length > 0) {
    console.log("These documents will NOT show in mobile app:");
    problematic.forEach((d) => {
      console.log(`  - ${d.name}`);
    });
  }

  await prisma.$disconnect();
}

checkDocs();
