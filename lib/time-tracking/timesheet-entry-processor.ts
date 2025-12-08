/**
 * Timesheet Entry Processor
 * 
 * Handles creation and update of timesheet entries with NZ-compliant
 * overtime calculation and public holiday detection.
 * 
 * Used by manual entry routes and timesheet edit operations to ensure
 * consistent overtime/holiday metadata persistence.
 */

import { prisma } from '@/lib/prisma';
import { calculateOvertimeForEntry, OvertimeSettings, EmployeeOvertimeConfig, TimesheetEntryInput } from '@/lib/overtime-calculator';
import { Prisma } from '@prisma/client';
import { startOfDay, startOfWeek, endOfWeek } from 'date-fns';
import {
  cancelPendingTimesheetApprovalActionItems,
  resolveActionItemAssigneeUserId,
  upsertTimesheetApprovalActionItem,
} from '@/lib/action-items-helper';

export interface ProcessedTimesheetEntry {
  date: Date;
  startTime: Date;
  endTime: Date;
  breakMinutes: number;
  hours: number;
  regularHours: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  overtimeType: string;
  overtimeReason: string;
  isOvertime: boolean;
  isPublicHoliday: boolean;
  publicHolidayName?: string;
  publicHolidayHours: number;
  publicHolidayMultiplier: number;
  publicHolidayType?: string;
  publicHolidayRegion?: string;
  alternativeDayGranted: boolean;
  notes?: string;
  entryType: string;
}

/**
 * Process a timesheet entry with NZ-compliant overtime calculation
 * 
 * @param entry - Entry data (date, startTime, endTime, breakMinutes)
 * @param employeeId - Employee ID
 * @param companyId - Company ID
 * @param entryType - Entry type (MANUAL, ADJUSTED, CLOCK)
 * @param notes - Optional notes
 * @returns Processed entry with overtime and public holiday metadata
 */
export async function processTimesheetEntry(
  entry: {
    date: Date;
    startTime: Date;
    endTime: Date;
    breakMinutes: number;
  },
  employeeId: string,
  companyId: string,
  entryType: 'MANUAL' | 'ADJUSTED' | 'CLOCK',
  notes?: string
): Promise<ProcessedTimesheetEntry> {
  // Calculate total hours
  const totalMinutes = (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60);
  const workMinutes = totalMinutes - entry.breakMinutes;
  const hours = Math.max(0, workMinutes / 60);

  // Get overtime settings
  const settings = await prisma.timeTrackingSettings.findUnique({
    where: { companyId },
  });

  if (!settings) {
    throw new Error('Time tracking settings not found for company');
  }

  // Build overtime settings object
  const overtimeSettings: OvertimeSettings = {
    overtimeCalculationMode: (settings.overtimeCalculationMode as any) || 'DAILY',
    autoApplyOvertime: settings.autoApplyOvertime ?? false,
    dailyOvertimeThreshold: settings.dailyOvertimeThreshold ? parseFloat(settings.dailyOvertimeThreshold.toString()) : 8,
    weeklyOvertimeThreshold: settings.weeklyOvertimeThreshold ? parseFloat(settings.weeklyOvertimeThreshold.toString()) : 40,
    monthlyOvertimeThreshold: settings.monthlyOvertimeThreshold ? parseFloat(settings.monthlyOvertimeThreshold.toString()) : 173.33,
    overtimeMultiplier: settings.overtimeMultiplier ? parseFloat(settings.overtimeMultiplier.toString()) : 1.5,
    overtimeMultiplierTier2: settings.overtimeMultiplierTier2 ? parseFloat(settings.overtimeMultiplierTier2.toString()) : undefined,
    overtimeThresholdTier2: settings.overtimeThresholdTier2 ? parseFloat(settings.overtimeThresholdTier2.toString()) : undefined,
    publicHolidayMultiplier: settings.publicHolidayMultiplier ? parseFloat(settings.publicHolidayMultiplier.toString()) : 2.0,
    sundayMultiplier: settings.sundayMultiplier ? parseFloat(settings.sundayMultiplier.toString()) : undefined,
  };

  // Get employee overtime config
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      overtimeEligible: true,
      overtimeThreshold: true,
      overtimeMultiplier: true,
    },
  });

  const employeeConfig: EmployeeOvertimeConfig | undefined = employee ? {
    overtimeEligible: employee.overtimeEligible ?? true,
    overtimeThreshold: employee.overtimeThreshold ? parseFloat(employee.overtimeThreshold.toString()) : undefined,
    overtimeMultiplier: employee.overtimeMultiplier ? parseFloat(employee.overtimeMultiplier.toString()) : undefined,
  } : undefined;

  // Create temporary entry ID for calculation
  const tempEntryId = `temp-${Date.now()}`;
  
  // Calculate overtime using NZ-compliant calculator
  // This now returns BOTH overtime AND public-holiday metadata
  // Pass start/end times for partial-day holiday calculations
  const overtimeResult = await calculateOvertimeForEntry(
    {
      id: tempEntryId,
      date: entry.date,
      hours,
      timesheetId: 'temp', // Will be set later
      startTime: entry.startTime,
      endTime: entry.endTime,
      breakMinutes: entry.breakMinutes,
    },
    employeeId,
    companyId,
    overtimeSettings,
    employeeConfig
  );

  // Use the enhanced calculator output directly (no re-fetching or hardcoding)
  return {
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakMinutes: entry.breakMinutes,
    hours,
    regularHours: overtimeResult.regularHours,
    overtimeHours: overtimeResult.overtimeHours,
    overtimeMultiplier: overtimeResult.overtimeMultiplier,
    overtimeType: overtimeResult.overtimeType,
    overtimeReason: overtimeResult.overtimeReason || '',
    isOvertime: overtimeResult.overtimeHours > 0,
    // Public holiday metadata from calculator (not hardcoded)
    isPublicHoliday: overtimeResult.isPublicHoliday,
    publicHolidayName: overtimeResult.publicHolidayName,
    publicHolidayHours: overtimeResult.publicHolidayHours,
    publicHolidayMultiplier: overtimeResult.publicHolidayMultiplier,
    publicHolidayType: overtimeResult.publicHolidayType,
    publicHolidayRegion: overtimeResult.publicHolidayRegion,
    alternativeDayGranted: overtimeResult.alternativeDayGranted,
    notes,
    entryType,
  };
}

/**
 * Find or create timesheet for a given date
 * 
 * @param employeeId - Employee ID
 * @param companyId - Company ID
 * @param date - Date for the timesheet entry
 * @returns Timesheet ID
 */
export async function findOrCreateTimesheet(
  employeeId: string,
  companyId: string,
  date: Date
): Promise<string> {
  // Get time tracking settings for period configuration
  const settings = await prisma.timeTrackingSettings.findUnique({
    where: { companyId },
  });

  const timesheetPeriod = settings?.timesheetPeriod || 'WEEKLY';
  
  // Calculate period bounds
  let periodStart: Date;
  let periodEnd: Date;

  if (timesheetPeriod === 'WEEKLY') {
    periodStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    periodEnd = endOfWeek(date, { weekStartsOn: 1 });
  } else if (timesheetPeriod === 'BIWEEKLY') {
    // For biweekly, align to a fixed starting point
    // This is simplified - you may need more complex logic
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    periodStart = weekStart;
    periodEnd = new Date(weekStart);
    periodEnd.setDate(periodEnd.getDate() + 13);
  } else {
    // MONTHLY
    periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
    periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  // Find existing timesheet
  let timesheet = await prisma.timesheet.findFirst({
    where: {
      employeeId,
      periodStart,
      periodEnd,
    },
  });

  // Create if doesn't exist
  if (!timesheet) {
    timesheet = await prisma.timesheet.create({
      data: {
        employeeId,
        companyId,
        periodStart,
        periodEnd,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        breakHours: 0,
        approvalStatus: 'PENDING',
      },
    });
  }

  return timesheet.id;
}

/**
 * Recalculate timesheet totals from entries
 * 
 * Must be called inside a transaction after updating entries
 * 
 * @param timesheetId - Timesheet ID
 * @param tx - Prisma transaction client
 */
export async function recalculateTimesheetTotals(
  timesheetId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  // Get all entries for this timesheet
  const entries = await tx.timesheetEntry.findMany({
    where: { timesheetId },
    select: {
      hours: true,
      regularHours: true,
      overtimeHours: true,
      breakMinutes: true,
    },
  });

  // Calculate totals
  const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours.toString()), 0);
  const regularHours = entries.reduce((sum, e) => sum + parseFloat((e.regularHours || e.hours).toString()), 0);
  const overtimeHours = entries.reduce((sum, e) => sum + parseFloat((e.overtimeHours || 0).toString()), 0);
  const breakHours = entries.reduce((sum, e) => sum + (e.breakMinutes / 60), 0);

  // Update timesheet
  await tx.timesheet.update({
    where: { id: timesheetId },
    data: {
      totalHours,
      regularHours,
      overtimeHours,
      breakHours,
    },
  });
}

/**
 * Auto-submit a timesheet for approval
 * 
 * This function automatically submits a timesheet when entries are added,
 * creating the approval workflow stages and action items for approvers.
 * 
 * @param timesheetId - Timesheet ID to submit
 * @param employeeId - Employee ID who owns the timesheet
 * @param companyId - Company ID
 * @returns true if submitted successfully, false if already submitted or error
 */
export async function autoSubmitTimesheet(
  timesheetId: string,
  employeeId: string,
  companyId: string
): Promise<boolean> {
  try {
    // Check if already submitted
    const timesheet = await prisma.timesheet.findFirst({
      where: { id: timesheetId, companyId },
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
                managerId: true,
              },
            },
          },
        },
      },
    });

    if (!timesheet) {
      console.error(`[Auto-Submit] Timesheet ${timesheetId} not found`);
      return false;
    }

    // Skip if already submitted
    if (timesheet.submittedAt) {
      console.log(`[Auto-Submit] Timesheet ${timesheetId} already submitted, skipping`);
      return true;
    }

    // Skip if no entries
    if (timesheet.TimesheetEntries.length === 0) {
      console.log(`[Auto-Submit] Timesheet ${timesheetId} has no entries, skipping`);
      return false;
    }

    const employeeName = timesheet.Employee?.User
      ? `${timesheet.Employee.User.firstName ?? ''} ${timesheet.Employee.User.lastName ?? ''}`.trim() ||
        timesheet.Employee.User.name ||
        'Employee'
      : 'Employee';

    // Clear any lingering pending approval action items
    await cancelPendingTimesheetApprovalActionItems(timesheetId);

    // Update timesheet status to submitted
    await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        submittedAt: new Date(),
        approvalStatus: 'PENDING',
      },
    });

    console.log(`[Auto-Submit] Timesheet ${timesheetId} auto-submitted for ${employeeName}`);

    // Get company settings to find approval workflow
    let settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId },
    });

    // Ensure workflow exists - create if missing
    if (!settings?.defaultWorkflowId) {
      console.log('[Auto-Submit] No workflow configured - auto-creating default workflow');
      
      // Create TIMESHEET_APPROVAL event category if it doesn't exist
      await prisma.eventCategory.upsert({
        where: {
          companyId_name: {
            companyId,
            name: 'Timesheet Approval',
          },
        },
        update: {},
        create: {
          id: `TIMESHEET_APPROVAL_${companyId}`,
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

      // Create workflow
      const newWorkflow = await prisma.approvalWorkflow.create({
        data: {
          companyId,
          name: 'Default Timesheet Approval',
          eventCategoryId: `TIMESHEET_APPROVAL_${companyId}`,
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

      // Update settings
      await prisma.timeTrackingSettings.upsert({
        where: { companyId },
        update: { defaultWorkflowId: newWorkflow.id },
        create: {
          companyId,
          defaultWorkflowId: newWorkflow.id,
        },
      });

      console.log(`[Auto-Submit] Auto-created workflow: ${newWorkflow.id}`);
      
      // Re-fetch settings with new workflow
      settings = await prisma.timeTrackingSettings.findUnique({
        where: { companyId },
      });
    }

    // If there's a default workflow, create approval stages
    if (settings?.defaultWorkflowId) {
      const workflow = await prisma.approvalWorkflow.findFirst({
        where: { id: settings.defaultWorkflowId, companyId },
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
        console.error(`[Auto-Submit] Workflow ${settings.defaultWorkflowId} not found`);
        return true; // Still submitted, just no workflow
      }

      if (workflow.stages && workflow.stages.length > 0) {
        console.log(`[Auto-Submit] Creating ${workflow.stages.length} approval stages`);
        
        // Create approval stages
        for (const stage of workflow.stages) {
          const approvalStage = await prisma.timesheetApprovalStage.create({
            data: {
              timesheetId,
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
            } else if (approver.type === 'MANAGER') {
              // Resolve the manager's employee record from the submitter's managerId
              const managerId = timesheet.Employee?.User?.managerId;
              
              if (!managerId) {
                console.warn(`[Auto-Submit] Employee ${employeeName} has no manager assigned - skipping manager approver`);
                continue;
              }

              const managerEmployee = await prisma.employee.findFirst({
                where: {
                  userId: managerId,
                  companyId,
                },
                select: { id: true },
              });

              if (!managerEmployee?.id) {
                console.warn(`[Auto-Submit] Manager user ID ${managerId} has no employee record - skipping`);
                continue;
              }

              approverId = managerEmployee.id;
            } else {
              console.warn(`[Auto-Submit] Unsupported approver type: ${approver.type}`);
              continue;
            }
            
            if (!approverId) {
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
              // Create action item for first stage approvers
              const assignedToId = await resolveActionItemAssigneeUserId(approverId);
              if (assignedToId) {
                await upsertTimesheetApprovalActionItem({
                  companyId,
                  assignedToId,
                  relatedEmployeeId: employeeId,
                  timesheetId,
                  decisionId: decision.id,
                  stageId: approvalStage.id,
                  stageName: approvalStage.name,
                  periodStart: timesheet.periodStart,
                  periodEnd: timesheet.periodEnd,
                  totalHours: Number(timesheet.totalHours),
                  employeeName,
                });
                console.log(`[Auto-Submit] Created action item for approver ${assignedToId}`);
              }
            }
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[Auto-Submit] Error auto-submitting timesheet:', error);
    return false;
  }
}
