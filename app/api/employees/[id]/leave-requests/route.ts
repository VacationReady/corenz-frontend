import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendLeaveNotification } from "@/lib/sendLeaveNotification";
import { resolveApprovalWorkflow } from "@/lib/resolveApprovalWorkflow";
import { createLeaveApprovalPlan } from "@/lib/createLeaveApprovalPlan";
import { notifyApproversForStage } from "@/lib/approvalNotifications";
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
  // Accept both keys for compatibility; prefer lowerCamel in code
  eventCategoryId: z
    .string({ required_error: "eventCategoryId is required" })
    .trim()
    .min(1, "eventCategoryId is required")
    .optional(),
  EventCategoryId: z
    .string()
    .trim()
    .min(1, "EventCategoryId is required")
    .optional(),
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

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await ensurePrismaConnected();
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
      employeeId: id,
      // Use correct relation casing per Prisma schema: Employee
      Employee: { companyId: session.user.companyId },
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
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      console.log("❌ Unauthenticated attempt to submit leave request");
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const employeeId = id;
  const body = leaveRequestCreateSchema.parse(await req.json());
  const EventCategoryId = body.eventCategoryId || body.EventCategoryId;
  const { startDate, endDate, reason, sickReason, paidStatus, dayType } = body;
  if (!EventCategoryId) {
    return NextResponse.json(
      { success: false, error: "Event category is required" },
      { status: 400 },
    );
  }

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

    if (
      employee.User.id !== userId &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
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
      isAdmin:
        session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN",
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

    // If fast-tracked by admin (immediate approval), keep legacy flow
    if (newLeaveRequest.approvalStatus === "APPROVED") {
      return NextResponse.json({ success: true, data: newLeaveRequest });
    }

    // Resolve workflow for this request
    const employeeLite = {
      id: employee.id,
      departmentId: employee.departmentId ?? null,
      jobRoleId: employee.jobRoleId ?? null,
      companyId: session.user.companyId,
    } as any;

    const workflow = await resolveApprovalWorkflow({
      companyId: session.user.companyId,
      employee: employeeLite,
      eventCategoryId: EventCategoryId,
    });

    if (workflow) {
      const stages = await createLeaveApprovalPlan({
        prismaTx: prisma,
        leaveRequestId: newLeaveRequest.id,
        workflow: {
          ...workflow,
          context: {
            requesterUserId: employee.User.id,
            managerUserId: employee.User.managerId ?? null,
            findFallbackAdminUserId: () => null,
          },
        } as any,
      });

      // If manager was missing and no decisions created, fallback to an ADMIN, rebuild plan
      if (stages.some((s: any) => (s.decisions || []).length === 0)) {
        const admin = await prisma.user.findFirst({
          where: { companyId: session.user.companyId, role: "ADMIN" },
          select: { id: true },
        });
        if (admin?.id) {
          await prisma.leaveApprovalStage.deleteMany({ where: { leaveRequestId: newLeaveRequest.id } });
          await createLeaveApprovalPlan({
            prismaTx: prisma,
            leaveRequestId: newLeaveRequest.id,
            workflow: {
              ...workflow,
              context: {
                requesterUserId: employee.User.id,
                managerUserId: employee.User.managerId ?? null,
                findFallbackAdminUserId: () => admin.id,
              },
            } as any,
          });
        }
      }

      // Notify active approvers on first stage
      const first = stages.find((s: any) => s.isActive);
      if (first) {
        const lrFull = await prisma.leaveRequest.findUnique({
          where: { id: newLeaveRequest.id },
          include: { Employee: { include: { User: true } } },
        });
        await notifyApproversForStage({
          stage: { ...first, decisions: await prisma.leaveApprovalDecision.findMany({ where: { stageId: first.id }, include: { approver: true } }) } as any,
          leaveRequest: lrFull as any,
          eventCategoryName: EventCategoryName,
        });
      }
    } else {
      // Fallback to manager email if no workflow
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
    }

    console.log("✅ Leave request submitted successfully");
    // Return with approval stages when present
    const full = await prisma.leaveRequest.findUnique({
      where: { id: newLeaveRequest.id },
      include: {
        LeaveApprovalStage: {
          orderBy: { order: "asc" },
          include: { decisions: { orderBy: { order: "asc" }, include: { approver: true } } },
        },
      },
    });

    const response = full
      ? {
          ...newLeaveRequest,
          approvalStages: (full.LeaveApprovalStage || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            mode: s.mode,
            status: s.status,
            isActive: s.isActive,
            decisions: s.decisions.map((d: any) => ({
              id: d.id,
              approverId: d.approverId,
              approverName: d.approver?.name ?? null,
              approverEmail: d.approver?.email ?? null,
              order: d.order,
              status: d.status,
              isActive: d.isActive,
            })),
          })),
        }
      : newLeaveRequest;

    return NextResponse.json({ success: true, data: response });
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
