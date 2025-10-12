import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

const bulkApproveSchema = z.object({
  timesheetIds: z.array(z.string()).min(1),
  comment: z.string().optional(),
});

/**
 * POST /api/timesheets/bulk-approve
 * Bulk approve multiple timesheets
 * Permission: ADMIN or MANAGER
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = bulkApproveSchema.parse(body);

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
        { error: "Only admins and managers can approve timesheets" },
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
        employee: {
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
        if (timesheet.employee.companyId !== employee.companyId) {
          failed.push({
            timesheetId: timesheet.id,
            error: "Timesheet belongs to different company",
          });
          continue;
        }

        // Managers can only approve their department
        if (isManager && !isAdmin && timesheet.employee.departmentId !== employee.departmentId) {
          failed.push({
            timesheetId: timesheet.id,
            error: "Can only approve timesheets from your department",
          });
          continue;
        }

        // Check if already approved
        if (timesheet.status === "APPROVED") {
          failed.push({
            timesheetId: timesheet.id,
            error: "Already approved",
          });
          continue;
        }

        // Check if submitted
        if (timesheet.status !== "SUBMITTED") {
          failed.push({
            timesheetId: timesheet.id,
            error: "Timesheet must be submitted before approval",
          });
          continue;
        }

        // Approve the timesheet
        await prisma.$transaction(async (tx) => {
          // Update timesheet status
          await tx.timesheet.update({
            where: { id: timesheet.id },
            data: {
              status: "APPROVED",
            },
          });

          // Create approval record
          await tx.timesheetApproval.create({
            data: {
              id: `approval-${Date.now()}-${Math.random()}`,
              timesheetId: timesheet.id,
              approverId: employee.id,
              status: "APPROVED",
              comment: data.comment,
            },
          });

          // Create audit log
          await tx.globalAuditLog.create({
            data: {
              id: `audit-${Date.now()}-${Math.random()}`,
              actorId: session.user.id,
              companyId: employee.companyId,
              action: "APPROVED",
              entityType: "TIMESHEET",
              entityId: timesheet.id,
              metadata: {
                type: "TIMESHEET_APPROVED",
                employeeId: timesheet.employeeId,
                periodStart: timesheet.periodStart,
                periodEnd: timesheet.periodEnd,
                approvedBy: employee.User.name,
                bulkApproval: true,
              },
            },
          });
        });

        // Send email notification
        if (timesheet.employee.User?.email) {
          try {
            await sendEmail({
              to: timesheet.employee.User.email,
              subject: "Timesheet Approved",
              text: `Your timesheet for ${new Date(timesheet.periodStart).toLocaleDateString()} - ${new Date(timesheet.periodEnd).toLocaleDateString()} has been approved by ${employee.User.name}.`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2 style="color: #10B981;">Timesheet Approved ✓</h2>
                  <p>Hi ${timesheet.employee.User.name},</p>
                  <p>Your timesheet for <strong>${new Date(timesheet.periodStart).toLocaleDateString()} - ${new Date(timesheet.periodEnd).toLocaleDateString()}</strong> has been approved.</p>
                  <p><strong>Approved by:</strong> ${employee.User.name}</p>
                  ${data.comment ? `<p><strong>Comment:</strong> ${data.comment}</p>` : ""}
                  <p>Thank you!</p>
                </div>
              `,
            });
          } catch (emailError) {
            console.error("Failed to send approval email:", emailError);
          }
        }

        succeeded.push(timesheet.id);
      } catch (error) {
        console.error(`Failed to approve timesheet ${timesheet.id}:`, error);
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
    console.error("Bulk approve error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to approve timesheets" }, { status: 500 });
  }
}
