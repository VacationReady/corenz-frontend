// lib/validateLeaveRequest.ts

import { prisma } from "@/lib/prisma";
import { addDays, eachDayOfInterval } from "date-fns";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

/**
 * Validates a leave request against entitlement, business rules, blackout dates, and working pattern.
 */
export async function validateLeaveRequest({
  employeeId,
  eventCategoryId,
  startDate,
  endDate,
  isAdmin = false,
}: {
  employeeId: string;
  eventCategoryId: string;
  startDate: Date;
  endDate: Date;
  isAdmin?: boolean;
}) {
  console.log("🛠️ [validateLeaveRequest] START:", {
    employeeId,
    eventCategoryId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    isAdmin,
  });

  const eventCategory = await prisma.eventCategory.findUnique({
    where: { id: eventCategoryId },
    select: { name: true },
  });

  if (!eventCategory) {
    console.error("❌ Invalid eventCategoryId provided.");
    throw new Error(`Invalid event category.`);
  }

  // ── BLACKOUT DATES CHECK ─────────────────────────────
  const eventRule = await prisma.eventRule.findFirst({
    where: {
      eventCategoryId,
      companyId: "default-company-id", // replace with dynamic scoping later
    },
    select: {
      blackoutDates: true,
    },
  });

  if (eventRule && eventRule.blackoutDates.length > 0 && !isAdmin) {
    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
    for (const date of datesInRange) {
      const dateString = date.toISOString().split("T")[0];
      const isBlocked = eventRule.blackoutDates.some(
        (d) => new Date(d).toISOString().split("T")[0] === dateString
      );
      if (isBlocked) {
        console.error(`❌ Blackout date detected on ${dateString}, throwing error.`);
        throw new Error(
          `The date ${dateString} is blocked for this leave type due to a company blackout.`
        );
      }
    }
  }

  const entitlement = await prisma.leaveEntitlement.findFirst({
    where: {
      employeeId,
      eventCategoryId,
    },
  });

  console.log("🔍 Entitlement record fetched:", entitlement);

  if (!entitlement) {
    console.error("❌ No entitlement found for employee, throwing.");
    throw new Error(
      `No entitlement found for event category: ${eventCategory.name}`
    );
  }

  // Calculate days requested using working pattern
  const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
  let daysRequested = 0;

  for (const date of datesInRange) {
    const deduction = await calculateLeaveDeduction(employeeId, date);
    daysRequested += deduction;
    console.log(`📅 ${date.toDateString()}: deduction = ${deduction}`);
  }

  // ── Compute available days from totalDays and usedDays ──────────────
  const availableDays = entitlement.totalDays - entitlement.usedDays;

  console.log("🔍 Entitlement evaluation:", {
    daysRequested,
    availableDays,
  });

  if (daysRequested > availableDays && !isAdmin) {
    console.error("❌ Insufficient entitlement, throwing error.");
    throw new Error(
      `Insufficient entitlement: Requested ${daysRequested} days, but only ${availableDays} available.`
    );
  }

  if (eventCategory.name === "Annual Leave" && !isAdmin) {
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

  if (overlapping && !isAdmin) {
    console.error("❌ Overlapping leave request detected, throwing error.");
    throw new Error(
      "Employee has an overlapping leave request during these dates."
    );
  }

  console.log("✅ Leave request validation passed.");
}
