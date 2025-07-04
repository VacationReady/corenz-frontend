// lib/validateLeaveRequest.ts

import { prisma } from "@/lib/prisma";
import { addDays, eachDayOfInterval } from "date-fns";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import dayjs from "dayjs";

/**
 * Validates a leave request against entitlement, business rules, blackout days, working pattern, and concurrency.
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

  // ── FETCH EVENT RULE ──────────────────────────────
  const eventRule = await prisma.eventRule.findUnique({
    where: {
      companyId_eventCategoryId: {
        companyId: "default-company-id",
        eventCategoryId: eventCategoryId,
      },
    },
    select: {
      noticePeriodDays: true,
      maxConcurrent: true,
      maxBookingLength: true, // 🩶 for max booking enforcement
    },
  });

  const requiredNoticeDays = eventRule?.noticePeriodDays ?? 0;

  const leaveStart = dayjs(startDate).startOf("day");
  const leaveEnd = dayjs(endDate).startOf("day");
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

  // ── MAX BOOKING LENGTH ENFORCEMENT ───────────────
  const daysRequested = leaveEnd.diff(leaveStart, "day") + 1;
  const maxBookingLength = eventRule?.maxBookingLength ?? 14;

  if (daysRequested > maxBookingLength && !isAdmin) {
    console.error(
      `❌ Max booking length exceeded: requested ${daysRequested}, allowed ${maxBookingLength}`
    );
    throw new Error(
      `You can only book up to ${maxBookingLength} days at a time for this leave type.`
    );
  }

  // ── BLACKOUT DAY CHECK ────────────────────────────
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

  // ── MAX CONCURRENT CHECK ──────────────────────────
  if (eventRule && eventRule.maxConcurrent !== null && !isAdmin) {
    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });

    for (const date of datesInRange) {
      const startOfDay = dayjs(date).startOf("day").toDate();
      const endOfDay = dayjs(date).endOf("day").toDate();

      const concurrentCount = await prisma.leaveRequest.count({
        where: {
          eventCategoryId,
          approvalStatus: { in: ["APPROVED", "PENDING"] },
          OR: [
            {
              startDate: { lte: endOfDay },
              endDate: { gte: startOfDay },
            },
          ],
        },
      });

      if (concurrentCount >= eventRule.maxConcurrent) {
        console.error(
          `❌ Max concurrent limit reached on ${date.toDateString()} (${concurrentCount}/${eventRule.maxConcurrent})`
        );
        throw new Error(
          `The maximum number of employees off on ${date.toDateString()} for this leave type has been reached.`
        );
      }
    }
  }

  // ── ENTITLEMENT CHECK ─────────────────────────────
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

  // ── CALCULATE DAYS REQUESTED ──────────────────────
  const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
  let daysRequestedForDeduction = 0;

  for (const date of datesInRange) {
    const deduction = await calculateLeaveDeduction(employeeId, date);
    daysRequestedForDeduction += deduction;
    console.log(`📅 ${date.toDateString()}: deduction = ${deduction}`);
  }

  const availableDays = entitlement.totalDays - entitlement.usedDays;

  console.log("🔍 Entitlement evaluation:", {
    daysRequestedForDeduction,
    availableDays,
  });

  if (daysRequestedForDeduction > availableDays && !isAdmin) {
    console.error("❌ Insufficient entitlement, throwing error.");
    throw new Error(
      `Insufficient entitlement: Requested ${daysRequestedForDeduction} days, but only ${availableDays} days available.`
    );
  }

  console.log("✅ [validateLeaveRequest] Validation passed successfully.");
}
