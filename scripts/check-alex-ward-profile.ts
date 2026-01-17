import { prisma } from "../app/lib/prisma";

async function checkAlexWardProfile() {
  console.log("=== Checking Alex Ward Mobile Profile ===\n");

  // Find Alex Ward's user
  const user = await prisma.user.findFirst({
    where: {
      email: { contains: "alex.ward", mode: "insensitive" },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      companyId: true,
      Employee: {
        select: {
          id: true,
          companyId: true,
          isActive: true,
        },
      },
    },
  });

  if (!user) {
    console.log("❌ Alex Ward user not found");
    return;
  }

  console.log("User Record:");
  console.log(`  User ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name: ${user.firstName} ${user.lastName}`);
  console.log(`  Role: ${user.role}`);
  console.log(`  Company ID: ${user.companyId}\n`);

  if (!user.Employee) {
    console.log("❌ No Employee record found for this user!");
    console.log("   This is the problem - the user has no linked Employee record");
    await prisma.$disconnect();
    return;
  }

  console.log("Employee Record:");
  console.log(`  Employee ID: ${user.Employee.id}`);
  console.log(`  Company ID: ${user.Employee.companyId}`);
  console.log(`  Is Active: ${user.Employee.isActive}\n`);

  // Check what /api/employees/me would return
  console.log("=== Testing /api/employees/me endpoint ===");
  const meEndpoint = await prisma.employee.findFirst({
    where: {
      userId: user.id,
      companyId: user.companyId,
    },
    select: {
      id: true,
      userId: true,
      companyId: true,
    },
  });

  if (!meEndpoint) {
    console.log("❌ /api/employees/me would return null");
    console.log("   User ID and Company ID don't match any Employee record");
  } else {
    console.log("✓ /api/employees/me would return:");
    console.log(`  Employee ID: ${meEndpoint.id}\n`);

    // Check documents for this employee ID
    const docs = await prisma.document.count({
      where: {
        employeeId: meEndpoint.id,
        deletedAt: null,
        canViewEmployee: true,
      },
    });

    console.log(`Documents for this employee ID: ${docs}`);
    console.log(
      `Mobile app would call: /api/documents/list-employee?employeeId=${meEndpoint.id}`
    );
  }

  await prisma.$disconnect();
}

checkAlexWardProfile().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
