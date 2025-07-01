// app/api/leave-request/[id]/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveStatusUpdate } from "@/lib/sendLeaveStatusUpdate";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const leaveId = params.id;
  const { action } = await req.json();

  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: { include: { user: true, workingPatternAssignments: true } } },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (action === "approve") {
      // Calculate total deduction day-by-day
      const totalDays: number[] = [];
      let currentDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);

      while (currentDate <= endDate) {
        const deduction = await calculateLeaveDeduction(leave.employeeId, currentDate);
        totalDays.push(deduction);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDeduction = totalDays.reduce((sum, val) => sum + val, 0);

      console.log(
        `🧮 [Leave Approval] Calculated total deduction for ${leave.employee.user.name}: ${totalDeduction} days.`
      );

      const updatedLeaveRequest = await prisma.$transaction(async (tx) => {
        const entitlement = await tx.leaveEntitlement.findFirst({
          where: { employeeId: leave.employeeId, leaveType: leave.type },
        });

        if (!entitlement) {
          throw new Error("Leave entitlement not found for this employee and leave type.");
        }

        const updatedEntitlement = await tx.leaveEntitlement.update({
          where: { id: entitlement.id },
          data: { usedDays: { increment: totalDeduction } },
        });

        console.log(
          `✅ Deducted ${totalDeduction} days from entitlement. Now used: ${updatedEntitlement.usedDays}/${updatedEntitlement.totalDays}`
        );

        const updatedLeave = await tx.leaveRequest.update({
          where: { id: leaveId },
          data: {
            approvedBy: session.user.email,
            approvedAt: new Date(),
          },
          include: { employee: { include: { user: true } } },
        });

        return updatedLeave;
      });

      if (updatedLeaveRequest && updatedLeaveRequest.employee.user.email) {
        await sendLeaveStatusUpdate({
          to: updatedLeaveRequest.employee.user.email,
          name:
            updatedLeaveRequest.employee.user.name ||
            `${updatedLeaveRequest.employee.user.firstName ?? ""} ${
              updatedLeaveRequest.employee.user.lastName ?? ""
            }`.trim(),
          status: "Approved",
          type: updatedLeaveRequest.type,
          startDate: updatedLeaveRequest.startDate.toISOString(),
          endDate: updatedLeaveRequest.endDate.toISOString(),
        });
      }

      return NextResponse.json({ success: true, data: updatedLeaveRequest });
    }

    if (action === "decline") {
      const updatedLeaveRequest = await prisma.leaveRequest.update({
        where: { id: leaveId },
        data: { declinedBy: session.user.email, declinedAt: new Date() },
        include: { employee: { include: { user: true } } },
      });

      if (updatedLeaveRequest && updatedLeaveRequest.employee.user.email) {
        await sendLeaveStatusUpdate({
          to: updatedLeaveRequest.employee.user.email,
          name:
            updatedLeaveRequest.employee.user.name ||
            `${updatedLeaveRequest.employee.user.firstName ?? ""} ${
              updatedLeaveRequest.employee.user.lastName ?? ""
            }`.trim(),
          status: "Declined",
          type: updatedLeaveRequest.type,
          startDate: updatedLeaveRequest.startDate.toISOString(),
          endDate: updatedLeaveRequest.endDate.toISOString(),
        });
      }

      return NextResponse.json({ success: true, data: updatedLeaveRequest });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Error in leave approval route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request." },
      { status: 500 }
    );
  }
}
