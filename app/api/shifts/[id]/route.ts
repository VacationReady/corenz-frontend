import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateShiftCost } from '@/lib/timesheet-calculations';
import { resend, PEOPLECORE_FROM_EMAIL } from '@/lib/resend';
import { format } from 'date-fns';

const updateShiftSchema = z.object({
  employeeId: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  breakDuration: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  requiredSkills: z.array(z.string()).optional(),
  requiresConfirmation: z.boolean().optional(),
  attendanceStatus: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']).optional(),
});

/**
 * GET /api/shifts/[id]
 * Fetch single shift with employee, department, location details
 * Permission: MANAGER/ADMIN for all shifts, employees can view own published shifts
 */
export async function GET(
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
        departmentId: true,
        User: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);

    // Fetch shift with related data
    const shift = await prisma.shift.findUnique({
      where: { id: id },
      include: {
        Template: true,
        ShiftSwapRequests: {
          where: {
            status: {
              not: 'REJECTED',
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Check company scoping
    if (shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check permissions
    const isOwnShift = shift.employeeId === requestingEmployee.id;
    
    if (!isAdminOrManager && !isOwnShift) {
      return NextResponse.json({ error: 'Unauthorized to view this shift' }, { status: 403 });
    }

    // Employees can only view published shifts
    if (!isAdminOrManager && !shift.isPublished) {
      return NextResponse.json({ error: 'Shift not available' }, { status: 403 });
    }

    // Get employee details if assigned
    let employee = null;
    if (shift.employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: shift.employeeId },
        include: {
          User: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true,
            },
          },
          Department: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    // Get department details if assigned
    let department = null;
    if (shift.departmentId) {
      department = await prisma.department.findUnique({
        where: { id: shift.departmentId },
        select: {
          id: true,
          name: true,
        },
      });
    }

    // Get location details if assigned
    let location = null;
    if (shift.locationId) {
      location = await prisma.location.findUnique({
        where: { id: shift.locationId },
        select: {
          id: true,
          name: true,
        },
      });
    }

    return NextResponse.json({
      shift: {
        ...shift,
        employee,
        department,
        location,
      },
    });
  } catch (error) {
    console.error('Shift fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 });
  }
}

/**
 * PUT /api/shifts/[id]
 * Update shift (time, employee assignment, notes)
 * Permission: MANAGER/ADMIN only
 */
export async function PUT(
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
    const data = updateShiftSchema.parse(body);

    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Only managers and admins can edit shifts
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to update shifts' }, { status: 403 });
    }

    const shift = await prisma.shift.findUnique({
      where: { id: id },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Check company scoping
    if (shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update data
    const updateData: any = {};

    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.templateId !== undefined) updateData.templateId = data.templateId;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.breakDuration !== undefined) updateData.breakDuration = data.breakDuration;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.requiredSkills !== undefined) updateData.requiredSkills = data.requiredSkills;
    if (data.requiresConfirmation !== undefined) updateData.requiresConfirmation = data.requiresConfirmation;
    if (data.attendanceStatus) updateData.attendanceStatus = data.attendanceStatus;

    // Recalculate cost if time changed
    if (data.startTime || data.endTime || data.employeeId !== undefined) {
      const startTime = data.startTime ? new Date(data.startTime) : shift.startTime;
      const endTime = data.endTime ? new Date(data.endTime) : shift.endTime;
      const employeeId = data.employeeId !== undefined ? data.employeeId : shift.employeeId;
      const breakDuration = data.breakDuration !== undefined ? data.breakDuration : shift.breakDuration;

      if (employeeId) {
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
        });

        if (employee) {
          const shiftHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          const cost = calculateShiftCost(
            shiftHours,
            breakDuration,
            employee.hourlyRate ? parseFloat(employee.hourlyRate.toString()) : 0
          );
          updateData.cost = cost;
        }
      }
    }

    // Update shift
    const updatedShift = await prisma.shift.update({
      where: { id: id },
      data: updateData,
      include: {
        Template: true,
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: updatedShift.employeeId || 'unassigned',
        metadata: {
          type: 'SHIFT_UPDATED',
          shiftId: id,
          changes: data,
        },
      },
    });

    // Get employee details for response
    let employee = null;
    if (updatedShift.employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: updatedShift.employeeId },
        include: {
          User: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      shift: {
        ...updatedShift,
        employee,
      },
      message: 'Shift updated successfully',
    });
  } catch (error) {
    console.error('Shift update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
  }
}

const deleteShiftSchema = z.object({
  reason: z.string().optional(),
  notifyEmployee: z.boolean().optional().default(false),
});

/**
 * DELETE /api/shifts/[id]
 * Delete shifts (both published and unpublished)
 * For published shifts with assigned employees, can optionally notify them via email
 * Permission: MANAGER/ADMIN only
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Parse request body (optional for backwards compatibility)
    let body: { reason?: string; notifyEmployee?: boolean } = {};
    try {
      const rawBody = await req.text();
      if (rawBody) {
        body = deleteShiftSchema.parse(JSON.parse(rawBody));
      }
    } catch {
      // Body is optional, continue with defaults
    }

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

    // Only managers and admins can delete shifts
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to delete shifts' }, { status: 403 });
    }

    // Fetch shift with employee and company details for email notification
    const shift = await prisma.shift.findUnique({
      where: { id: id },
      include: {
        employee: {
          include: {
            User: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        department: {
          select: { name: true },
        },
        location: {
          select: { name: true },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Check company scoping
    if (shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get company name for email
    const company = await prisma.company.findUnique({
      where: { id: shift.companyId },
      select: { name: true },
    });

    // Send notification email if requested and shift is published with an assigned employee
    let emailSent = false;
    if (body.notifyEmployee && shift.isPublished && shift.employee?.User?.email) {
      try {
        const employeeName = shift.employee.User.name ||
          [shift.employee.User.firstName, shift.employee.User.lastName].filter(Boolean).join(' ') ||
          'Team Member';
        
        const formattedDate = format(shift.startTime, 'EEEE, MMMM d, yyyy');
        const formattedStartTime = format(shift.startTime, 'h:mm a');
        const formattedEndTime = format(shift.endTime, 'h:mm a');
        
        const reasonText = body.reason 
          ? `<p style="margin: 16px 0; padding: 12px 16px; background-color: #f3f4f6; border-left: 4px solid #6b7280; border-radius: 4px;"><strong>Reason:</strong> ${body.reason}</p>`
          : '';

        const locationText = shift.location?.name ? ` at ${shift.location.name}` : '';
        const departmentText = shift.department?.name ? ` (${shift.department.name})` : '';

        await resend.emails.send({
          from: PEOPLECORE_FROM_EMAIL,
          to: shift.employee.User.email,
          subject: `Shift Cancelled - ${formattedDate}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Shift Cancelled</h1>
              </div>
              
              <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="margin-top: 0;">Hi ${employeeName},</p>
                
                <p>We're writing to let you know that your scheduled shift has been cancelled:</p>
                
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0 0 8px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
                  <p style="margin: 0 0 8px 0;"><strong>🕐 Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
                  ${shift.location?.name ? `<p style="margin: 0 0 8px 0;"><strong>📍 Location:</strong> ${shift.location.name}</p>` : ''}
                  ${shift.department?.name ? `<p style="margin: 0;"><strong>🏢 Department:</strong> ${shift.department.name}</p>` : ''}
                </div>
                
                ${reasonText}
                
                <p>If you have any questions about this cancellation, please contact your manager.</p>
                
                <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
                  Best regards,<br>
                  ${company?.name || 'Your Team'}
                </p>
              </div>
              
              <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
                This is an automated message from PeopleCore.
              </p>
            </body>
            </html>
          `,
          text: `Hi ${employeeName},

Your scheduled shift has been cancelled:

Date: ${formattedDate}
Time: ${formattedStartTime} - ${formattedEndTime}${locationText}${departmentText}

${body.reason ? `Reason: ${body.reason}\n\n` : ''}If you have any questions about this cancellation, please contact your manager.

Best regards,
${company?.name || 'Your Team'}`,
        });
        
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send shift cancellation email:', emailError);
        // Continue with deletion even if email fails
      }
    }

    // Delete shift (cascade will handle related records)
    await prisma.shift.delete({
      where: { id: id },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'DELETED',
        entityType: 'EMPLOYEE',
        entityId: shift.employeeId || 'unassigned',
        metadata: {
          type: 'SHIFT_DELETED',
          shiftId: id,
          startTime: shift.startTime.toISOString(),
          endTime: shift.endTime.toISOString(),
          wasPublished: shift.isPublished,
          reason: body.reason || null,
          employeeNotified: emailSent,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully',
      employeeNotified: emailSent,
    });
  } catch (error) {
    console.error('Shift delete error:', error);
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
  }
}
