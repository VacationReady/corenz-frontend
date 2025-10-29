import { prisma } from "@/lib/prisma";

async function backfillSiteLocation() {
  const locations = await prisma.location.findMany({
    select: { id: true, name: true },
  });

  const lookup = new Map(
    locations
      .filter((location) => location.name)
      .map((location) => [location.name.toLowerCase(), location.id] as const),
  );

  const employees = await prisma.employee.findMany({
    where: {
      locationId: null,
      siteLocation: { not: null },
    },
    select: { id: true, siteLocation: true },
  });

  let updated = 0;

  for (const employee of employees) {
    const siteLocation = employee.siteLocation?.trim();
    if (!siteLocation) {
      continue;
    }

    const locationId = lookup.get(siteLocation.toLowerCase());
    if (!locationId) {
      continue;
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { locationId },
    });

    updated += 1;
  }

  console.log(`✅ Backfill complete. Updated ${updated} employee location assignments.`);
}

backfillSiteLocation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
