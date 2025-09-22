import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execSync } from "child_process";
import { randomUUID } from "crypto";


const prisma = new PrismaClient();

async function main() {
  // Ensure the database schema is up to date before seeding
  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  // ✅ 1. Create Company
  const company = await prisma.company.upsert({
    where: { name: "PeopleCore" },
    update: {},
    create: {
      id: randomUUID(),
      name: "PeopleCore",
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Company created: ${company.name} (${company.id})`);

  // ✅ 2. Create Department linked to Company
  const department = await prisma.department.upsert({
    where: { companyId_name: { companyId: company.id, name: "Sales" } },
    update: {},
    create: {
      id: randomUUID(),
      name: "Sales",
      companyId: company.id,
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Department created: ${department.name} (${department.id})`);

  // ✅ 3. Standard Working Pattern (Monday-Friday, 9am-5pm)
  let standardWorkingPattern = await prisma.workingPattern.findFirst({
    where: { name: "Standard (Mon-Fri, 9am-5pm)", companyId: company.id },
  });

  if (!standardWorkingPattern) {
    standardWorkingPattern = await prisma.workingPattern.create({
      data: {
        id: randomUUID(),
        name: "Standard (Mon-Fri, 9am-5pm)",
        description:
          "Standard Monday to Friday working pattern from 9am to 5pm",
        companyId: company.id,
        updatedAt: new Date(),
        WorkingPatternWeek: {
          create: [
            {
              id: randomUUID(),
              weekNumber: 1,
              WorkingPatternDay: {
                create: [
                  { id: randomUUID(), day: "Mon", type: "FULL_DAY" },
                  { id: randomUUID(), day: "Tue", type: "FULL_DAY" },
                  { id: randomUUID(), day: "Wed", type: "FULL_DAY" },
                  { id: randomUUID(), day: "Thu", type: "FULL_DAY" },
                  { id: randomUUID(), day: "Fri", type: "FULL_DAY" },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // ✅ 4. Built-in Permission Profiles
  const adminProfile = await prisma.permissionProfile.upsert({
    where: { companyId_name: { companyId: company.id, name: "Admin" } },
    update: {},
    create: {
      id: randomUUID(),
      companyId: company.id,
      name: "Admin",
      description: "Full system access with administrative privileges",
      permissions: JSON.stringify({
        dashboard: ["read"],
        approvals: ["read", "edit"],
        employees: ["read", "edit", "delete"],
        calendar: ["read", "edit", "delete"],
        documents: ["read", "edit", "delete"],
        reports: ["read", "edit", "delete"],
        "org-chart": ["read"],
        news: ["read", "edit", "delete"],
        settings: ["read", "edit", "delete"],
        onboarding: ["read", "edit", "delete"],
        offboarding: ["read", "edit", "delete"],
        forms: ["read", "edit", "delete"],
        "leave-requests": ["read", "edit", "delete"],
        "working-patterns": ["read", "edit", "delete"],
        departments: ["read", "edit", "delete"],
        "job-roles": ["read", "edit", "delete"],
        permissions: ["read", "edit", "delete"],
        // Employee detail screens
        "employee-overview": ["read", "edit"],
        "employee-documents": ["read", "edit", "delete"],
        "employee-driver-licenses": ["read", "edit", "delete"],
        "employee-employment-checks": ["read", "edit", "delete"],
        "employee-forms": ["read", "edit", "delete"],
        "employee-leave": ["read", "edit"],
        "employee-offboarding": ["read", "edit"],
        "employee-onboarding": ["read", "edit", "delete"],
        "employee-performance": ["read", "edit"],
        "employee-settings": ["read", "edit"],
        "employee-training": ["read", "edit", "delete"],
      }),
      builtIn: true,
      updatedAt: new Date(),
    },
  });

  const managerProfile = await prisma.permissionProfile.upsert({
    where: { companyId_name: { companyId: company.id, name: "Manager" } },
    update: {},
    create: {
      id: randomUUID(),
      companyId: company.id,
      name: "Manager",
      description: "Management access with employee oversight capabilities",
      permissions: JSON.stringify({
        dashboard: ["read"],
        employees: ["read", "edit"],
        calendar: ["read", "edit"],
        documents: ["read", "edit"],
        reports: ["read"],
        "org-chart": ["read"],
        news: ["read"],
        "leave-requests": ["read", "edit"],
        "working-patterns": ["read"],
        onboarding: ["read"],
        offboarding: ["read"],
        // Employee detail screens - Managers can view and edit most employee details
        "employee-overview": ["read", "edit"],
        "employee-documents": ["read", "edit"],
        "employee-driver-licenses": ["read", "edit"],
        "employee-employment-checks": ["read", "edit"],
        "employee-forms": ["read", "edit"],
        "employee-leave": ["read", "edit"],
        "employee-offboarding": ["read"],
        "employee-onboarding": ["read", "edit"],
        "employee-performance": ["read", "edit"],
        "employee-settings": ["read"],
        "employee-training": ["read", "edit"],
      }),
      builtIn: true,
      updatedAt: new Date(),
    },
  });

  const employeeProfile = await prisma.permissionProfile.upsert({
    where: { companyId_name: { companyId: company.id, name: "Employee" } },
    update: {},
    create: {
      id: randomUUID(),
      companyId: company.id,
      name: "Employee",
      description: "Standard employee access to essential features",
      permissions: JSON.stringify({
        dashboard: ["read"],
        calendar: ["read"],
        documents: ["read"],
        news: ["read"],
        "leave-requests": ["read", "edit"],
        onboarding: ["read"],
        // Employee detail screens - Employees can only view their own details
        "employee-overview": ["read"],
        "employee-documents": ["read"],
        "employee-forms": ["read"],
        "employee-leave": ["read", "edit"],
        "employee-training": ["read"],
      }),
      builtIn: true,
      updatedAt: new Date(),
    },
  });

  // ✅ 5. Admin User & Employees
  const hashedPassword = await bcrypt.hash("Admin123!", 10);
  const adminUser = await prisma.user.upsert({
    where: {
      email_companyId: { email: "admin@peoplecore.com", companyId: company.id },
    },
    update: {},
    create: {
      id: randomUUID(),
      email: "admin@peoplecore.com",
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      password: hashedPassword,
      companyId: company.id,
      departmentId: department.id,
      permissionProfileId: adminProfile.id,
      updatedAt: new Date(),
    },
  });

  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      id: randomUUID(),
      userId: adminUser.id,
      departmentId: department.id,
      companyId: company.id,
      isActive: true,
    },
  });

  const sampleEmployees = [
    {
      email: "john.doe@peoplecore.com",
      firstName: "John",
      lastName: "Doe",
      role: "MANAGER",
    },
    {
      email: "jane.smith@peoplecore.com",
      firstName: "Jane",
      lastName: "Smith",
      role: "EMPLOYEE",
    },
  ];

  for (const emp of sampleEmployees) {
    const user = await prisma.user.upsert({
      where: {
        email_companyId: { email: emp.email, companyId: company.id },
      },
      update: {},
      create: {
        id: randomUUID(),
        email: emp.email,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: emp.role as "ADMIN" | "MANAGER" | "EMPLOYEE",
        password: hashedPassword,
        companyId: company.id,
        departmentId: department.id,
        permissionProfileId:
          emp.role === "MANAGER" ? managerProfile.id : employeeProfile.id,
        updatedAt: new Date(),
      },
    });

    await prisma.employee.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: randomUUID(),
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
      name: "Annual Leave",
      categoryType: "TIME_OFF",
      requiresApproval: true,
      adminOnly: false,
      color: "#008000",
      systemDefined: true,
    },
    {
      name: "Sickness",
      categoryType: "TIME_OFF",
      requiresApproval: false,
      adminOnly: false,
      color: "#FF0000",
      systemDefined: true,
    },
  ];

  for (const category of systemCategories) {
    console.log(`⏳ Attempting to upsert category: ${category.name}`);
    const result = await prisma.eventCategory.upsert({
      where: { companyId_name: { companyId: company.id, name: category.name } },
      update: {
        systemDefined: true,
        categoryType: category.categoryType,
        requiresApproval: category.requiresApproval,
        adminOnly: category.adminOnly,
        color: category.color,
        updatedAt: new Date(),
      },
      create: { id: randomUUID(), updatedAt: new Date(), ...category, Company: { connect: { id: company.id } } },
    });
    console.log(`✅ Category upserted: ${result.name} (${result.id})`);

    // ✅ 6. Create EventRule tied to the category and company
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
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        companyId: company.id,
        eventCategoryId: result.id,
        maxCarryoverDays: 5,
        carryoverExpiryMonths: 3,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ EventRule created for ${category.name} (${eventRule.id})`);
  }

  // ✅ 7. Seed FieldMetadata for dynamic report builder
  const fieldMetadataData = [
      // User fields
      { model: "user", field: "email", label: "Email", fieldType: "string" },
      { model: "user", field: "role", label: "Role", fieldType: "string" },
      {
        model: "user",
        field: "firstName",
        label: "First Name",
        fieldType: "string",
      },
      {
        model: "user",
        field: "lastName",
        label: "Last Name",
        fieldType: "string",
      },
      { model: "user", field: "phone", label: "Phone", fieldType: "string" },
      // Employee fields
      {
        model: "employee",
        field: "isActive",
        label: "Is Active",
        fieldType: "boolean",
      },
      {
        model: "employee",
        field: "departmentId",
        label: "Department ID",
        fieldType: "string",
      },
      {
        model: "employee",
        field: "workingPatternId",
        label: "Working Pattern ID",
        fieldType: "string",
      },
      // Department fields
      {
        model: "department",
        field: "name",
        label: "Department Name",
        fieldType: "string",
      },
      {
        model: "department",
        field: "companyId",
        label: "Company ID",
        fieldType: "string",
      },
      // JobRole fields
      {
        model: "jobrole",
        field: "name",
        label: "Job Role Name",
        fieldType: "string",
      },
      {
        model: "jobrole",
        field: "description",
        label: "Job Role Description",
        fieldType: "string",
      },
      // Leave Request fields
      {
        model: "leaverequest",
        field: "startDate",
        label: "Start Date",
        fieldType: "date",
      },
      {
        model: "leaverequest",
        field: "endDate",
        label: "End Date",
        fieldType: "date",
      },
      {
        model: "leaverequest",
        field: "status",
        label: "Status",
        fieldType: "string",
      },
      {
        model: "leaverequest",
        field: "daysRequested",
        label: "Days Requested",
        fieldType: "int",
      },
      // Leave Entitlement fields
      {
        model: "leaveentitlement",
        field: "totalDays",
        label: "Total Days",
        fieldType: "int",
      },
      {
        model: "leaveentitlement",
        field: "usedDays",
        label: "Used Days",
        fieldType: "int",
      },
      {
        model: "leaveentitlement",
        field: "carryoverDays",
        label: "Carryover Days",
        fieldType: "int",
      },
      {
        model: "leaveentitlement",
        field: "carryoverExpiry",
        label: "Carryover Expiry",
        fieldType: "date",
      },
  ];
  await prisma.fieldMetadata.createMany({
    data: fieldMetadataData.map((item) => ({ id: randomUUID(), ...item })),
    skipDuplicates: true, // prevent duplication on re-seeding
  });
  console.log("✅ FieldMetadata seeded for dynamic report builder.");

  // ✅ 8. Seed ExpiryRules for expiry alerts
  const expiryRules = [
    {
      category: "Employment Checks",
      daysBefore: 28,
      notifyAdmin: true,
      notifyManager: true,
      notifyEmployee: true,
    },
    {
      category: "Driver Licence",
      daysBefore: 30,
      notifyAdmin: true,
      notifyManager: true,
      notifyEmployee: true,
    },
    {
      category: "Training",
      daysBefore: 45,
      notifyAdmin: true,
      notifyManager: true,
      notifyEmployee: true,
    },
  ];

  for (const rule of expiryRules) {
    const result = await prisma.expiryRule.upsert({
      where: { category: rule.category },
      update: {
        daysBefore: rule.daysBefore,
        notifyAdmin: rule.notifyAdmin,
        notifyManager: rule.notifyManager,
        notifyEmployee: rule.notifyEmployee,
        updatedAt: new Date(),
      },
      create: { id: randomUUID(), updatedAt: new Date(), ...rule },
    });
    console.log(`✅ ExpiryRule created: ${result.category} (${result.id})`);
  }

  console.log("✅ Seeding process completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
