import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// GET: Fetch all event rules for the company
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await prisma.eventRule.findMany({
      where: { companyId: session.user.companyId },
      include: { eventCategory: true },
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
    const session = await getServerSession(authOptions);
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
      maxCarryoverDays, // ✅ NEW
      carryoverExpiryMonths, // ✅ NEW
      maxConcurrentMode = "HARD_BLOCK",
      maxBookingLengthMode = "HARD_BLOCK",
      notes,
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
        maxConcurrentMode,
        maxBookingLengthMode,
        notes,
      },
      create: {
        companyId: session.user.companyId,
        eventCategoryId,
        enforceEntitlement,
        noticePeriodDays,
        maxConcurrent,
        maxBookingLength: maxBookingLength ?? 14,
        maxCarryoverDays: maxCarryoverDays ?? null,
        carryoverExpiryMonths: carryoverExpiryMonths ?? null,
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

