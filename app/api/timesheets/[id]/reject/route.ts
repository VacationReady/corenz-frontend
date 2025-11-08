import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { cancelTimesheetApprovalActionItem } from '@/lib/action-items-helper';
import { validateTimesheetTenant, getRequestingEmployee, TenantValidationError } from '@/lib/tenant-validation';
// import { sendEmail } from '@/lib/email'; // TODO: Implement email service

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

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

    const body = await req.json();
    const data = rejectSchema.parse(body);

    // Get requesting employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // ✅ SECURITY FIX: Validate tenant ownership BEFORE rejection
    try {
      await validateTimesheetTenant(id, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
      }
      throw error;
    }

    // Safe to fetch timesheet - tenant ownership validated
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: id },
      include: {
        ApprovalStages: {
          include: { Decisions: true },
          orderBy: { order: 'asc' },
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

    const activeStage = timesheet.ApprovalStages.find((s) => s.isActive);
    if (!activeStage) {
      return NextResponse.json({ error: 'No active approval stage found' }, { status: 400 });
    }

    const userDecision = activeStage.Decisions.find(
      (d) => d.approverId === requestingEmployee.id && d.isActive
    );

    if (!userDecision) {
      return NextResponse.json(
        { error: 'You are not assigned to approve this timesheet' },
        { status: 403 }
      );
    }

    // Update decision
    await prisma.timesheetApprovalDecision.update({
      where: { id: userDecision.id },
      data: { status: 'DECLINED', comments: data.reason, respondedAt: new Date() },
    });

    // Cancel the action item for this decision
    await cancelTimesheetApprovalActionItem(userDecision.id);

    // Mark stage and timesheet as rejected
    await prisma.timesheetApprovalStage.update({
      where: { id: activeStage.id },
      data: { status: 'DECLINED', isActive: false, completedAt: new Date() },
    });

    await prisma.timesheet.update({
      where: { id: id },
      data: { approvalStatus: 'DECLINED', rejectedReason: data.reason },
    });

    // Notify employee
    const employee = await prisma.employee.findUnique({
      where: { id: timesheet.employeeId },
      include: { User: { select: { email: true, name: true } } },
    });

    if (employee?.User.email) {
      // TODO: Implement email notifications
      // await sendEmail({
      //   to: employee.User.email,
      //   subject: 'Timesheet Rejected',
      //   html: `
      //     <h2>Timesheet Rejected</h2>
      //     <p>Hi ${employee.User.name},</p>
      //     <p>Your timesheet has been rejected by ${requestingEmployee.User.name}.</p>
      //     <p><strong>Reason:</strong> ${data.reason}</p>
      //     <p><strong>Period:</strong> ${timesheet.periodStart.toLocaleDateString()} - ${timesheet.periodEnd.toLocaleDateString()}</p>
      //     <p>Please review and resubmit.</p>
      //   `,
      // });
    }

    // Audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: timesheet.employeeId,
        metadata: {
          type: 'TIMESHEET_REJECTED',
          timesheetId: id,
          reason: data.reason,
        },
      },
    });

    const updatedTimesheet = await prisma.timesheet.findUnique({
      where: { id: id },
      include: {
        ApprovalStages: {
          include: { Decisions: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet,
      message: 'Timesheet rejected',
    });
  } catch (error) {
    console.error('Timesheet reject error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to reject timesheet' }, { status: 500 });
  }
}