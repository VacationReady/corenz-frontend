// Step 1️⃣: system category seeding and API protection

// File: prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create system-defined event categories if they do not exist
  const systemCategories = [
    { name: 'Annual Leave', systemDefined: true },
    { name: 'Sickness', systemDefined: true },
  ];

  for (const category of systemCategories) {
    await prisma.eventCategory.upsert({
      where: { name: category.name },
      update: { systemDefined: true },
      create: category,
    });
  }

  console.log('✅ System-defined event categories seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// File: prisma/schema.prisma (add systemDefined field if not present)

model EventCategory {
  id             String            @id @default(cuid())
  name           String            @unique
  systemDefined  Boolean           @default(false)
  subcategories  EventSubcategory[]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

// Migration will be required:
// npx prisma migrate dev --name add-systemdefined-to-eventcategory