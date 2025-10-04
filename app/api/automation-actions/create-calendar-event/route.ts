import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createAutomationCalendarEvent } from "@/lib/calendar/createAutomationCalendarEvent";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { config, employeeId, context } = await req.json();

    const result = await createAutomationCalendarEvent({
      config,
      employeeId,
      companyId: session.user.companyId,
      initiatorUserId: session.user.id,
      context,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Calendar event creation failed:", error);
    const message = error instanceof Error ? error.message : "Failed to create calendar event";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
