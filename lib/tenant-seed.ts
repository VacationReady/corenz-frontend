/**
 * Tenant Seeding Utility
 * 
 * Seeds essential reference data for new tenants to ensure immediate usability.
 * This is a best practice for SaaS HRIS systems - provide sensible defaults
 * that tenants can customize to their needs.
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

/**
 * Seeds a new tenant with essential reference data:
 * - Working patterns
 * - Leave categories (event categories)
 * - Job roles
 * - Employment type options
 * - Common locations
 * - Field metadata for reporting
 * - Expiry rules
 * 
 * @param prisma - Prisma client or transaction
 * @param companyId - The company/tenant ID to seed data for
 */
export async function seedTenantReferenceData(
  prisma: PrismaClient | any,
  companyId: string
): Promise<void> {
  const now = new Date();

  // =============== 1) Working Patterns ===============
  // These are essential - without them, employees can't be properly configured
  
  // Standard full-time pattern (Mon-Fri, 40hrs)
  await prisma.workingPattern.create({
    data: {
      id: randomUUID(),
      name: "Standard (Mon-Fri, 9am-5pm)",
      description: "Standard Monday to Friday working pattern from 9am to 5pm",
      patternType: "STANDARD",
      contractedHoursPerWeek: 40.00,
      companyId,
      active: true,
      updatedAt: now,
      WorkingPatternWeek: {
        create: [
          {
            id: randomUUID(),
            weekNumber: 1,
            totalHours: 40.00,
            WorkingPatternDay: {
              create: [
                { id: randomUUID(), day: "Mon", type: "FULL_DAY", hoursPerDay: 8.00 },
                { id: randomUUID(), day: "Tue", type: "FULL_DAY", hoursPerDay: 8.00 },
                { id: randomUUID(), day: "Wed", type: "FULL_DAY", hoursPerDay: 8.00 },
                { id: randomUUID(), day: "Thu", type: "FULL_DAY", hoursPerDay: 8.00 },
                { id: randomUUID(), day: "Fri", type: "FULL_DAY", hoursPerDay: 8.00 },
              ],
            },
          },
        ],
      },
    },
  });

  // Part-time pattern (Mon/Wed/Fri, 24hrs)
  await prisma.workingPattern.create({
    data: {
      id: randomUUID(),
      name: "Part-time (Mon/Wed/Fri)",
      description: "Part-time schedule working Monday, Wednesday, Friday",
      patternType: "STANDARD",
      contractedHoursPerWeek: 24.00,
      companyId,
      active: true,
      updatedAt: now,
      WorkingPatternWeek: {
        create: [
          {
            id: randomUUID(),
            weekNumber: 1,
            totalHours: 24.00,
            WorkingPatternDay: {
              create: [
                { id: randomUUID(), day: "Mon", type: "FULL_DAY", hoursPerDay: 8.00 },
                { id: randomUUID(), day: "Wed", type: "FULL_DAY", hoursPerDay: 8.00 },
                { id: randomUUID(), day: "Fri", type: "FULL_DAY", hoursPerDay: 8.00 },
              ],
            },
          },
        ],
      },
    },
  });

  // Shift-based pattern for gig workers/zero-hour contracts
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
            // No WorkingPatternDay - shifts are created manually
          },
        ],
      },
    },
  });

  // =============== 2) Event Categories (Leave Types) ===============
  // Essential for leave management functionality
  
  const leaveCategories = [
    { 
      name: "Annual Leave", 
      color: "#008000", 
      requiresApproval: true,
      description: "Paid annual leave entitlement"
    },
    { 
      name: "Sick Leave", 
      color: "#FF0000", 
      requiresApproval: false,
      description: "Paid sick leave (as per New Zealand Holidays Act)"
    },
    { 
      name: "Bereavement Leave", 
      color: "#8B5CF6", 
      requiresApproval: true,
      description: "Compassionate leave for bereavement"
    },
    { 
      name: "Training", 
      color: "#4F46E5", 
      requiresApproval: true,
      description: "Professional development and training"
    },
    { 
      name: "Unpaid Leave", 
      color: "#6B7280", 
      requiresApproval: true,
      description: "Unpaid time off"
    },
  ];

  for (const category of leaveCategories) {
    const eventCategory = await prisma.eventCategory.create({
      data: {
        id: randomUUID(),
        name: category.name,
        categoryType: "TIME_OFF",
        requiresApproval: category.requiresApproval,
        adminOnly: false,
        color: category.color,
        isActive: true,
        companyId,
        systemDefined: true,
        updatedAt: now,
      },
    });

    // Create default event rule for annual leave
    if (category.name === "Annual Leave") {
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

  // =============== 3) Job Roles ===============
  // Common job roles to get started
  
  const jobRoles = [
    "Sales Executive",
    "HR Administrator",
    "Customer Service Representative",
    "Finance Analyst",
    "Operations Coordinator",
    "Marketing Manager",
    "Technical Lead",
  ];

  for (const roleName of jobRoles) {
    await prisma.jobRole.create({
      data: {
        id: randomUUID(),
        name: roleName,
        companyId,
        updatedAt: now,
      },
    });
  }

  // =============== 4) Employment Type Options ===============
  // Standard employment types for New Zealand
  
  const employmentTypes = [
    { label: "Permanent Full-time", order: 1 },
    { label: "Permanent Part-time", order: 2 },
    { label: "Fixed-term", order: 3 },
    { label: "Casual", order: 4 },
    { label: "Contractor", order: 5 },
  ];

  for (const empType of employmentTypes) {
    await prisma.employmentTypeOption.create({
      data: {
        id: randomUUID(),
        companyId,
        label: empType.label,
        order: empType.order,
      },
    });
  }

  // =============== 5) Common NZ Locations ===============
  // Only create if they don't already exist (these are global)
  
  const locations = [
    "Auckland",
    "Wellington",
    "Christchurch",
    "Hamilton",
    "Tauranga",
    "Dunedin",
    "Queenstown",
  ];

  for (const locationName of locations) {
    // Check if location exists
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

  // =============== 6) Expiry Rules ===============
  // Set up default expiry notification rules
  
  const expiryRules = [
    { 
      category: "Employment Checks", 
      daysBefore: 28, 
      notifyAdmin: true, 
      notifyManager: true, 
      notifyEmployee: true 
    },
    { 
      category: "Driver Licence", 
      daysBefore: 30, 
      notifyAdmin: true, 
      notifyManager: true, 
      notifyEmployee: true 
    },
    { 
      category: "Training", 
      daysBefore: 45, 
      notifyAdmin: true, 
      notifyManager: true, 
      notifyEmployee: true 
    },
  ];

  for (const rule of expiryRules) {
    // Check if rule exists
    const existing = await prisma.expiryRule.findFirst({
      where: { category: rule.category },
    });

    if (!existing) {
      await prisma.expiryRule.create({
        data: {
          id: randomUUID(),
          ...rule,
          updatedAt: now,
        },
      });
    }
  }

  // =============== 7) Field Metadata ===============
  // Essential field metadata for reporting functionality
  
  const fieldMetadata = [
    // User fields
    { model: "user", field: "email", label: "Email", fieldType: "string" },
    { model: "user", field: "role", label: "Role", fieldType: "string" },
    { model: "user", field: "firstName", label: "First Name", fieldType: "string" },
    { model: "user", field: "lastName", label: "Last Name", fieldType: "string" },
    { model: "user", field: "phone", label: "Phone", fieldType: "string" },
    
    // Employee fields
    { model: "employee", field: "isActive", label: "Is Active", fieldType: "boolean" },
    { model: "employee", field: "startDate", label: "Start Date", fieldType: "date" },
    { model: "employee", field: "departmentId", label: "Department ID", fieldType: "string" },
    { model: "employee", field: "workingPatternId", label: "Working Pattern ID", fieldType: "string" },
    
    // Department fields
    { model: "department", field: "name", label: "Department Name", fieldType: "string" },
    
    // Leave request fields
    { model: "leaverequest", field: "startDate", label: "Start Date", fieldType: "date" },
    { model: "leaverequest", field: "endDate", label: "End Date", fieldType: "date" },
    { model: "leaverequest", field: "status", label: "Status", fieldType: "string" },
    { model: "leaverequest", field: "daysRequested", label: "Days Requested", fieldType: "int" },
  ];

  // Only create field metadata if they don't exist (these are global)
  for (const field of fieldMetadata) {
    const existing = await prisma.fieldMetadata.findFirst({
      where: {
        model: field.model,
        field: field.field,
      },
    });

    if (!existing) {
      await prisma.fieldMetadata.create({
        data: {
          id: randomUUID(),
          ...field,
        },
      });
    }
  }

  console.log(`✅ Tenant reference data seeded for company: ${companyId}`);
}
