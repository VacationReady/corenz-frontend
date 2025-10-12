import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAdminPermissions() {
  console.log("🔍 Checking admin user permissions...");

  try {
    const adminUser = await prisma.user.findFirst({
      where: { email: "admin@peoplecore.com" },
      include: {
        PermissionProfile: true,
      },
    });

    if (!adminUser) {
      console.log("❌ Admin user not found");
      return;
    }

    console.log(`Admin user: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Has permission profile: ${!!adminUser.PermissionProfile}`);

    if (adminUser.PermissionProfile) {
      console.log(`Permission profile: ${adminUser.PermissionProfile.name}`);
      console.log(`Built-in: ${adminUser.PermissionProfile.builtIn}`);
    } else {
      console.log("Using default role-based permissions");
    }

    // Test permission resolution
    const permissions = adminUser.PermissionProfile
      ? JSON.parse(adminUser.PermissionProfile.permissions as string)
      : {
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
        };

    console.log('\nPermissions for "permissions" screen:');
    const permissionsScreen = permissions["permissions"];
    if (permissionsScreen && permissionsScreen.includes("read")) {
      console.log("✅ Admin has read access to permissions");
    } else {
      console.log("❌ Admin does NOT have read access to permissions");
    }

    console.log("\nAll permissions:");
    console.log(JSON.stringify(permissions, null, 2));
  } catch (error) {
    console.error("❌ Error checking admin permissions:", error);
  }
}

checkAdminPermissions()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
