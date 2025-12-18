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
              type: "INSTRUCTION",
              label: "Company Policies",
              order: 2,
              instruction: "Please familiarise yourself with our company policies. Your manager or HR contact can provide you with the employee handbook and any other relevant documentation.",
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
              type: "PAYROLL_SETUP",
              label: "Bank & IRD Details",
              order: 5,
              instruction: "Please enter your bank account and IRD details for payroll.",
              metadata: { 
                category: "Payroll",
                instructions: "Please enter your bank account number and IRD number below so we can set up your payments correctly.",
                fields: [
                  { id: "bankAccountNumber", label: "Bank account number", type: "text", placeholder: "00-0000-0000000-00", required: true },
                  { id: "irdNumber", label: "IRD number", type: "irdNumber", placeholder: "123-456-785", required: true },
                ],
              },
            },
            {
              id: randomUUID(),
              type: "INSTRUCTION",
              label: "Onboarding Complete",
              order: 6,
              instruction: "Congratulations! You've completed your onboarding. Welcome to the team! If you have any questions, please don't hesitate to reach out to your manager or HR.",
              metadata: { category: "Complete" },
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

  // =============== 23) Additional Onboarding Templates ===============
  console.log("📋 Seeding additional onboarding templates...");

  // Technical Role Onboarding
  const existingTechOnboarding = await prisma.onboardingTemplate.findFirst({
    where: { companyId: company.id, name: "Technical Role Onboarding" }
  });

  if (!existingTechOnboarding) {
    await prisma.onboardingTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "Technical Role Onboarding",
        description: "Comprehensive onboarding for developers, engineers, and technical staff",
        isDefault: false,
        isActive: true,
        version: 1,
        OnboardingStep: {
          create: [
            { id: randomUUID(), type: "INSTRUCTION", label: "Welcome to the Tech Team", order: 1, instruction: "Welcome to our technical team! This onboarding will guide you through setting up your development environment.", metadata: { category: "Welcome" } },
            { id: randomUUID(), type: "EQUIPMENT_CHECKLIST", label: "Equipment Setup", order: 2, instruction: "Confirm receipt and setup of your technical equipment.", metadata: { category: "Equipment", items: [{ id: "laptop", label: "Laptop/Workstation", required: true }, { id: "monitors", label: "External monitors", required: false }, { id: "headset", label: "Headset for calls", required: true }] } },
            { id: randomUUID(), type: "SYSTEM_ACCESS", label: "Development Environment Access", order: 3, instruction: "Request access to development tools and repositories.", metadata: { category: "Access", systems: [{ id: "github", label: "GitHub/GitLab", required: true }, { id: "jira", label: "Jira/Project Management", required: true }, { id: "vpn", label: "VPN Access", required: true }] } },
            { id: randomUUID(), type: "UPLOAD_DOCUMENT", label: "Right to Work Documentation", order: 4, uploadType: "RIGHT_TO_WORK", instruction: "Please upload documentation proving your right to work.", metadata: { category: "Compliance" } },
            { id: randomUUID(), type: "PAYROLL_SETUP", label: "Bank & IRD Details", order: 5, instruction: "Please enter your bank account and IRD details for payroll.", metadata: { category: "Payroll", fields: [{ id: "bankAccountNumber", label: "Bank account number", type: "text", required: true }, { id: "irdNumber", label: "IRD number", type: "irdNumber", required: true }] } },
            { id: randomUUID(), type: "COMPLIANCE_TRAINING", label: "Security & Privacy Training", order: 6, instruction: "Complete mandatory security awareness and data privacy training.", metadata: { category: "Training", courses: ["Cybersecurity Awareness", "Privacy & Data Protection"] } },
            { id: randomUUID(), type: "BUDDY_INTRODUCTION", label: "Meet Your Tech Buddy", order: 7, instruction: "You'll be paired with an experienced team member who can help you navigate the codebase.", metadata: { category: "Integration" } },
            { id: randomUUID(), type: "MANAGER_CHECKIN", label: "Week 1 Technical Check-in", order: 8, instruction: "Schedule a check-in with your manager to discuss your first week.", metadata: { category: "Check-in", timing: "Week 1" } },
            { id: randomUUID(), type: "PROBATION_GOALS", label: "90-Day Technical Goals", order: 9, instruction: "Work with your manager to set your 90-day technical objectives.", metadata: { category: "Goals" } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Onboarding Complete", order: 10, instruction: "Congratulations! You've completed your technical onboarding. Welcome to the team!", metadata: { category: "Complete" } },
          ],
        },
      },
    });
  }

  // Customer-Facing Role Onboarding
  const existingCustomerOnboarding = await prisma.onboardingTemplate.findFirst({
    where: { companyId: company.id, name: "Customer-Facing Role Onboarding" }
  });

  if (!existingCustomerOnboarding) {
    await prisma.onboardingTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "Customer-Facing Role Onboarding",
        description: "Onboarding for sales, support, and customer success roles",
        isDefault: false,
        isActive: true,
        version: 1,
        OnboardingStep: {
          create: [
            { id: randomUUID(), type: "INSTRUCTION", label: "Welcome to Customer Success", order: 1, instruction: "Welcome! You'll be the face of our company to customers.", metadata: { category: "Welcome" } },
            { id: randomUUID(), type: "EQUIPMENT_CHECKLIST", label: "Equipment Setup", order: 2, instruction: "Confirm receipt of your equipment.", metadata: { category: "Equipment", items: [{ id: "laptop", label: "Laptop", required: true }, { id: "headset", label: "Professional headset", required: true }, { id: "webcam", label: "HD webcam", required: true }] } },
            { id: randomUUID(), type: "SYSTEM_ACCESS", label: "CRM & Communication Tools", order: 3, instruction: "Get access to customer management systems.", metadata: { category: "Access", systems: [{ id: "crm", label: "CRM System", required: true }, { id: "phone_system", label: "Phone System", required: true }, { id: "knowledge_base", label: "Knowledge Base", required: true }] } },
            { id: randomUUID(), type: "UPLOAD_DOCUMENT", label: "Right to Work Documentation", order: 4, uploadType: "RIGHT_TO_WORK", instruction: "Please upload documentation proving your right to work.", metadata: { category: "Compliance" } },
            { id: randomUUID(), type: "PAYROLL_SETUP", label: "Bank & IRD Details", order: 5, instruction: "Please enter your bank account and IRD details.", metadata: { category: "Payroll", fields: [{ id: "bankAccountNumber", label: "Bank account number", type: "text", required: true }, { id: "irdNumber", label: "IRD number", type: "irdNumber", required: true }] } },
            { id: randomUUID(), type: "COMPLIANCE_TRAINING", label: "Product Knowledge Training", order: 6, instruction: "Complete product training.", metadata: { category: "Training", courses: ["Product Overview", "Customer Service Excellence"] } },
            { id: randomUUID(), type: "BUDDY_INTRODUCTION", label: "Shadow an Experienced Rep", order: 7, instruction: "Shadow an experienced team member to learn best practices.", metadata: { category: "Integration" } },
            { id: randomUUID(), type: "MANAGER_CHECKIN", label: "Week 2 Performance Check-in", order: 8, instruction: "Meet with your manager to review your first customer interactions.", metadata: { category: "Check-in", timing: "Week 2" } },
            { id: randomUUID(), type: "PROBATION_GOALS", label: "90-Day Customer Success Goals", order: 9, instruction: "Set your customer satisfaction targets.", metadata: { category: "Goals" } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Onboarding Complete", order: 10, instruction: "You're ready to start helping customers! Welcome to the team!", metadata: { category: "Complete" } },
          ],
        },
      },
    });
  }

  // Manager/Leadership Onboarding
  const existingManagerOnboarding = await prisma.onboardingTemplate.findFirst({
    where: { companyId: company.id, name: "Manager/Leadership Onboarding" }
  });

  if (!existingManagerOnboarding) {
    await prisma.onboardingTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "Manager/Leadership Onboarding",
        description: "Comprehensive onboarding for managers and team leaders",
        isDefault: false,
        isActive: true,
        version: 1,
        OnboardingStep: {
          create: [
            { id: randomUUID(), type: "INSTRUCTION", label: "Welcome to Leadership", order: 1, instruction: "Welcome to our leadership team! This onboarding will help you understand your team and our processes.", metadata: { category: "Welcome" } },
            { id: randomUUID(), type: "EQUIPMENT_CHECKLIST", label: "Equipment Setup", order: 2, instruction: "Confirm receipt of your equipment.", metadata: { category: "Equipment", items: [{ id: "laptop", label: "Laptop", required: true }, { id: "headset", label: "Professional headset", required: true }] } },
            { id: randomUUID(), type: "SYSTEM_ACCESS", label: "Management Systems Access", order: 3, instruction: "Get access to HR, finance, and management tools.", metadata: { category: "Access", systems: [{ id: "hris", label: "HRIS (PeopleCore)", required: true }, { id: "finance", label: "Budget/Finance System", required: true }, { id: "approval", label: "Approval Workflows", required: true }] } },
            { id: randomUUID(), type: "UPLOAD_DOCUMENT", label: "Right to Work Documentation", order: 4, uploadType: "RIGHT_TO_WORK", instruction: "Please upload documentation proving your right to work.", metadata: { category: "Compliance" } },
            { id: randomUUID(), type: "PAYROLL_SETUP", label: "Bank & IRD Details", order: 5, instruction: "Please enter your bank account and IRD details.", metadata: { category: "Payroll", fields: [{ id: "bankAccountNumber", label: "Bank account number", type: "text", required: true }, { id: "irdNumber", label: "IRD number", type: "irdNumber", required: true }] } },
            { id: randomUUID(), type: "COMPLIANCE_TRAINING", label: "Leadership & Compliance Training", order: 6, instruction: "Complete mandatory training for people managers.", metadata: { category: "Training", courses: ["New Manager Essentials", "Anti-Harassment & Bullying", "Health & Safety Induction"] } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Meet Your Team", order: 7, instruction: "Schedule 1-2-1 meetings with each of your direct reports.", metadata: { category: "Integration" } },
            { id: randomUUID(), type: "MANAGER_CHECKIN", label: "Week 1 Leadership Check-in", order: 8, instruction: "Meet with your manager to discuss team dynamics and priorities.", metadata: { category: "Check-in", timing: "Week 1" } },
            { id: randomUUID(), type: "PROBATION_GOALS", label: "90-Day Leadership Goals", order: 9, instruction: "Define your leadership objectives.", metadata: { category: "Goals" } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Onboarding Complete", order: 10, instruction: "You're set up for success! Welcome to the leadership team!", metadata: { category: "Complete" } },
          ],
        },
      },
    });
  }

  // Remote Worker Onboarding
  const existingRemoteOnboarding = await prisma.onboardingTemplate.findFirst({
    where: { companyId: company.id, name: "Remote Worker Onboarding" }
  });

  if (!existingRemoteOnboarding) {
    await prisma.onboardingTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "Remote Worker Onboarding",
        description: "Onboarding tailored for fully remote employees",
        isDefault: false,
        isActive: true,
        version: 1,
        OnboardingStep: {
          create: [
            { id: randomUUID(), type: "INSTRUCTION", label: "Welcome to Remote Work", order: 1, instruction: "Welcome! As a remote worker, we'll ensure you have everything you need to be productive from day one.", metadata: { category: "Welcome" } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Equipment Shipping Confirmation", order: 2, instruction: "Your equipment has been shipped. Please confirm delivery and setup.", metadata: { category: "Equipment" } },
            { id: randomUUID(), type: "EQUIPMENT_CHECKLIST", label: "Home Office Setup", order: 3, instruction: "Confirm your home office equipment is set up.", metadata: { category: "Equipment", items: [{ id: "laptop", label: "Laptop received and working", required: true }, { id: "headset", label: "Headset for video calls", required: true }, { id: "internet", label: "Stable internet connection", required: true }] } },
            { id: randomUUID(), type: "SYSTEM_ACCESS", label: "Remote Access Setup", order: 4, instruction: "Set up secure remote access.", metadata: { category: "Access", systems: [{ id: "vpn", label: "VPN Connection", required: true }, { id: "email", label: "Company Email", required: true }, { id: "slack", label: "Slack/Teams", required: true }] } },
            { id: randomUUID(), type: "UPLOAD_DOCUMENT", label: "Right to Work Documentation", order: 5, uploadType: "RIGHT_TO_WORK", instruction: "Please upload documentation proving your right to work.", metadata: { category: "Compliance" } },
            { id: randomUUID(), type: "PAYROLL_SETUP", label: "Bank & IRD Details", order: 6, instruction: "Please enter your bank account and IRD details.", metadata: { category: "Payroll", fields: [{ id: "bankAccountNumber", label: "Bank account number", type: "text", required: true }, { id: "irdNumber", label: "IRD number", type: "irdNumber", required: true }] } },
            { id: randomUUID(), type: "COMPLIANCE_TRAINING", label: "Remote Work & Security Training", order: 7, instruction: "Complete training on remote work best practices.", metadata: { category: "Training", courses: ["Cybersecurity Awareness", "Remote Work Best Practices"] } },
            { id: randomUUID(), type: "BUDDY_INTRODUCTION", label: "Virtual Buddy Introduction", order: 8, instruction: "You'll be paired with a buddy for virtual support.", metadata: { category: "Integration" } },
            { id: randomUUID(), type: "MANAGER_CHECKIN", label: "Week 1 Remote Check-in", order: 9, instruction: "Video call with your manager to ensure you're settled.", metadata: { category: "Check-in", timing: "Week 1" } },
            { id: randomUUID(), type: "PROBATION_GOALS", label: "90-Day Goals", order: 10, instruction: "Set your objectives with clear deliverables.", metadata: { category: "Goals" } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Onboarding Complete", order: 11, instruction: "You're all set for remote success! Welcome to the team!", metadata: { category: "Complete" } },
          ],
        },
      },
    });
  }

  // Contractor/Temp Onboarding
  const existingContractorOnboarding = await prisma.onboardingTemplate.findFirst({
    where: { companyId: company.id, name: "Contractor/Temporary Staff Onboarding" }
  });

  if (!existingContractorOnboarding) {
    await prisma.onboardingTemplate.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: "Contractor/Temporary Staff Onboarding",
        description: "Streamlined onboarding for contractors and temporary workers",
        isDefault: false,
        isActive: true,
        version: 1,
        OnboardingStep: {
          create: [
            { id: randomUUID(), type: "INSTRUCTION", label: "Welcome - Contractor Onboarding", order: 1, instruction: "Welcome! This streamlined onboarding will get you set up quickly.", metadata: { category: "Welcome" } },
            { id: randomUUID(), type: "ACKNOWLEDGE_DOCUMENT", label: "Contract Agreement", order: 2, instruction: "Please review and acknowledge your contractor agreement.", metadata: { category: "Compliance" } },
            { id: randomUUID(), type: "SYSTEM_ACCESS", label: "Project-Specific Access", order: 3, instruction: "Request access to systems required for your project.", metadata: { category: "Access", systems: [{ id: "project_tools", label: "Project Management Tools", required: true }] } },
            { id: randomUUID(), type: "UPLOAD_DOCUMENT", label: "Right to Work & Insurance", order: 4, uploadType: "RIGHT_TO_WORK", instruction: "Upload your right to work documentation.", metadata: { category: "Compliance" } },
            { id: randomUUID(), type: "PAYROLL_SETUP", label: "Payment Details", order: 5, instruction: "Enter your bank details for invoice payments.", metadata: { category: "Payroll", fields: [{ id: "bankAccountNumber", label: "Bank account number", type: "text", required: true }, { id: "gstNumber", label: "GST number (if registered)", type: "text", required: false }] } },
            { id: randomUUID(), type: "COMPLIANCE_TRAINING", label: "Essential Compliance", order: 6, instruction: "Complete mandatory health & safety training.", metadata: { category: "Training", courses: ["Health & Safety Induction", "Privacy & Data Protection"] } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Project Briefing", order: 7, instruction: "Your project manager will brief you on scope and deliverables.", metadata: { category: "Integration" } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Onboarding Complete", order: 8, instruction: "You're ready to start! Contact your project manager if you have questions.", metadata: { category: "Complete" } },
          ],
        },
      },
    });
  }

  console.log("✅ Additional onboarding templates seeded (5 templates).");

  // Continue with more seed data in next section...
  await seedEventSubcategories(prisma, company.id);
  await seedFormTemplates(prisma, company.id);
  await seedShiftTemplates(prisma, company.id);
  await seedTimeTrackingSettings(prisma, company.id);
  await seedLeavePolicies(prisma, company.id);
  await seedIndustryJobRoles(prisma, company.id);
  await seedAdditionalCourses(prisma, company.id);
  await seedBrandingConfiguration(prisma, company.id);
  await seedAdditionalExitTemplates(prisma, company.id);
  await seedNotificationPreferences(prisma, company.id);
  await seedJourneyTemplates(prisma, company.id, adminUser.id);
  await seedAutomationRuleTemplates(prisma, company.id, adminUser.id);

  console.log("🎉 Seed complete.");
}

// =============== Helper Functions for Additional Seed Data ===============

async function seedEventSubcategories(prisma: PrismaClient, companyId: string) {
  console.log("📂 Seeding event subcategories...");

  const sicknessCategory = await prisma.eventCategory.findFirst({
    where: { companyId, name: "Sickness" }
  });
  const bereavementCategory = await prisma.eventCategory.findFirst({
    where: { companyId, name: "Bereavement Leave" }
  });
  const trainingCategory = await prisma.eventCategory.findFirst({
    where: { companyId, name: "Training" }
  });

  if (sicknessCategory) {
    const sicknessSubcategories = [
      "Cold/Flu", "COVID-19", "Mental Health Day", "Injury", "Medical Appointment",
      "Family Illness (Caring)", "Migraine/Headache", "Stomach/Digestive", "Other Illness"
    ];
    for (const name of sicknessSubcategories) {
      await prisma.eventSubcategory.upsert({
        where: { companyId_name: { companyId, name } },
        update: { updatedAt: new Date() },
        create: { id: randomUUID(), name, eventCategoryId: sicknessCategory.id, companyId, defaultPaidStatus: "PAID", isActive: true, updatedAt: new Date() },
      });
    }
  }

  if (bereavementCategory) {
    const bereavementSubcategories = [
      "Spouse/Partner", "Parent", "Child", "Sibling", "Grandparent",
      "Grandchild", "Parent-in-law", "Extended Family (1 day)", "Close Friend/Colleague"
    ];
    for (const name of bereavementSubcategories) {
      await prisma.eventSubcategory.upsert({
        where: { companyId_name: { companyId, name } },
        update: { updatedAt: new Date() },
        create: { id: randomUUID(), name, eventCategoryId: bereavementCategory.id, companyId, defaultPaidStatus: "PAID", isActive: true, updatedAt: new Date() },
      });
    }
  }

  if (trainingCategory) {
    const trainingSubcategories = [
      "Internal Training", "External Course", "Conference/Seminar",
      "Certification Exam", "Workshop", "Online Learning"
    ];
    for (const name of trainingSubcategories) {
      await prisma.eventSubcategory.upsert({
        where: { companyId_name: { companyId, name } },
        update: { updatedAt: new Date() },
        create: { id: randomUUID(), name, eventCategoryId: trainingCategory.id, companyId, defaultPaidStatus: "PAID", isActive: true, updatedAt: new Date() },
      });
    }
  }

  console.log("✅ Event subcategories seeded.");
}

async function seedFormTemplates(prisma: PrismaClient, companyId: string) {
  console.log("📝 Seeding form templates...");

  const formTemplates = [
    { name: "Personal Details Update", slug: "personal-details-update", description: "Request to update personal information", formType: "FORM" as const, transactionalEnabled: true, schema: { pages: [{ title: "Personal Details Update", fields: [{ id: "field_type", type: "select", label: "What would you like to update?", required: true, options: ["Address", "Phone Number", "Emergency Contact", "Name Change", "Other"] }, { id: "current_value", type: "text", label: "Current Value", required: true }, { id: "new_value", type: "text", label: "New Value", required: true }, { id: "effective_date", type: "date", label: "Effective Date", required: true }] }] } },
    { name: "Emergency Contact Form", slug: "emergency-contact", description: "Add or update emergency contact information", formType: "FORM" as const, transactionalEnabled: false, schema: { pages: [{ title: "Emergency Contact Details", fields: [{ id: "contact_name", type: "text", label: "Contact Name", required: true }, { id: "relationship", type: "select", label: "Relationship", required: true, options: ["Spouse/Partner", "Parent", "Sibling", "Child", "Friend", "Other"] }, { id: "phone_primary", type: "phone", label: "Primary Phone", required: true }, { id: "email", type: "email", label: "Email Address", required: false }] }] } },
    { name: "Equipment Request Form", slug: "equipment-request", description: "Request new equipment or replacement", formType: "FORM" as const, transactionalEnabled: true, schema: { pages: [{ title: "Equipment Request", fields: [{ id: "request_type", type: "select", label: "Request Type", required: true, options: ["New Equipment", "Replacement", "Upgrade", "Repair"] }, { id: "equipment_type", type: "select", label: "Equipment Type", required: true, options: ["Laptop", "Monitor", "Keyboard/Mouse", "Headset", "Phone", "Chair", "Desk", "Other"] }, { id: "description", type: "textarea", label: "Description", required: true }, { id: "justification", type: "textarea", label: "Business Justification", required: true }] }] } },
    { name: "Training Request Form", slug: "training-request", description: "Request approval for training", formType: "FORM" as const, transactionalEnabled: true, schema: { pages: [{ title: "Training Request", fields: [{ id: "training_name", type: "text", label: "Training/Course Name", required: true }, { id: "provider", type: "text", label: "Training Provider", required: true }, { id: "start_date", type: "date", label: "Start Date", required: true }, { id: "cost", type: "number", label: "Cost (NZD)", required: true }, { id: "business_benefit", type: "textarea", label: "Business Benefit", required: true }] }] } },
    { name: "Flexible Working Request", slug: "flexible-working-request", description: "Request flexible working arrangements", formType: "FORM" as const, transactionalEnabled: true, schema: { pages: [{ title: "Flexible Working Request", fields: [{ id: "request_type", type: "select", label: "Type of Flexibility", required: true, options: ["Work from Home", "Compressed Hours", "Part-Time", "Flexible Start/End Times", "Other"] }, { id: "proposed_arrangement", type: "textarea", label: "Proposed Arrangement", required: true }, { id: "start_date", type: "date", label: "Proposed Start Date", required: true }, { id: "reason", type: "textarea", label: "Reason for Request", required: true }] }] } },
    { name: "Expense Claim Form", slug: "expense-claim", description: "Submit expense reimbursement claims", formType: "FORM" as const, transactionalEnabled: true, schema: { pages: [{ title: "Expense Claim", fields: [{ id: "expense_date", type: "date", label: "Date of Expense", required: true }, { id: "category", type: "select", label: "Category", required: true, options: ["Travel", "Accommodation", "Meals", "Office Supplies", "Client Entertainment", "Training", "Other"] }, { id: "description", type: "text", label: "Description", required: true }, { id: "amount", type: "number", label: "Amount (NZD)", required: true }] }] } },
    { name: "New Starter Checklist", slug: "new-starter-checklist", description: "Manager checklist for new employee setup", formType: "DATA_SCREEN" as const, transactionalEnabled: false, schema: { pages: [{ title: "New Starter Setup Checklist", fields: [{ id: "desk_assigned", type: "checkbox", label: "Desk/workspace assigned", required: false }, { id: "equipment_ordered", type: "checkbox", label: "Equipment ordered", required: false }, { id: "email_created", type: "checkbox", label: "Email account created", required: false }, { id: "systems_access", type: "checkbox", label: "System access requested", required: false }, { id: "team_notified", type: "checkbox", label: "Team notified", required: false }, { id: "buddy_assigned", type: "checkbox", label: "Buddy assigned", required: false }] }] } },
  ];

  for (const form of formTemplates) {
    const existing = await prisma.form.findFirst({ where: { companyId, slug: form.slug } });
    if (!existing) {
      await prisma.form.create({
        data: { id: randomUUID(), companyId, name: form.name, slug: form.slug, description: form.description, formType: form.formType, transactionalEnabled: form.transactionalEnabled, schema: form.schema, isActive: true, updatedAt: new Date() },
      });
    }
  }

  console.log("✅ Form templates seeded (7 forms).");
}

async function seedShiftTemplates(prisma: PrismaClient, companyId: string) {
  console.log("⏰ Seeding shift templates...");

  const shiftTemplates = [
    { name: "Morning Shift", startTime: "06:00", endTime: "14:00", breakDuration: 30 },
    { name: "Day Shift", startTime: "09:00", endTime: "17:00", breakDuration: 60 },
    { name: "Afternoon Shift", startTime: "14:00", endTime: "22:00", breakDuration: 30 },
    { name: "Night Shift", startTime: "22:00", endTime: "06:00", breakDuration: 30 },
    { name: "Early Start", startTime: "07:00", endTime: "15:00", breakDuration: 30 },
    { name: "Late Start", startTime: "10:00", endTime: "18:00", breakDuration: 60 },
    { name: "Half Day AM", startTime: "09:00", endTime: "13:00", breakDuration: 0 },
    { name: "Half Day PM", startTime: "13:00", endTime: "17:00", breakDuration: 0 },
  ];

  for (const shift of shiftTemplates) {
    const existing = await prisma.shiftTemplate.findFirst({ where: { companyId, name: shift.name } });
    if (!existing) {
      await prisma.shiftTemplate.create({
        data: { id: randomUUID(), companyId, name: shift.name, startTime: shift.startTime, endTime: shift.endTime, breakDuration: shift.breakDuration, updatedAt: new Date() },
      });
    }
  }

  console.log("✅ Shift templates seeded (8 templates).");
}

async function seedTimeTrackingSettings(prisma: PrismaClient, companyId: string) {
  console.log("⚙️ Seeding time tracking settings...");

  const existing = await prisma.timeTrackingSettings.findUnique({ where: { companyId } });
  if (!existing) {
    await prisma.timeTrackingSettings.create({
      data: {
        id: randomUUID(), companyId, requireGpsLocation: false, photoRequirement: "NONE", allowMobileClock: true,
        allowManualTimeEntry: true, allowManualEntry: true, requirePhotos: false, enableGeofencing: false,
        geofenceRadius: 100, roundClockTimes: "NONE", requireBreaks: true, minBreakDuration: 30,
        timesheetPeriod: "WEEKLY", periodStartDay: "MONDAY", autoSubmit: false, allowEditAfterSubmit: false,
        autoSchedulingEnabled: false, publishDaysAdvance: 7, requireShiftConfirmation: false, allowShiftSwaps: true,
        managerApprovalSwaps: true, minimumRestHours: 11, includeOvertimeExport: true, overtimeThreshold: 40.00,
        overtimeMultiplier: 1.50, overtimeCalculationMode: "WEEKLY", autoApplyOvertime: true,
        allowManualOvertimeEntry: true, blockOvertimeDuringHours: true, requireOvertimeApproval: false,
        publicHolidayMultiplier: 1.50, enableOvertimeBreakdown: true, payrollExportFormat: "CSV",
        includeBreaks: true, includeNotes: true, updatedAt: new Date(),
      },
    });
  }

  console.log("✅ Time tracking settings seeded.");
}

async function seedLeavePolicies(prisma: PrismaClient, companyId: string) {
  console.log("📅 Seeding leave policies...");

  const annualLeaveCategory = await prisma.eventCategory.findFirst({ where: { companyId, name: "Annual Leave" } });

  if (annualLeaveCategory) {
    const existingStandard = await prisma.leavePolicy.findFirst({ where: { companyId, name: "Standard Annual Leave - 20 Days" } });
    if (!existingStandard) {
      await prisma.leavePolicy.create({
        data: {
          id: randomUUID(), companyId, name: "Standard Annual Leave - 20 Days",
          description: "NZ statutory minimum of 4 weeks (20 days) annual leave per year",
          eventCategoryId: annualLeaveCategory.id, isActive: true, effectiveFrom: new Date("2024-01-01"),
          accrualRate: 20, accrualPeriod: "ANNUALLY", accrualUnit: "DAYS", enableProration: true,
          prorationMethod: "DAILY", allowNegativeBalance: false, updatedAt: new Date(),
        },
      });
    }

    const existingEnhanced = await prisma.leavePolicy.findFirst({ where: { companyId, name: "Enhanced Annual Leave - 25 Days" } });
    if (!existingEnhanced) {
      await prisma.leavePolicy.create({
        data: {
          id: randomUUID(), companyId, name: "Enhanced Annual Leave - 25 Days",
          description: "Enhanced leave entitlement for senior roles (5 weeks per year)",
          eventCategoryId: annualLeaveCategory.id, isActive: true, effectiveFrom: new Date("2024-01-01"),
          accrualRate: 25, accrualPeriod: "ANNUALLY", accrualUnit: "DAYS", enableProration: true,
          prorationMethod: "DAILY", allowNegativeBalance: false,
          serviceLengthTiers: [{ yearsOfService: 0, entitlement: 25 }, { yearsOfService: 5, entitlement: 27 }, { yearsOfService: 10, entitlement: 30 }],
          updatedAt: new Date(),
        },
      });
    }
  }

  console.log("✅ Leave policies seeded.");
}

async function seedIndustryJobRoles(prisma: PrismaClient, companyId: string) {
  console.log("💼 Seeding industry-specific job roles...");

  const industryJobRoles = [
    "Registered Nurse", "Care Assistant", "Practice Manager", "Medical Receptionist",
    "Chef", "Sous Chef", "Barista", "Front of House Manager", "Restaurant Manager",
    "Store Manager", "Sales Associate", "Visual Merchandiser", "Stock Controller",
    "Site Manager", "Quantity Surveyor", "Site Supervisor", "Foreman",
    "Consultant", "Senior Consultant", "Principal Consultant", "Associate Director",
    "Junior Developer", "Senior Developer", "Tech Lead", "DevOps Engineer", "QA Engineer", "Scrum Master",
  ];

  for (const name of industryJobRoles) {
    await prisma.jobRole.upsert({
      where: { companyId_name: { companyId, name } },
      update: { updatedAt: new Date() },
      create: { id: randomUUID(), name, companyId, updatedAt: new Date() },
    });
  }

  console.log("✅ Industry-specific job roles seeded (28 roles).");
}

async function seedAdditionalCourses(prisma: PrismaClient, companyId: string) {
  console.log("🎓 Seeding additional training courses...");

  const additionalCourses = [
    "Workplace Diversity & Inclusion", "Mental Health Awareness", "Leadership Fundamentals",
    "Project Management Basics", "Time Management", "Effective Communication",
    "Conflict Resolution", "Customer Service Excellence", "GDPR/Privacy Compliance",
    "Environmental Awareness", "Remote Work Best Practices", "Presentation Skills",
  ];

  for (const courseName of additionalCourses) {
    await prisma.course.upsert({
      where: { name: courseName },
      update: {},
      create: { id: randomUUID(), name: courseName, companyId },
    });
  }

  console.log("✅ Additional training courses seeded (12 courses).");
}

async function seedBrandingConfiguration(prisma: PrismaClient, companyId: string) {
  console.log("🎨 Seeding branding configuration...");

  const existing = await prisma.brandingConfiguration.findUnique({ where: { companyId } });
  if (!existing) {
    await prisma.brandingConfiguration.create({
      data: {
        id: randomUUID(), companyId, enabled: true, primaryColor: "#4F46E5",
        secondaryColor: "#10B981", accentColor: "#F59E0B", emailHeaderEnabled: true,
        emailFooterEnabled: true, emailFooterText: "© 2024 PeopleCore. All rights reserved.",
        updatedAt: new Date(),
      },
    });
  }

  console.log("✅ Branding configuration seeded.");
}

async function seedAdditionalExitTemplates(prisma: PrismaClient, companyId: string) {
  console.log("📝 Seeding additional exit interview templates...");

  const existingQuickExit = await prisma.exitInterviewFormTemplate.findFirst({ where: { companyId, name: "Quick Exit Survey" } });
  if (!existingQuickExit) {
    await prisma.exitInterviewFormTemplate.create({
      data: {
        id: randomUUID(), name: "Quick Exit Survey", description: "Brief exit survey for short-tenure employees",
        isActive: true, updatedAt: new Date(), Company: { connect: { id: companyId } },
        schemaJson: { sections: [{ title: "Quick Feedback", questions: [
          { id: "reason_leaving", type: "multipleChoice", question: "Primary reason for leaving?", required: true, options: ["Better opportunity", "Personal reasons", "Relocation", "Career change", "Compensation", "Management", "Culture fit", "Other"] },
          { id: "overall_experience", type: "rating", question: "Overall experience working here?", required: true, min: 1, max: 5 },
          { id: "recommend", type: "multipleChoice", question: "Would you recommend us as an employer?", required: true, options: ["Yes", "Maybe", "No"] },
          { id: "feedback", type: "textarea", question: "Any final feedback?", required: false }
        ]}] },
      },
    });
  }

  const existingManagerExit = await prisma.exitInterviewFormTemplate.findFirst({ where: { companyId, name: "Manager/Leadership Exit Interview" } });
  if (!existingManagerExit) {
    await prisma.exitInterviewFormTemplate.create({
      data: {
        id: randomUUID(), name: "Manager/Leadership Exit Interview", description: "Comprehensive exit interview for departing managers",
        isActive: true, updatedAt: new Date(), Company: { connect: { id: companyId } },
        schemaJson: { sections: [
          { title: "Leadership Experience", questions: [
            { id: "reason_leaving", type: "multipleChoice", question: "Primary reason for leaving?", required: true, options: ["Career advancement", "Better compensation", "Work-life balance", "Strategic direction disagreement", "Organizational changes", "Personal reasons", "Other"] },
            { id: "leadership_support", type: "rating", question: "How supported did you feel as a leader?", required: true, min: 1, max: 5 },
          ]},
          { title: "Team & Culture", questions: [
            { id: "team_concerns", type: "textarea", question: "Any concerns about your team we should be aware of?", required: false },
            { id: "succession", type: "textarea", question: "Recommendations for your successor?", required: false },
          ]},
          { title: "Strategic Feedback", questions: [
            { id: "improvements", type: "textarea", question: "What would you change about how the company operates?", required: false },
            { id: "return_consideration", type: "multipleChoice", question: "Would you consider returning?", required: true, options: ["Yes, definitely", "Possibly", "Unlikely", "No"] },
          ]},
        ] },
      },
    });
  }

  console.log("✅ Additional exit interview templates seeded (2 templates).");
}

async function seedNotificationPreferences(prisma: PrismaClient, companyId: string) {
  console.log("🔔 Seeding transactional notification preferences...");

  const notificationSections = [
    { section: "personal-info", notifyAdmin: true, notifyManager: false, notifyEmployee: true },
    { section: "employment-checks", notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { section: "driver-licence", notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { section: "training", notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { section: "emergency-contacts", notifyAdmin: false, notifyManager: false, notifyEmployee: true },
    { section: "payroll-details", notifyAdmin: true, notifyManager: false, notifyEmployee: true },
    { section: "leave-balances", notifyAdmin: true, notifyManager: true, notifyEmployee: true },
  ];

  for (const pref of notificationSections) {
    await prisma.transactionalNotificationPreference.upsert({
      where: { companyId_section: { companyId, section: pref.section } },
      update: { notifyAdmin: pref.notifyAdmin, notifyManager: pref.notifyManager, notifyEmployee: pref.notifyEmployee },
      create: { id: randomUUID(), companyId, section: pref.section, notifyAdmin: pref.notifyAdmin, notifyManager: pref.notifyManager, notifyEmployee: pref.notifyEmployee },
    });
  }

  console.log("✅ Transactional notification preferences seeded.");
}

async function seedJourneyTemplates(prisma: PrismaClient, companyId: string, createdBy: string) {
  console.log("🗺️ Seeding journey templates...");

  // Standard Onboarding Journey
  const existingOnboardingJourney = await prisma.journeyTemplate.findFirst({
    where: { companyId, name: "Standard Employee Onboarding Journey" }
  });

  if (!existingOnboardingJourney) {
    const journeyId = randomUUID();
    await prisma.journeyTemplate.create({
      data: {
        id: journeyId,
        companyId,
        name: "Standard Employee Onboarding Journey",
        description: "Comprehensive 90-day onboarding journey for new employees",
        persona: "New Hire",
        duration: 90,
        businessGoals: ["Reduce time-to-productivity", "Improve new hire retention", "Ensure compliance completion"],
        status: "PUBLISHED",
        version: 1,
        isTemplate: true,
        category: "Onboarding",
        tags: ["onboarding", "new-hire", "standard"],
        createdBy,
        publishedAt: new Date(),
        phases: {
          create: [
            {
              id: randomUUID(),
              name: "Pre-boarding",
              description: "Activities before the employee's first day",
              order: 1,
              duration: 7,
              phaseType: "SEQUENTIAL",
              isRequired: true,
              experienceBlocks: {
                create: [
                  { id: randomUUID(), name: "Welcome Email", description: "Send welcome email with first day details", blockType: "COMMUNICATION", order: 1, estimatedDuration: 1, isRequired: true, responsibleRole: "HR" },
                  { id: randomUUID(), name: "Equipment Setup", description: "Prepare workstation and equipment", blockType: "TASK", order: 2, estimatedDuration: 4, isRequired: true, responsibleRole: "IT" },
                  { id: randomUUID(), name: "System Access Provisioning", description: "Create accounts and access permissions", blockType: "AUTOMATION", order: 3, estimatedDuration: 2, isRequired: true, responsibleRole: "IT" },
                ],
              },
            },
            {
              id: randomUUID(),
              name: "First Week",
              description: "Orientation and initial setup",
              order: 2,
              duration: 5,
              phaseType: "SEQUENTIAL",
              isRequired: true,
              experienceBlocks: {
                create: [
                  { id: randomUUID(), name: "Day 1 Welcome Meeting", description: "In-person or virtual welcome with manager", blockType: "MEETING", order: 1, estimatedDuration: 2, isRequired: true, responsibleRole: "Manager" },
                  { id: randomUUID(), name: "HR Paperwork", description: "Complete employment forms and documentation", blockType: "FORM", order: 2, estimatedDuration: 2, isRequired: true, responsibleRole: "HR" },
                  { id: randomUUID(), name: "Team Introduction", description: "Meet team members and key stakeholders", blockType: "MEETING", order: 3, estimatedDuration: 2, isRequired: true, responsibleRole: "Manager" },
                  { id: randomUUID(), name: "Compliance Training", description: "Complete mandatory compliance courses", blockType: "TRAINING", order: 4, estimatedDuration: 4, isRequired: true, responsibleRole: "Employee" },
                  { id: randomUUID(), name: "Buddy Assignment", description: "Introduce onboarding buddy", blockType: "TASK", order: 5, estimatedDuration: 1, isRequired: false, responsibleRole: "HR" },
                ],
              },
            },
            {
              id: randomUUID(),
              name: "First Month",
              description: "Role-specific training and integration",
              order: 3,
              duration: 30,
              phaseType: "PARALLEL",
              isRequired: true,
              experienceBlocks: {
                create: [
                  { id: randomUUID(), name: "Role-Specific Training", description: "Complete job-specific training modules", blockType: "TRAINING", order: 1, estimatedDuration: 16, isRequired: true, responsibleRole: "Manager" },
                  { id: randomUUID(), name: "30-Day Check-in", description: "Manager check-in to review progress", blockType: "MEETING", order: 2, estimatedDuration: 1, isRequired: true, responsibleRole: "Manager" },
                  { id: randomUUID(), name: "Onboarding Survey", description: "Collect feedback on onboarding experience", blockType: "SURVEY", order: 3, estimatedDuration: 1, isRequired: true, responsibleRole: "Employee" },
                ],
              },
            },
            {
              id: randomUUID(),
              name: "Probation Period",
              description: "Performance monitoring and goal setting",
              order: 4,
              duration: 60,
              phaseType: "SEQUENTIAL",
              isRequired: true,
              experienceBlocks: {
                create: [
                  { id: randomUUID(), name: "60-Day Review", description: "Mid-probation performance review", blockType: "MEETING", order: 1, estimatedDuration: 2, isRequired: true, responsibleRole: "Manager" },
                  { id: randomUUID(), name: "Goal Setting", description: "Set 90-day objectives", blockType: "FORM", order: 2, estimatedDuration: 2, isRequired: true, responsibleRole: "Manager" },
                  { id: randomUUID(), name: "90-Day Review", description: "End of probation review", blockType: "APPROVAL", order: 3, estimatedDuration: 2, isRequired: true, responsibleRole: "Manager" },
                  { id: randomUUID(), name: "Onboarding Complete", description: "Mark onboarding as complete", blockType: "MILESTONE", order: 4, estimatedDuration: 1, isRequired: true, responsibleRole: "HR" },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // Manager Onboarding Journey
  const existingManagerJourney = await prisma.journeyTemplate.findFirst({
    where: { companyId, name: "Manager Onboarding Journey" }
  });

  if (!existingManagerJourney) {
    const journeyId = randomUUID();
    await prisma.journeyTemplate.create({
      data: {
        id: journeyId,
        companyId,
        name: "Manager Onboarding Journey",
        description: "Extended onboarding journey for new managers with leadership focus",
        persona: "Manager",
        duration: 120,
        businessGoals: ["Accelerate leadership effectiveness", "Build team relationships", "Ensure policy compliance"],
        status: "PUBLISHED",
        version: 1,
        isTemplate: true,
        category: "Onboarding",
        tags: ["onboarding", "manager", "leadership"],
        createdBy,
        publishedAt: new Date(),
        phases: {
          create: [
            {
              id: randomUUID(),
              name: "Leadership Orientation",
              description: "Introduction to leadership responsibilities",
              order: 1,
              duration: 14,
              phaseType: "SEQUENTIAL",
              isRequired: true,
              experienceBlocks: {
                create: [
                  { id: randomUUID(), name: "Leadership Welcome", description: "Executive welcome and vision alignment", blockType: "MEETING", order: 1, estimatedDuration: 2, isRequired: true, responsibleRole: "Executive" },
                  { id: randomUUID(), name: "HR Systems Training", description: "Training on people management systems", blockType: "TRAINING", order: 2, estimatedDuration: 4, isRequired: true, responsibleRole: "HR" },
                  { id: randomUUID(), name: "Budget & Finance Overview", description: "Introduction to budget management", blockType: "TRAINING", order: 3, estimatedDuration: 2, isRequired: true, responsibleRole: "Finance" },
                  { id: randomUUID(), name: "Team 1:1 Meetings", description: "Individual meetings with each team member", blockType: "MEETING", order: 4, estimatedDuration: 8, isRequired: true, responsibleRole: "Manager" },
                ],
              },
            },
            {
              id: randomUUID(),
              name: "Leadership Development",
              description: "Core leadership training and development",
              order: 2,
              duration: 30,
              phaseType: "PARALLEL",
              isRequired: true,
              experienceBlocks: {
                create: [
                  { id: randomUUID(), name: "Leadership Essentials Course", description: "Complete leadership fundamentals training", blockType: "TRAINING", order: 1, estimatedDuration: 8, isRequired: true, responsibleRole: "Manager" },
                  { id: randomUUID(), name: "Performance Management Training", description: "Learn performance review processes", blockType: "TRAINING", order: 2, estimatedDuration: 4, isRequired: true, responsibleRole: "HR" },
                  { id: randomUUID(), name: "Compliance for Managers", description: "Employment law and compliance training", blockType: "TRAINING", order: 3, estimatedDuration: 4, isRequired: true, responsibleRole: "Manager" },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // Offboarding Journey
  const existingOffboardingJourney = await prisma.journeyTemplate.findFirst({
    where: { companyId, name: "Employee Offboarding Journey" }
  });

  if (!existingOffboardingJourney) {
    await prisma.journeyTemplate.create({
      data: {
        id: randomUUID(),
        companyId,
        name: "Employee Offboarding Journey",
        description: "Structured offboarding process for departing employees",
        persona: "Departing Employee",
        duration: 14,
        businessGoals: ["Ensure knowledge transfer", "Maintain compliance", "Protect company assets"],
        status: "PUBLISHED",
        version: 1,
        isTemplate: true,
        category: "Offboarding",
        tags: ["offboarding", "exit", "transition"],
        createdBy,
        publishedAt: new Date(),
        phases: {
          create: [
            {
              id: randomUUID(),
              name: "Notice Period",
              description: "Activities during notice period",
              order: 1,
              duration: 10,
              phaseType: "PARALLEL",
              isRequired: true,
              experienceBlocks: {
                create: [
                  { id: randomUUID(), name: "Knowledge Transfer Plan", description: "Create and execute knowledge transfer", blockType: "DOCUMENT", order: 1, estimatedDuration: 8, isRequired: true, responsibleRole: "Employee" },
                  { id: randomUUID(), name: "Project Handover", description: "Hand over active projects", blockType: "TASK", order: 2, estimatedDuration: 8, isRequired: true, responsibleRole: "Employee" },
                  { id: randomUUID(), name: "Exit Interview", description: "Conduct exit interview", blockType: "MEETING", order: 3, estimatedDuration: 1, isRequired: true, responsibleRole: "HR" },
                ],
              },
            },
            {
              id: randomUUID(),
              name: "Final Day",
              description: "Last day activities and closure",
              order: 2,
              duration: 1,
              phaseType: "SEQUENTIAL",
              isRequired: true,
              experienceBlocks: {
                create: [
                  { id: randomUUID(), name: "Asset Return", description: "Return company equipment and assets", blockType: "TASK", order: 1, estimatedDuration: 2, isRequired: true, responsibleRole: "IT" },
                  { id: randomUUID(), name: "Access Revocation", description: "Remove system access", blockType: "AUTOMATION", order: 2, estimatedDuration: 1, isRequired: true, responsibleRole: "IT" },
                  { id: randomUUID(), name: "Final Paperwork", description: "Complete exit documentation", blockType: "FORM", order: 3, estimatedDuration: 1, isRequired: true, responsibleRole: "HR" },
                  { id: randomUUID(), name: "Farewell", description: "Team farewell", blockType: "MEETING", order: 4, estimatedDuration: 1, isRequired: false, responsibleRole: "Manager" },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log("✅ Journey templates seeded (3 templates).");
}

async function seedAutomationRuleTemplates(prisma: PrismaClient, companyId: string, createdBy: string) {
  console.log("⚡ Seeding automation rule templates...");

  const automationTemplates = [
    {
      name: "Document Expiry Reminder - 30 Days",
      description: "Send reminder when documents are expiring in 30 days",
      triggerType: "DOCUMENT_EXPIRING" as const,
      triggerConfig: { daysBefore: 30 },
      conditions: undefined as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "document-expiry-reminder", recipients: ["employee", "manager"] } },
        { type: "CREATE_ACTION_ITEM", config: { title: "Document expiring soon", priority: "medium" } },
      ],
      category: "Compliance",
      tags: ["document", "expiry", "reminder"],
    },
    {
      name: "New Employee Welcome Email",
      description: "Send welcome email when new employee is created",
      triggerType: "EMPLOYEE_CREATED" as const,
      triggerConfig: {},
      conditions: undefined as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "welcome-email", recipients: ["employee"] } },
        { type: "SEND_EMAIL", config: { template: "new-hire-notification", recipients: ["manager", "hr"] } },
      ],
      category: "Onboarding",
      tags: ["onboarding", "welcome", "email"],
    },
    {
      name: "Onboarding Start Trigger",
      description: "Trigger onboarding workflow on employee start date",
      triggerType: "EMPLOYEE_START_DATE" as const,
      triggerConfig: { daysOffset: 0 },
      conditions: undefined as object | undefined,
      actions: [
        { type: "ASSIGN_ONBOARDING", config: { templateName: "Standard Onboarding" } },
        { type: "SEND_EMAIL", config: { template: "first-day-welcome", recipients: ["employee"] } },
      ],
      category: "Onboarding",
      tags: ["onboarding", "start-date", "automation"],
    },
    {
      name: "Leave Request Notification",
      description: "Notify manager when leave request is submitted",
      triggerType: "LEAVE_REQUEST" as const,
      triggerConfig: { status: "PENDING" },
      conditions: undefined as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "leave-request-pending", recipients: ["manager"] } },
        { type: "CREATE_ACTION_ITEM", config: { title: "Leave request pending approval", assignTo: "manager", priority: "high" } },
      ],
      category: "Leave",
      tags: ["leave", "approval", "notification"],
    },
    {
      name: "Contract Expiry Alert - 60 Days",
      description: "Alert HR when fixed-term contracts are expiring",
      triggerType: "CONTRACT_EXPIRING" as const,
      triggerConfig: { daysBefore: 60 },
      conditions: { employmentType: ["FIXED_TERM", "CONTRACT"] } as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "contract-expiry-alert", recipients: ["hr", "manager"] } },
        { type: "CREATE_ACTION_ITEM", config: { title: "Contract renewal decision required", assignTo: "hr", priority: "high" } },
      ],
      category: "Compliance",
      tags: ["contract", "expiry", "hr"],
    },
    {
      name: "Probation Review Reminder",
      description: "Remind manager to complete probation review",
      triggerType: "SCHEDULED" as const,
      triggerConfig: { schedule: "0 9 * * 1", description: "Every Monday at 9am" },
      conditions: { probationEndingWithinDays: 14 } as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "probation-review-reminder", recipients: ["manager"] } },
        { type: "CREATE_ACTION_ITEM", config: { title: "Probation review due", assignTo: "manager", priority: "high" } },
      ],
      category: "Performance",
      tags: ["probation", "review", "reminder"],
    },
    {
      name: "Training Completion Follow-up",
      description: "Follow up on incomplete mandatory training",
      triggerType: "SCHEDULED" as const,
      triggerConfig: { schedule: "0 10 * * 3", description: "Every Wednesday at 10am" },
      conditions: { trainingOverdue: true } as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "training-overdue", recipients: ["employee"] } },
        { type: "SEND_EMAIL", config: { template: "training-overdue-manager", recipients: ["manager"] } },
      ],
      category: "Training",
      tags: ["training", "compliance", "follow-up"],
    },
    {
      name: "Birthday Celebration",
      description: "Send birthday wishes to employees",
      triggerType: "SCHEDULED" as const,
      triggerConfig: { schedule: "0 8 * * *", description: "Daily at 8am" },
      conditions: { birthdayToday: true } as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "birthday-wishes", recipients: ["employee"] } },
      ],
      category: "Engagement",
      tags: ["birthday", "engagement", "celebration"],
    },
    {
      name: "Work Anniversary Recognition",
      description: "Recognize employee work anniversaries",
      triggerType: "SCHEDULED" as const,
      triggerConfig: { schedule: "0 8 * * *", description: "Daily at 8am" },
      conditions: { workAnniversaryToday: true } as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "work-anniversary", recipients: ["employee", "manager"] } },
        { type: "CREATE_ACTION_ITEM", config: { title: "Recognize work anniversary", assignTo: "manager", priority: "low" } },
      ],
      category: "Engagement",
      tags: ["anniversary", "recognition", "engagement"],
    },
    {
      name: "Leave Return Notification",
      description: "Notify team when employee returns from extended leave",
      triggerType: "LEAVE_ENDING" as const,
      triggerConfig: { minDays: 5 },
      conditions: undefined as object | undefined,
      actions: [
        { type: "SEND_EMAIL", config: { template: "leave-return-notification", recipients: ["manager"] } },
      ],
      category: "Leave",
      tags: ["leave", "return", "notification"],
    },
  ];

  for (const template of automationTemplates) {
    const existing = await prisma.automationRule.findFirst({
      where: { companyId, name: template.name }
    });

    if (!existing) {
      await prisma.automationRule.create({
        data: {
          id: randomUUID(),
          companyId,
          name: template.name,
          description: template.description,
          isActive: false,
          triggerType: template.triggerType,
          triggerConfig: template.triggerConfig,
          conditions: template.conditions,
          actions: template.actions,
          isTemplate: true,
          category: template.category,
          tags: template.tags,
          createdBy,
          updatedAt: new Date(),
        },
      });
    }
  }

  console.log("✅ Automation rule templates seeded (10 templates).");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
