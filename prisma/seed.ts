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

  // =============== 8) Locations ===============
  const locations = [
    "Auckland","Wellington","Christchurch","Hamilton","Tauranga","Dunedin",
    "Queenstown","Napier","Palmerston North","London","Manchester",
  ];
  for (const name of locations) {
    await prisma.location.upsert({
      where: { name },
      update: {},
      create: { id: randomUUID(), name },
    });
  }

  // =============== 9) Event Categories + Rules ===============
  const systemCategories = [
    { name: "Annual Leave", categoryType: "TIME_OFF", requiresApproval: true,  adminOnly: false, color: "#008000", systemDefined: true },
    { name: "Sickness",     categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#FF0000", systemDefined: true },
    { name: "Training",     categoryType: "TIME_OFF", requiresApproval: true,  adminOnly: false, color: "#4F46E5", systemDefined: true },
    { name: "Maternity Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#EC4899", systemDefined: true },
    { name: "Compassionate Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#8B5CF6", systemDefined: true },
    { name: "Doctor Appointment", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#14B8A6", systemDefined: true },
    { name: "Dentist Appointment", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#0EA5E9", systemDefined: true },
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

  // =============== 10) Field Metadata (Reporting) ===============
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

  // =============== 11) Expiry Rules ===============
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
  console.log("📊 Seeding standard survey templates...");

  // Pulse Survey
  await prisma.survey.upsert({
    where: { companyId_title: { companyId: company.id, title: "Weekly Pulse Survey" } },
    update: { updatedAt: new Date() },
    create: {
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

  // eNPS Survey
  await prisma.survey.upsert({
    where: { companyId_title: { companyId: company.id, title: "Employee Net Promoter Score (eNPS)" } },
    update: { updatedAt: new Date() },
    create: {
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

  // Engagement Survey
  await prisma.survey.upsert({
    where: { companyId_title: { companyId: company.id, title: "Quarterly Engagement Survey" } },
    update: { updatedAt: new Date() },
    create: {
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

  console.log("✅ Standard surveys seeded (3 surveys created).");

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
