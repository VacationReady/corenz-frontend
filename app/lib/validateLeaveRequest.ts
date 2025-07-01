import { prisma } from "@/lib/prisma";
import { LeaveType } from "@prisma/client";
import { addDays, eachDayOfInterval } from "date-fns";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

/**
 * Validates a leave request against entitlement and business rules with working pattern validation.
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
  console.log("🛠️ [validateLeaveRequest] START:", {
    employeeId,
    leaveType,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    isAdmin,
  });

  if (!["ANNUAL", "SICK", "BEREAVEMENT"].includes(leaveType)) {
    console.error("❌ Invalid leaveType received:", leaveType);
    throw new Error(`Invalid leave type provided: ${leaveType}`);
  }

  const entitlement = await prisma.leaveEntitlement.findUnique({
    where: {
      employeeId_leaveType: {
        employeeId,
        leaveType,
      },
    },
  });

  console.log("🔍 Entitlement record fetched:", entitlement);

  if (!entitlement) {
    console.error("❌ No entitlement found for employee, throwing.");
    throw new Error(`No entitlement found for leave type: ${leaveType}`);
  }

  // Calculate days requested using working pattern
  const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
  let daysRequested = 0;

  for (const date of datesInRange) {
    const deduction = await calculateLeaveDeduction(employeeId, date);
    daysRequested += deduction;
    console.log(`📅 ${date.toDateString()}: deduction = ${deduction}`);
  }

  const availableDays = entitlement.totalDays - entitlement.usedDays;

  console.log("🔍 Entitlement evaluation:", {
    daysRequested,
    totalDays: entitlement.totalDays,
    usedDays: entitlement.usedDays,
    availableDays,
  });

  if (daysRequested > availableDays) {
    console.error("❌ Insufficient entitlement, throwing error.");
    throw new Error(
      `Insufficient entitlement: Requested ${daysRequested} days, but only ${availableDays} available.`
    );
  }

  if (leaveType === "ANNUAL" && !isAdmin) {
    const today = new Date();
    const minNoticeDate = addDays(today, 2);

    console.log("🔍 Notice period check:", {
      today: today.toDateString(),
      minNoticeDate: minNoticeDate.toDateString(),
      startDate: startDate.toDateString(),
    });

    if (startDate < minNoticeDate) {
      console.error("❌ Notice period not met, throwing error.");
      throw new Error(
        `Annual leave requires at least 2 working days notice. Earliest start date: ${minNoticeDate.toDateString()}`
      );
    }
  }

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
    console.error("❌ Overlapping leave found, throwing error.");
    throw new Error(`You already have a leave booked that overlaps these dates.`);
  }

  console.log("✅ All checks passed, leave request can proceed.");
}
