import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";

const SALT_ROUNDS = 10;
const ADMIN_ROLE: Role = "ADMIN";

/**
 * Generate a secure temporary password
 * Format: 3 random words + 4 digits + special char
 */
function generateSecurePassword(): string {
  const words = [
    "Tiger", "Cloud", "Ocean", "River", "Mountain", "Forest", "Thunder",
    "Crystal", "Phoenix", "Dragon", "Storm", "Flame", "Shadow", "Spirit",
    "Falcon", "Aurora", "Comet", "Breeze", "Horizon", "Sunset", "Valley",
    "Glacier", "Meadow", "Ember", "Coral", "Lunar", "Solar", "Nebula"
  ];
  
  const specialChars = "!@#$%^&*";
  const selectedWords: string[] = [];
  
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    selectedWords.push(words[randomIndex]);
  }
  
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  return `${selectedWords.join("-")}-${digits}${specialChar}`;
}

/**
 * Find or create an admin permission profile
 */
async function findOrCreatePermissionProfile(companyId: string): Promise<string | null> {
  const existingProfile = await prisma.permissionProfile.findFirst({
    where: {
      companyId,
      OR: [
        { name: "Admin" },
        { name: "Administrator" },
      ],
    },
  });

  if (existingProfile) {
    return existingProfile.id;
  }

  const profile = await prisma.permissionProfile.create({
    data: {
      id: randomUUID(),
      companyId,
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
      }),
      builtIn: true,
      updatedAt: new Date(),
    },
  });

  return profile.id;
}

/**
 * Find or create a department for the admin
 */
async function findOrCreateDepartment(companyId: string): Promise<string> {
  const existingDept = await prisma.department.findFirst({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });

  if (existingDept) {
    return existingDept.id;
  }

  const dept = await prisma.department.create({
    data: {
      id: randomUUID(),
      name: "Administration",
      companyId,
      updatedAt: new Date(),
    },
  });

  return dept.id;
}

/**
 * POST /api/setup-admin/create
 * 
 * Creates an initial admin user for the specified company.
 * This endpoint is intentionally unauthenticated to support initial setup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, companyId, newCompanyName } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    let targetCompanyId: string;
    let targetCompanyName: string;

    // Determine company (use existing or create new)
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company) {
        return NextResponse.json(
          { error: "Selected company not found" },
          { status: 404 }
        );
      }
      targetCompanyId = company.id;
      targetCompanyName = company.name;
    } else if (newCompanyName) {
      // Check if company name already exists
      const existingCompany = await prisma.company.findUnique({
        where: { name: newCompanyName },
      });
      if (existingCompany) {
        return NextResponse.json(
          { error: `A company named "${newCompanyName}" already exists` },
          { status: 400 }
        );
      }
      
      const newCompany = await prisma.company.create({
        data: {
          id: randomUUID(),
          name: newCompanyName,
          updatedAt: new Date(),
        },
      });
      targetCompanyId = newCompany.id;
      targetCompanyName = newCompany.name;
    } else {
      return NextResponse.json(
        { error: "Please select an existing company or provide a new company name" },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: {
        email_companyId: {
          email,
          companyId: targetCompanyId,
        },
      },
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        email,
        companyName: targetCompanyName,
        message: "An admin with this email already exists for this company",
      });
    }

    // Generate secure password
    const tempPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    // Find or create department
    const departmentId = await findOrCreateDepartment(targetCompanyId);

    // Find or create permission profile
    const permissionProfileId = await findOrCreatePermissionProfile(targetCompanyId);

    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: ADMIN_ROLE,
        companyId: targetCompanyId,
        departmentId,
        permissionProfileId,
        isActivated: true,
        updatedAt: new Date(),
      },
    });

    // Create associated employee record
    await prisma.employee.create({
      data: {
        id: randomUUID(),
        userId: adminUser.id,
        companyId: targetCompanyId,
        departmentId,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      email,
      password: tempPassword,
      companyName: targetCompanyName,
      message: "Admin account created successfully",
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Failed to create admin account. Please try again." },
      { status: 500 }
    );
  }
}

