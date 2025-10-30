import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function backfillSiteLocation() {
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, companyId: true },
  });

  const locationLookup = new Map<string, string>(
    locations
      .filter((location) => location.name)
      .flatMap((location) => {
        const nameKey = location.name.toLowerCase();
        const keys = [`${location.companyId ?? "global"}::${nameKey}`];
        if (location.companyId) {
          keys.push(`global::${nameKey}`);
        }
        return keys.map((key) => [key, location.id] as const);
      }),
  );

  const employees = await prisma.employee.findMany({
    where: {
      locationId: null,
      siteLocation: { not: null },
    },
    select: { id: true, siteLocation: true, companyId: true },
  });

  let updated = 0;
  let createdLocations = 0;
  const unmatched = new Map<string, number>();

  for (const employee of employees) {
    const siteLocation = employee.siteLocation?.trim();
    if (!siteLocation) {
      continue;
    }

    const siteKey = siteLocation.toLowerCase();
    const companyKey = `${employee.companyId}::${siteKey}`;
    const globalKey = `global::${siteKey}`;

    let locationId = locationLookup.get(companyKey) ?? locationLookup.get(globalKey) ?? null;

    if (!locationId) {
      try {
        const created = await prisma.location.create({
          data: {
            id: crypto.randomUUID(),
            name: siteLocation,
            companyId: employee.companyId,
          },
          select: { id: true, name: true, companyId: true },
        });

        locationId = created.id;
        createdLocations += 1;

        const createdKey = `${created.companyId ?? "global"}::${created.name.toLowerCase()}`;
        locationLookup.set(createdKey, created.id);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const existing = await prisma.location.findFirst({
            where: {
              name: { equals: siteLocation, mode: "insensitive" },
            },
            select: { id: true, name: true, companyId: true },
          });

          if (existing) {
            locationId = existing.id;
            const existingKey = `${existing.companyId ?? "global"}::${existing.name.toLowerCase()}`;
            locationLookup.set(existingKey, existing.id);
          }
        }

        if (!locationId) {
          unmatched.set(siteLocation, (unmatched.get(siteLocation) ?? 0) + 1);
          continue;
        }
      }
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { locationId },
    });

    updated += 1;
  }

  console.log(
    `✅ Backfill complete. Checked ${employees.length} employees, created ${createdLocations} locations, and updated ${updated} location assignments.`,
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
