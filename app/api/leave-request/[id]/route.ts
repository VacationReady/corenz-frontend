import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveStatusUpdate } from "@/lib/sendLeaveStatusUpdate";
import { differenceInBusinessDays } from "date-fns";

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

    if (status === "APPROVED") {
      // Prisma transaction to update leaveRequest and deduct entitlement safely
      const result = await prisma.$transaction(async (tx) => {
        const leaveRequest = await tx.leaveRequest.findUnique({
          where: { id: leaveRequestId },
          include: { employee: true },
        });

        if (!leaveRequest) {
          throw new Error("Leave request not found.");
        }

        const daysRequested = differenceInBusinessDays(leaveRequest.endDate, leaveRequest.startDate) + 1;

        const entitlement = await tx.leaveEntitlement.findUnique({
          where: {
            employeeId_leaveType: {
              employeeId: leaveRequest.employeeId,
              leaveType: leaveRequest.type,
            },
          },
        });

        if (!entitlement) {
          throw new Error(`No entitlement found for leave type: ${leaveRequest.type}`);
        }

        const availableDays = entitlement.totalDays - entitlement.usedDays;

        if (daysRequested > availableDays) {
          throw new Error(
            `Cannot approve leave. Requested ${daysRequested} days, but only ${availableDays} days available for this leave type.`
          );
        }

        const updatedEntitlement = await tx.leaveEntitlement.update({
          where: { id: entitlement.id },
          data: {
            usedDays: entitlement.usedDays + daysRequested,
          },
        });

        console.log(
          `✅ Deducted ${daysRequested} days from entitlement. Now used: ${updatedEntitlement.usedDays}/${updatedEntitlement.totalDays}`
        );

        const updatedLeaveRequest = await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            approvalStatus: status,
            approvedById: session.user.id,
          },
          include: {
            employee: {
              include: {
                user: true,
              },
            },
          },
        });

        return updatedLeaveRequest;
      });

      // Send notification email after successful approval and deduction
      const employeeEmail = result.employee.user.email;
      const employeeName = `${result.employee.user.firstName ?? ""} ${result.employee.user.lastName ?? ""}`.trim() || "Employee";

      if (employeeEmail) {
        await sendLeaveStatusUpdate({
          to: employeeEmail,
          subject: `Your leave request has been ${status.toLowerCase()}`,
          employeeName,
          type: result.type,
          startDate: result.startDate.toISOString(),
          endDate: result.endDate.toISOString(),
          status,
        });
        console.log(`✅ Notification email sent to ${employeeEmail}`);
      } else {
        console.log("⚠️ Employee email missing, no notification sent.");
      }

      return NextResponse.json({ success: true, data: result });
    } else {
      // If declined, simply update status
      const updatedLeaveRequest = await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          approvalStatus: status,
          approvedById: session.user.id,
        },
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
      });

      // Send notification email after decline
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
    }
  } catch (error: any) {
    console.error("❌ Error updating leave request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request." },
      { status: 500 }
    );
  }
}
