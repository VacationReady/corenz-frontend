import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

import { z } from 'zod';
import {
  cancelTimesheetApprovalActionItem,
  cancelPendingTimesheetApprovalActionItems,
} from '@/lib/action-items-helper';
import { sendTimesheetRejectionEmail } from '@/lib/email/timesheet-notifications';
import {
  validateTimesheetTenant,
  getRequestingEmployee,
  TenantValidationError,
  logTenantViolationAttempt,
} from '@/lib/tenant-validation';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
  sendEmail: z.boolean().optional().default(true),
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
    const data = rejectSchema.parse(body);

    // Get requesting employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // SECURITY FIX: Validate tenant ownership BEFORE rejection
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

    const activeStage = timesheet.ApprovalStages.find((s: any) => s.isActive);

    if (!activeStage) {
      return NextResponse.json({ error: 'No active approval stage found' }, { status: 400 });
    }

    const userDecision = activeStage.Decisions.find(
      (d: any) => d.approverId === requestingEmployee.id && d.isActive
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

    const updateResult = await prisma.timesheet.updateMany({
      where: { id, companyId: requestingEmployee.companyId },
      data: { approvalStatus: 'DECLINED', rejectedReason: data.reason },
    });

    if (updateResult.count === 0) {
      throw new TenantValidationError('Timesheet not found or access denied');
    }

    await cancelPendingTimesheetApprovalActionItems(id);

    const employee = await prisma.employee.findFirst({
      where: { id: timesheet.employeeId, companyId: requestingEmployee.companyId },
      include: { User: { select: { email: true, name: true } } },
    });

    if (data.sendEmail && employee?.User.email) {
      try {
        await sendTimesheetRejectionEmail({
          to: employee.User.email,
          employeeName: employee.User.name || 'Team Member',
          rejectedBy: requestingEmployee.User.name || 'Manager',
          reason: data.reason,
          periodStart: timesheet.periodStart,
          periodEnd: timesheet.periodEnd,
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
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

    const updatedTimesheet = await prisma.timesheet.findFirst({
      where: { id, companyId: requestingEmployee.companyId },
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