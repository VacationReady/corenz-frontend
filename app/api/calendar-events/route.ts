import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");

  try {
    const leaveRequests = await prisma.leaveRequest.findMany({
  where: {
    approvalStatus: "APPROVED",
    employee: {
      department: department ? { name: department } : undefined,
    },
  },
  include: {
    employee: {
      include: {
        user: true,
        department: true,
      },
    },
    eventCategory: {
      select: {
        name: true,
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
        title: `${req.eventCategory.name} - ${displayName}`,
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
