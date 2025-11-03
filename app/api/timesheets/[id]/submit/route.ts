import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import {
  cancelPendingTimesheetApprovalActionItems,
  resolveActionItemAssigneeUserId,
  upsertTimesheetApprovalActionItem,
} from '@/lib/action-items-helper';
import { resend, PEOPLECORE_FROM_EMAIL } from '@/lib/resend';
import { renderPeopleCoreEmail, getAppBaseUrl } from '@/lib/email/template';

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

    console.log(`[Timesheet Submit] Timesheet ${id} submitted by ${employeeName}`);

    // If there's a default workflow, create approval stages
    if (settings?.defaultWorkflowId) {
      console.log(`[Timesheet Submit] Found default workflow: ${settings.defaultWorkflowId}`);
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

      if (!workflow) {
        console.error(`[Timesheet Submit] Workflow ${settings.defaultWorkflowId} not found`);
        return NextResponse.json(
          { error: 'Approval workflow not found. Please contact your administrator.' },
          { status: 500 }
        );
      }

      if (workflow?.stages && workflow.stages.length > 0) {
        console.log(`[Timesheet Submit] Creating ${workflow.stages.length} approval stages`);
        
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

            let approverId: string | null = null;
            
            if (approver.type === 'USER' && approver.userId) {
              approverId = approver.userId;
              console.log(`[Timesheet Submit] Stage ${stage.order}: USER approver ${approver.userId}`);
            } else if (approver.type === 'MANAGER') {
              // Resolve the manager's employee record from the submitter's managerId
              const employee = await prisma.employee.findUnique({
                where: { id: timesheet.employeeId },
                include: { 
                  User: { 
                    select: { 
                      managerId: true,
                      firstName: true,
                      lastName: true 
                    } 
                  } 
                },
              });
              
              if (!employee?.User?.managerId) {
                console.error(`[Timesheet Submit] Employee ${employeeName} has no manager assigned`);
                return NextResponse.json(
                  { 
                    error: `Cannot submit timesheet: No manager assigned to ${employeeName}. Please contact HR to assign a manager.` 
                  },
                  { status: 400 }
                );
              }

              const managerEmployee = await prisma.employee.findFirst({
                where: { userId: employee.User.managerId },
                select: { 
                  id: true,
                  User: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                },
              });

              if (!managerEmployee?.id) {
                console.error(`[Timesheet Submit] Manager user ID ${employee.User.managerId} has no employee record`);
                return NextResponse.json(
                  { 
                    error: 'Cannot submit timesheet: Manager employee record not found. Please contact your administrator.' 
                  },
                  { status: 500 }
                );
              }

              approverId = managerEmployee.id;
              const managerName = `${managerEmployee.User?.firstName || ''} ${managerEmployee.User?.lastName || ''}`.trim();
              console.log(`[Timesheet Submit] Stage ${stage.order}: MANAGER approver ${approverId} (${managerName})`);
            } else {
              console.warn(`[Timesheet Submit] Unsupported approver type: ${approver.type}`);
              continue;
            }
            
            if (!approverId) {
              console.error(`[Timesheet Submit] Could not resolve approverId for approver type ${approver.type}`);
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
                console.log(`[Timesheet Submit] Creating action item for user ${assignedToId}`);
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
                console.log(`[Timesheet Submit] Action item created successfully`);
              } else {
                console.error(`[Timesheet Submit] Could not resolve userId for approver employeeId: ${approverId}`);
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
          console.log(`[Timesheet Submit] Sending emails to ${firstStage.Decisions.length} approvers`);
          
          for (const decision of firstStage.Decisions) {
            const approverEmployee = await prisma.employee.findUnique({
              where: { id: decision.approverId },
              include: {
                User: {
                  select: {
                    email: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            });

            if (!approverEmployee?.User?.email) {
              console.error(`[Timesheet Submit] Approver employee ${decision.approverId} has no email address`);
              continue;
            }

            try {
              const baseUrl = getAppBaseUrl();
              const approverName = approverEmployee.User.name || 
                `${approverEmployee.User.firstName || ''} ${approverEmployee.User.lastName || ''}`.trim();
              
              console.log(`[Timesheet Submit] Sending email to ${approverEmployee.User.email} (${approverName})`);
              
              const { html, text } = renderPeopleCoreEmail({
                preheader: `${employeeName} just submitted a timesheet for your approval`,
                title: 'Timesheet awaiting your approval',
                heroBadge: 'Action required',
                heroSubtitle: 'Review and approve in PeopleCore',
                intro: [`Hi ${approverName},`],
                sections: [
                  {
                    eyebrow: 'Submission details',
                    title: `Timesheet for ${employeeName}`,
                    description: [
                      `${employeeName} has sent you their latest timesheet. Review the summary below and approve it when you are ready.`,
                    ],
                    bulletPoints: [
                      `Period: ${timesheet.periodStart.toLocaleDateString()} - ${timesheet.periodEnd.toLocaleDateString()}`,
                      `Total hours: ${Number(timesheet.totalHours).toFixed(2)}`,
                      `Submitted: ${new Date().toLocaleDateString()}`,
                    ],
                    highlight: true,
                  },
                  {
                    title: 'Next steps',
                    description: [
                      'Log in to PeopleCore to review the full details, approve the submission, or request changes.',
                    ],
                  },
                ],
                ctas: {
                  label: 'Review & approve',
                  href: `${baseUrl}/admin/timesheets/hub`,
                },
                outro: [
                  "Thank you for keeping your team's time tracking up to date.",
                ],
              });

              const emailResult = await resend.emails.send({
                from: PEOPLECORE_FROM_EMAIL,
                to: approverEmployee.User.email,
                subject: `Timesheet submitted by ${employeeName}`,
                html,
                text,
              });
              
              console.log(`[Timesheet Submit] Email sent successfully to ${approverEmployee.User.email}:`, emailResult);
            } catch (emailError) {
              console.error(`[Timesheet Submit] CRITICAL: Failed to send email to ${approverEmployee.User.email}:`, emailError);
              // Log the full error for debugging
              console.error('[Timesheet Submit] Email error details:', JSON.stringify(emailError, null, 2));
              // Don't throw - email failures shouldn't break the submission, but we log it prominently
            }
          }
        } else {
          console.warn(`[Timesheet Submit] No first stage approvers found`);
        }
      } else {
        console.warn(`[Timesheet Submit] Workflow has no stages configured`);
      }
    } else {
      console.log(`[Timesheet Submit] No default workflow configured - timesheet submitted without approval workflow`);
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