const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ✅ 1. Create Company
  const company = await prisma.company.upsert({
    where: { name: 'CoreNZ' },
    update: {},
    create: {
      name: 'CoreNZ',
    },
  });
  console.log(`✅ Company created: ${company.name} (${company.id})`);

  // ✅ 2. Create Department linked to Company
  const department = await prisma.department.upsert({
    where: { name: 'Sales' },
    update: { companyId: company.id },
    create: {
      name: 'Sales',
      companyId: company.id,
    },
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
    console.log(`⏳ Attempting to upsert category: ${category.name}`);
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

    // ✅ 4. Create EventRule tied to the category and company
    const eventRule = await prisma.eventRule.upsert({
      where: {
        companyId_eventCategoryId: {
          companyId: company.id,
          eventCategoryId: result.id,
        },
      },
      update: {
        maxCarryoverDays: 5,
        carryoverExpiryMonths: 3,
      },
      create: {
        companyId: company.id,
        eventCategoryId: result.id,
        maxCarryoverDays: 5,
        carryoverExpiryMonths: 3,
      },
    });
    console.log(`✅ EventRule created for ${category.name} (${eventRule.id})`);
  }

  // ✅ 5. Seed FieldMetadata for dynamic report builder
  await prisma.fieldMetadata.createMany({
    data: [
      // User fields
      { model: "user", field: "email", label: "Email", fieldType: "string" },
      { model: "user", field: "role", label: "Role", fieldType: "string" },
      { model: "user", field: "firstName", label: "First Name", fieldType: "string" },
      { model: "user", field: "lastName", label: "Last Name", fieldType: "string" },
      { model: "user", field: "phone", label: "Phone", fieldType: "string" },
      // Employee fields
      { model: "employee", field: "isActive", label: "Is Active", fieldType: "boolean" },
      { model: "employee", field: "departmentId", label: "Department ID", fieldType: "string" },
      { model: "employee", field: "workingPatternId", label: "Working Pattern ID", fieldType: "string" },
      // Department fields
      { model: "department", field: "name", label: "Department Name", fieldType: "string" },
      { model: "department", field: "companyId", label: "Company ID", fieldType: "string" },
      // JobRole fields
      { model: "jobrole", field: "name", label: "Job Role Name", fieldType: "string" },
      { model: "jobrole", field: "description", label: "Job Role Description", fieldType: "string" },
      // Leave Request fields
      { model: "leaverequest", field: "startDate", label: "Start Date", fieldType: "date" },
      { model: "leaverequest", field: "endDate", label: "End Date", fieldType: "date" },
      { model: "leaverequest", field: "status", label: "Status", fieldType: "string" },
      { model: "leaverequest", field: "daysRequested", label: "Days Requested", fieldType: "int" },
      // Leave Entitlement fields
      { model: "leaveentitlement", field: "totalDays", label: "Total Days", fieldType: "int" },
      { model: "leaveentitlement", field: "usedDays", label: "Used Days", fieldType: "int" },
      { model: "leaveentitlement", field: "carryoverDays", label: "Carryover Days", fieldType: "int" },
      { model: "leaveentitlement", field: "carryoverExpiry", label: "Carryover Expiry", fieldType: "date" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ FieldMetadata seeded for dynamic report builder.");

  // ✅ 6. Seed ExpiryRules for expiry alerts
  const expiryRules = [
    { category: "Employment Checks", daysBefore: 28, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Driver Licence", daysBefore: 30, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Training", daysBefore: 45, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
  ];

  for (const rule of expiryRules) {
    const result = await prisma.expiryRule.upsert({
      where: { category: rule.category },
      update: {
        daysBefore: rule.daysBefore,
        notifyAdmin: rule.notifyAdmin,
        notifyManager: rule.notifyManager,
        notifyEmployee: rule.notifyEmployee,
      },
      create: rule,
    });
    console.log(`✅ ExpiryRule created: ${result.category} (${result.id})`);
  }

  // ✅ 7. Seed Additional Departments
  const additionalDepartments = ['HR', 'Finance', 'Engineering']
  for (const deptName of additionalDepartments) {
    const dept = await prisma.department.upsert({
      where: { name: deptName },
      update: { companyId: company.id },
      create: {
        name: deptName,
        companyId: company.id,
      },
    })
    console.log(`✅ Department created: ${dept.name} (${dept.id})`)
  }

  // ✅ 8. Seed Job Roles
  const jobRoles = ['Manager', 'Employee', 'Admin']
  for (const roleName of jobRoles) {
    const role = await prisma.jobRole.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
      },
    })
    console.log(`✅ JobRole created: ${role.name} (${role.id})`)
  }

  // ✅ 9. Seed Locations
  const locations = ['Auckland', 'Wellington', 'Christchurch']
  for (const locName of locations) {
    const loc = await prisma.location.upsert({
      where: { name: locName },
      update: {},
      create: {
        name: locName,
      },
    })
    console.log(`✅ Location created: ${loc.name} (${loc.id})`)
  }

  console.log('✅ Seeding process completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
