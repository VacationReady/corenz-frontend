import { PrismaClient } from "@prisma/client";
import { DEFAULT_PERMISSIONS } from "../app/lib/permissions";

const prisma = new PrismaClient();

interface DefaultProfile {
  name: string;
  role: string;
  description: string;
}

const DEFAULT_PROFILES: DefaultProfile[] = [
  {
    name: "Admin",
    role: "ADMIN",
    description: "Full system access with administrative privileges",
  },
  {
    name: "Manager",
    role: "MANAGER",
    description: "Management access with employee oversight capabilities",
  },
  {
    name: "Employee",
    role: "EMPLOYEE",
    description: "Standard employee access to essential features",
  },
];

async function createDefaultPermissionProfiles() {
  console.log("🔧 Creating default permission profiles...");

  // Get the company ID (assuming we have one from the seed)
  const company = await prisma.company.findFirst();
  if (!company) {
    throw new Error("No company found. Please run the seed script first.");
  }

  for (const profile of DEFAULT_PROFILES) {
    // Check if profile already exists
    const existingProfile = await prisma.permissionProfile.findFirst({
      where: {
        companyId: company.id,
        name: profile.name,
        builtIn: true,
      },
    });

    if (existingProfile) {
      console.log(`✅ ${profile.name} profile already exists, skipping...`);
      continue;
    }

    // Get permissions for this role from DEFAULT_PERMISSIONS
    const permissions =
      DEFAULT_PERMISSIONS[profile.role as keyof typeof DEFAULT_PERMISSIONS];
    if (!permissions) {
      console.log(
        `⚠️  No default permissions found for role ${profile.role}, skipping...`,
      );
      continue;
    }

    // Create the permission profile
    const createdProfile = await prisma.permissionProfile.create({
      data: {
        companyId: company.id,
        name: profile.name,
        description: profile.description,
        permissions: JSON.stringify(permissions),
        builtIn: true,
      },
    });

    console.log(
      `✅ Created ${profile.name} permission profile (${createdProfile.id})`,
    );
  }

  console.log("🎉 Default permission profiles creation completed!");
}

createDefaultPermissionProfiles()
  .catch((e) => {
    console.error("Error creating default permission profiles:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
