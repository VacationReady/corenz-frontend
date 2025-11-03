import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const settingsUpdateSchema = z.object({
  // Timesheet settings
  defaultApprovalWorkflow: z.enum(['SEQUENTIAL', 'UNANIMOUS', 'FIRST_RESPONDER']).optional(),
  requirePhotos: z.boolean().optional(),
  enableGPSTracking: z.boolean().optional(),
  allowManualEntry: z.boolean().optional(),

  // Shift settings
  minimumRestHours: z.coerce.number().int().min(0).max(24).optional(),
  overtimeThreshold: z.coerce.number().min(20).max(80).optional(),
  requireShiftConfirmation: z.boolean().optional(),
  managerApprovalSwaps: z.boolean().optional(),

  // Clock in/out settings
  enableGeofencing: z.boolean().optional(),
  geofenceRadius: z.coerce.number().int().min(50).max(5000).optional(),
  requireBreaks: z.boolean().optional(),
  minBreakDuration: z.coerce.number().int().min(0).max(120).optional(),

  // Export settings
  payrollExportFormat: z.enum(['CSV', 'EXCEL', 'JSON']).optional(),
  includeBreaks: z.boolean().optional(),
  includeNotes: z.boolean().optional(),
});

/**
 * GET /api/settings/time-tracking
 * Fetch time tracking settings for company
 * Permission: ADMIN only
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
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

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Only admins can view settings
    if (employee.User.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can view time tracking settings' },
        { status: 403 }
      );
    }

    // Fetch or create settings
    let settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: employee.companyId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.timeTrackingSettings.create({
        data: {
          companyId: employee.companyId,
        },
      });
    }

    // Convert Decimal fields to numbers for frontend compatibility
    const settingsFormatted = {
      ...settings,
      overtimeThreshold: settings.overtimeThreshold ? Number(settings.overtimeThreshold) : 40,
      overtimeMultiplier: settings.overtimeMultiplier ? Number(settings.overtimeMultiplier) : 1.5,
    };

    return NextResponse.json({ settings: settingsFormatted });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/time-tracking
 * Update time tracking settings
 * Permission: ADMIN only
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = settingsUpdateSchema.parse(body);

    const employee = await prisma.employee.findUnique({
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

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Only admins can update settings
    if (employee.User.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update time tracking settings' },
        { status: 403 }
      );
    }

    // Update or create settings
    const settings = await prisma.timeTrackingSettings.upsert({
      where: { companyId: employee.companyId },
      update: data,
      create: {
        companyId: employee.companyId,
        ...data,
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: employee.companyId,
        action: 'UPDATED',
        entityType: 'EMPLOYEE',
        entityId: employee.id,
        metadata: {
          type: 'TIME_TRACKING_SETTINGS_UPDATED',
          changes: data,
          updatedBy: employee.User.name,
        },
      },
    });

    // Convert Decimal fields to numbers for frontend compatibility
    const settingsFormatted = {
      ...settings,
      overtimeThreshold: settings.overtimeThreshold ? Number(settings.overtimeThreshold) : 40,
      overtimeMultiplier: settings.overtimeMultiplier ? Number(settings.overtimeMultiplier) : 1.5,
    };

    return NextResponse.json({
      success: true,
      settings: settingsFormatted,
      message: 'Time tracking settings updated successfully',
    });
  } catch (error) {
    console.error('Settings update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
