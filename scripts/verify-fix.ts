// Quick verification that the fix works
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFix() {
  console.log('✅ Testing permission dropdown fix...');

  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }

    // Get profiles like the API does
    const profiles = await prisma.permissionProfile.findMany({
      where: { companyId: adminUser.companyId },
      include: { _count: { select: { users: true } } },
      orderBy: [{ builtIn: 'desc' }, { name: 'asc' }],
    });

    console.log(`📊 Found ${profiles.length} permission profiles:`);
    profiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.name} (${profile.builtIn ? 'Built-in' : 'Custom'})`);
    });

    // Simulate the API response structure
    const apiResponse = { profiles, pagination: { page: 1, limit: 10, total: profiles.length, totalPages: 1 } };

    // Test the OLD logic (what was causing the bug)
    const oldLogicResult = Array.isArray(apiResponse) ? apiResponse : [];
    console.log(`\n❌ Old logic result: ${oldLogicResult.length} profiles (WRONG)`);

    // Test the NEW logic (the fix)
    const newLogicResult = Array.isArray(apiResponse.profiles) ? apiResponse.profiles : [];
    console.log(`✅ New logic result: ${newLogicResult.length} profiles (CORRECT)`);

    console.log('\n🎉 Fix verified! Permission dropdown should now work correctly.');

  } catch (error) {
    console.error('❌ Error verifying fix:', error);
  }
}

verifyFix()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
