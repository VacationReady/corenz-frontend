import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugEmployeeUserMapping() {
  console.log("🔍 Debugging employee-user ID mapping...");

  try {
    // Get all employees with their user information
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          include: {
            permissionProfile: true,
          },
        },
      },
      take: 10, // Limit for debugging
    });

    console.log(`Found ${employees.length} employees:\n`);

    employees.forEach((emp, index) => {
      console.log(`${index + 1}. Employee ID: ${emp.id}`);
      console.log(`   User ID: ${emp.userId}`);

      if (emp.user) {
        console.log(`   User Email: ${emp.user.email}`);
        console.log(`   User Role: ${emp.user.role}`);
        console.log(
          `   Permission Profile: ${emp.user.permissionProfile?.name || "Default"}`,
        );
      } else {
        console.log(`   ⚠️  No associated user found!`);
      }
      console.log("");
    });

    // Check if there are any orphaned employees (employees without users)
    const orphanedCount = await prisma.employee.count({
      where: {
        user: null,
      },
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total employees: ${await prisma.employee.count()}`);
    console.log(`   Orphaned employees (no user): ${orphanedCount}`);
    console.log(
      `   Valid employees: ${(await prisma.employee.count()) - orphanedCount}`,
    );

    // Check recent employees to see if the target ID might be a recent creation
    const recentEmployees = await prisma.employee.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (recentEmployees.length > 0) {
      console.log(`\n🕒 Recent employees (last 24 hours):`);
      recentEmployees.forEach((emp, index) => {
        console.log(
          `${index + 1}. ${emp.id} -> ${emp.user?.email || "No user"}`,
        );
      });
    }
  } catch (error) {
    console.error("❌ Error debugging employee-user mapping:", error);
  }
}

debugEmployeeUserMapping()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
