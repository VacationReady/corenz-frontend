import { prisma } from "@/lib/prisma";

async function backfillStartDate() {
  const employees = await prisma.employee.findMany({
    where: { startDate: null },
    select: {
      id: true,
      startDate: true,
      EmployeeWorkingPatternAssignment: {
        select: { effectiveDate: true },
        orderBy: { effectiveDate: "asc" },
      },
    },
  });

  let updated = 0;
  for (const emp of employees) {
    const earliest = emp.EmployeeWorkingPatternAssignment?.[0]?.effectiveDate;
    if (earliest) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { startDate: earliest },
      });
      updated++;
    }
  }

  console.log(`✅ Backfill complete. Updated ${updated} employees.`);
}

backfillStartDate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


