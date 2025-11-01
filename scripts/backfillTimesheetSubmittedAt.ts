import { prisma } from "@/lib/prisma";

async function backfillTimesheetSubmittedAt() {
  const pendingTimesheets = await prisma.timesheet.findMany({
    where: {
      approvalStatus: {
        in: ["PENDING", "SUBMITTED"],
      },
      submittedAt: null,
      totalHours: {
        gt: 0,
      },
      Company: {
        TimeTrackingSettings: {
          some: {
            defaultWorkflowId: {
              not: null,
            },
          },
        },
      },
    },
    select: {
      id: true,
      employeeId: true,
      companyId: true,
      approvalStatus: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      updatedAt: true,
      totalHours: true,
    },
  });

  if (pendingTimesheets.length === 0) {
    console.log("✅ No pending timesheets without submittedAt found.");
    return;
  }

  let updatedCount = 0;

  for (const timesheet of pendingTimesheets) {
    const referenceDate = timesheet.createdAt ?? timesheet.updatedAt ?? new Date();

    await prisma.timesheet.update({
      where: { id: timesheet.id },
      data: {
        submittedAt: referenceDate,
      },
    });

    updatedCount += 1;
    console.log(
      `Updated timesheet ${timesheet.id} (status ${timesheet.approvalStatus}) for employee ${timesheet.employeeId} (${timesheet.periodStart.toISOString()} - ${timesheet.periodEnd.toISOString()})`
    );
  }

  console.log(`✅ Backfill complete. Updated ${updatedCount} timesheets.`);
}

backfillTimesheetSubmittedAt()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Backfill failed", err);
    process.exit(1);
  });
