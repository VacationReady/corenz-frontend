import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveNotification } from "@/lib/sendLeaveNotification";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const employeeId = params.id;
    const body = await req.json();
    const { type, startDate, endDate, reason } = body;

    if (!type || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    // Verify employee belongs to user submitting the request
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: { name: true, email: true, managerId: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
    }

    if (employee.user.id !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const newLeaveRequest = await prisma.leaveRequest.create({
      data: {
        employee: { connect: { id: employeeId } },
        createdBy: { connect: { id: userId } },
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason ?? "",
      },
    });

    // Send Resend email notification to manager if managerId exists
    if (employee.user.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: employee.user.managerId },
        select: { email: true, name: true },
      });

      if (manager?.email) {
        await sendLeaveNotification({
          to: manager.email,
          subject: `New Leave Request Submitted by ${employee.user.name || "Employee"}`,
          employeeName: employee.user.name || "Employee",
          type,
          startDate,
          endDate,
          status: "PENDING",
        });
      }
    }

    return NextResponse.json({ success: true, data: newLeaveRequest });
  } catch (error: any) {
    console.error("Error creating leave request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create leave request." },
      { status: 500 }
    );
  }
}
