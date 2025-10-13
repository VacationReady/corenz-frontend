import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
// import { sendEmail } from "@/lib/email"; // TODO: Implement email service

const bulkRejectSchema = z.object({
  timesheetIds: z.array(z.string()).min(1),
  reason: z.string().min(1, "Rejection reason is required"),
});

/**
 * POST /api/timesheets/bulk-reject
 * Bulk reject multiple timesheets
 * Permission: ADMIN or MANAGER
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = bulkRejectSchema.parse(body);

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
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
          in: data.timesheetIds,
        },
      },
      include: {
        Employee: {
          include: {
            User: {
              select: {
                name: true,
                email: true,
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

        // Managers can only reject their department
        if (isManager && !isAdmin && timesheet.Employee.departmentId !== employee.departmentId) {
          failed.push({
            timesheetId: timesheet.id,
            error: "Can only reject timesheets from your department",
          });
          continue;
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
            },
          });

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

        // Send email notification
        if (timesheet.Employee.User?.email) {
          try {
            // TODO: Implement email notifications
            // await sendEmail({
            //   to: timesheet.Employee.User.email,
            //   subject: "Timesheet Rejected - Action Required",
            //   text: `Your timesheet for ${new Date(timesheet.periodStart).toLocaleDateString()} - ${new Date(timesheet.periodEnd).toLocaleDateString()} has been rejected by ${employee.User.name}. Reason: ${data.reason}`,
            //   html: `
            //     <div style="font-family: Arial, sans-serif; padding: 20px;">
            //       <h2 style="color: #EF4444;">Timesheet Rejected</h2>
            //       <p>Hi ${timesheet.Employee.User.name},</p>
            //       <p>Your timesheet for <strong>${new Date(timesheet.periodStart).toLocaleDateString()} - ${new Date(timesheet.periodEnd).toLocaleDateString()}</strong> has been rejected and requires your attention.</p>
            //       <p><strong>Rejected by:</strong> ${employee.User.name}</p>
            //       <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 12px; margin: 16px 0;">
            //         <p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
            //       </div>
            //       <p>Please review the feedback and resubmit your timesheet.</p>
            //       <p>Thank you!</p>
            //     </div>
            //   `,
            // });
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
        total: data.timesheetIds.length,
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
