/**
 * Tenant Seeding Utility
 * 
 * Seeds essential reference data for new tenants to ensure immediate usability.
 * This mirrors the main prisma/seed.ts file but works for any tenant dynamically.
 * 
 * This is a best practice for SaaS HRIS systems - provide sensible defaults
 * that tenants can customize to their needs.
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

/**
 * Seeds a new tenant with essential reference data:
 * - Departments
 * - Working patterns
 * - Permission profiles
 * - Job roles
 * - Employment type options
 * - Locations
 * - Event categories (leave types) with rules
 * - Field metadata for reporting
 * - Expiry rules
 * - Performance templates
 * - Onboarding templates
 * - Exit interview templates
 * - Training courses & providers
 * - Gender options
 * - Contract type options
 * - Notification settings
 * 
 * @param prisma - Prisma client or transaction
 * @param companyId - The company/tenant ID to seed data for
 * @param adminUserId - Optional admin user ID for templates that need a creator
 */
export async function seedTenantReferenceData(
  prisma: PrismaClient | any,
  companyId: string,
  adminUserId?: string
): Promise<void> {
  const now = new Date();

  console.log(`🌱 Seeding tenant reference data for company: ${companyId}`);

  // =============== 1) Departments ===============
  const departments = [
    "Sales",
    "HR",
    "Finance",
    "Engineering",
    "Operations",
    "Customer Support",
    "Marketing",
    "IT",
  ];

  for (const name of departments) {
    const existing = await prisma.department.findFirst({
      where: { companyId, name },
    });
    if (!existing) {
      await prisma.department.create({
        data: {
          id: randomUUID(),
          name,
          companyId,
          updatedAt: now,
        },
      });
    }
  }
  console.log("✅ Departments seeded.");

  // =============== 2) Working Patterns ===============
  async function createWorkingPatternIfMissing(
    name: string,
    description: string,
    weeks: { weekNumber?: number; days: { day: string; type: string; hoursPerDay?: number }[] }[],
    patternType: string = "STANDARD",
    contractedHoursPerWeek?: number
  ) {
    const existing = await prisma.workingPattern.findFirst({
      where: { name, companyId },
    });
    if (existing) return existing;

    // Calculate total hours if not provided
    let totalHours = contractedHoursPerWeek;
    if (!totalHours) {
      totalHours = weeks.reduce((acc, week) => {
        return acc + week.days.reduce((dayAcc, day) => {
          if (day.type === "FULL_DAY") return dayAcc + (day.hoursPerDay || 8);
          if (day.type.includes("HALF_DAY")) return dayAcc + (day.hoursPerDay || 4);
          return dayAcc;
        }, 0);
      }, 0) / weeks.length;
    }

    return prisma.workingPattern.create({
      data: {
        id: randomUUID(),
        name,
        description,
        patternType,
        contractedHoursPerWeek: totalHours,
        companyId,
        active: true,
        updatedAt: now,
        WorkingPatternWeek: {
          create: weeks.map((week, idx) => ({
            id: randomUUID(),
            weekNumber: week.weekNumber ?? idx + 1,
            totalHours: week.days.reduce((acc, day) => {
              if (day.type === "FULL_DAY") return acc + (day.hoursPerDay || 8);
              if (day.type.includes("HALF_DAY")) return acc + (day.hoursPerDay || 4);
              return acc;
            }, 0),
            WorkingPatternDay: {
              create: week.days.map((d) => ({
                id: randomUUID(),
                day: d.day,
                type: d.type as any,
                hoursPerDay: d.hoursPerDay || (d.type === "FULL_DAY" ? 8 : 4),
              })),
            },
          })),
        },
      },
    });
  }

  // Standard full-time pattern (Mon-Fri, 40hrs)
  await createWorkingPatternIfMissing(
    "Standard (Mon-Fri, 9am-5pm)",
    "Standard Monday to Friday working pattern from 9am to 5pm",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Tue", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Wed", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Thu", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Fri", type: "FULL_DAY", hoursPerDay: 8 },
    ]}],
    "STANDARD",
    40
  );

  // Part-time pattern (Mon/Wed/Fri)
  await createWorkingPatternIfMissing(
    "Part-time (Mon/Wed/Fri)",
    "Part-time schedule working Monday, Wednesday, Friday",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Wed", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Fri", type: "FULL_DAY", hoursPerDay: 8 },
    ]}],
    "STANDARD",
    24
  );

  // School Hours pattern
  await createWorkingPatternIfMissing(
    "School Hours (Mon-Fri, AM)",
    "Half-day mornings Monday to Friday",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "HALF_DAY_AM", hoursPerDay: 4 },
      { day: "Tue", type: "HALF_DAY_AM", hoursPerDay: 4 },
      { day: "Wed", type: "HALF_DAY_AM", hoursPerDay: 4 },
      { day: "Thu", type: "HALF_DAY_AM", hoursPerDay: 4 },
      { day: "Fri", type: "HALF_DAY_AM", hoursPerDay: 4 },
    ]}],
    "STANDARD",
    20
  );

  // 4-on 4-off pattern
  await createWorkingPatternIfMissing(
    "4-on 4-off",
    "Four days on, four days off (two-week cycle)",
    [
      { weekNumber: 1, days: [
        { day: "Mon", type: "FULL_DAY", hoursPerDay: 8 },
        { day: "Tue", type: "FULL_DAY", hoursPerDay: 8 },
        { day: "Wed", type: "FULL_DAY", hoursPerDay: 8 },
        { day: "Thu", type: "FULL_DAY", hoursPerDay: 8 },
      ]},
      { weekNumber: 2, days: [
        { day: "Tue", type: "FULL_DAY", hoursPerDay: 8 },
        { day: "Wed", type: "FULL_DAY", hoursPerDay: 8 },
        { day: "Thu", type: "FULL_DAY", hoursPerDay: 8 },
        { day: "Fri", type: "FULL_DAY", hoursPerDay: 8 },
      ]},
    ],
    "STANDARD",
    32
  );

  // Compressed Week (Mon-Thu)
  await createWorkingPatternIfMissing(
    "Compressed Week (Mon-Thu)",
    "Four 10-hour days Monday to Thursday",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "FULL_DAY", hoursPerDay: 10 },
      { day: "Tue", type: "FULL_DAY", hoursPerDay: 10 },
      { day: "Wed", type: "FULL_DAY", hoursPerDay: 10 },
      { day: "Thu", type: "FULL_DAY", hoursPerDay: 10 },
    ]}],
    "STANDARD",
    40
  );

  // 9-Day Fortnight
  await createWorkingPatternIfMissing(
    "9-Day Fortnight",
    "Nine days over two weeks with alternate Fridays off",
    [
      { weekNumber: 1, days: [
        { day: "Mon", type: "FULL_DAY", hoursPerDay: 8.89 },
        { day: "Tue", type: "FULL_DAY", hoursPerDay: 8.89 },
        { day: "Wed", type: "FULL_DAY", hoursPerDay: 8.89 },
        { day: "Thu", type: "FULL_DAY", hoursPerDay: 8.89 },
        { day: "Fri", type: "FULL_DAY", hoursPerDay: 8.89 },
      ]},
      { weekNumber: 2, days: [
        { day: "Mon", type: "FULL_DAY", hoursPerDay: 8.89 },
        { day: "Tue", type: "FULL_DAY", hoursPerDay: 8.89 },
        { day: "Wed", type: "FULL_DAY", hoursPerDay: 8.89 },
        { day: "Thu", type: "FULL_DAY", hoursPerDay: 8.89 },
      ]},
    ],
    "STANDARD",
    40
  );

  // Hybrid (3 Days Office)
  await createWorkingPatternIfMissing(
    "Hybrid (3 Days Office)",
    "Flexible hybrid working - 3 days in office (Tue-Thu)",
    [{ weekNumber: 1, days: [
      { day: "Tue", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Wed", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Thu", type: "FULL_DAY", hoursPerDay: 8 },
    ]}],
    "STANDARD",
    24
  );

  // Weekend Worker
  await createWorkingPatternIfMissing(
    "Weekend Worker",
    "Saturday and Sunday working pattern",
    [{ weekNumber: 1, days: [
      { day: "Sat", type: "FULL_DAY", hoursPerDay: 8 },
      { day: "Sun", type: "FULL_DAY", hoursPerDay: 8 },
    ]}],
    "STANDARD",
    16
  );

  // Afternoons Only (Mon-Fri)
  await createWorkingPatternIfMissing(
    "Afternoons Only (Mon-Fri)",
    "Half-day afternoons Monday to Friday",
    [{ weekNumber: 1, days: [
      { day: "Mon", type: "HALF_DAY_PM", hoursPerDay: 4 },
      { day: "Tue", type: "HALF_DAY_PM", hoursPerDay: 4 },
      { day: "Wed", type: "HALF_DAY_PM", hoursPerDay: 4 },
      { day: "Thu", type: "HALF_DAY_PM", hoursPerDay: 4 },
      { day: "Fri", type: "HALF_DAY_PM", hoursPerDay: 4 },
    ]}],
    "STANDARD",
    20
  );

  // Shift-based pattern for gig workers/zero-hour contracts
  const existingShift = await prisma.workingPattern.findFirst({
    where: { name: "Shift-Based (20h/week guaranteed)", companyId },
  });
  if (!existingShift) {
    await prisma.workingPattern.create({
      data: {
        id: randomUUID(),
        name: "Shift-Based (20h/week guaranteed)",
        description: "Flexible shift-based contract with 20 hours per week guaranteed. Shifts scheduled as needed.",
        patternType: "SHIFT_BASED",
        contractedHoursPerWeek: 20.00,
        companyId,
        active: true,
        updatedAt: now,
        WorkingPatternWeek: {
          create: [
            {
              id: randomUUID(),
              weekNumber: 1,
              totalHours: 0.00,
            },
          ],
        },
      },
    });
  }

  console.log("✅ Working patterns seeded.");

  // =============== 3) Permission Profiles ===============
  const adminProfileData = {
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
  };

  const existingAdminProfile = await prisma.permissionProfile.findFirst({
    where: { companyId, name: "Admin" },
  });
  if (!existingAdminProfile) {
    await prisma.permissionProfile.create({
      data: {
        id: randomUUID(),
        companyId,
        ...adminProfileData,
        updatedAt: now,
      },
    });
  }

  const managerProfileData = {
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
  };

  const existingManagerProfile = await prisma.permissionProfile.findFirst({
    where: { companyId, name: "Manager" },
  });
  if (!existingManagerProfile) {
    await prisma.permissionProfile.create({
      data: {
        id: randomUUID(),
        companyId,
        ...managerProfileData,
        updatedAt: now,
      },
    });
  }

  const employeeProfileData = {
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
  };

  const existingEmployeeProfile = await prisma.permissionProfile.findFirst({
    where: { companyId, name: "Employee" },
  });
  if (!existingEmployeeProfile) {
    await prisma.permissionProfile.create({
      data: {
        id: randomUUID(),
        companyId,
        ...employeeProfileData,
        updatedAt: now,
      },
    });
  }

  console.log("✅ Permission profiles seeded.");

  // =============== 4) Job Roles ===============
  const jobRoles = [
    "Manager",
    "Employee",
    "Admin",
    "HR Advisor",
    "Software Engineer",
    "Sales Executive",
    "Finance Analyst",
    "Operations Coordinator",
    "Customer Support Representative",
    "Marketing Manager",
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

  for (const name of jobRoles) {
    const existing = await prisma.jobRole.findFirst({
      where: { companyId, name },
    });
    if (!existing) {
      await prisma.jobRole.create({
        data: {
          id: randomUUID(),
          name,
          companyId,
          updatedAt: now,
        },
      });
    }
  }

  console.log("✅ Job roles seeded.");

  // =============== 5) Employment Type Options ===============
  const employmentTypes = [
    { label: "Permanent", order: 1 },
    { label: "Part Time", order: 2 },
    { label: "Contractor", order: 3 },
    { label: "Zero Hours", order: 4 },
  ];

  for (const empType of employmentTypes) {
    const existing = await prisma.employmentTypeOption.findFirst({
      where: { companyId, label: empType.label },
    });
    if (!existing) {
      await prisma.employmentTypeOption.create({
        data: {
          id: randomUUID(),
          companyId,
          label: empType.label,
          order: empType.order,
        },
      });
    }
  }

  console.log("✅ Employment type options seeded.");

  // =============== 6) Locations ===============
  const locations = [
    "Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Dunedin",
    "Queenstown", "Napier", "Palmerston North", "London", "Manchester",
  ];

  for (const locationName of locations) {
    const existing = await prisma.location.findFirst({
      where: { name: locationName },
    });
    if (!existing) {
      await prisma.location.create({
        data: {
          id: randomUUID(),
          name: locationName,
        },
      });
    }
  }

  console.log("✅ Locations seeded.");

  // =============== 7) Event Categories (Leave Types) + Rules ===============
  const systemCategories = [
    { name: "Annual Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#008000", systemDefined: true },
    { name: "Sickness", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#FF0000", systemDefined: true },
    { name: "Training", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#4F46E5", systemDefined: true },
    { name: "Maternity Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#EC4899", systemDefined: true },
    { name: "Compassionate Leave", categoryType: "TIME_OFF", requiresApproval: true, adminOnly: false, color: "#8B5CF6", systemDefined: true },
    { name: "Doctor Appointment", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#14B8A6", systemDefined: true },
    { name: "Dentist Appointment", categoryType: "TIME_OFF", requiresApproval: false, adminOnly: false, color: "#0EA5E9", systemDefined: true },
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
    let eventCategory = await prisma.eventCategory.findFirst({
      where: { companyId, name: cat.name },
    });

    if (!eventCategory) {
      eventCategory = await prisma.eventCategory.create({
        data: {
          id: randomUUID(),
          name: cat.name,
          categoryType: cat.categoryType as any,
          requiresApproval: cat.requiresApproval,
          adminOnly: cat.adminOnly,
          color: cat.color,
          isActive: true,
          companyId,
          systemDefined: cat.systemDefined,
          updatedAt: now,
        },
      });
    }

    // Create event rule for the category
    const existingRule = await prisma.eventRule.findFirst({
      where: { companyId, eventCategoryId: eventCategory.id },
    });
    if (!existingRule) {
      await prisma.eventRule.create({
        data: {
          id: randomUUID(),
          companyId,
          eventCategoryId: eventCategory.id,
          maxCarryoverDays: 5,
          carryoverExpiryMonths: 3,
          updatedAt: now,
        },
      });
    }
  }

  console.log("✅ Event categories and rules seeded.");

  // =============== 8) Field Metadata (Reporting) ===============
  const fieldMetadataData = [
    { model: "user", field: "email", label: "Email", fieldType: "string" },
    { model: "user", field: "role", label: "Role", fieldType: "string" },
    { model: "user", field: "firstName", label: "First Name", fieldType: "string" },
    { model: "user", field: "lastName", label: "Last Name", fieldType: "string" },
    { model: "user", field: "phone", label: "Phone", fieldType: "string" },
    { model: "employee", field: "isActive", label: "Is Active", fieldType: "boolean" },
    { model: "employee", field: "departmentId", label: "Department ID", fieldType: "string" },
    { model: "employee", field: "workingPatternId", label: "Working Pattern ID", fieldType: "string" },
    { model: "department", field: "name", label: "Department Name", fieldType: "string" },
    { model: "department", field: "companyId", label: "Company ID", fieldType: "string" },
    { model: "jobrole", field: "name", label: "Job Role Name", fieldType: "string" },
    { model: "jobrole", field: "description", label: "Job Role Description", fieldType: "string" },
    { model: "leaverequest", field: "startDate", label: "Start Date", fieldType: "date" },
    { model: "leaverequest", field: "endDate", label: "End Date", fieldType: "date" },
    { model: "leaverequest", field: "status", label: "Status", fieldType: "string" },
    { model: "leaverequest", field: "daysRequested", label: "Days Requested", fieldType: "int" },
    { model: "leaveentitlement", field: "totalDays", label: "Total Days", fieldType: "int" },
    { model: "leaveentitlement", field: "usedDays", label: "Used Days", fieldType: "int" },
    { model: "leaveentitlement", field: "carryoverDays", label: "Carryover Days", fieldType: "int" },
    { model: "leaveentitlement", field: "carryoverExpiry", label: "Carryover Expiry", fieldType: "date" },
  ];

  for (const field of fieldMetadataData) {
    const existing = await prisma.fieldMetadata.findFirst({
      where: { model: field.model, field: field.field },
    });
    if (!existing) {
      await prisma.fieldMetadata.create({
        data: { id: randomUUID(), ...field },
      });
    }
  }

  console.log("✅ Field metadata seeded.");

  // =============== 9) Expiry Rules ===============
  const expiryRules = [
    { category: "Employment Checks", daysBefore: 28, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Driver Licence", daysBefore: 30, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Training", daysBefore: 45, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Work Visa", daysBefore: 90, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Professional License", daysBefore: 60, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
    { category: "Police Check", daysBefore: 30, notifyAdmin: true, notifyManager: false, notifyEmployee: true },
    { category: "First Aid Certificate", daysBefore: 45, notifyAdmin: true, notifyManager: true, notifyEmployee: true },
  ];

  for (const rule of expiryRules) {
    const existing = await prisma.expiryRule.findFirst({
      where: { category: rule.category },
    });
    if (!existing) {
      await prisma.expiryRule.create({
        data: {
          id: randomUUID(),
          companyId,
          ...rule,
          updatedAt: now,
        },
      });
    }
  }

  console.log("✅ Expiry rules seeded.");

  // =============== 10) Gender Options ===============
  const genderOptions = [
    { key: "male", label: "Male", order: 1 },
    { key: "female", label: "Female", order: 2 },
    { key: "non_binary", label: "Non-binary", order: 3 },
    { key: "prefer_not_to_say", label: "Prefer not to say", order: 4 },
    { key: "other", label: "Other", order: 5 },
  ];

  for (const option of genderOptions) {
    const existing = await prisma.genderOption.findFirst({
      where: { companyId, key: option.key },
    });
    if (!existing) {
      await prisma.genderOption.create({
        data: {
          id: randomUUID(),
          companyId,
          key: option.key,
          label: option.label,
          order: option.order,
          active: true,
          updatedAt: now,
        },
      });
    }
  }

  console.log("✅ Gender options seeded.");

  // =============== 11) Contract Type Options ===============
  const contractTypeOptions = [
    { label: "Permanent", order: 1 },
    { label: "Fixed Term", order: 2 },
    { label: "Casual", order: 3 },
    { label: "Seasonal", order: 4 },
  ];

  for (const option of contractTypeOptions) {
    const existing = await prisma.contractTypeOption.findFirst({
      where: { companyId, label: option.label },
    });
    if (!existing) {
      await prisma.contractTypeOption.create({
        data: {
          id: randomUUID(),
          companyId,
          label: option.label,
          order: option.order,
        },
      });
    }
  }

  console.log("✅ Contract type options seeded.");

  // =============== 12) Training Courses & Provider ===============
  let internalProvider = await prisma.trainingProvider.findFirst({
    where: { name: "Internal Training" },
  });
  if (!internalProvider) {
    internalProvider = await prisma.trainingProvider.create({
      data: {
        id: randomUUID(),
        name: "Internal Training",
        companyId,
      },
    });
  }

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
    const existing = await prisma.course.findFirst({
      where: { name: courseName },
    });
    if (!existing) {
      await prisma.course.create({
        data: {
          id: randomUUID(),
          name: courseName,
          companyId,
        },
      });
    }
  }

  console.log("✅ Training courses and provider seeded.");

  // =============== 13) Onboarding Template ===============
  const existingOnboardingTemplate = await prisma.onboardingTemplate.findFirst({
    where: { companyId, name: "Standard New Starter" },
  });

  if (!existingOnboardingTemplate) {
    await prisma.onboardingTemplate.create({
      data: {
        id: randomUUID(),
        companyId,
        name: "Standard New Starter",
        description: "Comprehensive onboarding journey for all new employees",
        isDefault: true,
        isActive: true,
        version: 1,
        OnboardingStep: {
          create: [
            { id: randomUUID(), type: "INSTRUCTION", label: "Welcome to the Team", order: 1, instruction: "Welcome! We're excited to have you join us. This onboarding process will guide you through everything you need to get started.", metadata: { category: "Welcome" } },
            { id: randomUUID(), type: "ACKNOWLEDGE_DOCUMENT", label: "Employee Handbook", order: 2, instruction: "Please read and acknowledge our employee handbook which outlines company policies and procedures.", metadata: { category: "Documentation" } },
            { id: randomUUID(), type: "UPLOAD_DOCUMENT", label: "Upload ID Photo", order: 3, uploadType: "OTHER", instruction: "Please upload a professional photo for your employee profile and ID badge.", metadata: { category: "Documentation" } },
            { id: randomUUID(), type: "UPLOAD_DOCUMENT", label: "Right to Work Documentation", order: 4, uploadType: "RIGHT_TO_WORK", instruction: "Please upload documentation proving your right to work (passport, visa, etc.).", metadata: { category: "Compliance" } },
            { id: randomUUID(), type: "UPLOAD_DOCUMENT", label: "Bank Details", order: 5, uploadType: "OTHER", instruction: "Please upload a bank statement or void cheque for payroll setup.", metadata: { category: "Payroll" } },
            { id: randomUUID(), type: "INSTRUCTION", label: "Tax Code Declaration", order: 6, instruction: "Please complete your IR330 tax code declaration form for IRD.", metadata: { category: "Payroll" } },
            { id: randomUUID(), type: "INSTRUCTION", label: "KiwiSaver Enrollment", order: 7, instruction: "Review and confirm your KiwiSaver preferences. You can opt in, opt out, or choose your contribution rate.", metadata: { category: "Payroll" } },
            { id: randomUUID(), type: "EQUIPMENT_CHECKLIST", label: "IT Equipment Setup", order: 8, instruction: "Your IT equipment will be prepared. Please confirm receipt of all items.", metadata: { category: "IT Setup", checklist: ["Laptop", "Mouse", "Keyboard", "Monitor", "Headset", "Security Badge"] } },
            { id: randomUUID(), type: "SYSTEM_ACCESS", label: "System Access & Accounts", order: 9, instruction: "Your accounts for company systems will be created. Please verify access to email, Teams/Slack, and other required systems.", metadata: { category: "IT Setup" } },
            { id: randomUUID(), type: "COMPLIANCE_TRAINING", label: "Health & Safety Induction", order: 10, instruction: "Complete the mandatory health and safety induction training.", metadata: { category: "Training" } },
            { id: randomUUID(), type: "MANAGER_CHECKIN", label: "Manager Introduction Meeting", order: 11, instruction: "Your manager will schedule a welcome meeting to discuss your role, expectations, and answer any questions.", metadata: { category: "Orientation" } },
            { id: randomUUID(), type: "BUDDY_INTRODUCTION", label: "Meet Your Buddy", order: 12, instruction: "You'll be introduced to your onboarding buddy who can help you navigate the company.", metadata: { category: "Orientation" } },
            { id: randomUUID(), type: "PROBATION_GOALS", label: "Set Probation Goals", order: 13, instruction: "Work with your manager to set clear goals and expectations for your probation period.", metadata: { category: "Performance" } },
            { id: randomUUID(), type: "WELCOME_SURVEY", label: "First Week Feedback", order: 14, instruction: "Please share your feedback on your first week experience.", metadata: { category: "Feedback" } },
          ],
        },
      },
    });
  }

  console.log("✅ Onboarding template seeded.");

  // =============== 14) Exit Interview Form Template ===============
  const existingExitTemplate = await prisma.exitInterviewFormTemplate.findFirst({
    where: { companyId, name: "Standard Exit Interview" },
  });

  if (!existingExitTemplate) {
    await prisma.exitInterviewFormTemplate.create({
      data: {
        id: randomUUID(),
        name: "Standard Exit Interview",
        description: "Comprehensive exit interview to gather feedback from departing employees",
        isActive: true,
        updatedAt: now,
        Company: { connect: { id: companyId } },
        schemaJson: {
          sections: [
            {
              title: "Reason for Leaving",
              questions: [
                { id: "reason_primary", type: "multipleChoice", question: "What is your primary reason for leaving?", required: true, options: ["Career advancement opportunity", "Better compensation/benefits", "Work-life balance", "Relocation", "Management/leadership issues", "Company culture", "Personal reasons", "Return to study", "Retirement", "Other"] },
                { id: "reason_details", type: "textarea", question: "Please provide more details about your reason for leaving:", required: false },
              ],
            },
            {
              title: "Job Satisfaction",
              questions: [
                { id: "job_satisfaction", type: "rating", question: "Overall, how satisfied were you with your job?", required: true, min: 1, max: 5, labels: ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"] },
                { id: "role_clarity", type: "rating", question: "How clear were the expectations and responsibilities of your role?", required: true, min: 1, max: 5 },
                { id: "workload", type: "rating", question: "How manageable was your workload?", required: true, min: 1, max: 5 },
              ],
            },
            {
              title: "Management & Leadership",
              questions: [
                { id: "manager_support", type: "rating", question: "How would you rate the support received from your direct manager?", required: true, min: 1, max: 5 },
                { id: "manager_feedback", type: "rating", question: "How would you rate the quality and frequency of feedback from your manager?", required: true, min: 1, max: 5 },
                { id: "leadership_confidence", type: "rating", question: "How confident were you in the company's leadership?", required: true, min: 1, max: 5 },
              ],
            },
            {
              title: "Work Environment",
              questions: [
                { id: "team_collaboration", type: "rating", question: "How would you rate team collaboration and support?", required: true, min: 1, max: 5 },
                { id: "company_culture", type: "rating", question: "How would you rate the company culture?", required: true, min: 1, max: 5 },
                { id: "work_life_balance", type: "rating", question: "How satisfied were you with work-life balance?", required: true, min: 1, max: 5 },
              ],
            },
            {
              title: "Growth & Development",
              questions: [
                { id: "career_growth", type: "rating", question: "How satisfied were you with career growth opportunities?", required: true, min: 1, max: 5 },
                { id: "training_opportunities", type: "rating", question: "How satisfied were you with training and development opportunities?", required: true, min: 1, max: 5 },
              ],
            },
            {
              title: "Final Thoughts",
              questions: [
                { id: "recommend_employer", type: "rating", question: "How likely are you to recommend this company as an employer? (0-10)", required: true, min: 0, max: 10 },
                { id: "return_consideration", type: "multipleChoice", question: "Would you consider returning to this company in the future?", required: true, options: ["Yes, definitely", "Possibly", "Unlikely", "No"] },
                { id: "improvements", type: "textarea", question: "What could the company do to improve as an employer?", required: false },
                { id: "positive_aspects", type: "textarea", question: "What did you enjoy most about working here?", required: false },
                { id: "additional_comments", type: "textarea", question: "Any other comments or feedback you'd like to share?", required: false },
              ],
            },
          ],
        },
      },
    });
  }

  console.log("✅ Exit interview template seeded.");

  // =============== 15) Notification Settings ===============
  const existingNotificationSettings = await prisma.notificationSettings.findUnique({
    where: { companyId },
  });

  if (!existingNotificationSettings) {
    await prisma.notificationSettings.create({
      data: {
        id: randomUUID(),
        companyId,
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
        updatedAt: now,
      },
    });
  }

  console.log("✅ Notification settings seeded.");

  // =============== 16) Company Settings (NZ Defaults) ===============
  await prisma.company.update({
    where: { id: companyId },
    data: {
      publicHolidayTemplate: "NZ",
      publicHolidayRegion: "Auckland",
    },
  });

  console.log("✅ Company settings updated with NZ defaults.");

  console.log(`🎉 Tenant reference data seeding complete for company: ${companyId}`);
}
