import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveNotification } from "@/lib/sendLeaveNotification";
import { validateLeaveRequest } from "@/lib/validateLeaveRequest";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("❌ Unauthenticated attempt to submit leave request");
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const employeeId = params.id;
    const body = await req.json();
    const { eventCategoryId, startDate, endDate, reason, sickReason, paidStatus, dayType } = body;

    if (!eventCategoryId || !startDate || !endDate) {
      console.log("❌ Missing required leave request fields");
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            managerId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!employee) {
      console.log("❌ Employee not found for leave request");
      return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
    }

    if (employee.user.id !== userId && session.user.role !== "ADMIN") {
      console.log("❌ Unauthorized leave request submission attempt");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const eventCategory = await prisma.eventCategory.findUnique({
      where: { id: eventCategoryId },
      select: { name: true },
    });

    if (!eventCategory) {
      console.log("❌ Invalid event category");
      return NextResponse.json({ success: false, error: "Invalid event category." }, { status: 400 });
    }

    const eventCategoryName = eventCategory.name;

    // Validate entitlement and overlap using the updated validateLeaveRequest
    await validateLeaveRequest({
      employeeId,
      eventCategoryId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAdmin: session.user.role === "ADMIN",
    });

    const newLeaveRequest = await prisma.leaveRequest.create({
  data: {
    employee: { connect: { id: employeeId } },
    requester: { connect: { id: userId } },
    eventCategory: { connect: { id: eventCategoryId } },
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    dayType: dayType ?? "FULL_DAY",
    reason: reason ?? "",
    sickReasonId: eventCategoryName === "Sick Leave" ? sickReason ?? null : null,
    paidStatus: eventCategoryName === "Sick Leave" ? paidStatus ?? "PAID" : null,
  },
});

    if (employee.user.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: employee.user.managerId },
        select: { email: true, name: true },
      });

      if (manager?.email) {
        const employeeFullName =
          `${employee.user.firstName ?? ""} ${employee.user.lastName ?? ""}`.trim() || "Employee";
        await sendLeaveNotification({
  to: manager.email,
  subject: `New Leave Request from ${employeeFullName}`,
  employeeName: employeeFullName,
  type: eventCategoryName,
  startDate,
  endDate,
});
      }
    }

    console.log("✅ Leave request submitted successfully");
    return NextResponse.json({ success: true, data: newLeaveRequest });
  } catch (error: any) {
    console.error("❌ Error submitting leave request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit leave request." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
