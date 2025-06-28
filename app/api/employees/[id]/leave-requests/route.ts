import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch leave requests for a specific employee
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { employeeId: params.id },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        type: true,
        status: true,
        reason: true,
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(leaveRequests);
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leave requests." },
      { status: 500 }
    );
  }
}

// POST: Create a leave request for a specific employee
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { startDate, endDate, type, reason } = await req.json();

    if (!startDate || !endDate || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employee: { connect: { id: params.id } },
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type,
        reason,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, leaveRequest });
  } catch (error) {
    console.error("Error creating leave request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create leave request." },
      { status: 500 }
    );
  }
}
