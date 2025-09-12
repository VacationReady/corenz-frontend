import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixDefaultProfile() {
  console.log("🔧 Fixing Default permission profile...");

  try {
    const defaultProfile = await prisma.permissionProfile.findFirst({
      where: {
        name: "Default",
        builtIn: true,
      },
    });

    if (!defaultProfile) {
      console.log("❌ Default profile not found");
      return;
    }

    // Check if permissions is valid JSON
    try {
      JSON.parse(defaultProfile.permissions as string);
      console.log("✅ Default profile permissions are already valid JSON");
      return;
    } catch (error) {
      console.log(
        "⚠️  Default profile has invalid permissions JSON, fixing...",
      );

      // Create empty permissions object (no permissions for default)
      const emptyPermissions = JSON.stringify({});

      await prisma.permissionProfile.update({
        where: { id: defaultProfile.id },
        data: { permissions: emptyPermissions },
      });

      console.log("✅ Fixed Default profile permissions");
    }
  } catch (error) {
    console.error("❌ Error fixing Default profile:", error);
  }
}

fixDefaultProfile()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
