import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveStatusUpdate } from "@/lib/sendLeaveStatusUpdate";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { z } from "zod";

const leaveRequestActionSchema = z.object({
  action: z.enum(["approve", "decline"], {
    required_error: "action is required",
  }),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        Employee: { include: { User: true, Department: true } },
        EventCategory: true,
        EventSubcategory: true,
      },
    });

    if (!leave || leave.companyId !== session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Leave request not found" },
        { status: 404 },
      );
    }

    const user = leave.Employee?.User;
    const displayName = user
      ? (user.name && user.name.trim().length > 0
          ? user.name
          : `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()) || null
      : null;

    const data = {
      id: leave.id,
      type: leave.EventCategory?.name ?? "",
      eventCategoryId: leave.eventCategoryId,
      eventSubcategory: leave.EventSubcategory
        ? { id: leave.EventSubcategory.id, name: leave.EventSubcategory.name }
        : null,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason ?? null,
      approvalStatus: leave.approvalStatus,
      paidStatus: leave.paidStatus ?? null,
      dayType: leave.dayType,
      employee: {
        id: leave.employeeId,
        user: {
          name: displayName,
          email: user?.email ?? null,
          id: user?.id ?? null,
        },
        department: leave.Employee?.Department?.name ?? null,
      },
    } as const;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[LEAVE_REQUEST_GET]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const leaveId = params.id;

  try {
    const { action } = leaveRequestActionSchema.parse(await req.json());
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        Employee: {
          include: { User: true },
        },
        EventCategory: true,
      },
    });

    if (!leave) {
      return NextResponse.json(
        { success: false, error: "Leave request not found." },
        { status: 404 },
      );
    }

    if (action === "approve") {
      const totalDays: number[] = [];
      let currentDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);

      while (currentDate <= endDate) {
        const deduction = await calculateLeaveDeduction(
          leave.employeeId,
          currentDate,
        );
        totalDays.push(deduction);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDeduction = totalDays.reduce((sum, val) => sum + val, 0);

      const updatedLeaveRequest = await prisma.$transaction(async (tx) => {
        const entitlement = await tx.leaveEntitlement.findFirst({
          where: {
            employeeId: leave.employeeId,
            eventCategoryId: leave.eventCategoryId,
          },
        });

        if (!entitlement) {
          throw new Error(
            "Leave entitlement not found for this employee and event category.",
          );
        }

        await tx.leaveEntitlement.update({
          where: { id: entitlement.id },
          data: { usedDays: { increment: totalDeduction } },
        });

        return await tx.leaveRequest.update({
          where: { id: leaveId },
          data: {
            approvalStatus: "APPROVED",
            approvedById: session.user.id,
          },
          include: {
            Employee: { include: { User: true } },
            EventCategory: true,
          },
        });
      });

      await sendLeaveStatusUpdate({
        to: updatedLeaveRequest.Employee.User.email,
        subject: `Your ${updatedLeaveRequest.EventCategory?.name ?? "leave"} request has been approved`,
        employeeName:
          updatedLeaveRequest.Employee.User.name ||
          `${updatedLeaveRequest.Employee.User.firstName ?? ""} ${updatedLeaveRequest.Employee.User.lastName ?? ""}`.trim(),
        status: "APPROVED",
        type: updatedLeaveRequest.EventCategory?.name ?? "Leave",
        startDate: updatedLeaveRequest.startDate.toISOString(),
        endDate: updatedLeaveRequest.endDate.toISOString(),
      });

      return NextResponse.json({ success: true, data: updatedLeaveRequest });
    }

    if (action === "decline") {
      const updatedLeaveRequest = await prisma.leaveRequest.update({
        where: { id: leaveId },
        data: {
          approvalStatus: "DECLINED",
          approvedById: session.user.id,
        },
        include: {
          Employee: { include: { User: true } },
          EventCategory: true,
        },
      });

      await sendLeaveStatusUpdate({
        to: updatedLeaveRequest.Employee.User.email,
        subject: `Your ${updatedLeaveRequest.EventCategory?.name ?? "leave"} request has been declined`,
        employeeName:
          updatedLeaveRequest.Employee.User.name ||
          `${updatedLeaveRequest.Employee.User.firstName ?? ""} ${updatedLeaveRequest.Employee.User.lastName ?? ""}`.trim(),
        status: "DECLINED",
        type: updatedLeaveRequest.EventCategory?.name ?? "Leave",
        startDate: updatedLeaveRequest.startDate.toISOString(),
        endDate: updatedLeaveRequest.endDate.toISOString(),
      });

      return NextResponse.json({ success: true, data: updatedLeaveRequest });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action specified." },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[Leave Request Approval Error]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 },
    );
  }
}

export function POST() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed" },
    { status: 405 },
  );
}

export function PUT() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed" },
    { status: 405 },
  );
}

export function DELETE() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed" },
    { status: 405 },
  );
}
