import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const employeeId = params.id;
    const body = await req.json();
    const { type, startDate, endDate, reason, status } = body;

    // Basic validation
    if (!type || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const newLeaveRequest = await prisma.leaveRequest.create({
      data: {
        employee: { connect: { id: employeeId } },
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason ?? "",
        status: status ?? "PENDING", // fallback if status is undefined
      },
    });

    return NextResponse.json({ success: true, data: newLeaveRequest });
  } catch (error: any) {
    console.error("API error creating leave request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create leave request." },
      { status: 500 }
    );
  }
}
