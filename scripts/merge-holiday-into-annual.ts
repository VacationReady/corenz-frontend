/*
  Script: Merge legacy "Holiday" event category into canonical "Annual Leave"
  - Reassign LeaveEntitlement.eventCategoryId from Holiday -> Annual Leave
  - Reassign LeaveRequest.eventCategoryId from Holiday -> Annual Leave
  - Archive Holiday (set isActive=false) or delete if --delete passed
  Usage (ts-node):
    npx ts-node scripts/merge-holiday-into-annual.ts [--companyId <id>] [--delete]
*/

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const companyIdArgIndex = args.indexOf("--companyId");
  const deleteFlag = args.includes("--delete");
  const companyId =
    companyIdArgIndex >= 0 && args[companyIdArgIndex + 1]
      ? args[companyIdArgIndex + 1]
      : undefined;

  const companyFilter = companyId ? { companyId } : {};

  const annual = await prisma.eventCategory.findFirst({
    where: { name: "Annual Leave", isActive: true, ...companyFilter },
  });
  if (!annual) {
    throw new Error(
      `Annual Leave category not found$${companyId ? ` for company ${companyId}` : ""}. Create it first.`,
    );
  }

  const holiday = await prisma.eventCategory.findFirst({
    where: { name: "Holiday", isActive: true, ...companyFilter },
  });

  if (!holiday) {
    console.log("No active Holiday category found. Nothing to merge.");
    return;
  }

  console.log(`Merging Holiday (${holiday.id}) into Annual Leave (${annual.id})`);

  // Reassign LeaveEntitlement
  const entitlements = await prisma.leaveEntitlement.updateMany({
    where: { eventCategoryId: holiday.id, ...companyFilter },
    data: { eventCategoryId: annual.id, updatedAt: new Date() },
  });
  console.log(`Updated entitlements: ${entitlements.count}`);

  // Reassign LeaveRequest
  const requests = await prisma.leaveRequest.updateMany({
    where: { eventCategoryId: holiday.id, ...companyFilter },
    data: { eventCategoryId: annual.id, updatedAt: new Date() },
  });
  console.log(`Updated leave requests: ${requests.count}`);

  if (deleteFlag) {
    await prisma.eventCategory.delete({ where: { id: holiday.id } });
    console.log("Deleted Holiday category.");
  } else {
    await prisma.eventCategory.update({
      where: { id: holiday.id },
      data: { isActive: false, updatedAt: new Date() },
    });
    console.log("Archived Holiday category (isActive=false).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


