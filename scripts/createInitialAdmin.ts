/**
 * PeopleCore - Initial Tenant Admin Creation Script
 * 
 * This script creates an initial tenant admin user for the UAT/Prod environment.
 * It is idempotent - running it multiple times will not create duplicate users.
 * 
 * Usage:
 *   npx tsx scripts/createInitialAdmin.ts
 * 
 * Or via npm script:
 *   npm run create-admin
 * 
 * Environment:
 *   Set DATABASE_URL in .env to point to the target database.
 * 
 * Alternative:
 *   You can also use the web UI at /setup-admin to create an admin account
 *   with your own password and automatic sign-in.
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { config } from "dotenv";

// Load environment variables
config();

const prisma = new PrismaClient();

// Configuration
const ADMIN_EMAIL = "uat.admin@peoplecore.co.nz";
const ADMIN_FIRST_NAME = "UAT";
const ADMIN_LAST_NAME = "Administrator";
const ADMIN_ROLE: Role = "ADMIN";
const SALT_ROUNDS = 10;
const DEFAULT_COMPANY_NAME = "UAT Demo Company";

/**
 * Generate a secure temporary password
 * Format: 3 random words + 4 digits + special char
 * This creates passwords like: "Tiger-Cloud-Ocean-4821!"
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
 * Extract database host/name from DATABASE_URL for logging
 */
function getDatabaseInfo(): string {
  const dbUrl = process.env.DATABASE_URL || "";
  try {
    // Parse the connection string to extract host
    const match = dbUrl.match(/@([^:\/]+)/);
    if (match) {
      return match[1];
    }
    // If it's a Railway URL, try to extract the identifier
    if (dbUrl.includes("railway.app")) {
      return "Railway PostgreSQL";
    }
    return "PostgreSQL Database";
  } catch {
    return "Unknown Database";
  }
}

/**
 * Find or create a company to link the admin to
 */
async function findOrCreateCompany(): Promise<{ id: string; name: string }> {
  // First, try to find an existing company
  const existingCompany = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existingCompany) {
    console.log(`📍 Using existing company: ${existingCompany.name}`);
    return { id: existingCompany.id, name: existingCompany.name };
  }

  // No company exists, create a new one
  console.log(`📍 No company found. Creating: ${DEFAULT_COMPANY_NAME}`);
  const newCompany = await prisma.company.create({
    data: {
      id: randomUUID(),
      name: DEFAULT_COMPANY_NAME,
      updatedAt: new Date(),
    },
  });

  return { id: newCompany.id, name: newCompany.name };
}

/**
 * Find or create a department for the admin
 */
async function findOrCreateDepartment(companyId: string): Promise<string> {
  // Try to find an existing department
  const existingDept = await prisma.department.findFirst({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });

  if (existingDept) {
    return existingDept.id;
  }

  // Create a default HR department
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
 * Find or create an admin permission profile
 */
async function findOrCreatePermissionProfile(companyId: string): Promise<string | null> {
  // Try to find an existing admin profile
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

  // Create an admin permission profile
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
 * Main function to create the initial admin
 */
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║        PeopleCore - Initial Tenant Admin Setup              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const dbInfo = getDatabaseInfo();
  console.log(`🔗 Target Database: ${dbInfo}`);
  console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
  console.log(`👤 Admin Role: ${ADMIN_ROLE}\n`);

  try {
    // Step 1: Find or create company
    const company = await findOrCreateCompany();

    // Step 2: Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: {
        email_companyId: {
          email: ADMIN_EMAIL,
          companyId: company.id,
        },
      },
    });

    if (existingAdmin) {
      console.log("\n╔══════════════════════════════════════════════════════════════╗");
      console.log("║                    ADMIN ALREADY EXISTS                       ║");
      console.log("╠══════════════════════════════════════════════════════════════╣");
      console.log(`║  Email:    ${ADMIN_EMAIL.padEnd(47)}║`);
      console.log(`║  Company:  ${company.name.padEnd(47)}║`);
      console.log(`║  Status:   User already exists - no changes made              ║`);
      console.log("║                                                               ║");
      console.log("║  💡 To reset password, use the 'Forgot Password' feature     ║");
      console.log("║     or contact your system administrator.                    ║");
      console.log("╚══════════════════════════════════════════════════════════════╝\n");
      return;
    }

    // Step 3: Generate secure password
    const tempPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    // Step 4: Find or create department
    const departmentId = await findOrCreateDepartment(company.id);

    // Step 5: Find or create permission profile
    const permissionProfileId = await findOrCreatePermissionProfile(company.id);

    // Step 6: Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: ADMIN_EMAIL,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        password: hashedPassword,
        role: ADMIN_ROLE,
        companyId: company.id,
        departmentId,
        permissionProfileId,
        isActivated: true,
        updatedAt: new Date(),
      },
    });

    // Step 7: Create associated employee record
    await prisma.employee.create({
      data: {
        id: randomUUID(),
        userId: adminUser.id,
        companyId: company.id,
        departmentId,
        isActive: true,
      },
    });

    // Success output
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║              ✅ INITIAL ADMIN CREATED SUCCESSFULLY           ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║                                                               ║");
    console.log(`║  📧 Email:     ${ADMIN_EMAIL.padEnd(44)}║`);
    console.log(`║  🔑 Password:  ${tempPassword.padEnd(44)}║`);
    console.log(`║  🏢 Company:   ${company.name.padEnd(44)}║`);
    console.log(`║  🔗 Database:  ${dbInfo.padEnd(44)}║`);
    console.log("║                                                               ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║  ⚠️  IMPORTANT: Save this password now!                       ║");
    console.log("║  This is the only time it will be displayed.                 ║");
    console.log("║                                                               ║");
    console.log("║  💡 Next steps:                                               ║");
    console.log("║  1. Log in at your PeopleCore URL with these credentials     ║");
    console.log("║  2. Change your password immediately after first login       ║");
    console.log("║  3. Configure company settings and invite team members       ║");
    console.log("║                                                               ║");
    console.log("║  🌐 Alternative: Use /setup-admin to create admins via UI    ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error("\n❌ Error creating admin:", error);
    throw error;
  }
}

// Run the script
main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

