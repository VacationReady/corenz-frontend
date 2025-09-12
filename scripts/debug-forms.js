// Script to debug forms and employee data
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugForms() {
  try {
    console.log("🔍 Debugging forms and employees...\n");

    // Check all companies
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    });
    console.log("Companies:", companies);

    // Check all forms
    const forms = await prisma.form.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        companyId: true,
        isActive: true,
        visibleToRoles: true,
        visibleToDepartments: true,
        visibleToJobRoles: true,
      },
    });
    console.log("\nForms:", forms);

    // Check all employees
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        companyId: true,
        user: {
          select: {
            email: true,
            companyId: true,
            role: true,
            departmentId: true,
            jobRoleId: true,
          },
        },
      },
    });
    console.log("\nEmployees:", employees);

    // Check if any forms match any employees
    console.log("\n🔍 Checking form-employee matches...");
    for (const employee of employees) {
      const matchingForms = forms.filter(
        (form) => form.companyId === employee.companyId && form.isActive,
      );
      console.log(
        `Employee ${employee.user.email} (companyId: ${employee.companyId}) has ${matchingForms.length} matching forms`,
      );
      if (matchingForms.length > 0) {
        console.log(
          "  Forms:",
          matchingForms.map((f) => f.name),
        );
      }
    }
  } catch (error) {
    console.error("❌ Error debugging:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugForms();
