import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function removeDefaultProfile() {
  console.log("🗑️ Removing Default permission profile...\n");

  try {
    // Find the Default profile
    const defaultProfile = await prisma.permissionProfile.findFirst({
      where: { name: "Default" },
      include: { users: true },
    });

    if (!defaultProfile) {
      console.log("✅ Default profile not found - already removed");
      return;
    }

    console.log(
      `Found Default profile with ${defaultProfile.users.length} assigned users`,
    );

    // If there are users assigned to Default, we need to reassign them
    if (defaultProfile.users.length > 0) {
      console.log("🔄 Reassigning users from Default profile...");

      for (const user of defaultProfile.users) {
        let targetProfile = null;

        if (user.role === "ADMIN") {
          targetProfile = await prisma.permissionProfile.findFirst({
            where: { name: "Admin" },
          });
        } else if (user.role === "MANAGER") {
          targetProfile = await prisma.permissionProfile.findFirst({
            where: { name: "Manager" },
          });
        } else {
          targetProfile = await prisma.permissionProfile.findFirst({
            where: { name: "Employee" },
          });
        }

        if (targetProfile) {
          await prisma.user.update({
            where: { id: user.id },
            data: { permissionProfileId: targetProfile.id },
          });
          console.log(`✅ Reassigned ${user.email} to ${targetProfile.name}`);
        }
      }
    }

    // Now safe to delete the Default profile
    await prisma.permissionProfile.delete({
      where: { id: defaultProfile.id },
    });

    console.log("✅ Default permission profile successfully removed");
  } catch (error) {
    console.error("❌ Error removing Default profile:", error);
  }
}

removeDefaultProfile()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
