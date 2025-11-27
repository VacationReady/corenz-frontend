import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";
import { resend, PEOPLECORE_FROM_EMAIL } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";
import { seedTenantReferenceData } from "@/lib/tenant-seed";

const SALT_ROUNDS = 10;
const ADMIN_ROLE: Role = "ADMIN";

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
 * Creates an initial admin user and company for trial setup.
 * User provides their own password which is hashed with bcrypt.
 * Sends a welcome confirmation email upon successful creation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, password, companyName } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !password || !companyName) {
      return NextResponse.json(
        { error: "Email, first name, last name, password, and company name are required" },
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if company name already exists
    const existingCompany = await prisma.company.findUnique({
      where: { name: companyName },
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: `A company named "${companyName}" already exists. Please choose a different name or contact support.` },
        { status: 400 }
      );
    }
    
    // Create the company
    const newCompany = await prisma.company.create({
      data: {
        id: randomUUID(),
        name: companyName,
        updatedAt: new Date(),
      },
    });
    const targetCompanyId = newCompany.id;
    const targetCompanyName = newCompany.name;

    // Seed essential reference data (working patterns, leave types, job roles, etc.)
    try {
      await seedTenantReferenceData(prisma, targetCompanyId);
      console.log(`✅ Tenant reference data seeded for: ${targetCompanyName}`);
    } catch (seedError) {
      console.error("Warning: Failed to seed tenant reference data:", seedError);
      // Don't fail the entire request - admin can still be created
      // Reference data can be manually added or seeded later
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
        success: false,
        alreadyExists: true,
        email,
        companyName: targetCompanyName,
        message: "An account with this email already exists for this company",
      });
    }

    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

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

    // Send welcome confirmation email
    try {
      const loginUrl = `${getAppBaseUrl()}/login`;
      
      const { html, text } = renderPeopleCoreEmail({
        preheader: `Welcome to PeopleCore, ${firstName}! Your account is ready.`,
        title: "Welcome Aboard! 🎉",
        heroBadge: "Account Created",
        heroSubtitle: `Your PeopleCore account for ${targetCompanyName} is ready to go`,
        intro: [
          `Hi ${firstName},`,
          `Welcome to PeopleCore! We're thrilled to have you and ${targetCompanyName} join us on this journey to transform the way you manage your people.`,
        ],
        sections: [
          {
            title: "Your Account Details",
            highlight: true,
            description: [
              `Organisation: ${targetCompanyName}`,
              `Email: ${email}`,
              `Role: Administrator`,
            ],
          },
          {
            title: "What's Next?",
            bulletPoints: [
              "Explore your dashboard and familiarise yourself with the platform",
              "Add your team members and set up departments",
              "Configure leave policies and working patterns",
              "Set up onboarding workflows for new hires",
            ],
          },
        ],
        ctas: {
          label: "Log In to PeopleCore",
          href: loginUrl,
        },
        outro: [
          "Bookmark this link to access PeopleCore anytime.",
          "If you have any questions or need assistance, our support team is here to help.",
          "Welcome aboard!",
          "The PeopleCore Team",
        ],
      });

      await resend.emails.send({
        from: PEOPLECORE_FROM_EMAIL,
        to: email,
        subject: `Welcome to PeopleCore, ${firstName}! 🎉`,
        html,
        text,
      });
    } catch (emailError) {
      // Log but don't fail the request if email sending fails
      console.error("Failed to send welcome email:", emailError);
    }

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      email,
      companyName: targetCompanyName,
      companyId: targetCompanyId,
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
