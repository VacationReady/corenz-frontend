import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveStatusUpdate } from "@/lib/sendLeaveStatusUpdate";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const leaveRequestId = params.id;
    const { status } = await req.json();

    if (!["APPROVED", "DECLINED"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status provided." }, { status: 400 });
    }

    const updatedLeaveRequest = await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status,
        reviewedBy: session.user.id,
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log(`✅ Leave request ${leaveRequestId} updated to ${status}`);

    // Send notification email to employee
    const employeeEmail = updatedLeaveRequest.employee.user.email;
    const employeeName = `${updatedLeaveRequest.employee.user.firstName ?? ""} ${updatedLeaveRequest.employee.user.lastName ?? ""}`.trim() || "Employee";

    if (employeeEmail) {
      await sendLeaveStatusUpdate({
        to: employeeEmail,
        subject: `Your leave request has been ${status.toLowerCase()}`,
        employeeName,
        type: updatedLeaveRequest.type,
        startDate: updatedLeaveRequest.startDate.toISOString(),
        endDate: updatedLeaveRequest.endDate.toISOString(),
        status,
      });
      console.log(`✅ Notification email sent to ${employeeEmail}`);
    } else {
      console.log("⚠️ Employee email missing, no notification sent.");
    }

    return NextResponse.json({ success: true, data: updatedLeaveRequest });
  } catch (error: any) {
    console.error("❌ Error updating leave request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request." },
      { status: 500 }
    );
  }
}
