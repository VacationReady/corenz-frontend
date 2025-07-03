// 1️⃣ /app/api/blackout-days/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { date, allEvents, eventCategoryIds, companyId } = await req.json();

        if (!date || !companyId) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const blackout = await prisma.blackoutDay.create({
            data: {
                date: new Date(date),
                allEvents: allEvents ?? false,
                eventCategoryIds: eventCategoryIds ?? [],
                companyId,
            },
        });

        return NextResponse.json({ success: true, blackout });
    } catch (error) {
        console.error("Error creating blackout day:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}