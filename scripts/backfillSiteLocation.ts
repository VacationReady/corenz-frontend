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
  const unmatched = new Map<string, number>();

  for (const employee of employees) {
    const siteLocation = employee.siteLocation?.trim();
    if (!siteLocation) {
      continue;
    }

    const locationId = lookup.get(siteLocation.toLowerCase());
    if (!locationId) {
      unmatched.set(siteLocation, (unmatched.get(siteLocation) ?? 0) + 1);
      continue;
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { locationId },
    });

    updated += 1;
  }

  console.log(
    `✅ Backfill complete. Checked ${employees.length} employees and updated ${updated} location assignments.`,
  );

  if (unmatched.size > 0) {
    console.log("⚠️  Unmatched site locations (no location name found):");
    for (const [name, count] of unmatched.entries()) {
      console.log(`   • ${name} (employees: ${count})`);
    }
  }
}

backfillSiteLocation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
