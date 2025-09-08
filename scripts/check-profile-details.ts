import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProfileDetails() {
  console.log('🔍 Checking permission profile details...');

  const profiles = await prisma.permissionProfile.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      builtIn: true,
      permissions: true,
      companyId: true,
    },
  });

  console.log(`Found ${profiles.length} permission profiles:\n`);

  profiles.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.name}`);
    console.log(`   - ID: ${profile.id}`);
    console.log(`   - Built-in: ${profile.builtIn}`);
    console.log(`   - Description: ${profile.description || 'No description'}`);
    console.log(`   - Company ID: ${profile.companyId}`);

    try {
      const permissions = JSON.parse(profile.permissions as string);
      const screenCount = Object.keys(permissions).length;
      const totalPermissions = Object.values(permissions).reduce((total: number, actions: any) => total + actions.length, 0);
      console.log(`   - Screens: ${screenCount}`);
      console.log(`   - Total Permissions: ${totalPermissions}`);
    } catch (error) {
      console.log(`   - Permissions: Invalid JSON - ${profile.permissions}`);
    }
    console.log('');
  });

  console.log('🎉 Profile details check completed!');
}

checkProfileDetails()
  .catch((e) => {
    console.error('Error checking profile details:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
