import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { TimeTrackingSettings } from '@/types/time-tracking-settings';

/**
 * Create or get default timesheet approval workflow for a company
 */
async function ensureDefaultTimesheetWorkflow(companyId: string): Promise<string> {
  // Check if a timesheet workflow already exists
  const existingWorkflow = await prisma.approvalWorkflow.findFirst({
    where: {
      companyId,
      eventCategoryId: 'TIMESHEET_APPROVAL',
      isActive: true,
    },
  });

  if (existingWorkflow) {
    return existingWorkflow.id;
  }

  // Ensure TIMESHEET_APPROVAL event category exists
  await prisma.eventCategory.upsert({
    where: {
      companyId_name: {
        companyId,
        name: 'Timesheet Approval',
      },
    },
    update: {},
    create: {
      id: 'TIMESHEET_APPROVAL',
      companyId,
      name: 'Timesheet Approval',
      requiresApproval: true,
      adminOnly: false,
      isActive: true,
      categoryType: 'SYSTEM',
      systemDefined: true,
      updatedAt: new Date(),
    },
  });

  // Create default workflow with single manager approval stage
  const workflow = await prisma.approvalWorkflow.create({
    data: {
      companyId,
      name: 'Default Timesheet Approval',
      eventCategoryId: 'TIMESHEET_APPROVAL',
      scopeType: 'COMPANY',
      isActive: true,
      stages: {
        create: {
          name: 'Manager Approval',
          order: 1,
          mode: 'SEQUENTIAL',
          approvers: {
            create: {
              type: 'MANAGER',
              order: 1,
            },
          },
        },
      },
    },
  });

  return workflow.id;
}

const settingsUpdateSchema = z.object({
  // Timesheet settings
  defaultWorkflowId: z.string().optional().nullable(),
  // Canonical field names (preferred)
  requireGpsLocation: z.boolean().optional(),
  photoRequirement: z.enum(['NONE', 'CLOCK_IN', 'CLOCK_IN_OUT']).optional(),
  allowManualTimeEntry: z.boolean().optional(),
  allowMobileClock: z.boolean().optional(),
  // Deprecated field names (for backward compatibility - will be removed in future version)
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

  // Enhanced overtime configuration (NZ Employment Relations Act 2000)
  overtimeCalculationMode: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'PATTERN_BASED']).optional(),
  autoApplyOvertime: z.boolean().optional(),
  allowManualOvertimeEntry: z.boolean().optional(),
  blockOvertimeDuringHours: z.boolean().optional(),
  requireOvertimeApproval: z.boolean().optional(),
  dailyOvertimeThreshold: z.coerce.number().min(0).max(24).optional().nullable(),
  weeklyOvertimeThreshold: z.coerce.number().min(0).max(168).optional().nullable(),
  monthlyOvertimeThreshold: z.coerce.number().min(0).max(744).optional().nullable(),
  overtimeMultiplierTier2: z.coerce.number().min(1.0).max(3.0).optional().nullable(),
  overtimeThresholdTier2: z.coerce.number().min(0).max(100).optional().nullable(),
  publicHolidayMultiplier: z.coerce.number().min(1.0).max(3.0).optional(),
  sundayMultiplier: z.coerce.number().min(1.0).max(3.0).optional().nullable(),
  enableOvertimeBreakdown: z.boolean().optional(),

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
      // Ensure default workflow exists and get its ID
      const defaultWorkflowId = await ensureDefaultTimesheetWorkflow(employee.companyId);
      
      settings = await prisma.timeTrackingSettings.create({
        data: {
          companyId: employee.companyId,
          defaultWorkflowId,
        },
      });
    } else if (!settings.defaultWorkflowId) {
      // If settings exist but no workflow is set, create and assign one
      const defaultWorkflowId = await ensureDefaultTimesheetWorkflow(employee.companyId);
      
      settings = await prisma.timeTrackingSettings.update({
        where: { companyId: employee.companyId },
        data: { defaultWorkflowId },
      });
    }

    // Convert Decimal fields to numbers for frontend compatibility
    const settingsFormatted: TimeTrackingSettings & { enableGPSTracking?: boolean; requirePhotos?: boolean; allowManualEntry?: boolean } = {
      ...settings,
      overtimeThreshold: settings.overtimeThreshold ? Number(settings.overtimeThreshold) : 40,
      overtimeMultiplier: settings.overtimeMultiplier ? Number(settings.overtimeMultiplier) : 1.5,
      dailyOvertimeThreshold: settings.dailyOvertimeThreshold ? Number(settings.dailyOvertimeThreshold) : null,
      weeklyOvertimeThreshold: settings.weeklyOvertimeThreshold ? Number(settings.weeklyOvertimeThreshold) : null,
      monthlyOvertimeThreshold: settings.monthlyOvertimeThreshold ? Number(settings.monthlyOvertimeThreshold) : null,
      overtimeMultiplierTier2: settings.overtimeMultiplierTier2 ? Number(settings.overtimeMultiplierTier2) : null,
      overtimeThresholdTier2: settings.overtimeThresholdTier2 ? Number(settings.overtimeThresholdTier2) : null,
      publicHolidayMultiplier: settings.publicHolidayMultiplier ? Number(settings.publicHolidayMultiplier) : 1.5,
      sundayMultiplier: settings.sundayMultiplier ? Number(settings.sundayMultiplier) : null,
      // Backward compatibility fields for deprecated names (temporary - will be removed)
      enableGPSTracking: settings.requireGpsLocation,
      requirePhotos: settings.photoRequirement !== 'NONE',
      allowManualEntry: settings.allowManualTimeEntry,
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
    const rawData = settingsUpdateSchema.parse(body);
    
    // Map deprecated field names to canonical names for backward compatibility
    const data: Record<string, any> = { ...rawData };
    
    // Handle GPS tracking field name migration
    if ('enableGPSTracking' in rawData && !('requireGpsLocation' in rawData)) {
      console.warn('[TimeTracking] Deprecated field "enableGPSTracking" used, mapping to "requireGpsLocation"');
      data.requireGpsLocation = rawData.enableGPSTracking;
      delete data.enableGPSTracking;
    }
    
    // Handle photo requirement field name migration
    if ('requirePhotos' in rawData && !('photoRequirement' in rawData)) {
      console.warn('[TimeTracking] Deprecated field "requirePhotos" used, mapping to "photoRequirement"');
      data.photoRequirement = rawData.requirePhotos ? 'CLOCK_IN_OUT' : 'NONE';
      delete data.requirePhotos;
    }
    
    // Handle manual entry field name migration
    if ('allowManualEntry' in rawData && !('allowManualTimeEntry' in rawData)) {
      console.warn('[TimeTracking] Deprecated field "allowManualEntry" used, mapping to "allowManualTimeEntry"');
      data.allowManualTimeEntry = rawData.allowManualEntry;
      delete data.allowManualEntry;
    }

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

    // Sync legacy fields with canonical fields to maintain consistency
    const updatedSettings = await prisma.timeTrackingSettings.update({
      where: { companyId: employee.companyId },
      data: {
        // Sync allowManualEntry with allowManualTimeEntry
        allowManualEntry: settings.allowManualTimeEntry,
        // Sync requirePhotos with photoRequirement
        requirePhotos: settings.photoRequirement !== 'NONE',
      },
    });

    // Convert Decimal fields to numbers for frontend compatibility
    const settingsFormatted: TimeTrackingSettings & { enableGPSTracking?: boolean; requirePhotos?: boolean; allowManualEntry?: boolean } = {
      ...updatedSettings,
      overtimeThreshold: updatedSettings.overtimeThreshold ? Number(updatedSettings.overtimeThreshold) : 40,
      overtimeMultiplier: updatedSettings.overtimeMultiplier ? Number(updatedSettings.overtimeMultiplier) : 1.5,
      dailyOvertimeThreshold: updatedSettings.dailyOvertimeThreshold ? Number(updatedSettings.dailyOvertimeThreshold) : null,
      weeklyOvertimeThreshold: updatedSettings.weeklyOvertimeThreshold ? Number(updatedSettings.weeklyOvertimeThreshold) : null,
      monthlyOvertimeThreshold: updatedSettings.monthlyOvertimeThreshold ? Number(updatedSettings.monthlyOvertimeThreshold) : null,
      overtimeMultiplierTier2: updatedSettings.overtimeMultiplierTier2 ? Number(updatedSettings.overtimeMultiplierTier2) : null,
      overtimeThresholdTier2: updatedSettings.overtimeThresholdTier2 ? Number(updatedSettings.overtimeThresholdTier2) : null,
      publicHolidayMultiplier: updatedSettings.publicHolidayMultiplier ? Number(updatedSettings.publicHolidayMultiplier) : 1.5,
      sundayMultiplier: updatedSettings.sundayMultiplier ? Number(updatedSettings.sundayMultiplier) : null,
      // Backward compatibility fields for deprecated names (temporary - will be removed)
      enableGPSTracking: updatedSettings.requireGpsLocation,
      requirePhotos: updatedSettings.photoRequirement !== 'NONE',
      allowManualEntry: updatedSettings.allowManualTimeEntry,
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
