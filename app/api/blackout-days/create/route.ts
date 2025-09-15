// 1️⃣ /app/api/blackout-days/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, allEvents, eventCategoryIds, note } = await req.json();

    if (!date) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    // 🚩 Force blackout date to 00:01 UTC on the selected date to prevent previous day blocking
    const blackoutDate = new Date(date);
    blackoutDate.setUTCHours(0, 1, 0, 0); // 00:01 UTC

    const blackout = await prisma.blackoutDay.create({
      data: {
        date: blackoutDate,
        allEvents: allEvents ?? false,
        eventCategoryIds: eventCategoryIds ?? [],
        note: note ?? null,
        companyId: session.user.companyId,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, blackout });
  } catch (error) {
    console.error("Error creating blackout day:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
