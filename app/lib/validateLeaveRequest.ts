import { prisma } from "@/lib/prisma";
import { LeaveType } from "@prisma/client";
import { addDays, differenceInBusinessDays } from "date-fns";

/**
 * Validates a leave request against entitlement and business rules.
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
  const entitlement = await prisma.leaveEntitlement.findUnique({
    where: {
      employeeId_leaveType: {
        employeeId,
        leaveType,
      },
    },
  });

  if (!entitlement) {
    throw new Error(`No entitlement found for leave type: ${leaveType}`);
  }

  const daysRequested = differenceInBusinessDays(endDate, startDate) + 1;
  const availableDays = entitlement.totalDays - entitlement.usedDays;

  if (daysRequested > availableDays) {
    throw new Error(
      `Insufficient entitlement: Requested ${daysRequested} days, but only ${availableDays} available.`
    );
  }

  // Optional: Restrict sick leave to managers only (can be added later)

  // Enforce notice period ONLY if not admin
  if (leaveType === "ANNUAL" && !isAdmin) {
    const today = new Date();
    const minNoticeDate = addDays(today, 2);
    if (startDate < minNoticeDate) {
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

  if (overlapping) {
    throw new Error(`You already have a leave booked that overlaps these dates.`);
  }
}
