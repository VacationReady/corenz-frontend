import { PrismaClient } from '@prisma/client';

type ManualDiscrepancy = {
  companyId: string;
  companyName: string | null;
  allowManualEntry: boolean;
  allowManualTimeEntry: boolean;
  allowMobileClock: boolean;
};

type PhotoDiscrepancy = {
  companyId: string;
  companyName: string | null;
  requirePhotos: boolean;
  photoRequirement: string;
};

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying TimeTrackingSettings migration...\n');

  const [companies, settings] = await Promise.all([
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    }),
    prisma.timeTrackingSettings.findMany({
      select: {
        companyId: true,
        allowManualEntry: true,
        allowManualTimeEntry: true,
        allowMobileClock: true,
        requirePhotos: true,
        photoRequirement: true,
      },
    }),
  ]);

  const settingsByCompany = new Map(
    settings.map((row) => [row.companyId, row])
  );

  const missingSettings = companies.filter(
    (company) => !settingsByCompany.has(company.id)
  );

  const manualDiscrepancies: ManualDiscrepancy[] = [];
  const photoDiscrepancies: PhotoDiscrepancy[] = [];

  for (const company of companies) {
    const row = settingsByCompany.get(company.id);

    if (!row) {
      continue;
    }

    if (
      row.allowManualEntry !== row.allowManualTimeEntry ||
      row.allowManualEntry !== row.allowMobileClock
    ) {
      manualDiscrepancies.push({
        companyId: company.id,
        companyName: company.name ?? null,
        allowManualEntry: row.allowManualEntry,
        allowManualTimeEntry: row.allowManualTimeEntry,
        allowMobileClock: row.allowMobileClock,
      });
    }

    const requirePhotosFromEnum = row.photoRequirement !== 'NONE';

    if (row.requirePhotos !== requirePhotosFromEnum) {
      photoDiscrepancies.push({
        companyId: company.id,
        companyName: company.name ?? null,
        requirePhotos: row.requirePhotos,
        photoRequirement: row.photoRequirement,
      });
    }
  }

  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Companies: ${companies.length}`);
  console.log(`   Settings rows: ${settings.length}`);
  console.log(`   Missing settings: ${missingSettings.length}`);
  console.log(`   Manual entry discrepancies: ${manualDiscrepancies.length}`);
  console.log(`   Photo requirement discrepancies: ${photoDiscrepancies.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (missingSettings.length > 0) {
    console.log('⚠️  Companies missing TimeTrackingSettings:');
    missingSettings.slice(0, 20).forEach((company) => {
      console.log(
        `   - ${company.id}${
          company.name ? ` (${company.name})` : ''
        }${company.isActive ? '' : ' [inactive]'}`
      );
    });

    if (missingSettings.length > 20) {
      console.log(`   …and ${missingSettings.length - 20} more`);
    }

    console.log('');
  }

  if (manualDiscrepancies.length > 0) {
    console.log('⚠️  Manual entry discrepancies detected:');
    manualDiscrepancies.slice(0, 20).forEach((item) => {
      console.log(
        `   - ${item.companyId}${item.companyName ? ` (${item.companyName})` : ''}`
      );
      console.log(
        `     allowManualEntry=${item.allowManualEntry}, allowManualTimeEntry=${item.allowManualTimeEntry}, allowMobileClock=${item.allowMobileClock}`
      );
    });

    if (manualDiscrepancies.length > 20) {
      console.log(`   …and ${manualDiscrepancies.length - 20} more`);
    }

    console.log('');
  }

  if (photoDiscrepancies.length > 0) {
    console.log('⚠️  Photo requirement discrepancies detected:');
    photoDiscrepancies.slice(0, 20).forEach((item) => {
      console.log(
        `   - ${item.companyId}${item.companyName ? ` (${item.companyName})` : ''}`
      );
      console.log(
        `     requirePhotos=${item.requirePhotos}, photoRequirement=${item.photoRequirement}`
      );
    });

    if (photoDiscrepancies.length > 20) {
      console.log(`   …and ${photoDiscrepancies.length - 20} more`);
    }

    console.log('');
  }

  if (
    missingSettings.length === 0 &&
    manualDiscrepancies.length === 0 &&
    photoDiscrepancies.length === 0
  ) {
    console.log('✅ Verification passed. All data aligned.');
  } else {
    console.log('❌ Verification failed. See discrepancies above.');
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('❌ Verification encountered an error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
