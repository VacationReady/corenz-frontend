// Script to fix all users and employees to have the correct companyId
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixAllCompanyIds() {
  try {
    console.log("🔍 Finding the main company...");

    // Find the main company (assuming there's only one)
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log("❌ No company found");
      return;
    }

    console.log(`Found company: ${company.name} (${company.id})`);

    // Fix users without companyId
    console.log("\n🔧 Fixing users without companyId...");
    const usersWithoutCompanyId = await prisma.user.findMany({
      where: { companyId: null },
      select: { id: true, email: true },
    });

    console.log(
      `Found ${usersWithoutCompanyId.length} users without companyId`,
    );

    for (const user of usersWithoutCompanyId) {
      console.log(`Updating user ${user.email} with companyId: ${company.id}`);
      await prisma.user.update({
        where: { id: user.id },
        data: { companyId: company.id },
      });
    }

    // Fix employees without companyId
    console.log("\n🔧 Fixing employees without companyId...");
    const employeesWithoutCompanyId = await prisma.employee.findMany({
      where: { companyId: null },
      include: {
        user: { select: { email: true } },
      },
    });

    console.log(
      `Found ${employeesWithoutCompanyId.length} employees without companyId`,
    );

    for (const employee of employeesWithoutCompanyId) {
      console.log(
        `Updating employee ${employee.user.email} with companyId: ${company.id}`,
      );
      await prisma.employee.update({
        where: { id: employee.id },
        data: { companyId: company.id },
      });
    }

    console.log("\n✅ All company IDs fixed!");
  } catch (error) {
    console.error("❌ Error fixing company IDs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllCompanyIds();
