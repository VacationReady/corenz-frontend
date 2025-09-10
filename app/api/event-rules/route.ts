import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch all event rules for the company
export async function GET(req: Request) {
    try {
        const companyId = "default-company-id"; // Replace with actual logic later

        const rules = await prisma.eventRule.findMany({
            where: { companyId },
            include: { eventCategory: true },
        });

        return NextResponse.json(rules);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch event rules" }, { status: 500 });
    }
}

// POST: Create or update an event rule
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const {
            companyId = "default-company-id", // Replace with actual logic later
            eventCategoryId,
            enforceEntitlement,
            noticePeriodDays,
            maxConcurrent,
            maxBookingLength,
            maxCarryoverDays,         // ✅ NEW
            carryoverExpiryMonths,    // ✅ NEW
            maxConcurrentMode = "HARD_BLOCK",
            maxBookingLengthMode = "HARD_BLOCK",
            notes
        } = body;

        const rule = await prisma.eventRule.upsert({
            where: {
                companyId_eventCategoryId: {
                    companyId,
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
                companyId,
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
        return NextResponse.json({ error: "Failed to create/update event rule" }, { status: 500 });
    }
}
