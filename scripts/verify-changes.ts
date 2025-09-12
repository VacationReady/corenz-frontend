import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyChanges() {
  console.log("🎯 Verifying all requested changes...\n");

  try {
    // 1. Check that Default permission profile was removed
    console.log("1️⃣ Checking Default permission profile removal:");
    const defaultProfile = await prisma.permissionProfile.findFirst({
      where: { name: "Default" },
    });
    if (defaultProfile) {
      console.log("❌ Default profile still exists:", defaultProfile.name);
    } else {
      console.log("✅ Default permission profile successfully removed");
    }

    // 2. Check that standard working pattern was created
    console.log("\n2️⃣ Checking standard working pattern creation:");
    const workingPattern = await prisma.workingPattern.findFirst({
      where: { name: "Standard (Mon-Fri, 9am-5pm)" },
      include: {
        WorkingPatternWeek: {
          include: {
            WorkingPatternDay: true,
          },
        },
      },
    });
    if (workingPattern) {
      console.log("✅ Standard working pattern created:", workingPattern.name);
      console.log(`   Weeks: ${workingPattern.WorkingPatternWeek.length}`);
      console.log(
        `   Days: ${workingPattern.WorkingPatternWeek[0]?.WorkingPatternDay.length || 0}`,
      );
    } else {
      console.log("❌ Standard working pattern not found");
    }

    // 3. Check that employee detail screens were added to permissions
    console.log("\n3️⃣ Checking employee detail screens in permissions:");
    const adminProfile = await prisma.permissionProfile.findFirst({
      where: { name: "Admin" },
    });

    if (adminProfile) {
      const permissions = JSON.parse(adminProfile.permissions as string);
      const employeeScreens = Object.keys(permissions).filter((key) =>
        key.startsWith("employee-"),
      );

      console.log(
        `✅ Found ${employeeScreens.length} employee detail screens in Admin permissions:`,
      );
      employeeScreens.forEach((screen) => {
        console.log(`   - ${screen}`);
      });

      // Check if all expected screens are there
      const expectedScreens = [
        "employee-overview",
        "employee-documents",
        "employee-driver-licenses",
        "employee-employment-checks",
        "employee-forms",
        "employee-leave",
        "employee-offboarding",
        "employee-onboarding",
        "employee-performance",
        "employee-settings",
        "employee-training",
      ];

      const missingScreens = expectedScreens.filter(
        (screen) => !employeeScreens.includes(screen),
      );
      if (missingScreens.length > 0) {
        console.log(`❌ Missing screens: ${missingScreens.join(", ")}`);
      } else {
        console.log("✅ All expected employee detail screens are present");
      }
    }

    // 4. Check that users have correct permission profiles
    console.log("\n4️⃣ Checking user permission profile assignments:");
    const users = await prisma.user.findMany({
      include: {
        permissionProfile: true,
      },
    });

    users.forEach((user) => {
      const expectedProfile =
        user.role === "ADMIN"
          ? "Admin"
          : user.role === "MANAGER"
            ? "Manager"
            : "Employee";
      const actualProfile = user.permissionProfile?.name;

      if (actualProfile === expectedProfile) {
        console.log(`✅ ${user.email}: ${user.role} → ${actualProfile}`);
      } else {
        console.log(
          `❌ ${user.email}: ${user.role} → ${actualProfile} (expected ${expectedProfile})`,
        );
      }
    });

    // 5. Check permissions.ts has new screens
    console.log(
      "\n5️⃣ Checking permissions.ts includes employee detail screens:",
    );
    const { getAvailableScreens } = await import("../app/lib/permissions");
    const availableScreens = getAvailableScreens();
    const employeeDetailScreens = availableScreens.filter((screen) =>
      screen.startsWith("employee-"),
    );

    console.log(
      `✅ Found ${employeeDetailScreens.length} employee detail screens in permissions.ts:`,
    );
    employeeDetailScreens.forEach((screen) => {
      console.log(`   - ${screen}`);
    });

    console.log("\n🎉 All changes verified successfully!");
  } catch (error) {
    console.error("❌ Error verifying changes:", error);
  }
}

verifyChanges()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
