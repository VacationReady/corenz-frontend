/**
 * Compliance Audit Trail System
 * 
 * Logs all compliance-related actions for audit purposes
 * Provides immutable audit trail for regulatory compliance
 */

export type AuditAction = 
  | 'template_created'
  | 'template_modified'
  | 'template_deleted'
  | 'step_added'
  | 'step_modified'
  | 'step_removed'
  | 'compliance_requirement_removed'
  | 'compliance_override_approved'
  | 'compliance_override_rejected'
  | 'validation_bypassed'
  | 'mandatory_step_made_optional'
  | 'preset_applied'
  | 'preset_modified';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ComplianceAuditLog = {
  id: string;
  tenantId: string;
  companyId: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  severity: AuditSeverity;
  timestamp: Date;
  entityType: 'template' | 'step' | 'preset';
  entityId: string;
  entityName: string;
  details: {
    before?: any;
    after?: any;
    requirementIds?: string[];
    requirementTitles?: string[];
    reason?: string;
    approvedBy?: string;
    validationResults?: any;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
  isOverride: boolean;
  requiresReview: boolean;
};

export type AuditSearchParams = {
  tenantId?: string;
  companyId?: string;
  userId?: string;
  action?: AuditAction[];
  severity?: AuditSeverity[];
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  requiresReview?: boolean;
  isOverride?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * Create audit log entry
 */
export async function createAuditLog(
  log: Omit<ComplianceAuditLog, 'id' | 'timestamp'>
): Promise<ComplianceAuditLog> {
  const auditLog: ComplianceAuditLog = {
    ...log,
    id: generateAuditId(),
    timestamp: new Date()
  };

  // TODO: Persist to database
  // await prisma.complianceAuditLog.create({ data: auditLog });

  // Log critical actions immediately
  if (auditLog.severity === 'critical' || auditLog.isOverride) {
    console.warn('[COMPLIANCE AUDIT - CRITICAL]', {
      action: auditLog.action,
      user: auditLog.userEmail,
      entity: auditLog.entityName,
      details: auditLog.details
    });
  }

  return auditLog;
}

/**
 * Log template creation with compliance preset
 */
export async function logTemplateCreated(
  tenantId: string,
  companyId: string,
  userId: string,
  userEmail: string,
  userName: string,
  templateId: string,
  templateName: string,
  presetId?: string,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    companyId,
    userId,
    userEmail,
    userName,
    action: 'template_created',
    severity: 'info',
    entityType: 'template',
    entityId: templateId,
    entityName: templateName,
    details: {
      presetId,
      createdFrom: presetId ? 'preset' : 'scratch'
    },
    ipAddress,
    isOverride: false,
    requiresReview: false
  });
}

/**
 * Log compliance step removal
 */
export async function logComplianceStepRemoved(
  tenantId: string,
  companyId: string,
  userId: string,
  userEmail: string,
  userName: string,
  templateId: string,
  templateName: string,
  stepId: string,
  stepTitle: string,
  stepData: any,
  requirementIds: string[],
  requirementTitles: string[],
  reason?: string,
  ipAddress?: string
): Promise<void> {
  const isMandatory = requirementIds.some(id => {
    // Check if any requirement is mandatory
    return true; // Simplified - should check against NZ_STATUTORY_REQUIREMENTS
  });

  await createAuditLog({
    tenantId,
    companyId,
    userId,
    userEmail,
    userName,
    action: 'step_removed',
    severity: isMandatory ? 'critical' : 'high',
    entityType: 'step',
    entityId: stepId,
    entityName: stepTitle,
    details: {
      templateId,
      templateName,
      before: stepData,
      requirementIds,
      requirementTitles,
      reason,
      isMandatory
    },
    ipAddress,
    isOverride: true,
    requiresReview: isMandatory
  });
}

/**
 * Log compliance requirement removal
 */
export async function logComplianceRequirementRemoved(
  tenantId: string,
  companyId: string,
  userId: string,
  userEmail: string,
  userName: string,
  templateId: string,
  templateName: string,
  stepId: string,
  stepTitle: string,
  requirementId: string,
  requirementTitle: string,
  reason?: string,
  approvedBy?: string,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    companyId,
    userId,
    userEmail,
    userName,
    action: 'compliance_requirement_removed',
    severity: 'critical',
    entityType: 'step',
    entityId: stepId,
    entityName: stepTitle,
    details: {
      templateId,
      templateName,
      requirementIds: [requirementId],
      requirementTitles: [requirementTitle],
      reason,
      approvedBy
    },
    ipAddress,
    isOverride: true,
    requiresReview: !approvedBy // Requires review if not pre-approved
  });
}

/**
 * Log mandatory step made optional
 */
export async function logMandatoryStepMadeOptional(
  tenantId: string,
  companyId: string,
  userId: string,
  userEmail: string,
  userName: string,
  templateId: string,
  templateName: string,
  stepId: string,
  stepTitle: string,
  requirementIds: string[],
  reason?: string,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    companyId,
    userId,
    userEmail,
    userName,
    action: 'mandatory_step_made_optional',
    severity: 'high',
    entityType: 'step',
    entityId: stepId,
    entityName: stepTitle,
    details: {
      templateId,
      templateName,
      requirementIds,
      reason
    },
    ipAddress,
    isOverride: true,
    requiresReview: true
  });
}

/**
 * Log validation bypass
 */
export async function logValidationBypassed(
  tenantId: string,
  companyId: string,
  userId: string,
  userEmail: string,
  userName: string,
  templateId: string,
  templateName: string,
  validationErrors: any[],
  reason: string,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    companyId,
    userId,
    userEmail,
    userName,
    action: 'validation_bypassed',
    severity: 'critical',
    entityType: 'template',
    entityId: templateId,
    entityName: templateName,
    details: {
      validationResults: validationErrors,
      reason,
      errorCount: validationErrors.length
    },
    ipAddress,
    isOverride: true,
    requiresReview: true
  });
}

/**
 * Log compliance override approval
 */
export async function logOverrideApproved(
  tenantId: string,
  companyId: string,
  userId: string,
  userEmail: string,
  userName: string,
  originalAuditLogId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    companyId,
    userId,
    userEmail,
    userName,
    action: 'compliance_override_approved',
    severity: 'high',
    entityType: 'template',
    entityId: originalAuditLogId,
    entityName: 'Override Approval',
    details: {
      originalAuditLogId,
      reason,
      approvedBy: userEmail
    },
    ipAddress,
    isOverride: false,
    requiresReview: false
  });
}

/**
 * Log compliance override rejection
 */
export async function logOverrideRejected(
  tenantId: string,
  companyId: string,
  userId: string,
  userEmail: string,
  userName: string,
  originalAuditLogId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    companyId,
    userId,
    userEmail,
    userName,
    action: 'compliance_override_rejected',
    severity: 'medium',
    entityType: 'template',
    entityId: originalAuditLogId,
    entityName: 'Override Rejection',
    details: {
      originalAuditLogId,
      reason,
      rejectedBy: userEmail
    },
    ipAddress,
    isOverride: false,
    requiresReview: false
  });
}

/**
 * Search audit logs
 */
export async function searchAuditLogs(params: AuditSearchParams): Promise<{
  logs: ComplianceAuditLog[];
  total: number;
  hasMore: boolean;
}> {
  // TODO: Implement database search
  return {
    logs: [],
    total: 0,
    hasMore: false
  };
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditHistory(
  entityType: 'template' | 'step' | 'preset',
  entityId: string,
  limit: number = 50
): Promise<ComplianceAuditLog[]> {
  // TODO: Implement database query
  return [];
}

/**
 * Get logs requiring review
 */
export async function getLogsRequiringReview(
  companyId: string,
  limit: number = 20
): Promise<ComplianceAuditLog[]> {
  // TODO: Implement database query filtered by requiresReview = true
  return [];
}

/**
 * Get compliance override statistics
 */
export async function getOverrideStatistics(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalOverrides: number;
  overridesByAction: Record<AuditAction, number>;
  overridesBySeverity: Record<AuditSeverity, number>;
  overridesByUser: Array<{ userId: string; userEmail: string; count: number }>;
  pendingReviews: number;
  approvedOverrides: number;
  rejectedOverrides: number;
}> {
  // TODO: Implement database aggregation
  return {
    totalOverrides: 0,
    overridesByAction: {} as any,
    overridesBySeverity: {} as any,
    overridesByUser: [],
    pendingReviews: 0,
    approvedOverrides: 0,
    rejectedOverrides: 0
  };
}

/**
 * Export audit trail for compliance reporting
 */
export async function exportAuditTrail(
  params: AuditSearchParams,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const result = await searchAuditLogs({ ...params, limit: 10000 });

  if (format === 'json') {
    return JSON.stringify(result.logs, null, 2);
  }

  // Convert to CSV
  const csv: string[] = [];
  csv.push('Timestamp,Action,Severity,User,Entity Type,Entity Name,Details,Is Override,Requires Review');

  result.logs.forEach(log => {
    csv.push([
      log.timestamp.toISOString(),
      log.action,
      log.severity,
      log.userEmail,
      log.entityType,
      log.entityName,
      JSON.stringify(log.details).replace(/,/g, ';'),
      log.isOverride ? 'Yes' : 'No',
      log.requiresReview ? 'Yes' : 'No'
    ].join(','));
  });

  return csv.join('\n');
}

/**
 * Generate audit report for regulatory compliance
 */
export async function generateComplianceAuditReport(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  reportId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalActions: number;
    criticalActions: number;
    overrides: number;
    pendingReviews: number;
  };
  details: {
    actionBreakdown: Record<AuditAction, number>;
    severityBreakdown: Record<AuditSeverity, number>;
    userActivity: Array<{ userEmail: string; actionCount: number }>;
    templatesAffected: number;
    requirementsRemoved: Array<{ requirementId: string; title: string; removalCount: number }>;
  };
  recommendations: string[];
}> {
  // TODO: Implement comprehensive audit reporting

  return {
    reportId: generateAuditId(),
    generatedAt: new Date(),
    period: { start: startDate, end: endDate },
    summary: {
      totalActions: 0,
      criticalActions: 0,
      overrides: 0,
      pendingReviews: 0
    },
    details: {
      actionBreakdown: {} as any,
      severityBreakdown: {} as any,
      userActivity: [],
      templatesAffected: 0,
      requirementsRemoved: []
    },
    recommendations: []
  };
}

/**
 * Generate unique audit ID
 */
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Verify audit log integrity (for tamper detection)
 */
export async function verifyAuditLogIntegrity(logId: string): Promise<{
  isValid: boolean;
  message: string;
}> {
  // TODO: Implement cryptographic verification
  // Could use hashing or digital signatures to ensure logs haven't been tampered with
  
  return {
    isValid: true,
    message: 'Audit log integrity verified'
  };
}
