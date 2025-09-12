import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testPermissionsDropdown() {
  console.log("🔍 Testing permissions dropdown data...");

  try {
    // Simulate the API call that AddEmployeeModal makes
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminUser) {
      console.log("❌ No admin user found");
      return;
    }

    console.log(`Testing with admin user: ${adminUser.email}`);

    // Simulate API parameters (same as AddEmployeeModal)
    const search = "";
    const page = 1;
    const limit = 10;
    const filterType = "all";
    const sortBy = "name";
    const sortOrder = "asc";
    const offset = (page - 1) * limit;

    // Build where clause (same as API)
    const whereClause: any = {
      companyId: adminUser.companyId,
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Add type filter
    if (filterType === "builtin") {
      whereClause.builtIn = true;
    } else if (filterType === "custom") {
      whereClause.builtIn = false;
    }

    // Build orderBy clause
    const orderBy: any[] = [];

    if (sortBy === "users") {
      orderBy.push({ users: { _count: sortOrder } });
    } else if (sortBy === "createdAt") {
      orderBy.push({ createdAt: sortOrder });
    } else {
      // Always put built-in profiles first for name sorting
      orderBy.push({ builtIn: "desc" });
      orderBy.push({ name: sortOrder });
    }

    // Get profiles (same as API)
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

    // Simulate what the API returns
    const apiResponse = {
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    console.log(`\n✅ API Response Structure:`);
    console.log(`   Type: ${typeof apiResponse}`);
    console.log(`   Has profiles property: ${"profiles" in apiResponse}`);
    console.log(`   Has pagination property: ${"pagination" in apiResponse}`);
    console.log(`   Profiles count: ${apiResponse.profiles.length}`);

    console.log(`\n📋 Profile Details:`);
    apiResponse.profiles.forEach((profile, index) => {
      console.log(
        `${index + 1}. ${profile.name} (${profile.builtIn ? "Built-in" : "Custom"}) - ${profile.description || "No description"}`,
      );
    });

    // Simulate what AddEmployeeModal is doing wrong
    console.log(`\n❌ AddEmployeeModal Current Logic:`);
    console.log(`   Array.isArray(apiResponse): ${Array.isArray(apiResponse)}`);
    console.log(`   Would set permissionProfiles to: [] (empty array)`);

    // Simulate correct fix
    console.log(`\n✅ Correct Logic Should Be:`);
    const correctProfiles = Array.isArray(apiResponse.profiles)
      ? apiResponse.profiles
      : [];
    console.log(
      `   Array.isArray(apiResponse.profiles): ${Array.isArray(apiResponse.profiles)}`,
    );
    console.log(
      `   Would set permissionProfiles to: ${correctProfiles.length} profiles`,
    );

    console.log(`\n🔧 FIX: Change line 92 in AddEmployeeModal from:`);
    console.log(
      `   setPermissionProfiles(Array.isArray(profilesRes) ? profilesRes : []);`,
    );
    console.log(`   to:`);
    console.log(
      `   setPermissionProfiles(Array.isArray(profilesRes.profiles) ? profilesRes.profiles : []);`,
    );
  } catch (error) {
    console.error("❌ Error testing permissions dropdown:", error);
  }
}

testPermissionsDropdown()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
