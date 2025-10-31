import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import {
  cancelPendingTimesheetApprovalActionItems,
  resolveActionItemAssigneeUserId,
  upsertTimesheetApprovalActionItem,
} from '@/lib/action-items-helper';
import { resend } from '@/app/lib/resend';
import { renderPeopleCoreEmail, getAppBaseUrl } from '@/app/lib/email/template';
import { PEOPLECORE_FROM_EMAIL } from '@/app/lib/resend';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: id },
      include: {
        TimesheetEntries: true,
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
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions - only own timesheets can be submitted
    if (timesheet.employeeId !== requestingEmployee.id) {
      return NextResponse.json(
        { error: 'You can only submit your own timesheets' },
        { status: 403 }
      );
    }

    // Check if already submitted
    if (timesheet.submittedAt) {
      return NextResponse.json(
        { error: 'Timesheet has already been submitted' },
        { status: 400 }
      );
    }

    // Check if timesheet has entries
    if (timesheet.TimesheetEntries.length === 0) {
      return NextResponse.json(
        { error: 'Cannot submit empty timesheet' },
        { status: 400 }
      );
    }

    // Get company settings to find approval workflow
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    const employeeName = timesheet.Employee?.User
      ? `${timesheet.Employee.User.firstName ?? ''} ${timesheet.Employee.User.lastName ?? ''}`.trim() ||
        timesheet.Employee.User.name ||
        requestingEmployee.User?.name ||
        'Employee'
      : requestingEmployee.User?.name || 'Employee';

    // Clear any lingering pending approval action items (resubmissions)
    await cancelPendingTimesheetApprovalActionItems(id);

    // Update timesheet status
    await prisma.timesheet.update({
      where: { id: id },
      data: {
        submittedAt: new Date(),
        approvalStatus: 'PENDING',
      },
    });

    // If there's a default workflow, create approval stages
    if (settings?.defaultWorkflowId) {
      const workflow = await prisma.approvalWorkflow.findUnique({
        where: { id: settings.defaultWorkflowId },
        include: {
          stages: {
            include: {
              approvers: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (workflow?.stages) {
        // Create approval stages
        for (const stage of workflow.stages) {
          const approvalStage = await prisma.timesheetApprovalStage.create({
            data: {
              timesheetId: id,
              workflowStageId: stage.id,
              name: stage.name || `Stage ${stage.order}`,
              order: stage.order,
              mode: stage.mode,
              status: 'PENDING',
              isActive: stage.order === 1, // First stage is active
            },
          });

          // Create approval decisions for each approver
          for (let i = 0; i < stage.approvers.length; i++) {
            const approver = stage.approvers[i];
            
            let approverId: string;
            if (approver.type === 'USER' && approver.userId) {
              approverId = approver.userId;
            } else if (approver.type === 'MANAGER') {
              // Get employee's manager through User
              const employee = await prisma.employee.findUnique({
                where: { id: timesheet.employeeId },
                include: { User: { select: { managerId: true } } },
              });
              if (!employee?.User?.managerId) continue;
              approverId = employee.User.managerId;
            } else {
              continue;
            }

            const decision = await prisma.timesheetApprovalDecision.create({
              data: {
                stageId: approvalStage.id,
                approverId,
                order: i + 1,
                status: 'PENDING',
                isActive: stage.order === 1, // Active if first stage
              },
            });

            if (stage.order === 1) {
              // approverId is an employeeId, need to get the userId
              const assignedToId = await resolveActionItemAssigneeUserId(approverId);
              if (assignedToId) {
                await upsertTimesheetApprovalActionItem({
                  companyId: requestingEmployee.companyId,
                  assignedToId,
                  relatedEmployeeId: timesheet.employeeId,
                  timesheetId: timesheet.id,
                  decisionId: decision.id,
                  stageId: approvalStage.id,
                  stageName: approvalStage.name,
                  periodStart: timesheet.periodStart,
                  periodEnd: timesheet.periodEnd,
                  totalHours: Number(timesheet.totalHours),
                  employeeName,
                });
              }
            }
          }
        }

        // Send notification to first stage approvers
        const firstStage = await prisma.timesheetApprovalStage.findFirst({
          where: {
            timesheetId: id,
            order: 1,
          },
          include: {
            Decisions: true,
          },
        });

        if (firstStage) {
          for (const decision of firstStage.Decisions) {
            const approverEmployee = await prisma.employee.findUnique({
              where: { id: decision.approverId },
              include: {
                User: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            });

            if (approverEmployee?.User?.email) {
              try {
                const baseUrl = getAppBaseUrl();
                const { html, text } = renderPeopleCoreEmail({
                  preheader: `${employeeName} has submitted a timesheet for approval`,
                  title: 'Timesheet Approval Required',
                  heroBadge: 'Time Tracking',
                  intro: [`Hi ${approverEmployee.User.name},`],
                  sections: [
                    {
                      title: 'Timesheet Submission',
                      description: [
                        `${employeeName} has submitted a timesheet for your approval.`,
                      ],
                      bulletPoints: [
                        `Period: ${timesheet.periodStart.toLocaleDateString()} - ${timesheet.periodEnd.toLocaleDateString()}`,
                        `Total Hours: ${Number(timesheet.totalHours).toFixed(2)}`,
                        `Submitted: ${new Date().toLocaleDateString()}`,
                      ],
                    },
                  ],
                  ctas: {
                    label: 'Review Timesheet',
                    href: `${baseUrl}/admin/timesheets/hub`,
                  },
                  outro: [
                    'Please review and approve or reject this timesheet at your earliest convenience.',
                  ],
                });

                await resend.emails.send({
                  from: PEOPLECORE_FROM_EMAIL,
                  to: approverEmployee.User.email,
                  subject: `Timesheet Approval Required - ${employeeName}`,
                  html,
                  text,
                });
              } catch (emailError) {
                console.error('Failed to send timesheet approval email:', emailError);
                // Don't throw - email failures shouldn't break the submission
              }
            }
          }
        }
      }
    }

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: timesheet.employeeId,
        metadata: {
          type: 'TIMESHEET_SUBMITTED',
          timesheetId: id,
        },
      },
    });

    // Fetch updated timesheet
    const updatedTimesheet = await prisma.timesheet.findUnique({
      where: { id: id },
      include: {
        ApprovalStages: {
          include: {
            Decisions: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet,
      message: 'Timesheet submitted for approval',
    });
  } catch (error) {
    console.error('Timesheet submit error:', error);
    return NextResponse.json({ error: 'Failed to submit timesheet' }, { status: 500 });
  }
}