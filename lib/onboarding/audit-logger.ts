/**
 * Onboarding Step Audit Logger
 * 
 * Captures every label or reminder change, scoped to tenant,
 * with before/after values for compliance reporting.
 */

import { prisma } from '../../app/lib/prisma';

export type ChangeType = 'label_change' | 'reminder_config' | 'sla_config' | 'metadata_change';

export interface AuditLogEntry {
  companyId: string;
  templateId: string;
  stepId?: string;
  stepLabel: string;
  changeType: ChangeType;
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  changedById: string;
  reason?: string;
  ipAddress?: string;
}

/**
 * Create an audit log entry for an onboarding step change
 * 
 * @param entry - Audit log entry data
 * @returns Created audit log record
 */
export async function logStepChange(entry: AuditLogEntry) {
  try {
    return await prisma.onboardingStepAuditLog.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        companyId: entry.companyId,
        templateId: entry.templateId,
        stepId: entry.stepId,
        stepLabel: entry.stepLabel,
        changeType: entry.changeType,
        fieldName: entry.fieldName,
        oldValue: entry.oldValue !== undefined ? JSON.parse(JSON.stringify(entry.oldValue)) : null,
        newValue: entry.newValue !== undefined ? JSON.parse(JSON.stringify(entry.newValue)) : null,
        changedById: entry.changedById,
        changedAt: new Date(),
        reason: entry.reason,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    throw error;
  }
}

/**
 * Batch log multiple step changes (useful for bulk operations)
 * 
 * @param entries - Array of audit log entries
 * @returns Array of created audit log records
 */
export async function logStepChangesBatch(entries: AuditLogEntry[]) {
  try {
    return await prisma.$transaction(
      entries.map((entry) =>
        prisma.onboardingStepAuditLog.create({
          data: {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            companyId: entry.companyId,
            templateId: entry.templateId,
            stepId: entry.stepId,
            stepLabel: entry.stepLabel,
            changeType: entry.changeType,
            fieldName: entry.fieldName,
            oldValue: entry.oldValue !== undefined ? JSON.parse(JSON.stringify(entry.oldValue)) : null,
            newValue: entry.newValue !== undefined ? JSON.parse(JSON.stringify(entry.newValue)) : null,
            changedById: entry.changedById,
            changedAt: new Date(),
            reason: entry.reason,
            ipAddress: entry.ipAddress,
          },
        })
      )
    );
  } catch (error) {
    console.error('Failed to create batch audit log entries:', error);
    throw error;
  }
}

/**
 * Retrieve audit logs for a specific template
 * 
 * @param templateId - Template ID
 * @param options - Query options
 * @returns Array of audit log records
 */
export async function getTemplateLabelAuditLogs(
  templateId: string,
  options?: {
    stepLabel?: string;
    changeType?: ChangeType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  const where: any = {
    templateId,
  };

  if (options?.stepLabel) {
    where.stepLabel = options.stepLabel;
  }

  if (options?.changeType) {
    where.changeType = options.changeType;
  }

  if (options?.startDate || options?.endDate) {
    where.changedAt = {};
    if (options.startDate) {
      where.changedAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.changedAt.lte = options.endDate;
    }
  }

  return await prisma.onboardingStepAuditLog.findMany({
    where,
    include: {
      ChangedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      changedAt: 'desc',
    },
    take: options?.limit || 100,
  });
}

/**
 * Generate compliance report for a template
 * 
 * @param templateId - Template ID
 * @param startDate - Start date for the report
 * @param endDate - End date for the report
 * @returns Compliance report data
 */
export async function generateComplianceReport(
  templateId: string,
  startDate: Date,
  endDate: Date
) {
  const logs = await getTemplateLabelAuditLogs(templateId, {
    startDate,
    endDate,
  });

  // Group by change type
  const changesByType = logs.reduce<Record<ChangeType, typeof logs[number][]>>(
    (acc, log) => {
      const key = (log.changeType as ChangeType) ?? 'label_change';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(log);
      return acc;
    },
    {
      label_change: [],
      reminder_config: [],
      sla_config: [],
      metadata_change: [],
    },
  );

  // Group by step
  const changesByStep = logs.reduce<Record<string, typeof logs[number][]>>((acc, log) => {
    if (!acc[log.stepLabel]) {
      acc[log.stepLabel] = [];
    }
    acc[log.stepLabel].push(log);
    return acc;
  }, {});

  // Get unique changers
  const changers = Array.from(
    new Set(logs.map((log) => log.ChangedBy.id))
  ).map((id) => {
    const changer = logs.find((log) => log.ChangedBy.id === id)?.ChangedBy;
    return {
      id,
      name: changer?.name || 'Unknown',
      email: changer?.email || '',
      changeCount: logs.filter((log) => log.ChangedBy.id === id).length,
    };
  });

  return {
    summary: {
      totalChanges: logs.length,
      labelChanges: changesByType.label_change?.length || 0,
      reminderChanges: changesByType.reminder_config?.length || 0,
      slaChanges: changesByType.sla_config?.length || 0,
      metadataChanges: changesByType.metadata_change?.length || 0,
      uniqueSteps: Object.keys(changesByStep).length,
      uniqueChangers: changers.length,
    },
    changesByType,
    changesByStep,
    changers,
    logs,
  };
}

/**
 * Helper to detect what changed between two step configurations
 * 
 * @param oldStep - Old step configuration
 * @param newStep - New step configuration
 * @returns Array of detected changes
 */
export function detectStepChanges(
  oldStep: any,
  newStep: any
): Array<{ field: string; changeType: ChangeType }> {
  const changes: Array<{ field: string; changeType: ChangeType }> = [];

  // Check label/title change
  const oldLabel = (oldStep.title || oldStep.label || '').trim();
  const newLabel = (newStep.title || newStep.label || '').trim();
  if (oldLabel !== newLabel) {
    changes.push({ field: 'title', changeType: 'label_change' });
  }

  // Check reminder configuration changes
  const reminderFields = [
    'reminderEnabled',
    'reminderDaysBefore',
    'reminderTime',
    'reminderEscalationEnabled',
    'reminderEscalationDays',
    'reminderEscalationRole',
    'reminderEscalationUserId',
  ];

  for (const field of reminderFields) {
    if (
      oldStep.reminder?.[field] !== newStep.reminder?.[field] ||
      oldStep[field] !== newStep[field]
    ) {
      changes.push({ field, changeType: 'reminder_config' });
    }
  }

  // Check SLA configuration changes
  const slaFields = [
    'slaEnabled',
    'slaCompletionDays',
    'slaWarningDays',
    'excludePublicHolidays',
    'excludeWeekends',
  ];

  for (const field of slaFields) {
    if (
      oldStep.sla?.[field] !== newStep.sla?.[field] ||
      oldStep[field] !== newStep[field]
    ) {
      changes.push({ field, changeType: 'sla_config' });
    }
  }

  // Check metadata changes
  if (JSON.stringify(oldStep.metadata) !== JSON.stringify(newStep.metadata)) {
    changes.push({ field: 'metadata', changeType: 'metadata_change' });
  }

  return changes;
}
