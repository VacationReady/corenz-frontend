import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { approvalStatus: "APPROVED" },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    const events = leaveRequests.map((req) => {
      const user = req.employee.user;
      const displayName =
        user.name ||
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        "Unknown";

      return {
        id: req.id,
        title: `${req.type} - ${displayName}`,
        start: req.startDate,
        end: req.endDate,
        allDay: true,
      };
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[CALENDAR_EVENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
