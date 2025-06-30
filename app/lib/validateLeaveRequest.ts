import { prisma } from "@/lib/prisma";
import { LeaveType } from "@prisma/client";
import { addDays, differenceInBusinessDays } from "date-fns";

/**
 * Validates a leave request against entitlement and business rules with diagnostics.
 */
export async function validateLeaveRequest({
  employeeId,
  leaveType,
  startDate,
  endDate,
  isAdmin = false,
}: {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  isAdmin?: boolean;
}) {
  console.log("✅ validateLeaveRequest called with:", {
    employeeId,
    leaveType,
    startDate,
    endDate,
    isAdmin,
  });

  const entitlement = await prisma.leaveEntitlement.findUnique({
    where: {
      employeeId_leaveType: {
        employeeId,
        leaveType,
      },
    },
  });

  console.log("🔍 Fetched entitlement:", entitlement);

  if (!entitlement) {
    console.error("❌ No entitlement found, throwing error");
    throw new Error(`No entitlement found for leave type: ${leaveType}`);
  }

  const daysRequested = differenceInBusinessDays(endDate, startDate) + 1;
  const availableDays = entitlement.totalDays - entitlement.usedDays;

  console.log("🔍 Entitlement check:", {
    daysRequested,
    availableDays,
    totalDays: entitlement.totalDays,
    usedDays: entitlement.usedDays,
  });

  if (daysRequested > availableDays) {
    console.error("❌ Insufficient entitlement, throwing error");
    throw new Error(
      `Insufficient entitlement: Requested ${daysRequested} days, but only ${availableDays} available.`
    );
  }

  // Enforce notice period for annual leave unless admin
  if (leaveType === "ANNUAL" && !isAdmin) {
    const today = new Date();
    const minNoticeDate = addDays(today, 2);

    console.log("🔍 Notice period check:", {
      today: today.toDateString(),
      minNoticeDate: minNoticeDate.toDateString(),
      startDate: startDate.toDateString(),
    });

    if (startDate < minNoticeDate) {
      console.error("❌ Notice period not met, throwing error");
      throw new Error(
        `Annual leave requires at least 2 working days notice. Earliest start date: ${minNoticeDate.toDateString()}`
      );
    }
  }

  // Overlap check:
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      approvalStatus: { in: ["PENDING", "APPROVED"] },
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    },
  });

  console.log("🔍 Overlap check result:", overlapping);

  if (overlapping) {
    console.error("❌ Overlapping leave found, throwing error");
    throw new Error(`You already have a leave booked that overlaps these dates.`);
  }

  console.log("✅ validateLeaveRequest passed all checks.");
}
