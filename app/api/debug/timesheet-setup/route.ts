import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * Debug endpoint to check timesheet submission setup
 * GET /api/debug/timesheet-setup
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            managerId: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check time tracking settings
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: employee.companyId },
    });

    // Check if workflow exists
    let workflow = null;
    if (settings?.defaultWorkflowId) {
      workflow = await prisma.approvalWorkflow.findUnique({
        where: { id: settings.defaultWorkflowId },
        include: {
          stages: {
            include: {
              approvers: true,
            },
          },
        },
      });
    }

    // Check manager setup
    let manager = null;
    let managerEmployee = null;
    if (employee.User?.managerId) {
      manager = await prisma.user.findUnique({
        where: { id: employee.User.managerId },
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      managerEmployee = await prisma.employee.findFirst({
        where: { userId: employee.User.managerId },
        select: {
          id: true,
          userId: true,
        },
      });
    }

    // Check TIMESHEET_APPROVAL event category
    const eventCategory = await prisma.eventCategory.findFirst({
      where: {
        companyId: employee.companyId,
        id: 'TIMESHEET_APPROVAL',
      },
    });

    // Check if there are any approval workflows for this company
    const allWorkflows = await prisma.approvalWorkflow.findMany({
      where: {
        companyId: employee.companyId,
      },
      select: {
        id: true,
        name: true,
        eventCategoryId: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        userId: employee.User?.id,
        name: `${employee.User?.firstName || ''} ${employee.User?.lastName || ''}`.trim(),
        email: employee.User?.email,
        role: employee.User?.role,
        hasManager: !!employee.User?.managerId,
        managerId: employee.User?.managerId,
      },
      manager: manager
        ? {
            id: manager.id,
            name: manager.name || `${manager.firstName || ''} ${manager.lastName || ''}`.trim(),
            email: manager.email,
            hasEmployeeRecord: !!managerEmployee,
            employeeId: managerEmployee?.id,
          }
        : null,
      settings: settings
        ? {
            hasSettings: true,
            defaultWorkflowId: settings.defaultWorkflowId,
            hasWorkflowConfigured: !!settings.defaultWorkflowId,
          }
        : { hasSettings: false },
      workflow: workflow
        ? {
            id: workflow.id,
            name: workflow.name,
            eventCategoryId: workflow.eventCategoryId,
            isActive: workflow.isActive,
            stagesCount: workflow.stages?.length || 0,
            stages: workflow.stages?.map((s: any) => ({
              order: s.order,
              name: s.name,
              mode: s.mode,
              approversCount: s.approvers?.length || 0,
              approvers: s.approvers?.map((a: any) => ({
                type: a.type,
                userId: a.userId,
              })),
            })),
          }
        : null,
      eventCategory: eventCategory
        ? {
            exists: true,
            id: eventCategory.id,
            name: eventCategory.name,
          }
        : { exists: false },
      allWorkflows: allWorkflows,
      diagnosis: {
        canSubmitTimesheet: !!(
          employee.User?.managerId &&
          managerEmployee &&
          settings?.defaultWorkflowId &&
          workflow
        ),
        issues: [
          !employee.User?.managerId && 'Employee has no manager assigned',
          employee.User?.managerId && !managerEmployee && 'Manager has no employee record',
          !settings?.defaultWorkflowId && 'No default workflow configured in time tracking settings',
          settings?.defaultWorkflowId && !workflow && 'Configured workflow does not exist',
          !eventCategory && 'TIMESHEET_APPROVAL event category missing',
        ].filter(Boolean),
      },
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Debug check failed',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
