import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting seed (no migrations will be run here).");

  // =============== 1) Company ===============
  const company = await prisma.company.upsert({
    where: { name: "PeopleCore" },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      name: "PeopleCore",
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Company: ${company.name} (${company.id})`);

  // =============== 2) Departments ===============
  const primaryDeptName = "Sales";
  const department = await prisma.department.upsert({
    where: { companyId_name: { companyId: company.id, name: primaryDeptName } },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      name: primaryDeptName,
      companyId: company.id,
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Department: ${department.name}`);

  const additionalDepartments = [
    "HR",
    "Finance",
    "Engineering",
    "Operations",
    "Customer Support",
    "Marketing",
    "IT",
  ];
  for (const name of additionalDepartments) {
    await prisma.department.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: { updatedAt: new Date() },
      create: {
        id: randomUUID(),
        name,
        companyId: company.id,
        updatedAt: new Date(),
      },
    });
  }

  // =============== 3) SUPER_ADMIN (you) ===============
  const superAdminPassword = await bcrypt.hash("Admin123!", 10);
  const superAdmin = await prisma.user.upsert({
    where: {
      email_companyId: { email: "hi@peoplecore.co.nz", companyId: company.id },
    },
    update: {
      role: "SUPER_ADMIN",
      password: superAdminPassword,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      email: "hi@peoplecore.co.nz",
      firstName: "Michael",
      lastName: "Dowdle",
      role: "SUPER_ADMIN",
      password: superAdminPassword,
      companyId: company.id,
      departmentId: department.id,
      updatedAt: new Date(),
    },
  });
  await prisma.employee.upsert({
    where: { userId: superAdmin.id },
    update: { isActive: true },
    create: {
      id: randomUUID(),
      userId: superAdmin.id,
      departmentId: department.id,
      companyId: company.id,
      isActive: true,
    },
  });
  console.log("✅ SUPER_ADMIN ensured.");

  // =============== 4) Working Patterns ===============
  // Standard pattern
  let standardWorkingPattern = await prisma.workingPattern.findFirst({
    where: { name: "Standard (Mon-Fri, 9am-5pm)", companyId: company.id },
  });
  if (!standardWorkingPattern) {
    standardWorkingPattern = await prisma.workingPattern.create({
      data: {
        id: randomUUID(),
        name: "Standard (Mon-Fri, 9am-5pm)",
        description: "Standard Monday to Friday working pattern from 9am to 5pm",
        companyId: company.id,
        updatedAt: new Date(),
        WorkingPatternWeek: {
          create: [
            {
              id: randomUUID(),
              weekNumber: 1,
              WorkingPatternDay: {
                create: [
                  { id: randomUUID(), day: "Mon", type: "FULL_DAY" as any },
                  { id: randomUUID(), day: "Tue", type: "FULL_DAY" as any },
                  { id: randomUUID(), day: "Wed", type: "FULL_DAY" as any },
                  { id: randomUUID(), day: "Thu", type: "FULL_DAY" as any },
                  { id: randomUUID(), day: "Fri", type: "FULL_DAY" as any },
                ],
              },
            },
          ],
        },
      },
    });
  }

  async function createWorkingPatternIfMissing(
    name: string,
    description: string,
    weeks: { weekNumber?: number; days: { day: string; type: string }[] }[],
  ) {
    const existing = await prisma.workingPattern.findFirst({
      where: { name, companyId: company.id },
    });
    if (existing) return existing;
    return prisma.workingPattern.create({
      data: {
        id: randomUUID(),
        name,
        description,
        companyId: company.id,
        updatedAt: new Date(),
        WorkingPatternWeek: {
          create: weeks.map((week, idx) => ({
            id: randomUUID(),
            weekNumber: week.weekNumber ?? idx + 1,
            WorkingPatternDay: {
              create: week.days.map((d) => ({
                id: randomUUID(),
                day: d.day,
                type: d.type as any,
              })),
            },
          })),
        },
      },
    });
  }

  await createWorkingPatternIfMissing(
    "Part-time (Mon/Wed/Fri)",
    "Part-time schedule working Monday, Wednesday, Friday",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "FULL_DAY" },
      { day: "Wed", type: "FULL_DAY" },
      { day: "Fri", type: "FULL_DAY" },
    ]}],
  );

  await createWorkingPatternIfMissing(
    "School Hours (Mon-Fri, AM)",
    "Half-day mornings Monday to Friday",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "HALF_DAY_AM" },
      { day: "Tue", type: "HALF_DAY_AM" },
      { day: "Wed", type: "HALF_DAY_AM" },
      { day: "Thu", type: "HALF_DAY_AM" },
      { day: "Fri", type: "HALF_DAY_AM" },
    ]}],
  );

  await createWorkingPatternIfMissing(
    "4-on 4-off",
    "Four days on, four days off (two-week cycle)",
    [
      { weekNumber: 1, days: [
        { day: "Mon", type: "FULL_DAY" },
        { day: "Tue", type: "FULL_DAY" },
        { day: "Wed", type: "FULL_DAY" },
        { day: "Thu", type: "FULL_DAY" },
      ]},
      { weekNumber: 2, days: [
        { day: "Tue", type: "FULL_DAY" },
        { day: "Wed", type: "FULL_DAY" },
        { day: "Thu", type: "FULL_DAY" },
        { day: "Fri", type: "FULL_DAY" },
      ]},
    ],
  );

  // Additional Working Patterns for Production
  await createWorkingPatternIfMissing(
    "Compressed Week (Mon-Thu)",
    "Four 10-hour days Monday to Thursday",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "FULL_DAY" },
      { day: "Tue", type: "FULL_DAY" },
      { day: "Wed", type: "FULL_DAY" },
      { day: "Thu", type: "FULL_DAY" },
    ]}],
  );

  await createWorkingPatternIfMissing(
    "9-Day Fortnight",
    "Nine days over two weeks with alternate Fridays off",
    [
      { weekNumber: 1, days: [
        { day: "Mon", type: "FULL_DAY" },
        { day: "Tue", type: "FULL_DAY" },
        { day: "Wed", type: "FULL_DAY" },
        { day: "Thu", type: "FULL_DAY" },
        { day: "Fri", type: "FULL_DAY" },
      ]},
      { weekNumber: 2, days: [
        { day: "Mon", type: "FULL_DAY" },
        { day: "Tue", type: "FULL_DAY" },
        { day: "Wed", type: "FULL_DAY" },
        { day: "Thu", type: "FULL_DAY" },
      ]},
    ],
  );

  await createWorkingPatternIfMissing(
    "Hybrid (3 Days Office)",
    "Flexible hybrid working - 3 days in office (Tue-Thu)",
    [{ weekNumber: 1, days: [
      { day: "Tue", type: "FULL_DAY" },
      { day: "Wed", type: "FULL_DAY" },
      { day: "Thu", type: "FULL_DAY" },
    ]}],
  );

  await createWorkingPatternIfMissing(
    "Weekend Worker",
    "Saturday and Sunday working pattern",
    [{ weekNumber: 1, days: [
      { day: "Sat", type: "FULL_DAY" },
      { day: "Sun", type: "FULL_DAY" },
    ]}],
  );

  await createWorkingPatternIfMissing(
    "Afternoons Only (Mon-Fri)",
    "Half-day afternoons Monday to Friday",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "HALF_DAY_PM" },
      { day: "Tue", type: "HALF_DAY_PM" },
      { day: "Wed", type: "HALF_DAY_PM" },
      { day: "Thu", type: "HALF_DAY_PM" },
      { day: "Fri", type: "HALF_DAY_PM" },
    ]}],
  );

  console.log("✅ Working patterns seeded.");

  // =============== 5) Permission Profiles ===============
  const adminProfile = await prisma.permissionProfile.upsert({
    where: { companyId_name: { companyId: company.id, name: "Admin" } },
    update: { updatedAt: new Date() },
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
    update: { updatedAt: new Date() },
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
    update: { updatedAt: new Date() },
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

  // =============== 6) Admin + Sample Users ===============
  const hashedPassword = await bcrypt.hash("Admin123!", 10);
  const adminUser = await prisma.user.upsert({
    where: {
      email_companyId: { email: "admin@peoplecore.com", companyId: company.id },
    },
    update: { updatedAt: new Date() },
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
    update: { isActive: true },
    create: {
      id: randomUUID(),
      userId: adminUser.id,
      departmentId: department.id,
      companyId: company.id,
      isActive: true,
    },
  });

  const sampleEmployees = [
    { email: "john.doe@peoplecore.com", firstName: "John", lastName: "Doe", role: "MANAGER" as Role },
    { email: "jane.smith@peoplecore.com", firstName: "Jane", lastName: "Smith", role: "EMPLOYEE" as Role },
  ];
  for (const emp of sampleEmployees) {
    const user = await prisma.user.upsert({
      where: {
        email_companyId: { email: emp.email, companyId: company.id },
      },
      update: { updatedAt: new Date() },
      create: {
        id: randomUUID(),
        email: emp.email,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: emp.role,
        password: hashedPassword,
        companyId: company.id,
        departmentId: department.id,
        permissionProfileId: emp.role === "MANAGER" ? managerProfile.id : employeeProfile.id,
        updatedAt: new Date(),
      },
    });
    await prisma.employee.upsert({
      where: { userId: user.id },
      update: { isActive: true },
      create: {
        id: randomUUID(),
        userId: user.id,
        departmentId: department.id,
        companyId: company.id,
        isActive: true,
      },
    });
  }

  // =============== 7) Job Roles ===============
  const baseJobRoles = ["Manager", "Employee", "Admin"];
  const extraJobRoles = [
    "HR Advisor",
    "Software Engineer",
    "Sales Executive",
    "Finance Analyst",
    "Operations Coordinator",
    "Customer Support Representative",
    "Marketing Manager",
  ];
  for (const name of [...baseJobRoles, ...extraJobRoles]) {
    await prisma.jobRole.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: { updatedAt: new Date() },
      create: {
        id: randomUUID(),
        name,
        companyId: company.id,
        updatedAt: new Date(),
      },
    });
  }

  // =============== 8) Employment Type Options ===============
  const employmentTypeOptions = [
    { label: "Permanent", order: 1 },
    { label: "Part Time", order: 2 },
    { label: "Contractor", order: 3 },
    { label: "Zero Hours", order: 4 },
  ];
  for (const option of employmentTypeOptions) {
    await prisma.employmentTypeOption.upsert({
      where: {
        companyId_label: {
          companyId: company.id,
          label: option.label,
        },
      },
      update: {
        order: option.order,
      },
      create: {
        id: randomUUID(),
        companyId: company.id,
        label: option.label,
        order: option.order,
      },
    });
  }

  // =============== 9) Locations ===============
  const locations = [
    "Auckland","Wellington","Christchurch","Hamilton","Tauranga","Dunedin",
    "Queenstown","Napier","Palmerston North","London","Manchester",
  ];
  for (const name of locations) {
    const existing = await prisma.location.findFirst({
      where: { name, companyId: null },
    });
    if (!existing) {
      await prisma.location.create({
        data: { id: randomUUID(), name },
      });
    }
  }

  // =============== 10) Event Categories + Rules ===============
  const systemCategories = [
    { name: "Annual Leave", categoryType: "TIME_OFF", requiresApproval: true,  adminOnly: false, color: "#008000", systemDefined: true },
    { name: "Sickness",     categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#FF0000", systemDefined: true },
    { name: "Training",     categoryType: "TIME_OFF", requiresApproval: true,  adminOnly: false, color: "#4F46E5", systemDefined: true },
    { name: "Maternity Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#EC4899", systemDefined: true },
    { name: "Compassionate Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#8B5CF6", systemDefined: true },
    { name: "Doctor Appointment", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#14B8A6", systemDefined: true },
    { name: "Dentist Appointment", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#0EA5E9", systemDefined: true },
    // NZ-Compliant Additional Leave Categories
    { name: "Paternity Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#3B82F6", systemDefined: true },
    { name: "Bereavement Leave", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#6B7280", systemDefined: true },
    { name: "Family Violence Leave", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#DC2626", systemDefined: true },
    { name: "Parental Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#F472B6", systemDefined: true },
    { name: "Jury Duty", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#78716C", systemDefined: true },
    { name: "Study Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#A855F7", systemDefined: true },
    { name: "Time Off in Lieu", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#F59E0B", systemDefined: true },
    { name: "Long Service Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#10B981", systemDefined: true },
  ];
  for (const cat of systemCategories) {
    const saved = await prisma.eventCategory.upsert({
      where: { companyId_name: { companyId: company.id, name: cat.name } },
      update: {
        systemDefined: true,
        categoryType: cat.categoryType as any,
        requiresApproval: cat.requiresApproval,
        adminOnly: cat.adminOnly,
        color: cat.color,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        updatedAt: new Date(),
        ...cat,
        Company: { connect: { id: company.id } },
      },
    });
    await prisma.eventRule.upsert({
      where: {
        companyId_eventCategoryId: {
          companyId: company.id,
          eventCategoryId: saved.id,
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
        eventCategoryId: saved.id,
        maxCarryoverDays: 5,
        carryoverExpiryMonths: 3,
        updatedAt: new Date(),
      },
    });
  }

  // =============== 11) Field Metadata (Reporting) ===============
  const fieldMetadataData = [
    // User
    { model: "user", field: "email",      label: "Email",       fieldType: "string" },
    { model: "user", field: "role",       label: "Role",        fieldType: "string" },
    { model: "user", field: "firstName",  label: "First Name",  fieldType: "string" },
    { model: "user", field: "lastName",   label: "Last Name",   fieldType: "string" },
    { model: "user", field: "phone",      label: "Phone",       fieldType: "string" },
    // Employee
    { model: "employee", field: "isActive",         label: "Is Active",         fieldType: "boolean" },
    { model: "employee", field: "departmentId",     label: "Department ID",     fieldType: "string" },
    { model: "employee", field: "workingPatternId", label: "Working Pattern ID",fieldType: "string" },
    // Department
    { model: "department", field: "name",      label: "Department Name", fieldType: "string" },
    { model: "department", field: "companyId", label: "Company ID",      fieldType: "string" },
    // JobRole
    { model: "jobrole", field: "name",        label: "Job Role Name",        fieldType: "string" },
    { model: "jobrole", field: "description", label: "Job Role Description", fieldType: "string" },
    // Leave Request
    { model: "leaverequest", field: "startDate",     label: "Start Date",     fieldType: "date" },
    { model: "leaverequest", field: "endDate",       label: "End Date",       fieldType: "date" },
    { model: "leaverequest", field: "status",        label: "Status",         fieldType: "string" },
    { model: "leaverequest", field: "daysRequested", label: "Days Requested", fieldType: "int" },
    // Leave Entitlement
    { model: "leaveentitlement", field: "totalDays",       label: "Total Days",       fieldType: "int" },
    { model: "leaveentitlement", field: "usedDays",        label: "Used Days",        fieldType: "int" },
    { model: "leaveentitlement", field: "carryoverDays",   label: "Carryover Days",   fieldType: "int" },
    { model: "leaveentitlement", field: "carryoverExpiry", label: "Carryover Expiry", fieldType: "date" },
  ];
  await prisma.fieldMetadata.createMany({
    data: fieldMetadataData.map((item) => ({ id: randomUUID(), ...item })),
    skipDuplicates: true,
  });
  console.log("✅ Field metadata seeded.");

  // =============== 12) Expiry Rules ===============
  const expiryRules = [
    { category: "Employment Checks", daysBefore: 28, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Driver Licence",    daysBefore: 30, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Training",          daysBefore: 45, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
  ];
  for (const rule of expiryRules) {
    await prisma.expiryRule.upsert({
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
  }
  console.log("✅ Expiry rules seeded.");

  // =============== 12) Performance Management Templates ===============
  console.log("🎯 Seeding performance management templates...");

  // Weekly 1-2-1 Template
  const existing121 = await prisma.performanceTemplate.findFirst({
    where: { companyId: company.id, name: "Weekly 1-2-1" }
  });
  
  if (!existing121) {
    await prisma.performanceTemplate.create({
      data: {
      id: randomUUID(),
      companyId: company.id,
      name: "Weekly 1-2-1",
      description: "Standard template for recurring one-on-one meetings",
      type: "ONE_TO_ONE",
      icon: "💬",
      isDefault: true,
      isActive: true,
      tags: ["1-2-1", "recurring", "weekly"],
      visibility: "COMPANY",
      createdBy: superAdmin.id,
      sections: {
        create: [
          {
            id: randomUUID(),
            title: "Check-in & Wellbeing",
            description: "Start with personal connection",
            order: 1,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "How are you feeling this week?",
                  description: "General wellbeing and mood",
                  type: "RATING",
                  order: 1,
                  isRequired: true,
                  options: { min: 1, max: 5, labels: ["Struggling", "Excellent"] },
                },
                {
                  id: randomUUID(),
                  question: "What's on your mind?",
                  type: "TEXTAREA",
                  order: 2,
                  isRequired: false,
                },
              ],
            },
          },
          {
            id: randomUUID(),
            title: "Progress & Wins",
            description: "Celebrate achievements",
            order: 2,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "What went well this week?",
                  type: "TEXTAREA",
                  order: 1,
                  isRequired: false,
                },
                {
                  id: randomUUID(),
                  question: "Any blockers or challenges?",
                  type: "TEXTAREA",
                  order: 2,
                  isRequired: false,
                },
              ],
            },
          },
          {
            id: randomUUID(),
            title: "Goals & Priorities",
            description: "Plan ahead",
            order: 3,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "What are your top 3 priorities for next week?",
                  type: "TEXTAREA",
                  order: 1,
                  isRequired: false,
                },
                {
                  id: randomUUID(),
                  question: "What support do you need from me?",
                  type: "TEXTAREA",
                  order: 2,
                  isRequired: false,
                },
              ],
            },
          },
        ],
      },
      },
    });
  }

  // Probation Review Template
  const existingProbation = await prisma.performanceTemplate.findFirst({
    where: { companyId: company.id, name: "Probation Review" }
  });
  
  if (!existingProbation) {
    await prisma.performanceTemplate.create({
      data: {
      id: randomUUID(),
      companyId: company.id,
      name: "Probation Review",
      description: "End of probation performance review",
      type: "PROBATION_REVIEW",
      icon: "📝",
      isDefault: true,
      isActive: true,
      tags: ["probation", "review", "onboarding"],
      visibility: "COMPANY",
      createdBy: superAdmin.id,
      sections: {
        create: [
          {
            id: randomUUID(),
            title: "Role Understanding",
            order: 1,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "How well does the employee understand their role and responsibilities?",
                  type: "RATING",
                  order: 1,
                  isRequired: true,
                  options: { min: 1, max: 5 },
                },
                {
                  id: randomUUID(),
                  question: "Comments on role clarity",
                  type: "TEXTAREA",
                  order: 2,
                  isRequired: false,
                },
              ],
            },
          },
          {
            id: randomUUID(),
            title: "Performance & Deliverables",
            order: 2,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "Quality of work delivered",
                  type: "RATING",
                  order: 1,
                  isRequired: true,
                  options: { min: 1, max: 5 },
                },
                {
                  id: randomUUID(),
                  question: "Key achievements during probation",
                  type: "TEXTAREA",
                  order: 2,
                  isRequired: false,
                },
              ],
            },
          },
          {
            id: randomUUID(),
            title: "Decision & Next Steps",
            order: 3,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "Recommendation",
                  type: "MULTIPLE_CHOICE",
                  order: 1,
                  isRequired: true,
                  options: {
                    choices: ["Pass probation", "Extend probation", "Not suitable for role"],
                  },
                },
                {
                  id: randomUUID(),
                  question: "Next steps and development goals",
                  type: "TEXTAREA",
                  order: 2,
                  isRequired: false,
                },
              ],
            },
          },
        ],
      },
      },
    });
  }

  // Quarterly Review Template
  const existingQuarterly = await prisma.performanceTemplate.findFirst({
    where: { companyId: company.id, name: "Quarterly Performance Review" }
  });
  
  if (!existingQuarterly) {
    await prisma.performanceTemplate.create({
      data: {
      id: randomUUID(),
      companyId: company.id,
      name: "Quarterly Performance Review",
      description: "Comprehensive quarterly check-in",
      type: "QUARTERLY_REVIEW",
      icon: "📊",
      isDefault: true,
      isActive: true,
      tags: ["quarterly", "review", "check-in"],
      visibility: "COMPANY",
      createdBy: superAdmin.id,
      sections: {
        create: [
          {
            id: randomUUID(),
            title: "Objectives Review",
            order: 1,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "Review progress on quarterly objectives",
                  type: "TEXTAREA",
                  order: 1,
                  isRequired: true,
                },
                {
                  id: randomUUID(),
                  question: "Overall objective completion rate",
                  type: "RATING",
                  order: 2,
                  isRequired: true,
                  options: { min: 0, max: 100, unit: "%" },
                },
              ],
            },
          },
          {
            id: randomUUID(),
            title: "Strengths & Achievements",
            order: 2,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "Key achievements this quarter",
                  type: "TEXTAREA",
                  order: 1,
                  isRequired: false,
                },
              ],
            },
          },
          {
            id: randomUUID(),
            title: "Development Areas",
            order: 3,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "Areas for improvement",
                  type: "TEXTAREA",
                  order: 1,
                  isRequired: false,
                },
              ],
            },
          },
        ],
      },
      },
    });
  }

  // Annual Review Template
  const existingAnnual = await prisma.performanceTemplate.findFirst({
    where: { companyId: company.id, name: "Annual Performance Review" }
  });
  
  if (!existingAnnual) {
    await prisma.performanceTemplate.create({
      data: {
      id: randomUUID(),
      companyId: company.id,
      name: "Annual Performance Review",
      description: "Comprehensive yearly performance review",
      type: "ANNUAL_REVIEW",
      icon: "⭐",
      isDefault: true,
      isActive: true,
      tags: ["annual", "review", "360"],
      visibility: "COMPANY",
      createdBy: superAdmin.id,
      sections: {
        create: [
          {
            id: randomUUID(),
            title: "Year in Review",
            order: 1,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "Summarize the past year's performance",
                  type: "TEXTAREA",
                  order: 1,
                  isRequired: true,
                },
                {
                  id: randomUUID(),
                  question: "Overall performance rating",
                  type: "RATING",
                  order: 2,
                  isRequired: true,
                  options: {
                    min: 1,
                    max: 5,
                    labels: ["Needs Improvement", "Meets Expectations", "Exceeds Expectations", "Outstanding", "Exceptional"],
                  },
                },
              ],
            },
          },
          {
            id: randomUUID(),
            title: "Core Competencies",
            order: 2,
            isRequired: true,
            questions: {
              create: [
                {
                  id: randomUUID(),
                  question: "Technical skills",
                  type: "RATING",
                  order: 1,
                  isRequired: true,
                  options: { min: 1, max: 5 },
                },
                {
                  id: randomUUID(),
                  question: "Communication & collaboration",
                  type: "RATING",
                  order: 2,
                  isRequired: true,
                  options: { min: 1, max: 5 },
                },
              ],
            },
          },
        ],
      },
      },
    });
  }

  console.log("✅ Performance templates seeded (4 templates created).");

  // =============== 13) Standard Survey Templates ===============
  // SKIPPED: Survey seeding requires proper Form setup first
  // TODO: Implement survey seeding with Forms when needed
  console.log("⏭️  Skipping survey templates (requires Form setup)...");

  /*
  // Pulse Survey
  const existingPulseSurvey = await prisma.survey.findFirst({
    where: { companyId: company.id, name: "Weekly Pulse Survey" }
  });
  
  if (!existingPulseSurvey) {
    await prisma.survey.create({
      data: {
      id: randomUUID(),
      companyId: company.id,
      title: "Weekly Pulse Survey",
      description: "Quick weekly check-in to measure team mood and identify issues early",
      questions: [
        {
          id: randomUUID(),
          type: "rating",
          question: "How are you feeling about work this week?",
          required: true,
          options: {
            min: 1,
            max: 5,
            labels: ["😔 Struggling", "😐 Okay", "😊 Good", "😄 Great", "🤩 Excellent"],
          },
        },
        {
          id: randomUUID(),
          type: "multipleChoice",
          question: "What's your biggest challenge right now?",
          required: false,
          options: {
            choices: [
              "Workload",
              "Communication",
              "Tools/Resources",
              "Team Collaboration",
              "Work-Life Balance",
              "Other",
            ],
          },
        },
        {
          id: randomUUID(),
          type: "text",
          question: "Anything else you'd like to share?",
          required: false,
        },
      ],
      status: "draft",
      createdBy: superAdmin.id,
      isAnonymous: false,
      updatedAt: new Date(),
      },
    });
  }

  // eNPS Survey
  const existingENPS = await prisma.survey.findFirst({
    where: { companyId: company.id, title: "Employee Net Promoter Score (eNPS)" }
  });
  
  if (!existingENPS) {
    await prisma.survey.create({
      data: {
      id: randomUUID(),
      companyId: company.id,
      title: "Employee Net Promoter Score (eNPS)",
      description: "Measure employee loyalty and likelihood to recommend working here",
      questions: [
        {
          id: randomUUID(),
          type: "rating",
          question: "On a scale of 0-10, how likely are you to recommend working here to a friend?",
          required: true,
          options: {
            min: 0,
            max: 10,
            labels: ["Not at all likely", "Extremely likely"],
          },
        },
        {
          id: randomUUID(),
          type: "text",
          question: "What's the main reason for your score?",
          required: false,
        },
        {
          id: randomUUID(),
          type: "text",
          question: "What's one thing we could improve?",
          required: false,
        },
      ],
      status: "draft",
      createdBy: superAdmin.id,
      isAnonymous: true,
      updatedAt: new Date(),
      },
    });
  }

  // Engagement Survey
  const existingEngagement = await prisma.survey.findFirst({
    where: { companyId: company.id, title: "Quarterly Engagement Survey" }
  });
  
  if (!existingEngagement) {
    await prisma.survey.create({
      data: {
      id: randomUUID(),
      companyId: company.id,
      title: "Quarterly Engagement Survey",
      description: "Comprehensive survey to measure employee engagement, satisfaction, and identify areas for improvement",
      questions: [
        {
          id: randomUUID(),
          type: "rating",
          question: "I am satisfied with my job overall",
          required: true,
          options: { min: 1, max: 5, labels: ["Strongly Disagree", "Strongly Agree"] },
        },
        {
          id: randomUUID(),
          type: "rating",
          question: "I have the tools and resources I need to do my job effectively",
          required: true,
          options: { min: 1, max: 5, labels: ["Strongly Disagree", "Strongly Agree"] },
        },
        {
          id: randomUUID(),
          type: "rating",
          question: "I feel valued and appreciated at work",
          required: true,
          options: { min: 1, max: 5, labels: ["Strongly Disagree", "Strongly Agree"] },
        },
        {
          id: randomUUID(),
          type: "rating",
          question: "My manager provides clear feedback and support",
          required: true,
          options: { min: 1, max: 5, labels: ["Strongly Disagree", "Strongly Agree"] },
        },
        {
          id: randomUUID(),
          type: "rating",
          question: "I have opportunities for growth and development",
          required: true,
          options: { min: 1, max: 5, labels: ["Strongly Disagree", "Strongly Agree"] },
        },
        {
          id: randomUUID(),
          type: "rating",
          question: "I would recommend this company as a great place to work",
          required: true,
          options: { min: 1, max: 5, labels: ["Strongly Disagree", "Strongly Agree"] },
        },
        {
          id: randomUUID(),
          type: "text",
          question: "What do you enjoy most about working here?",
          required: false,
        },
        {
          id: randomUUID(),
          type: "text",
          question: "What's one thing we could improve to make this a better workplace?",
          required: false,
        },
      ],
      status: "draft",
      createdBy: superAdmin.id,
      isAnonymous: true,
      updatedAt: new Date(),
      },
    });
  }

  */

  // =============== 14) Standard Onboarding Template ===============
  console.log("📋 Seeding onboarding templates...");

  const existingOnboardingTemplate = await prisma.onboardingTemplate.findFirst({
    where: { companyId: company.id, name: "Standard New Starter" }
  });

  if (!existingOnboardingTemplate) {
    await prisma.onboardingTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "Standard New Starter",
        description: "Comprehensive onboarding journey for all new employees",
        isDefault: true,
        isActive: true,
        version: 1,
        OnboardingStep: {
          create: [
            {
              id: randomUUID(),
              type: "INSTRUCTION",
              label: "Welcome to the Team",
              order: 1,
              instruction: "Welcome! We're excited to have you join us. This onboarding process will guide you through everything you need to get started.",
              metadata: { category: "Welcome" },
            },
            {
              id: randomUUID(),
              type: "ACKNOWLEDGE_DOCUMENT",
              label: "Employee Handbook",
              order: 2,
              instruction: "Please read and acknowledge our employee handbook which outlines company policies and procedures.",
              metadata: { category: "Documentation" },
            },
            {
              id: randomUUID(),
              type: "UPLOAD_DOCUMENT",
              label: "Upload ID Photo",
              order: 3,
              uploadType: "OTHER",
              instruction: "Please upload a professional photo for your employee profile and ID badge.",
              metadata: { category: "Documentation" },
            },
            {
              id: randomUUID(),
              type: "UPLOAD_DOCUMENT",
              label: "Right to Work Documentation",
              order: 4,
              uploadType: "RIGHT_TO_WORK",
              instruction: "Please upload documentation proving your right to work (passport, visa, etc.).",
              metadata: { category: "Compliance" },
            },
            {
              id: randomUUID(),
              type: "UPLOAD_DOCUMENT",
              label: "Bank Details",
              order: 5,
              uploadType: "OTHER",
              instruction: "Please upload a bank statement or void cheque for payroll setup.",
              metadata: { category: "Payroll" },
            },
            {
              id: randomUUID(),
              type: "INSTRUCTION",
              label: "Tax Code Declaration",
              order: 6,
              instruction: "Please complete your IR330 tax code declaration form for IRD.",
              metadata: { category: "Payroll" },
            },
            {
              id: randomUUID(),
              type: "INSTRUCTION",
              label: "KiwiSaver Enrollment",
              order: 7,
              instruction: "Review and confirm your KiwiSaver preferences. You can opt in, opt out, or choose your contribution rate.",
              metadata: { category: "Payroll" },
            },
            {
              id: randomUUID(),
              type: "EQUIPMENT_CHECKLIST",
              label: "IT Equipment Setup",
              order: 8,
              instruction: "Your IT equipment will be prepared. Please confirm receipt of all items.",
              metadata: { 
                category: "IT Setup",
                checklist: ["Laptop", "Mouse", "Keyboard", "Monitor", "Headset", "Security Badge"]
              },
            },
            {
              id: randomUUID(),
              type: "SYSTEM_ACCESS",
              label: "System Access & Accounts",
              order: 9,
              instruction: "Your accounts for company systems will be created. Please verify access to email, Teams/Slack, and other required systems.",
              metadata: { category: "IT Setup" },
            },
            {
              id: randomUUID(),
              type: "COMPLIANCE_TRAINING",
              label: "Health & Safety Induction",
              order: 10,
              instruction: "Complete the mandatory health and safety induction training.",
              metadata: { category: "Training" },
            },
            {
              id: randomUUID(),
              type: "MANAGER_CHECKIN",
              label: "Manager Introduction Meeting",
              order: 11,
              instruction: "Your manager will schedule a welcome meeting to discuss your role, expectations, and answer any questions.",
              metadata: { category: "Orientation" },
            },
            {
              id: randomUUID(),
              type: "BUDDY_INTRODUCTION",
              label: "Meet Your Buddy",
              order: 12,
              instruction: "You'll be introduced to your onboarding buddy who can help you navigate the company.",
              metadata: { category: "Orientation" },
            },
            {
              id: randomUUID(),
              type: "PROBATION_GOALS",
              label: "Set Probation Goals",
              order: 13,
              instruction: "Work with your manager to set clear goals and expectations for your probation period.",
              metadata: { category: "Performance" },
            },
            {
              id: randomUUID(),
              type: "WELCOME_SURVEY",
              label: "First Week Feedback",
              order: 14,
              instruction: "Please share your feedback on your first week experience.",
              metadata: { category: "Feedback" },
            },
          ],
        },
      },
    });
  }

  console.log("✅ Onboarding templates seeded.");

  // =============== 15) Exit Interview Form Template ===============
  console.log("📝 Seeding exit interview templates...");

  const existingExitTemplate = await prisma.exitInterviewFormTemplate.findFirst({
    where: { companyId: company.id, name: "Standard Exit Interview" }
  });

  if (!existingExitTemplate) {
    await prisma.exitInterviewFormTemplate.create({
      data: {
        id: randomUUID(),
        name: "Standard Exit Interview",
        description: "Comprehensive exit interview to gather feedback from departing employees",
        isActive: true,
        updatedAt: new Date(),
        Company: { connect: { id: company.id } },
        schemaJson: {
          sections: [
            {
              title: "Reason for Leaving",
              questions: [
                {
                  id: "reason_primary",
                  type: "multipleChoice",
                  question: "What is your primary reason for leaving?",
                  required: true,
                  options: [
                    "Career advancement opportunity",
                    "Better compensation/benefits",
                    "Work-life balance",
                    "Relocation",
                    "Management/leadership issues",
                    "Company culture",
                    "Personal reasons",
                    "Return to study",
                    "Retirement",
                    "Other"
                  ]
                },
                {
                  id: "reason_details",
                  type: "textarea",
                  question: "Please provide more details about your reason for leaving:",
                  required: false
                }
              ]
            },
            {
              title: "Job Satisfaction",
              questions: [
                {
                  id: "job_satisfaction",
                  type: "rating",
                  question: "Overall, how satisfied were you with your job?",
                  required: true,
                  min: 1,
                  max: 5,
                  labels: ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"]
                },
                {
                  id: "role_clarity",
                  type: "rating",
                  question: "How clear were the expectations and responsibilities of your role?",
                  required: true,
                  min: 1,
                  max: 5
                },
                {
                  id: "workload",
                  type: "rating",
                  question: "How manageable was your workload?",
                  required: true,
                  min: 1,
                  max: 5
                }
              ]
            },
            {
              title: "Management & Leadership",
              questions: [
                {
                  id: "manager_support",
                  type: "rating",
                  question: "How would you rate the support received from your direct manager?",
                  required: true,
                  min: 1,
                  max: 5
                },
                {
                  id: "manager_feedback",
                  type: "rating",
                  question: "How would you rate the quality and frequency of feedback from your manager?",
                  required: true,
                  min: 1,
                  max: 5
                },
                {
                  id: "leadership_confidence",
                  type: "rating",
                  question: "How confident were you in the company's leadership?",
                  required: true,
                  min: 1,
                  max: 5
                }
              ]
            },
            {
              title: "Work Environment",
              questions: [
                {
                  id: "team_collaboration",
                  type: "rating",
                  question: "How would you rate team collaboration and support?",
                  required: true,
                  min: 1,
                  max: 5
                },
                {
                  id: "company_culture",
                  type: "rating",
                  question: "How would you rate the company culture?",
                  required: true,
                  min: 1,
                  max: 5
                },
                {
                  id: "work_life_balance",
                  type: "rating",
                  question: "How satisfied were you with work-life balance?",
                  required: true,
                  min: 1,
                  max: 5
                }
              ]
            },
            {
              title: "Growth & Development",
              questions: [
                {
                  id: "career_growth",
                  type: "rating",
                  question: "How satisfied were you with career growth opportunities?",
                  required: true,
                  min: 1,
                  max: 5
                },
                {
                  id: "training_opportunities",
                  type: "rating",
                  question: "How satisfied were you with training and development opportunities?",
                  required: true,
                  min: 1,
                  max: 5
                }
              ]
            },
            {
              title: "Final Thoughts",
              questions: [
                {
                  id: "recommend_employer",
                  type: "rating",
                  question: "How likely are you to recommend this company as an employer? (0-10)",
                  required: true,
                  min: 0,
                  max: 10
                },
                {
                  id: "return_consideration",
                  type: "multipleChoice",
                  question: "Would you consider returning to this company in the future?",
                  required: true,
                  options: ["Yes, definitely", "Possibly", "Unlikely", "No"]
                },
                {
                  id: "improvements",
                  type: "textarea",
                  question: "What could the company do to improve as an employer?",
                  required: false
                },
                {
                  id: "positive_aspects",
                  type: "textarea",
                  question: "What did you enjoy most about working here?",
                  required: false
                },
                {
                  id: "additional_comments",
                  type: "textarea",
                  question: "Any other comments or feedback you'd like to share?",
                  required: false
                }
              ]
            }
          ]
        },
      },
    });
  }

  console.log("✅ Exit interview templates seeded.");

  // =============== 16) Additional Job Roles ===============
  console.log("💼 Seeding additional job roles...");

  const additionalJobRoles = [
    "Chief Executive Officer",
    "Director",
    "Team Lead",
    "Project Manager",
    "Business Analyst",
    "Data Analyst",
    "UX/UI Designer",
    "Product Manager",
    "Receptionist",
    "Office Manager",
    "Health & Safety Officer",
    "Training Coordinator",
    "Accountant",
    "Payroll Administrator",
  ];
  
  for (const name of additionalJobRoles) {
    await prisma.jobRole.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: { updatedAt: new Date() },
      create: {
        id: randomUUID(),
        name,
        companyId: company.id,
        updatedAt: new Date(),
      },
    });
  }

  console.log("✅ Additional job roles seeded.");

  // =============== 17) Training Courses & Provider ===============
  console.log("🎓 Seeding training courses and providers...");

  const internalProvider = await prisma.trainingProvider.upsert({
    where: { name: "Internal Training" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Internal Training",
      companyId: company.id,
    },
  });

  const standardCourses = [
    "Health & Safety Induction",
    "First Aid Awareness",
    "Fire Safety & Evacuation",
    "Manual Handling",
    "Privacy & Data Protection",
    "Anti-Harassment & Bullying",
    "Cybersecurity Awareness",
    "New Manager Essentials",
  ];

  for (const courseName of standardCourses) {
    await prisma.course.upsert({
      where: { name: courseName },
      update: {},
      create: {
        id: randomUUID(),
        name: courseName,
        companyId: company.id,
      },
    });
  }

  console.log("✅ Training courses and provider seeded.");

  // =============== 18) Gender Options ===============
  console.log("👤 Seeding gender options...");

  const genderOptions = [
    { key: "male", label: "Male", order: 1 },
    { key: "female", label: "Female", order: 2 },
    { key: "non_binary", label: "Non-binary", order: 3 },
    { key: "prefer_not_to_say", label: "Prefer not to say", order: 4 },
    { key: "other", label: "Other", order: 5 },
  ];

  for (const option of genderOptions) {
    await prisma.genderOption.upsert({
      where: { companyId_key: { companyId: company.id, key: option.key } },
      update: { label: option.label, order: option.order, updatedAt: new Date() },
      create: {
        id: randomUUID(),
        companyId: company.id,
        key: option.key,
        label: option.label,
        order: option.order,
        active: true,
        updatedAt: new Date(),
      },
    });
  }

  console.log("✅ Gender options seeded.");

  // =============== 19) Contract Type Options ===============
  console.log("📄 Seeding contract type options...");

  const contractTypeOptions = [
    { label: "Permanent", order: 1 },
    { label: "Fixed Term", order: 2 },
    { label: "Casual", order: 3 },
    { label: "Seasonal", order: 4 },
  ];

  for (const option of contractTypeOptions) {
    await prisma.contractTypeOption.upsert({
      where: { companyId_label: { companyId: company.id, label: option.label } },
      update: { order: option.order },
      create: {
        id: randomUUID(),
        companyId: company.id,
        label: option.label,
        order: option.order,
      },
    });
  }

  console.log("✅ Contract type options seeded.");

  // =============== 20) Approval Workflows ===============
  console.log("✅ Seeding approval workflows...");

  // Get Annual Leave category for workflows
  const annualLeaveCategory = await prisma.eventCategory.findFirst({
    where: { companyId: company.id, name: "Annual Leave" }
  });

  if (annualLeaveCategory) {
    // Standard Leave Approval - Manager only
    const existingStandardWorkflow = await prisma.approvalWorkflow.findFirst({
      where: { companyId: company.id, name: "Standard Leave Approval" }
    });

    if (!existingStandardWorkflow) {
      await prisma.approvalWorkflow.create({
        data: {
          id: randomUUID(),
          companyId: company.id,
          name: "Standard Leave Approval",
          eventCategoryId: annualLeaveCategory.id,
          scopeType: "COMPANY",
          priority: 0,
          isActive: true,
          stages: {
            create: [
              {
                id: randomUUID(),
                name: "Manager Approval",
                order: 1,
                mode: "FIRST_RESPONDER",
                approvers: {
                  create: [
                    {
                      id: randomUUID(),
                      type: "MANAGER",
                      order: 1,
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    }

    // Extended Leave Approval - Manager then HR for leave > 5 days
    const existingExtendedWorkflow = await prisma.approvalWorkflow.findFirst({
      where: { companyId: company.id, name: "Extended Leave Approval" }
    });

    if (!existingExtendedWorkflow) {
      await prisma.approvalWorkflow.create({
        data: {
          id: randomUUID(),
          companyId: company.id,
          name: "Extended Leave Approval",
          eventCategoryId: annualLeaveCategory.id,
          scopeType: "COMPANY",
          priority: 1,
          isActive: false, // Not active by default, companies can enable if needed
          stages: {
            create: [
              {
                id: randomUUID(),
                name: "Manager Approval",
                order: 1,
                mode: "FIRST_RESPONDER",
                approvers: {
                  create: [
                    {
                      id: randomUUID(),
                      type: "MANAGER",
                      order: 1,
                    },
                  ],
                },
              },
              {
                id: randomUUID(),
                name: "HR Review",
                order: 2,
                mode: "FIRST_RESPONDER",
                approvers: {
                  create: [
                    {
                      id: randomUUID(),
                      type: "USER",
                      userId: adminUser.id,
                      order: 1,
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    }
  }

  console.log("✅ Approval workflows seeded.");

  // =============== 21) Additional Performance Templates ===============
  console.log("🎯 Seeding additional performance templates...");

  // 360 Feedback Review
  const existing360 = await prisma.performanceTemplate.findFirst({
    where: { companyId: company.id, name: "360 Feedback Review" }
  });

  if (!existing360) {
    await prisma.performanceTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "360 Feedback Review",
        description: "Multi-rater feedback review gathering input from managers, peers, and direct reports",
        type: "ANNUAL_REVIEW",
        icon: "🔄",
        isDefault: false,
        isActive: true,
        tags: ["360", "feedback", "multi-rater"],
        visibility: "COMPANY",
        createdBy: superAdmin.id,
        sections: {
          create: [
            {
              id: randomUUID(),
              title: "Leadership & Influence",
              description: "Rate leadership qualities and influence",
              order: 1,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "Demonstrates strong leadership skills",
                    type: "RATING",
                    order: 1,
                    isRequired: true,
                    options: { min: 1, max: 5, labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
                  },
                  {
                    id: randomUUID(),
                    question: "Inspires and motivates others",
                    type: "RATING",
                    order: 2,
                    isRequired: true,
                    options: { min: 1, max: 5 },
                  },
                  {
                    id: randomUUID(),
                    question: "Comments on leadership",
                    type: "TEXTAREA",
                    order: 3,
                    isRequired: false,
                  },
                ],
              },
            },
            {
              id: randomUUID(),
              title: "Communication",
              description: "Evaluate communication effectiveness",
              order: 2,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "Communicates clearly and effectively",
                    type: "RATING",
                    order: 1,
                    isRequired: true,
                    options: { min: 1, max: 5 },
                  },
                  {
                    id: randomUUID(),
                    question: "Listens actively and considers others' viewpoints",
                    type: "RATING",
                    order: 2,
                    isRequired: true,
                    options: { min: 1, max: 5 },
                  },
                  {
                    id: randomUUID(),
                    question: "Provides constructive feedback",
                    type: "RATING",
                    order: 3,
                    isRequired: true,
                    options: { min: 1, max: 5 },
                  },
                ],
              },
            },
            {
              id: randomUUID(),
              title: "Teamwork & Collaboration",
              description: "Assess collaboration abilities",
              order: 3,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "Works effectively with team members",
                    type: "RATING",
                    order: 1,
                    isRequired: true,
                    options: { min: 1, max: 5 },
                  },
                  {
                    id: randomUUID(),
                    question: "Shares knowledge and helps others succeed",
                    type: "RATING",
                    order: 2,
                    isRequired: true,
                    options: { min: 1, max: 5 },
                  },
                  {
                    id: randomUUID(),
                    question: "Handles conflict constructively",
                    type: "RATING",
                    order: 3,
                    isRequired: true,
                    options: { min: 1, max: 5 },
                  },
                ],
              },
            },
            {
              id: randomUUID(),
              title: "Open Feedback",
              description: "Provide additional feedback",
              order: 4,
              isRequired: false,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "What are this person's greatest strengths?",
                    type: "TEXTAREA",
                    order: 1,
                    isRequired: false,
                  },
                  {
                    id: randomUUID(),
                    question: "What areas could they improve?",
                    type: "TEXTAREA",
                    order: 2,
                    isRequired: false,
                  },
                  {
                    id: randomUUID(),
                    question: "Any additional feedback?",
                    type: "TEXTAREA",
                    order: 3,
                    isRequired: false,
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // Goals/OKR Check-in
  const existingGoalsCheckin = await prisma.performanceTemplate.findFirst({
    where: { companyId: company.id, name: "Goals/OKR Check-in" }
  });

  if (!existingGoalsCheckin) {
    await prisma.performanceTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "Goals/OKR Check-in",
        description: "Regular check-in on goals and key results progress",
        type: "ONE_TO_ONE",
        icon: "🎯",
        isDefault: false,
        isActive: true,
        tags: ["goals", "OKR", "check-in"],
        visibility: "COMPANY",
        createdBy: superAdmin.id,
        sections: {
          create: [
            {
              id: randomUUID(),
              title: "Goals Review",
              description: "Review progress on current goals",
              order: 1,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "What progress have you made on your goals since our last check-in?",
                    type: "TEXTAREA",
                    order: 1,
                    isRequired: true,
                  },
                  {
                    id: randomUUID(),
                    question: "Overall goal completion percentage",
                    type: "RATING",
                    order: 2,
                    isRequired: true,
                    options: { min: 0, max: 100, unit: "%" },
                  },
                ],
              },
            },
            {
              id: randomUUID(),
              title: "Blockers & Support",
              description: "Identify obstacles and support needed",
              order: 2,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "What blockers or challenges are you facing?",
                    type: "TEXTAREA",
                    order: 1,
                    isRequired: false,
                  },
                  {
                    id: randomUUID(),
                    question: "What support do you need to achieve your goals?",
                    type: "TEXTAREA",
                    order: 2,
                    isRequired: false,
                  },
                ],
              },
            },
            {
              id: randomUUID(),
              title: "Next Steps",
              description: "Plan for the next period",
              order: 3,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "What are your priorities for the next check-in period?",
                    type: "TEXTAREA",
                    order: 1,
                    isRequired: true,
                  },
                  {
                    id: randomUUID(),
                    question: "Do any goals need to be adjusted?",
                    type: "TEXTAREA",
                    order: 2,
                    isRequired: false,
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // Self-Assessment Review
  const existingSelfAssessment = await prisma.performanceTemplate.findFirst({
    where: { companyId: company.id, name: "Self-Assessment" }
  });

  if (!existingSelfAssessment) {
    await prisma.performanceTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "Self-Assessment",
        description: "Employee self-reflection and assessment template",
        type: "ANNUAL_REVIEW",
        icon: "📝",
        isDefault: false,
        isActive: true,
        tags: ["self-assessment", "review", "reflection"],
        visibility: "COMPANY",
        createdBy: superAdmin.id,
        sections: {
          create: [
            {
              id: randomUUID(),
              title: "Achievements",
              description: "Reflect on your accomplishments",
              order: 1,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "What are your most significant achievements this review period?",
                    type: "TEXTAREA",
                    order: 1,
                    isRequired: true,
                  },
                  {
                    id: randomUUID(),
                    question: "How did you contribute to team/company goals?",
                    type: "TEXTAREA",
                    order: 2,
                    isRequired: true,
                  },
                ],
              },
            },
            {
              id: randomUUID(),
              title: "Skills & Growth",
              description: "Assess your skills and development",
              order: 2,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "What new skills have you developed?",
                    type: "TEXTAREA",
                    order: 1,
                    isRequired: false,
                  },
                  {
                    id: randomUUID(),
                    question: "What areas would you like to improve?",
                    type: "TEXTAREA",
                    order: 2,
                    isRequired: true,
                  },
                  {
                    id: randomUUID(),
                    question: "How would you rate your overall performance?",
                    type: "RATING",
                    order: 3,
                    isRequired: true,
                    options: { min: 1, max: 5, labels: ["Needs Improvement", "Developing", "Meets Expectations", "Exceeds Expectations", "Exceptional"] },
                  },
                ],
              },
            },
            {
              id: randomUUID(),
              title: "Career Goals",
              description: "Plan your career development",
              order: 3,
              isRequired: true,
              questions: {
                create: [
                  {
                    id: randomUUID(),
                    question: "What are your career aspirations?",
                    type: "TEXTAREA",
                    order: 1,
                    isRequired: false,
                  },
                  {
                    id: randomUUID(),
                    question: "What training or development would help you achieve your goals?",
                    type: "TEXTAREA",
                    order: 2,
                    isRequired: false,
                  },
                  {
                    id: randomUUID(),
                    question: "How can your manager better support you?",
                    type: "TEXTAREA",
                    order: 3,
                    isRequired: false,
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log("✅ Additional performance templates seeded.");

  // =============== 22) Company Settings ===============
  console.log("⚙️ Seeding company settings...");

  // Update company with NZ public holiday template
  await prisma.company.update({
    where: { id: company.id },
    data: {
      publicHolidayTemplate: "NZ",
      publicHolidayRegion: "Auckland",
    },
  });

  // Create default notification settings
  const existingNotificationSettings = await prisma.notificationSettings.findUnique({
    where: { companyId: company.id }
  });

  if (!existingNotificationSettings) {
    await prisma.notificationSettings.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        dailyDigestEnabled: false,
        weeklyDigestEnabled: true,
        digestRecipients: [],
        emailTemplateEnabled: true,
        defaultChannels: {
          leaveRequests: ["EMAIL"],
          onboarding: ["EMAIL"],
          expiryAlerts: ["EMAIL"],
          performance: ["EMAIL"],
        },
        updatedAt: new Date(),
      },
    });
  }

  // Create additional expiry rules
  const additionalExpiryRules = [
    { category: "Work Visa", daysBefore: 90, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Professional License", daysBefore: 60, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Police Check", daysBefore: 30, notifyAdmin: true, notifyManager: false, notifyEmployee: true },
    { category: "First Aid Certificate", daysBefore: 45, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
  ];

  for (const rule of additionalExpiryRules) {
    await prisma.expiryRule.upsert({
      where: { category: rule.category },
      update: {
        daysBefore: rule.daysBefore,
        notifyAdmin: rule.notifyAdmin,
        notifyManager: rule.notifyManager,
        notifyEmployee: rule.notifyEmployee,
        updatedAt: new Date(),
      },
      create: { id: randomUUID(), companyId: company.id, updatedAt: new Date(), ...rule },
    });
  }

  console.log("✅ Company settings seeded.");

  console.log("🎉 Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
