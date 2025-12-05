import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";

// GET: Fetch all event rules for the company
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await prisma.eventRule.findMany({
      where: { companyId: session.user.companyId },
      include: { EventCategory: true },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch event rules" },
      { status: 500 },
    );
  }
}

// POST: Create or update an event rule
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const {
      eventCategoryId,
      enforceEntitlement,
      noticePeriodDays,
      maxConcurrent,
      maxBookingLength,
      maxCarryoverDays,
      carryoverExpiryMonths,
      maxConcurrentMode = "HARD_BLOCK",
      maxBookingLengthMode = "HARD_BLOCK",
      notes,
      maxDaysPerPeriod,  // Rolling max days limit (e.g., 5 days compassionate over 12 months)
      periodMonths,      // Period for rolling limit (e.g., 12 months)
    } = body;

    const rule = await prisma.eventRule.upsert({
      where: {
        companyId_eventCategoryId: {
          companyId: session.user.companyId,
          eventCategoryId,
        },
      },
      update: {
        enforceEntitlement,
        noticePeriodDays,
        maxConcurrent,
        ...(maxBookingLength !== undefined && { maxBookingLength }),
        ...(maxCarryoverDays !== undefined && { maxCarryoverDays }),
        ...(carryoverExpiryMonths !== undefined && { carryoverExpiryMonths }),
        ...(maxDaysPerPeriod !== undefined && { maxDaysPerPeriod }),
        ...(periodMonths !== undefined && { periodMonths }),
        maxConcurrentMode,
        maxBookingLengthMode,
        notes,
      },
      create: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        companyId: session.user.companyId,
        eventCategoryId,
        enforceEntitlement,
        noticePeriodDays,
        maxConcurrent,
        maxBookingLength: maxBookingLength ?? 14,
        maxCarryoverDays: maxCarryoverDays ?? null,
        carryoverExpiryMonths: carryoverExpiryMonths ?? null,
        maxDaysPerPeriod: maxDaysPerPeriod ?? null,
        periodMonths: periodMonths ?? null,
        maxConcurrentMode,
        maxBookingLengthMode,
        notes,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create/update event rule" },
      { status: 500 },
    );
  }
}

