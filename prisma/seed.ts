import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  // Ensure the database schema is up to date before seeding
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

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

  // ✅ 3. Default Permission Profile
  const defaultProfile = await prisma.permissionProfile.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Default' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Default',
      description: 'Default permission profile',
      permissions: {},
      builtIn: true,
    },
  });

  // ✅ 4. Admin User & Employees
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
      permissionProfileId: defaultProfile.id,
    },
  });

  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      departmentId: department.id,
      companyId: company.id,
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
        companyId: company.id,
        departmentId: department.id,
        permissionProfileId: defaultProfile.id,
      },
    });

    await prisma.employee.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        departmentId: department.id,
        companyId: company.id,
        isActive: true,
      },
    });
  }

  // ✅ 5. Create system-defined EventCategories
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
    skipDuplicates: true, // prevent duplication on re-seeding
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
