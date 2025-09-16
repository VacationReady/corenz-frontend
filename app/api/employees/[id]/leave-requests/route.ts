import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveNotification } from "@/lib/sendLeaveNotification";
import { validateLeaveRequest } from "@/lib/validateLeaveRequest";
import { z } from "zod";

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return undefined;
  });

const leaveRequestCreateSchema = z.object({
  EventCategoryId: z
    .string({ required_error: "EventCategoryId is required" })
    .trim()
    .min(1, "EventCategoryId is required"),
  startDate: z
    .string({ required_error: "startDate is required" })
    .trim()
    .min(1, "startDate is required"),
  endDate: z
    .string({ required_error: "endDate is required" })
    .trim()
    .min(1, "endDate is required"),
  reason: optionalTrimmedString,
  sickReason: optionalTrimmedString,
  paidStatus: z
    .enum(["PAID", "UNPAID"])
    .or(z.null())
    .or(z.undefined())
    .transform((val) => (typeof val === "string" ? val : undefined)),
  dayType: z
    .enum(["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"])
    .or(z.null())
    .or(z.undefined())
    .transform((val) => (typeof val === "string" ? val : undefined)),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const upcoming = searchParams.get("upcoming") === "true";
    const limitParam = searchParams.get("limit");
    const take = limitParam
      ? Math.max(1, Math.min(10, parseInt(limitParam, 10) || 0))
      : 3;

    const now = new Date();

    const where: any = {
      employeeId: params.id,
      employee: { companyId: session.user.companyId },
      approvalStatus: "APPROVED",
      ...(upcoming
        ? {
            OR: [
              { startDate: { gte: now } },
              { AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }] }, // ongoing
            ],
          }
        : {}),
    };

    const leaves = await prisma.leaveRequest.findMany({
      where,
      orderBy: { startDate: "asc" },
      take,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        dayType: true,
        EventCategory: { select: { id: true, name: true } },
        approvalStatus: true,
      },
    });

    return NextResponse.json(leaves);
  } catch (error) {
    console.error("[EMPLOYEE_LEAVE_REQUESTS_GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      console.log("❌ Unauthenticated attempt to submit leave request");
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const employeeId = params.id;
    const {
      EventCategoryId,
      startDate,
      endDate,
      reason,
      sickReason,
      paidStatus,
      dayType,
    } = leaveRequestCreateSchema.parse(await req.json());

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      include: {
        User: {
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
      return NextResponse.json(
        { success: false, error: "Employee not found." },
        { status: 404 },
      );
    }

    if (employee.User.id !== userId && session.user.role !== "ADMIN") {
      console.log("❌ Unauthorized leave request submission attempt");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const eventCategory = await prisma.eventCategory.findFirst({
      where: { id: EventCategoryId, companyId: session.user.companyId },
      select: { name: true },
    });

    if (!eventCategory) {
      console.log("❌ Invalid event category");
      return NextResponse.json(
        { success: false, error: "Invalid event category." },
        { status: 400 },
      );
    }

    const EventCategoryName = eventCategory.name;

    // Validate entitlement and overlap using the updated validateLeaveRequest
    await validateLeaveRequest({
      employeeId,
      eventCategoryId: EventCategoryId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAdmin: session.user.role === "ADMIN",
      companyId: session.user.companyId,
    });

    const newLeaveRequest = await prisma.leaveRequest.create({
      data: {
        id: crypto.randomUUID(),
        Employee: { connect: { id: employeeId } },
        User_LeaveRequest_requesterIdToUser: { connect: { id: userId } },
        EventCategory: { connect: { id: EventCategoryId } },
        Company: { connect: { id: session.user.companyId } },
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        dayType: dayType ?? "FULL_DAY",
        reason: reason ?? "",
        paidStatus:
          EventCategoryName === "Sick Leave" ? (paidStatus ?? "PAID") : null,
        updatedAt: new Date(),
      },
    });

    if (employee.User.managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: employee.User.managerId, companyId: session.user.companyId },
        select: { email: true, name: true },
      });

      if (manager?.email) {
        const employeeFullName =
          `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
          "Employee";
        await sendLeaveNotification({
          to: manager.email,
          subject: `New Leave Request from ${employeeFullName}`,
          employeeName: employeeFullName,
          type: EventCategoryName,
          startDate,
          endDate,
        });
      }
    }

    console.log("✅ Leave request submitted successfully");
    return NextResponse.json({ success: true, data: newLeaveRequest });
  } catch (error: any) {
    console.error("❌ Error submitting leave request:", error);
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
      {
        success: false,
        error: error.message || "Failed to submit leave request.",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
