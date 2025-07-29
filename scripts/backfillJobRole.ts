import { prisma } from "@/lib/prisma";

async function backfillJobRole() {
  const employees = await prisma.employee.findMany({
    include: { user: true },
  });

  for (const emp of employees) {
    if (emp.user.jobRoleId) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { jobRoleId: emp.user.jobRoleId },
      });
    }
  }

  console.log("✅ Backfill complete.");
}

backfillJobRole()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
