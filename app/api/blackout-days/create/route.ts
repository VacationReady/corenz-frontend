// 1️⃣ /app/api/blackout-days/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = user.companyId;

    const body = await req.json();
    const date = body?.date;
    const allEvents = Boolean(body?.allEvents);
    const eventCategoryIdsInput = body?.eventCategoryIds;
    const note = body?.note;

    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }

    // 🚩 Force blackout date to 00:01 UTC on the selected date to prevent previous day blocking
    const blackoutDate = new Date(date);
    blackoutDate.setUTCHours(0, 1, 0, 0); // 00:01 UTC
    if (isNaN(blackoutDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const eventCategoryIds = Array.isArray(eventCategoryIdsInput)
      ? (eventCategoryIdsInput as any[]).map((v) => String(v))
      : [];

    const blackout = await prisma.blackoutDay.create({
      data: {
        id: crypto.randomUUID(),
        date: blackoutDate,
        allEvents,
        eventCategoryIds,
        note: note ?? null,
        companyId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, blackout });
  } catch (error) {
    console.error("Error creating blackout day:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

