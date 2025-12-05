// 1️⃣ /app/api/blackout-days/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { randomUUID } from "crypto";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const session = await auth();
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

    // Parse the date string (expected format: YYYY-MM-DD)
    // Create date at noon UTC to avoid any timezone boundary issues
    let blackoutDate: Date;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Date-only string: parse as noon UTC on that date
      blackoutDate = new Date(`${date}T12:00:00.000Z`);
    } else {
      // Fallback: parse ISO string and extract date components, then set to noon UTC
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      // Extract the local date from the parsed value (in case it's still an ISO string)
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const day = String(parsed.getUTCDate()).padStart(2, "0");
      blackoutDate = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
    }
    
    if (isNaN(blackoutDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const eventCategoryIds = Array.isArray(eventCategoryIdsInput)
      ? (eventCategoryIdsInput as any[]).map((v) => String(v))
      : [];

    const blackout = await prisma.blackoutDay.create({
      data: {
        id: randomUUID(),
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

