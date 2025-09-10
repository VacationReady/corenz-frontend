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
  companyId,
}: {
  employeeId: string;
  eventCategoryId: string;
  startDate: Date;
  endDate: Date;
  isAdmin?: boolean;
  companyId: string;
}) {
  console.log("🛠️ [validateLeaveRequest] START:", {
    employeeId,
    eventCategoryId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    isAdmin,
  });

  const eventCategory = await prisma.eventCategory.findFirst({
    where: { id: eventCategoryId, companyId },
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
        companyId,
        eventCategoryId,
      },
    },
    select: {
      noticePeriodDays: true,
      maxConcurrent: true,
      maxBookingLength: true,
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
        companyId,
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

  // ── ENTITLEMENT & CARRYOVER LOGIC ────────────────
  const entitlement = await prisma.leaveEntitlement.findFirst({
    where: {
      employeeId,
      eventCategoryId,
      companyId,
    },
  });

  console.log("🔍 Entitlement fetched:", entitlement);

  if (!entitlement) {
    console.error("❌ No entitlement found for employee, throwing.");
    throw new Error(
      `No entitlement found for event category: ${eventCategory.name}`
    );
  }

  const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
  let daysRequestedForDeduction = 0;

  for (const date of datesInRange) {
    const deduction = await calculateLeaveDeduction(employeeId, date);
    daysRequestedForDeduction += deduction;
  }

  const availableCarryover = entitlement.carryoverDays ?? 0;
  const availableEntitlement = entitlement.totalDays - entitlement.usedDays;

  const combinedAvailable = availableCarryover + availableEntitlement;

  console.log("📊 Leave deduction check:", {
    daysRequestedForDeduction,
    availableCarryover,
    availableEntitlement,
    combinedAvailable,
  });

  if (daysRequestedForDeduction > combinedAvailable && !isAdmin) {
    console.error("❌ Insufficient entitlement including carryover.");
    throw new Error(
      `Insufficient entitlement: Requested ${daysRequestedForDeduction} days, but only ${combinedAvailable} days available (including carryover).`
    );
  }

  console.log("✅ [validateLeaveRequest] Validation passed successfully.");
}
