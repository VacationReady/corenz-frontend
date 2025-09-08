import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simulate the API logic from app/api/permissions/route.ts
async function testPermissionsAPI() {
  console.log('🔍 Testing permissions API logic...');

  try {
    // Simulate getting a user (using the admin user from seed)
    const user = await prisma.user.findFirst({
      where: { email: 'admin@corenz.com' },
    });

    if (!user) {
      console.log('❌ No admin user found');
      return;
    }

    console.log(`Testing with user: ${user.email} (Company: ${user.companyId})`);

    // Simulate API parameters
    const search = '';
    const page = 1;
    const limit = 10;
    const filterType = 'all' as 'all' | 'builtin' | 'custom';
    const sortBy = 'name' as 'name' | 'createdAt' | 'users';
    const sortOrder = 'asc' as 'asc' | 'desc';
    const offset = (page - 1) * limit;

    // Build where clause (same as API)
    const whereClause: any = {
      companyId: user.companyId,
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add type filter
    if (filterType === 'builtin') {
      whereClause.builtIn = true;
    } else if (filterType === 'custom') {
      whereClause.builtIn = false;
    }

    // Build orderBy clause
    const orderBy: any[] = [];

    if (sortBy === 'users') {
      orderBy.push({ users: { _count: sortOrder } });
    } else if (sortBy === 'createdAt') {
      orderBy.push({ createdAt: sortOrder });
    } else {
      // Always put built-in profiles first for name sorting
      orderBy.push({ builtIn: 'desc' });
      orderBy.push({ name: sortOrder });
    }

    console.log('Where clause:', JSON.stringify(whereClause, null, 2));
    console.log('Order by:', JSON.stringify(orderBy, null, 2));

    // Get profiles for the user's company
    const profiles = await prisma.permissionProfile.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    });

    const total = await prisma.permissionProfile.count({
      where: whereClause,
    });

    console.log(`\n✅ API would return ${profiles.length} profiles (total: ${total}):`);

    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name} (${profile.builtIn ? 'Built-in' : 'Custom'}) - ${profile._count?.users || 0} users`);
    });

    // Also test the API call that AddEmployeeModal makes
    console.log('\n🔍 Testing AddEmployeeModal API call...');
    const allProfilesForDropdown = await prisma.permissionProfile.findMany({
      where: {
        companyId: user.companyId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: [
        { builtIn: 'desc' },
        { name: 'asc' },
      ],
    });

    console.log(`AddEmployeeModal would see ${allProfilesForDropdown.length} profiles:`);
    allProfilesForDropdown.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name} ${profile.builtIn ? '(Built-in)' : ''} - ${profile.description || 'No description'}`);
    });

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testPermissionsAPI()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
