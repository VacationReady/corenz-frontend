import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const patterns = [
    {
      name: "Standard Mon-Fri",
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      description: "Standard Monday to Friday working pattern"
    },
    {
      name: "Tues-Sat",
      workingDays: ["Tue", "Wed", "Thu", "Fri", "Sat"],
      description: "Tuesday to Saturday working pattern"
    },
    {
      name: "4-Day Week",
      workingDays: ["Mon", "Tue", "Thu", "Fri"],
      description: "Flexible four-day work week"
    }
  ];

  for (const pattern of patterns) {
    await prisma.workingPattern.upsert({
      where: { name: pattern.name },
      update: {},
      create: pattern,
    });
  }

  console.log("✅ Working patterns seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
