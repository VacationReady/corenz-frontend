import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';

const approveSchema = z.object({
  comments: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = approveSchema.parse(body);

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
      where: { id: params.id },
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

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Find active stage and user's decision
    const activeStage = timesheet.ApprovalStages.find((s) => s.isActive);

    if (!activeStage) {
      return NextResponse.json(
        { error: 'No active approval stage found' },
        { status: 400 }
      );
    }

    const userDecision = activeStage.Decisions.find(
      (d) => d.approverId === requestingEmployee.id && d.isActive
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

    // Check if stage is complete based on mode
    const stageDecisions = await prisma.timesheetApprovalDecision.findMany({
      where: { stageId: activeStage.id },
    });

    let stageComplete = false;

    if (activeStage.mode === 'FIRST_RESPONDER') {
      stageComplete = true;
    } else if (activeStage.mode === 'UNANIMOUS') {
      stageComplete = stageDecisions.every((d) => d.status === 'APPROVED');
    } else {
      // SEQUENTIAL mode
      const nextDecision = stageDecisions.find(
        (d) => d.order === userDecision.order + 1
      );
      if (nextDecision) {
        await prisma.timesheetApprovalDecision.update({
          where: { id: nextDecision.id },
          data: { isActive: true },
        });
      } else {
        stageComplete = true;
      }
    }

    if (stageComplete) {
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
        (s) => s.order === activeStage.order + 1
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

        // Send notifications to next stage approvers
        const nextStageDecisions = await prisma.timesheetApprovalDecision.findMany({
          where: { stageId: nextStage.id },
        });

        for (const decision of nextStageDecisions) {
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

          if (approverEmployee?.User.email) {
            await sendEmail({
              to: approverEmployee.User.email,
              subject: 'Timesheet Approval Required',
              html: `
                <h2>Timesheet Approval Required</h2>
                <p>Hi ${approverEmployee.User.name},</p>
                <p>A timesheet has reached your approval stage.</p>
                <p><strong>Period:</strong> ${timesheet.periodStart.toLocaleDateString()} - ${timesheet.periodEnd.toLocaleDateString()}</p>
                <p><strong>Total Hours:</strong> ${timesheet.totalHours}</p>
                <p>Please review and approve or reject the timesheet.</p>
              `,
            });
          }
        }
      } else {
        // All stages complete - approve timesheet
        await prisma.timesheet.update({
          where: { id: params.id },
          data: {
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: requestingEmployee.id,
          },
        });

        // Notify employee
        const employee = await prisma.employee.findUnique({
          where: { id: timesheet.employeeId },
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
          await sendEmail({
            to: employee.User.email,
            subject: 'Timesheet Approved',
            html: `
              <h2>Timesheet Approved</h2>
              <p>Hi ${employee.User.name},</p>
              <p>Your timesheet has been approved.</p>
              <p><strong>Period:</strong> ${timesheet.periodStart.toLocaleDateString()} - ${timesheet.periodEnd.toLocaleDateString()}</p>
              <p><strong>Total Hours:</strong> ${timesheet.totalHours}</p>
            `,
          });
        }
      }
    }

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        userId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'APPROVE',
        resourceType: 'Timesheet',
        resourceId: params.id,
        details: `Approved timesheet at stage ${activeStage.name}`,
      },
    });

    // Fetch updated timesheet
    const updatedTimesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
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