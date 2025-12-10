import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  cancelPendingTimesheetApprovalActionItems,
  cancelTimesheetApprovalActionItems,
  completeTimesheetApprovalActionItem,
  resolveActionItemAssigneeUserId,
  upsertTimesheetApprovalActionItem,
} from '@/lib/action-items-helper';
import { renderPeopleCoreEmail, getAppBaseUrl } from '@/lib/email/template';
import { resend, PEOPLECORE_FROM_EMAIL } from '@/lib/resend';
import {
  validateTimesheetTenant,
  getRequestingEmployee,
  TenantValidationError,
  logTenantViolationAttempt,
} from '@/lib/tenant-validation';

const approveSchema = z.object({
  comments: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await req.json();
    const data = approveSchema.parse(body);

    // Get requesting employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // ✅ SECURITY FIX: Validate tenant ownership BEFORE approval operations
    try {
      await validateTimesheetTenant(id, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        await logTenantViolationAttempt(session.user.id, 'TIMESHEET', id, requestingEmployee.companyId);
        return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
      }
      throw error;
    }

    // Safe to fetch timesheet - tenant ownership validated
    const timesheet = await prisma.timesheet.findFirst({
      where: { id, companyId: requestingEmployee.companyId },
      include: {
        ApprovalStages: {
          include: {
            Decisions: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        Employee: {
          select: {
            id: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!timesheet) {
      // Clean up orphaned action items for this timesheet
      await prisma.actionItem.updateMany({
        where: {
          metadata: {
            path: ['timesheetId'],
            equals: id,
          },
        },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Find active stage and user's decision
    const activeStage = timesheet.ApprovalStages.find((s: any) => s.isActive);

    if (!activeStage) {
      return NextResponse.json(
        { error: 'No active approval stage found' },
        { status: 400 }
      );
    }

    const userDecision = activeStage.Decisions.find(
      (d: any) => d.approverId === requestingEmployee.id && d.isActive
    );

    if (!userDecision) {
      return NextResponse.json(
        { error: 'You are not assigned to approve this timesheet at this stage' },
        { status: 403 }
      );
    }

    // Update the decision
    await prisma.timesheetApprovalDecision.update({
      where: { id: userDecision.id },
      data: {
        status: 'APPROVED',
        comments: data.comments,
        respondedAt: new Date(),
      },
    });

    await completeTimesheetApprovalActionItem(userDecision.id);

    // Check if stage is complete based on mode
    const stageDecisions = await prisma.timesheetApprovalDecision.findMany({
      where: { stageId: activeStage.id },
    });

    let stageComplete = false;

    if (activeStage.mode === 'FIRST_RESPONDER') {
      stageComplete = true;
    } else if (activeStage.mode === 'UNANIMOUS') {
      stageComplete = stageDecisions.every((d: any) => d.status === 'APPROVED');
    } else {
      // SEQUENTIAL mode
      const nextDecision = stageDecisions.find(
        (d: any) => d.order === userDecision.order + 1
      );

      if (nextDecision) {
        await prisma.timesheetApprovalDecision.update({
          where: { id: nextDecision.id },
          data: { isActive: true },
        });
        const assignedToId = await resolveActionItemAssigneeUserId(nextDecision.approverId);
        if (assignedToId) {
          const employeeName = timesheet.Employee?.User
            ? `${timesheet.Employee.User.firstName ?? ''} ${timesheet.Employee.User.lastName ?? ''}`.trim() ||
              timesheet.Employee.User.name ||
              requestingEmployee.User?.name ||
              'Employee'
            : requestingEmployee.User?.name || 'Employee';

          await upsertTimesheetApprovalActionItem({
            companyId: requestingEmployee.companyId,
            assignedToId,
            relatedEmployeeId: timesheet.employeeId,
            timesheetId: timesheet.id,
            decisionId: nextDecision.id,
            stageId: activeStage.id,
            stageName: activeStage.name,
            periodStart: timesheet.periodStart,
            periodEnd: timesheet.periodEnd,
            totalHours: Number(timesheet.totalHours),
            employeeName,
          });
        }
      } else {
        stageComplete = true;
      }
    }

    if (stageComplete) {
      if (activeStage.mode === 'FIRST_RESPONDER') {
        const remainingDecisionIds = stageDecisions
          .filter((d: any) => d.id !== userDecision.id && d.status === 'PENDING')
          .map((d: any) => d.id);

        if (remainingDecisionIds.length > 0) {
          await cancelTimesheetApprovalActionItems(remainingDecisionIds);
        }
      }

      // Mark stage as complete
      await prisma.timesheetApprovalStage.update({
        where: { id: activeStage.id },
        data: {
          status: 'APPROVED',
          isActive: false,
          completedAt: new Date(),
        },
      });

      // Check if there's a next stage
      const nextStage = timesheet.ApprovalStages.find(
        (s: any) => s.order === activeStage.order + 1
      );

      if (nextStage) {
        // Activate next stage
        await prisma.timesheetApprovalStage.update({
          where: { id: nextStage.id },
          data: { isActive: true },
        });

        // Activate all decisions in next stage
        await prisma.timesheetApprovalDecision.updateMany({
          where: { stageId: nextStage.id },
          data: { isActive: true },
        });

        const nextStageDecisions = await prisma.timesheetApprovalDecision.findMany({
          where: { stageId: nextStage.id },
        });

        const employeeName = timesheet.Employee?.User
          ? `${timesheet.Employee.User.firstName ?? ''} ${timesheet.Employee.User.lastName ?? ''}`.trim() ||
            timesheet.Employee.User.name ||
            requestingEmployee.User?.name ||
            'Employee'
          : requestingEmployee.User?.name || 'Employee';

        await Promise.all(
          nextStageDecisions.map(async (decision: any) => {
            const assignedToId = await resolveActionItemAssigneeUserId(decision.approverId);
            if (!assignedToId) return;

            await upsertTimesheetApprovalActionItem({
              companyId: requestingEmployee.companyId,
              assignedToId,
              relatedEmployeeId: timesheet.employeeId,
              timesheetId: timesheet.id,
              decisionId: decision.id,
              stageId: nextStage.id,
              stageName: nextStage.name,
              periodStart: timesheet.periodStart,
              periodEnd: timesheet.periodEnd,
              totalHours: Number(timesheet.totalHours),
              employeeName,
            });
          })
        );

        // Send notifications to next stage approvers
        for (const decision of nextStageDecisions) {
          const approverEmployee = await prisma.employee.findFirst({
            where: { id: decision.approverId, companyId: requestingEmployee.companyId },
            include: {
              User: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          });

          if (approverEmployee?.User.email) {
            // TODO: Implement email notifications
            // await sendEmail({
            //   to: approverEmployee.User.email,
            //   subject: 'Timesheet Approval Required',
            //   html: `
            //     <h2>Timesheet Approval Required</h2>
            //     <p>Hi ${approverEmployee.User.name},</p>
            //     <p>A timesheet has reached your approval stage.</p>
            //     <p><strong>Period:</strong> ${timesheet.periodStart.toLocaleDateString()} - ${timesheet.periodEnd.toLocaleDateString()}</p>
            //     <p><strong>Total Hours:</strong> ${timesheet.totalHours}</p>
            //     <p>Please review and approve or reject the timesheet.</p>
            //   `,
            // });
          }
        }
      } else {
        // All stages complete - approve timesheet
        const updateResult = await prisma.timesheet.updateMany({
          where: { id, companyId: requestingEmployee.companyId },
          data: {
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: requestingEmployee.id,
          },
        });

        if (updateResult.count === 0) {
          throw new TenantValidationError('Timesheet not found or access denied');
        }

        // Update all timesheet entries' reconciliation status to APPROVED
        // This ensures the reconciliation page shows the correct status
        await prisma.timesheetEntry.updateMany({
          where: { timesheetId: id },
          data: {
            reconciliationStatus: 'APPROVED',
            reconciledBy: requestingEmployee.id,
            reconciledAt: new Date(),
          },
        });

        await cancelPendingTimesheetApprovalActionItems(timesheet.id);

        // Notify employee
        const employee = await prisma.employee.findFirst({
          where: { id: timesheet.employeeId, companyId: requestingEmployee.companyId },
          include: {
            User: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        });

        if (employee?.User.email) {
          try {
            const baseUrl = getAppBaseUrl();
            const approverName = requestingEmployee.User?.name || 'Your manager';
            
            const { html, text } = renderPeopleCoreEmail({
              preheader: 'Your timesheet has been approved',
              title: 'Timesheet Approved',
              intro: [
                `Hi ${employee.User.name || 'there'},`,
                `Great news! ${approverName} has approved your timesheet.`,
              ],
              sections: [
                {
                  title: 'Timesheet Details',
                  bulletPoints: [
                    `Period: ${timesheet.periodStart.toLocaleDateString()} - ${timesheet.periodEnd.toLocaleDateString()}`,
                    `Total hours: ${Number(timesheet.totalHours).toFixed(2)}`,
                    `Status: Approved`,
                  ],
                  highlight: true,
                },
              ],
              ctas: {
                label: 'View Timesheet',
                href: `${baseUrl}/employee/timesheet`,
              },
              outro: [
                'Your timesheet has been processed and is ready for payroll.',
              ],
            });

            await resend.emails.send({
              from: PEOPLECORE_FROM_EMAIL,
              to: employee.User.email,
              subject: '✅ Timesheet Approved',
              html,
              text,
            });

            console.log(`[Timesheet Approval] Email sent to employee: ${employee.User.email}`);
          } catch (emailError) {
            console.error('[Timesheet Approval] Failed to send approval email:', emailError);
            // Don't fail the approval if email fails
          }
        }
      }
    }

    // Fetch updated timesheet
    const updatedTimesheet = await prisma.timesheet.findFirst({
      where: { id, companyId: requestingEmployee.companyId },
      include: {
        ApprovalStages: {
          include: {
            Decisions: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        Employee: {
          select: {
            id: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet,
      message: 'Timesheet approved successfully',
    });
  } catch (error) {
    console.error('Timesheet approve error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to approve timesheet' }, { status: 500 });
  }
}