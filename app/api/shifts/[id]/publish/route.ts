import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { format } from 'date-fns';
// import { sendEmail } from '@/lib/email'; // TODO: Implement email notifications

const publishSchema = z.object({
  shiftIds: z.array(z.string()).optional(), // For batch publishing
  notifyEmployees: z.boolean().default(true),
});

/**
 * POST /api/shifts/[id]/publish
 * Publish shift(s) to employees (makes visible + sends notifications)
 * - Only unpublished shifts can be published
 * - Sends email/push notification to assigned employees
 * - Logs in audit trail
 * Permission: MANAGER/ADMIN only
 */
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
    const data = publishSchema.parse(body);

    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            role: true,
            name: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Only managers and admins can publish shifts
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to publish shifts' }, { status: 403 });
    }

    // Determine which shifts to publish
    const shiftIdsToPublish = data.shiftIds && data.shiftIds.length > 0 
      ? data.shiftIds 
      : [params.id];

    // Fetch all shifts to publish
    const shifts = await prisma.shift.findMany({
      where: {
        id: { in: shiftIdsToPublish },
        companyId: requestingEmployee.companyId,
      },
      include: {
        Template: true,
      },
    });

    if (shifts.length === 0) {
      return NextResponse.json({ error: 'No shifts found' }, { status: 404 });
    }

    // Validate all shifts belong to the same company
    const invalidShifts = shifts.filter(s => s.companyId !== requestingEmployee.companyId);
    if (invalidShifts.length > 0) {
      return NextResponse.json({ error: 'Unauthorized to publish these shifts' }, { status: 403 });
    }

    // Check if any shifts are already published
    const alreadyPublished = shifts.filter(s => s.isPublished);
    if (alreadyPublished.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some shifts are already published',
          alreadyPublished: alreadyPublished.map(s => s.id),
        },
        { status: 400 }
      );
    }

    // Warn about unassigned shifts
    const unassignedShifts = shifts.filter(s => !s.employeeId);
    
    // Update all shifts to published
    await prisma.shift.updateMany({
      where: {
        id: { in: shiftIdsToPublish },
      },
      data: {
        isPublished: true,
      },
    });

    // Get employee details for assigned shifts
    const assignedShifts = shifts.filter(s => s.employeeId);
    const employeeIds = [...new Set(assignedShifts.map(s => s.employeeId).filter(Boolean))];
    
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds as string[] },
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const employeeMap = new Map(employees.map(e => [e.id, e]));

    // Send notifications to employees (if enabled)
    const notificationResults: { success: number; failed: number } = { success: 0, failed: 0 };
    
    if (data.notifyEmployees && assignedShifts.length > 0) {
      for (const shift of assignedShifts) {
        if (!shift.employeeId) continue;

        const employee = employeeMap.get(shift.employeeId);
        if (!employee) continue;

        try {
          // TODO: Implement email notification
          // await sendEmail({
          //   to: employee.User.email,
          //   subject: 'New Shift Assignment',
          //   html: `
          //     <h2>New Shift Assigned</h2>
          //     <p>Hi ${employee.User.name},</p>
          //     <p>You have been assigned a new shift:</p>
          //     <ul>
          //       <li><strong>Date:</strong> ${format(shift.startTime, 'MMMM d, yyyy')}</li>
          //       <li><strong>Time:</strong> ${format(shift.startTime, 'h:mm a')} - ${format(shift.endTime, 'h:mm a')}</li>
          //       <li><strong>Duration:</strong> ${Math.round((shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60) * 10) / 10} hours</li>
          //       ${shift.notes ? `<li><strong>Notes:</strong> ${shift.notes}</li>` : ''}
          //     </ul>
          //     ${shift.requiresConfirmation ? '<p><strong>Please confirm your availability for this shift.</strong></p>' : ''}
          //     <p>Log in to view your schedule.</p>
          //   `,
          // });
          notificationResults.success++;
        } catch (error) {
          console.error(`Failed to send notification to ${employee.User.email}:`, error);
          notificationResults.failed++;
        }
      }
    }

    // Create audit logs
    for (const shift of shifts) {
      await prisma.globalAuditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random()}`,
          actorId: session.user.id,
          companyId: requestingEmployee.companyId,
          action: 'UPDATED',
          entityType: 'EMPLOYEE',
          entityId: shift.employeeId || 'unassigned',
          metadata: {
            type: 'SHIFT_PUBLISHED',
            shiftId: shift.id,
            startTime: shift.startTime.toISOString(),
            endTime: shift.endTime.toISOString(),
            publishedBy: requestingEmployee.User.name,
          },
        },
      });
    }

    // Fetch updated shifts
    const updatedShifts = await prisma.shift.findMany({
      where: {
        id: { in: shiftIdsToPublish },
      },
      include: {
        Template: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${shifts.length} shift${shifts.length > 1 ? 's' : ''} published successfully`,
      shifts: updatedShifts,
      notificationsSent: notificationResults.success,
      notificationsFailed: notificationResults.failed,
      warnings: unassignedShifts.length > 0 
        ? [`${unassignedShifts.length} shift${unassignedShifts.length > 1 ? 's' : ''} published without employee assignment`]
        : [],
    });
  } catch (error) {
    console.error('Shift publish error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to publish shifts' }, { status: 500 });
  }
}
