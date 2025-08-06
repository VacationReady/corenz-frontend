const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // ✅ 1. Create Company
  const company = await prisma.company.upsert({
    where: { name: 'CoreNZ' },
    update: {},
    create: { name: 'CoreNZ' },
  });
  console.log(`✅ Company created: ${company.name} (${company.id})`);

  // ✅ 2. Create Department linked to Company
  const department = await prisma.department.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Sales' } },
    update: {},
    create: { name: 'Sales', companyId: company.id },
  });
  console.log(`✅ Department created: ${department.name} (${department.id})`);

  // ✅ 3. Create system-defined EventCategories
  const systemCategories = [
    {
      name: 'Annual Leave',
      categoryType: 'TIME_OFF',
      requiresApproval: true,
      adminOnly: false,
      color: '#008000',
      systemDefined: true,
    },
    {
      name: 'Sickness',
      categoryType: 'TIME_OFF',
      requiresApproval: false,
      adminOnly: false,
      color: '#FF0000',
      systemDefined: true,
    },
  ];

  for (const category of systemCategories) {
    const result = await prisma.eventCategory.upsert({
      where: { name: category.name },
      update: {
        systemDefined: true,
        categoryType: category.categoryType,
        requiresApproval: category.requiresApproval,
        adminOnly: category.adminOnly,
        color: category.color,
      },
      create: category,
    });
    console.log(`✅ Category upserted: ${result.name} (${result.id})`);

    // ✅ EventRule tied to category and company
    await prisma.eventRule.upsert({
      where: {
        companyId_eventCategoryId: { companyId: company.id, eventCategoryId: result.id },
      },
      update: { maxCarryoverDays: 5, carryoverExpiryMonths: 3 },
      create: {
        companyId: company.id,
        eventCategoryId: result.id,
        maxCarryoverDays: 5,
        carryoverExpiryMonths: 3,
      },
    });
  }

  // ✅ 4. FieldMetadata (dynamic reporting)
  await prisma.fieldMetadata.createMany({
    data: [
      { model: "user", field: "email", label: "Email", fieldType: "string" },
      { model: "user", field: "role", label: "Role", fieldType: "string" },
      { model: "user", field: "firstName", label: "First Name", fieldType: "string" },
      { model: "user", field: "lastName", label: "Last Name", fieldType: "string" },
      { model: "user", field: "phone", label: "Phone", fieldType: "string" },
      { model: "employee", field: "isActive", label: "Is Active", fieldType: "boolean" },
      { model: "employee", field: "departmentId", label: "Department ID", fieldType: "string" },
      { model: "department", field: "name", label: "Department Name", fieldType: "string" },
      { model: "jobrole", field: "name", label: "Job Role Name", fieldType: "string" },
      { model: "leaverequest", field: "startDate", label: "Start Date", fieldType: "date" },
      { model: "leaverequest", field: "endDate", label: "End Date", fieldType: "date" },
      { model: "leaverequest", field: "approvalStatus", label: "Approval Status", fieldType: "string" },
      { model: "leaveentitlement", field: "totalDays", label: "Total Days", fieldType: "int" },
    ],
    skipDuplicates: true,
  });

  // ✅ 5. Expiry Rules
  const expiryRules = [
    { category: "Employment Checks", daysBefore: 28 },
    { category: "Driver Licence", daysBefore: 30 },
    { category: "Training", daysBefore: 45 },
  ];
  for (const rule of expiryRules) {
    await prisma.expiryRule.upsert({
      where: { category: rule.category },
      update: { daysBefore: rule.daysBefore },
      create: { ...rule, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    });
  }

  // ✅ 6. Departments (compound unique)
  const additionalDepartments = ['HR', 'Finance', 'Engineering'];
  for (const deptName of additionalDepartments) {
    await prisma.department.upsert({
      where: { companyId_name: { companyId: company.id, name: deptName } },
      update: {},
      create: { name: deptName, companyId: company.id },
    });
  }

  // ✅ 7. Job Roles (compound unique)
  const jobRoles = ['Manager', 'Employee', 'Admin'];
  for (const roleName of jobRoles) {
    await prisma.jobRole.upsert({
      where: { companyId_name: { companyId: company.id, name: roleName } },
      update: {},
      create: { name: roleName, companyId: company.id },
    });
  }

  // ✅ 8. Locations (global unique)
  const locations = ['Auckland', 'Wellington', 'Christchurch', 'London', 'Manchester'];
  for (const locName of locations) {
    await prisma.location.upsert({
      where: { name: locName },
      update: {},
      create: { name: locName },
    });
  }

  // ✅ 9. Onboarding Template + Steps
  const onboardingTemplate = await prisma.onboardingTemplate.upsert({
  where: { companyId_name: { companyId: company.id, name: 'Default Onboarding' } },
  update: { isDefault: true, isActive: true },
  create: {
    name: 'Default Onboarding',
    isDefault: true,
    isActive: true,
    companyId: company.id,
  },
});

  const onboardingSteps = [
    { label: 'Upload Passport/Right-to-Work', type: 'UPLOAD_DOCUMENT', uploadType: 'RIGHT_TO_WORK', order: 1 },
    { label: 'Acknowledge Health & Safety Policy', type: 'ACKNOWLEDGE_DOCUMENT', order: 2 },
    { label: 'Complete Bank Details Form', type: 'INSTRUCTION', instruction: 'Submit your bank account details.', order: 3 },
  ];
  for (const step of onboardingSteps) {
    await prisma.onboardingStep.upsert({
      where: { templateId_label: { templateId: onboardingTemplate.id, label: step.label } },
      update: {},
      create: { ...step, templateId: onboardingTemplate.id },
    });
  }

  // ✅ 11. Admin User & Employees
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@corenz.com' },
    update: {},
    create: {
      email: 'admin@corenz.com',
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      password: hashedPassword,
      companyId: company.id,
      departmentId: department.id,
    },
  });
  await prisma.employee.upsert({
  where: { userId: adminUser.id },
  update: {},
  create: {
    userId: adminUser.id,
    departmentId: department.id,
    companyId: company.id, // ✅ FIXED: Added missing companyId
    isActive: true,
  },
});

  const sampleEmployees = [
    { email: 'john.doe@corenz.com', firstName: 'John', lastName: 'Doe' },
    { email: 'jane.smith@corenz.com', firstName: 'Jane', lastName: 'Smith' },
  ];
  for (const emp of sampleEmployees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: 'EMPLOYEE',
        password: hashedPassword,
        companyId: company.id, // ✅ FIXED: Added missing companyId
        departmentId: department.id,
      },
    });
    await prisma.employee.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        departmentId: department.id,
        companyId: company.id, // ✅ FIXED: Added missing companyId
        isActive: true
      },
    });
  }

  console.log('🎉 Full CoreNZ seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
