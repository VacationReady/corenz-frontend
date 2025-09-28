import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { validateLeaveRequest } from "@/lib/validateLeaveRequest";
import { resolveApprovalWorkflow } from "@/lib/resolveApprovalWorkflow";
import { createLeaveApprovalPlan } from "@/lib/createLeaveApprovalPlan";
import { notifyApproversForStage } from "@/lib/approvalNotifications";
import { sendLeaveNotification } from "@/lib/sendLeaveNotification";

const payloadSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  eventCategoryId: z.string().uuid(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  dayType: z.enum(["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"]).optional(),
  reason: z.string().trim().min(1),
  forceApprove: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = payloadSchema.parse(await request.json());
    const {
      employeeIds,
      eventCategoryId,
      startDate,
      endDate,
      dayType,
      reason,
      forceApprove,
    } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const eventCategory = await prisma.eventCategory.findFirst({
      where: { id: eventCategoryId, companyId: session.user.companyId },
      select: { id: true, name: true },
    });

    if (!eventCategory) {
      return NextResponse.json({ error: "Event category not found" }, { status: 404 });
    }

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId: session.user.companyId },
      select: {
        id: true,
        departmentId: true,
        jobRoleId: true,
        User: {
          select: {
            id: true,
            email: true,
            managerId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const foundIds = new Set(employees.map((employee) => employee.id));
    const failures: Array<{ employeeId: string; error: string }> = [];

    for (const targetId of employeeIds) {
      if (!foundIds.has(targetId)) {
        failures.push({ employeeId: targetId, error: "Employee not found" });
      }
    }

    for (const employee of employees) {
      try {
        await validateLeaveRequest({
          employeeId: employee.id,
          eventCategoryId,
          startDate: start,
          endDate: end,
          companyId: session.user.companyId,
          isAdmin: true,
        });

        const leaveRequest = await prisma.leaveRequest.create({
          data: {
            id: crypto.randomUUID(),
            Employee: { connect: { id: employee.id } },
            Company: { connect: { id: session.user.companyId } },
            EventCategory: { connect: { id: eventCategoryId } },
            User_LeaveRequest_requesterIdToUser: {
              connect: { id: session.user.id },
            },
            startDate: start,
            endDate: end,
            dayType: dayType ?? "FULL_DAY",
            reason,
            approvalStatus: forceApprove ? "APPROVED" : "PENDING",
            updatedAt: new Date(),
          },
        });

        if (forceApprove) {
          continue;
        }

        const employeeLite = {
          id: employee.id,
          departmentId: employee.departmentId ?? null,
          jobRoleId: employee.jobRoleId ?? null,
          companyId: session.user.companyId,
        } as any;

        const workflow = await resolveApprovalWorkflow({
          companyId: session.user.companyId,
          employee: employeeLite,
          eventCategoryId,
        });

        if (workflow) {
          const stages = await createLeaveApprovalPlan({
            prismaTx: prisma,
            leaveRequestId: leaveRequest.id,
            workflow: {
              ...workflow,
              context: {
                requesterUserId: employee.User.id,
                managerUserId: employee.User.managerId ?? null,
                findFallbackAdminUserId: () => null,
              },
            } as any,
          });

          if (stages.some((stage: any) => (stage.decisions || []).length === 0)) {
            const admin = await prisma.user.findFirst({
              where: { companyId: session.user.companyId, role: "ADMIN" },
              select: { id: true },
            });

            if (admin?.id) {
              await prisma.leaveApprovalStage.deleteMany({
                where: { leaveRequestId: leaveRequest.id },
              });
              await createLeaveApprovalPlan({
                prismaTx: prisma,
                leaveRequestId: leaveRequest.id,
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

          const firstStage = await prisma.leaveApprovalStage.findFirst({
            where: { leaveRequestId: leaveRequest.id, isActive: true },
            include: { decisions: { include: { approver: true } } },
            orderBy: { order: "asc" },
          });

          if (firstStage) {
            const lrFull = await prisma.leaveRequest.findUnique({
              where: { id: leaveRequest.id },
              include: { Employee: { include: { User: true } } },
            });
            if (lrFull) {
              await notifyApproversForStage({
                stage: firstStage as any,
                leaveRequest: lrFull as any,
                eventCategoryName: eventCategory.name,
              });
            }
          }
        } else {
          let approverUserId: string | null = employee.User.managerId ?? null;
          if (!approverUserId) {
            const admin = await prisma.user.findFirst({
              where: { companyId: session.user.companyId, role: "ADMIN" },
              select: { id: true },
            });
            approverUserId = admin?.id ?? null;
          }

          if (approverUserId) {
            const stage = await prisma.leaveApprovalStage.create({
              data: {
                leaveRequestId: leaveRequest.id,
                name: null,
                order: 0,
                mode: "SEQUENTIAL",
                status: "PENDING",
                isActive: true,
              },
            });

            await prisma.leaveApprovalDecision.create({
              data: {
                stageId: stage.id,
                approverId: approverUserId,
                order: 0,
                status: "PENDING",
                isActive: true,
              },
            });

            const lrFull = await prisma.leaveRequest.findUnique({
              where: { id: leaveRequest.id },
              include: { Employee: { include: { User: true } } },
            });

            if (lrFull) {
              const stageWithApprover = await prisma.leaveApprovalStage.findUnique({
                where: { id: stage.id },
                include: { decisions: { include: { approver: true } } },
              });
              await notifyApproversForStage({
                stage: stageWithApprover as any,
                leaveRequest: lrFull as any,
                eventCategoryName: eventCategory.name,
              });
            }
          } else if (employee.User.managerId) {
            const manager = await prisma.user.findFirst({
              where: {
                id: employee.User.managerId,
                companyId: session.user.companyId,
              },
              select: { email: true, name: true },
            });
            if (manager?.email) {
              const employeeName =
                `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
                "Employee";
              await sendLeaveNotification({
                to: manager.email,
                subject: `New Leave Request from ${employeeName}`,
                employeeName,
                type: eventCategory.name,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
              });
            }
          }
        }
      } catch (error: any) {
        console.error("[bulk-actions/leave]", error);
        failures.push({
          employeeId: employee.id,
          error: error?.message || "Failed to create leave request",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: employeeIds.length,
      failures,
    });
  } catch (error: any) {
    console.error("[bulk-actions/leave]", error);
    return NextResponse.json(
      { error: error?.message || "Unable to process bulk leave action" },
      { status: 400 },
    );
  }
}
