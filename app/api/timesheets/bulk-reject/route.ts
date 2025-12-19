import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { cancelPendingTimesheetApprovalActionItems } from "@/lib/action-items-helper";
import { sendTimesheetRejectionEmail } from "@/lib/email/timesheet-notifications";
// import { sendEmail } from "@/lib/email"; // TODO: Implement email service

const bulkRejectSchema = z.object({
  timesheetIds: z.array(z.string()).min(1),
  reason: z.string().min(1, "Rejection reason is required"),
  sendEmail: z.boolean().optional().default(true),
});

/**
 * POST /api/timesheets/bulk-reject
 * Bulk reject multiple timesheets
 * Permission: ADMIN or MANAGER
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = bulkRejectSchema.parse(body);

    const uniqueTimesheetIds = Array.from(new Set(data.timesheetIds));
    if (uniqueTimesheetIds.length !== data.timesheetIds.length) {
      console.warn(
        "[API] /api/timesheets/bulk-reject deduped timesheetIds:",
        {
          received: data.timesheetIds.length,
          unique: uniqueTimesheetIds.length,
        },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        userId: true,
        companyId: true,
        departmentId: true,
        User: {
          select: {
            role: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    const isAdmin = employee.User.role === "ADMIN";
    const isManager = employee.User.role === "MANAGER";

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: "Only admins and managers can reject timesheets" },
        { status: 403 }
      );
    }

    // Fetch timesheets to validate
    const timesheets = await prisma.timesheet.findMany({
      where: {
        id: {
          in: uniqueTimesheetIds,
        },
      },
      include: {
        Employee: {
          include: {
            User: {
              select: {
                name: true,
                email: true,
                managerId: true,
              },
            },
            Department: true,
          },
        },
      },
    });

    const succeeded: string[] = [];
    const failed: { timesheetId: string; error: string }[] = [];

    // Process each timesheet in a transaction
    for (const timesheet of timesheets) {
      try {
        // Validate company scoping
        if (timesheet.Employee.companyId !== employee.companyId) {
          failed.push({
            timesheetId: timesheet.id,
            error: "Timesheet belongs to different company",
          });
          continue;
        }

        // Managers can only reject their department OR direct reports
        if (isManager && !isAdmin) {
          const isInDepartment = timesheet.Employee.departmentId === employee.departmentId;
          const isDirectReport = timesheet.Employee.User?.managerId === employee.userId;
          
          if (!isInDepartment && !isDirectReport) {
            failed.push({
              timesheetId: timesheet.id,
              error: "Can only reject timesheets from your department or direct reports",
            });
            continue;
          }
        }

        // Check if already rejected
        if (timesheet.approvalStatus === "DECLINED") {
          failed.push({
            timesheetId: timesheet.id,
            error: "Already rejected",
          });
          continue;
        }

        // Check if submitted
        if (timesheet.approvalStatus !== "PENDING") {
          failed.push({
            timesheetId: timesheet.id,
            error: "Timesheet must be submitted before rejection",
          });
          continue;
        }

        // Reject the timesheet
        await prisma.$transaction(async (tx) => {
          // Update timesheet status
          await tx.timesheet.update({
            where: { id: timesheet.id },
            data: {
              approvalStatus: "DECLINED",
              rejectedReason: data.reason,
            },
          });

          const activeStage = await tx.timesheetApprovalStage.findFirst({
            where: {
              timesheetId: timesheet.id,
              isActive: true,
            },
          });

          if (activeStage) {
            await tx.timesheetApprovalDecision.updateMany({
              where: {
                stageId: activeStage.id,
                isActive: true,
              },
              data: {
                status: "DECLINED",
                comments: data.reason,
                respondedAt: new Date(),
                isActive: false,
              },
            });

            await tx.timesheetApprovalStage.update({
              where: { id: activeStage.id },
              data: {
                status: "DECLINED",
                isActive: false,
                completedAt: new Date(),
              },
            });
          }

          await cancelPendingTimesheetApprovalActionItems(timesheet.id);

          // Create approval record - skipped (approval stages managed separately)

          // Create audit log
          await tx.globalAuditLog.create({
            data: {
              id: `audit-${Date.now()}-${Math.random()}`,
              actorId: session.user.id,
              companyId: employee.companyId,
              action: "UPDATED",
              entityType: "EMPLOYEE",
              entityId: timesheet.id,
              metadata: {
                type: "TIMESHEET_REJECTED",
                employeeId: timesheet.employeeId,
                periodStart: timesheet.periodStart,
                periodEnd: timesheet.periodEnd,
                rejectedBy: employee.User.name,
                reason: data.reason,
                bulkRejection: true,
              },
            },
          });
        });

        // Send email notification if enabled
        if (data.sendEmail && timesheet.Employee.User?.email) {
          try {
            await sendTimesheetRejectionEmail({
              to: timesheet.Employee.User.email,
              employeeName: timesheet.Employee.User.name || 'Team Member',
              rejectedBy: employee.User.name || 'Manager',
              reason: data.reason,
              periodStart: timesheet.periodStart,
              periodEnd: timesheet.periodEnd,
            });
          } catch (emailError) {
            console.error("Failed to send rejection email:", emailError);
          }
        }

        succeeded.push(timesheet.id);
      } catch (error) {
        console.error(`Failed to reject timesheet ${timesheet.id}:`, error);
        failed.push({
          timesheetId: timesheet.id,
          error: "Processing error",
        });
      }
    }

    return NextResponse.json({
      succeeded,
      failed,
      summary: {
        total: uniqueTimesheetIds.length,
        succeeded: succeeded.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error("Bulk reject error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to reject timesheets" }, { status: 500 });
  }
}
