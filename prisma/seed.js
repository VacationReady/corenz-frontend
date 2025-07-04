const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ✅ 1. Create Company
  const company = await prisma.company.upsert({
    where: { name: 'CoreNZ' },
    update: {},
    create: {
      name: 'CoreNZ',
    },
  });
  console.log(`✅ Company created: ${company.name} (${company.id})`);

  // ✅ 2. Create Department linked to Company
  const department = await prisma.department.upsert({
    where: { name: 'Sales' },
    update: { companyId: company.id },
    create: {
      name: 'Sales',
      companyId: company.id,
    },
  });
  console.log(`✅ Department created: ${department.name} (${department.id})`);

  // ✅ 3. Create system-defined EventCategories
  const systemCategories = [
    {
      name: 'Annual Leave',
      categoryType: 'TIME_OFF',
      requiresApproval: true,
      adminOnly: false,
      color: '#008000',
      systemDefined: true,
    },
    {
      name: 'Sickness',
      categoryType: 'TIME_OFF',
      requiresApproval: false,
      adminOnly: false,
      color: '#FF0000',
      systemDefined: true,
    },
  ];

  for (const category of systemCategories) {
    console.log(`⏳ Attempting to upsert category: ${category.name}`);
    const result = await prisma.eventCategory.upsert({
      where: { name: category.name },
      update: {
        systemDefined: true,
        categoryType: category.categoryType,
        requiresApproval: category.requiresApproval,
        adminOnly: category.adminOnly,
        color: category.color,
      },
      create: category,
    });
    console.log(`✅ Category upserted: ${result.name} (${result.id})`);

    // ✅ 4. Create EventRule tied to the category and company
    const eventRule = await prisma.eventRule.upsert({
      where: {
        companyId_eventCategoryId: {
          companyId: company.id,
          eventCategoryId: result.id,
        },
      },
      update: {
        maxCarryoverDays: 5,
        carryoverExpiryMonths: 3,
      },
      create: {
        companyId: company.id,
        eventCategoryId: result.id,
        maxCarryoverDays: 5,
        carryoverExpiryMonths: 3,
      },
    });
    console.log(`✅ EventRule created for ${category.name} (${eventRule.id})`);
  }

  console.log('✅ Seeding process completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
