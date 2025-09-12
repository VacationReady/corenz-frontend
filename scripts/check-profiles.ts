import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkProfiles() {
  console.log("🔍 Checking permission profiles in database...");

  const profiles = await prisma.permissionProfile.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      builtIn: true,
      companyId: true,
    },
  });

  console.log(`Found ${profiles.length} permission profiles:`);

  profiles.forEach((profile) => {
    console.log(
      `- ${profile.name} (${profile.builtIn ? "Built-in" : "Custom"}) - ${profile.description || "No description"}`,
    );
  });

  console.log("\n🎉 Profile check completed!");
}

checkProfiles()
  .catch((e) => {
    console.error("Error checking profiles:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
