// lib/validateLeaveRequest.ts

import { prisma } from "@/lib/prisma";
import { addDays, eachDayOfInterval } from "date-fns";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import dayjs from "dayjs";

/**
 * Validates a leave request against entitlement, business rules, blackout days (BlackoutDay), and working pattern.
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

  // ── FETCH EVENT RULE FOR NOTICE PERIOD ───────────────
  const eventRule = await prisma.eventRule.findUnique({
    where: {
      eventCategoryId: eventCategoryId,
      companyId: "default-company-id",
    },
    select: {
      noticePeriodDays: true,
    },
  });

  const requiredNoticeDays = eventRule?.noticePeriodDays ?? 2; // fallback to 2 days if no rule found

  const leaveStart = dayjs(startDate).startOf("day");
  const today = dayjs().startOf("day");
  const daysNoticeGiven = leaveStart.diff(today, "day");

  if (daysNoticeGiven < requiredNoticeDays && !isAdmin) {
    console.error(
      `❌ Notice period not met: required ${requiredNoticeDays}, given ${daysNoticeGiven}`
    );
    throw new Error(
      `This leave requires at least ${requiredNoticeDays} days notice.`
    );
  }

  // ── BLACKOUT DAY CHECK USING BlackoutDay TABLE ────────────────
  if (!isAdmin) {
    const blackoutDays = await prisma.blackoutDay.findMany({
      where: {
        OR: [
          { allEvents: true },
          { eventCategoryIds: { has: eventCategoryId } },
        ],
      },
    });

    const blackoutDates = blackoutDays.map((b) =>
      b.date.toISOString().split("T")[0]
    );
    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });

    for (const date of datesInRange) {
      const dateString = date.toISOString().split("T")[0];
      if (blackoutDates.includes(dateString)) {
        console.error(
          `❌ Blackout day detected on ${dateString}, throwing error.`
        );
        throw new Error(
          `The date ${dateString} is blocked due to a company blackout.`
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
      `Insufficient entitlement: Requested ${daysRequested} days, but only ${availableDays} days available.`
    );
  }

  console.log("✅ [validateLeaveRequest] Validation passed successfully.");
}
