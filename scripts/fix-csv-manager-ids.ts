import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCSVManagerIds() {
  console.log('🔧 Fixing CSV imported user manager IDs...\n');

  // 1. Find the System Admin
  const systemAdmin = await prisma.user.findFirst({
    where: { email: 'admin@peoplecore.com' }
  });

  if (!systemAdmin) {
    console.error('❌ System Admin not found!');
    return;
  }

  console.log(`✅ System Admin found: ${systemAdmin.userId}`);
  console.log(`   Email: ${systemAdmin.email}\n`);

  // 2. Find all users with broken manager references
  const allUsers = await prisma.user.findMany({
    where: {
      companyId: systemAdmin.companyId,
      managerUserId: { not: null }
    },
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      managerUserId: true
    }
  });

  // Check which manager IDs don't exist
  const allUserIds = new Set(allUsers.map(u => u.userId));
  const brokenUsers = allUsers.filter(user => 
    user.managerUserId && !allUserIds.has(user.managerUserId)
  );

  console.log(`📊 Statistics:`);
  console.log(`   Total users: ${allUsers.length}`);
  console.log(`   Users with broken manager refs: ${brokenUsers.length}\n`);

  if (brokenUsers.length === 0) {
    console.log('✅ No broken manager references found!');
    return;
  }

  // 3. Show broken manager IDs
  const brokenManagerIds = new Set(brokenUsers.map(u => u.managerUserId).filter(Boolean));
  console.log(`🚨 Broken manager IDs found:`);
  brokenManagerIds.forEach(id => {
    const count = brokenUsers.filter(u => u.managerUserId === id).length;
    console.log(`   ${id} (${count} users)`);
  });

  console.log(`\n💡 Sample broken users:`);
  brokenUsers.slice(0, 5).forEach(user => {
    console.log(`   - ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`     Manager ID: ${user.managerUserId}`);
  });

  // 4. Ask for confirmation
  console.log(`\n⚠️  This will update ${brokenUsers.length} users to report to System Admin`);
  console.log(`   Manager ID will change to: ${systemAdmin.userId}\n`);

  // Uncomment the following line to actually perform the update:
  // await performUpdate(brokenUsers, systemAdmin.userId);

  console.log(`\n✅ Dry run complete. To apply changes, uncomment the update line in the script.`);
}

async function performUpdate(brokenUsers: any[], correctManagerId: string) {
  console.log('🔄 Updating manager IDs...\n');

  const updatePromises = brokenUsers.map(user =>
    prisma.user.update({
      where: { userId: user.userId },
      data: { managerUserId: correctManagerId }
    })
  );

  await Promise.all(updatePromises);

  console.log(`✅ Updated ${brokenUsers.length} users successfully!`);
}

fixCSVManagerIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
