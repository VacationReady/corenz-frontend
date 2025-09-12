import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testFixedPermissionsAPI() {
  console.log("🔍 Testing fixed permissions API...");

  try {
    // Get the admin user (who should have access)
    const adminUser = await prisma.user.findFirst({
      where: { email: "admin@peoplecore.com" },
    });

    if (!adminUser) {
      console.log("❌ Admin user not found");
      return;
    }

    // Get the correct user ID (not employee ID) for testing
    const targetUserId = "cmfbi1xdo0006qspk9loplo5s"; // This is the actual user ID from our debug output

    console.log(`Testing API with:`);
    console.log(`   Admin user: ${adminUser.email} (${adminUser.id})`);
    console.log(`   Target user: ${targetUserId}`);

    // Test the API logic directly
    const user = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        companyId: adminUser.companyId,
      },
      include: {
        permissionProfile: true,
      },
    });

    if (!user) {
      console.log("❌ User not found or not in same company");
      return;
    }

    console.log("✅ User found successfully!");
    console.log(`   User: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(
      `   Permission Profile: ${user.permissionProfile?.name || "Default"}`,
    );

    // Test audit trail query
    const auditTrail = await prisma.permissionAudit.findMany({
      where: { employeeId: targetUserId },
      select: {
        id: true,
        changedAt: true,
        note: true,
        oldPermissions: true,
        newPermissions: true,
        changedBy: {
          select: { id: true, name: true, email: true },
        },
        oldProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
        newProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
      },
      orderBy: { changedAt: "desc" },
      take: 10,
    });

    console.log(`\n📊 Audit trail records: ${auditTrail.length}`);

    console.log("\n✅ API should work correctly now!");
  } catch (error) {
    console.error("❌ Error testing fixed API:", error);
  }
}

testFixedPermissionsAPI()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
