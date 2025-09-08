import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugUserPermissions() {
  console.log('🔍 Debugging user permissions issue...');

  const targetUserId = 'cmfbi1xpq0008qspke5wlh20o';

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        permissionProfile: true,
        company: true,
      },
    });

    if (!user) {
      console.log(`❌ User with ID ${targetUserId} not found`);
      return;
    }

    console.log(`✅ User found:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Company ID: ${user.companyId}`);
    console.log(`   - Company Name: ${user.company?.name}`);
    console.log(`   - Permission Profile: ${user.permissionProfile?.name || 'None (using default)'}`);

    // Check if there's an admin user to simulate the API call
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      console.log('❌ No admin user found to test permissions');
      return;
    }

    console.log(`\n🔍 Simulating API call with admin user: ${adminUser.email}`);

    // Test the same query as the API
    const apiUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        companyId: adminUser.companyId,
      },
      include: {
        permissionProfile: true,
      },
    });

    if (!apiUser) {
      console.log('❌ API query returned no user - user might not belong to admin\'s company');
      console.log(`   Admin company: ${adminUser.companyId}`);
      console.log(`   Target user company: ${user.companyId}`);

      if (adminUser.companyId !== user.companyId) {
        console.log('⚠️  Company mismatch! This would cause the 404 error.');
      }
    } else {
      console.log('✅ API query successful - user found in admin\'s company');
    }

    // Check permission audit table
    const auditCount = await prisma.permissionAudit.count({
      where: { employeeId: targetUserId },
    });

    console.log(`\n📊 Permission audit records for this user: ${auditCount}`);

  } catch (error) {
    console.error('❌ Error debugging user permissions:', error);
  }
}

debugUserPermissions()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
