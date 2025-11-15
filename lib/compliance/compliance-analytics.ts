/**
 * Compliance Analytics and Tracking
 * 
 * Tracks adoption, usage, and compliance metrics for NZ statutory requirements
 */

export type ComplianceEventType =
  | 'preset_applied'
  | 'preset_modified'
  | 'compliance_step_removed'
  | 'compliance_step_added'
  | 'compliance_override'
  | 'validation_warning_dismissed'
  | 'validation_error_fixed'
  | 'template_validated'
  | 'compliance_report_generated'
  | 'contextual_help_viewed'
  | 'government_resource_clicked';

export type ComplianceEvent = {
  id: string;
  tenantId: string;
  companyId: string;
  userId: string;
  eventType: ComplianceEventType;
  timestamp: Date;
  metadata: {
    presetId?: string;
    presetName?: string;
    templateId?: string;
    templateName?: string;
    stepType?: string;
    stepTitle?: string;
    requirementId?: string;
    requirementTitle?: string;
    validationCode?: string;
    complianceScore?: number;
    [key: string]: any;
  };
};

export type ComplianceMetrics = {
  tenantId: string;
  companyId: string;
  period: {
    start: Date;
    end: Date;
  };
  presetAdoption: {
    totalTemplates: number;
    templatesWithPresets: number;
    adoptionRate: number;
    presetBreakdown: Record<string, number>;
  };
  complianceHealth: {
    averageComplianceScore: number;
    templatesFullyCompliant: number;
    templatesWithErrors: number;
    templatesWithWarnings: number;
    complianceRate: number;
  };
  overrides: {
    totalOverrides: number;
    mandatoryStepsRemoved: number;
    recommendedStepsRemoved: number;
    overridesByRequirement: Record<string, number>;
  };
  engagement: {
    contextualHelpViews: number;
    governmentResourceClicks: number;
    validationsDismissed: number;
    errorsFixed: number;
  };
};

/**
 * Track a compliance event
 */
export async function trackComplianceEvent(event: Omit<ComplianceEvent, 'id' | 'timestamp'>): Promise<ComplianceEvent> {
  const fullEvent: ComplianceEvent = {
    ...event,
    id: generateEventId(),
    timestamp: new Date()
  };

  // TODO: Persist to database
  // await prisma.complianceEvent.create({ data: fullEvent });

  // Log for debugging
  console.log('[Compliance Analytics]', fullEvent.eventType, fullEvent.metadata);

  return fullEvent;
}

/**
 * Track preset application
 */
export async function trackPresetApplied(
  tenantId: string,
  companyId: string,
  userId: string,
  presetId: string,
  presetName: string,
  templateId: string,
  templateName: string
): Promise<void> {
  await trackComplianceEvent({
    tenantId,
    companyId,
    userId,
    eventType: 'preset_applied',
    metadata: {
      presetId,
      presetName,
      templateId,
      templateName
    }
  });
}

/**
 * Track compliance step removal
 */
export async function trackComplianceStepRemoved(
  tenantId: string,
  companyId: string,
  userId: string,
  templateId: string,
  stepTitle: string,
  requirementIds: string[],
  isMandatory: boolean
): Promise<void> {
  await trackComplianceEvent({
    tenantId,
    companyId,
    userId,
    eventType: 'compliance_step_removed',
    metadata: {
      templateId,
      stepTitle,
      requirementIds,
      isMandatory,
      requirementCount: requirementIds.length
    }
  });
}

/**
 * Track compliance override
 */
export async function trackComplianceOverride(
  tenantId: string,
  companyId: string,
  userId: string,
  templateId: string,
  requirementId: string,
  requirementTitle: string,
  reason?: string
): Promise<void> {
  await trackComplianceEvent({
    tenantId,
    companyId,
    userId,
    eventType: 'compliance_override',
    metadata: {
      templateId,
      requirementId,
      requirementTitle,
      reason
    }
  });
}

/**
 * Track validation
 */
export async function trackTemplateValidation(
  tenantId: string,
  companyId: string,
  userId: string,
  templateId: string,
  templateName: string,
  complianceScore: number,
  errorCount: number,
  warningCount: number
): Promise<void> {
  await trackComplianceEvent({
    tenantId,
    companyId,
    userId,
    eventType: 'template_validated',
    metadata: {
      templateId,
      templateName,
      complianceScore,
      errorCount,
      warningCount,
      isCompliant: errorCount === 0
    }
  });
}

/**
 * Track contextual help engagement
 */
export async function trackContextualHelpViewed(
  tenantId: string,
  companyId: string,
  userId: string,
  requirementId: string,
  stepType: string
): Promise<void> {
  await trackComplianceEvent({
    tenantId,
    companyId,
    userId,
    eventType: 'contextual_help_viewed',
    metadata: {
      requirementId,
      stepType
    }
  });
}

/**
 * Track government resource click
 */
export async function trackGovernmentResourceClick(
  tenantId: string,
  companyId: string,
  userId: string,
  requirementId: string,
  resourceUrl: string,
  resourceTitle: string
): Promise<void> {
  await trackComplianceEvent({
    tenantId,
    companyId,
    userId,
    eventType: 'government_resource_clicked',
    metadata: {
      requirementId,
      resourceUrl,
      resourceTitle
    }
  });
}

/**
 * Get compliance metrics for a company
 */
export async function getComplianceMetrics(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<ComplianceMetrics> {
  // TODO: Implement database queries
  // This would aggregate data from ComplianceEvent and OnboardingTemplate tables

  // Placeholder implementation
  return {
    tenantId: '',
    companyId,
    period: {
      start: startDate,
      end: endDate
    },
    presetAdoption: {
      totalTemplates: 0,
      templatesWithPresets: 0,
      adoptionRate: 0,
      presetBreakdown: {}
    },
    complianceHealth: {
      averageComplianceScore: 0,
      templatesFullyCompliant: 0,
      templatesWithErrors: 0,
      templatesWithWarnings: 0,
      complianceRate: 0
    },
    overrides: {
      totalOverrides: 0,
      mandatoryStepsRemoved: 0,
      recommendedStepsRemoved: 0,
      overridesByRequirement: {}
    },
    engagement: {
      contextualHelpViews: 0,
      governmentResourceClicks: 0,
      validationsDismissed: 0,
      errorsFixed: 0
    }
  };
}

/**
 * Get preset adoption rates
 */
export async function getPresetAdoptionRates(
  region: string = 'NZ',
  startDate?: Date,
  endDate?: Date
): Promise<{
  presetId: string;
  presetName: string;
  adoptionCount: number;
  modificationRate: number;
}[]> {
  // TODO: Implement database queries
  return [];
}

/**
 * Get compliance trends over time
 */
export async function getComplianceTrends(
  companyId: string,
  interval: 'day' | 'week' | 'month',
  periods: number
): Promise<{
  period: string;
  complianceScore: number;
  templatesCreated: number;
  templatesCompliant: number;
  overridesCount: number;
}[]> {
  // TODO: Implement time-series queries
  return [];
}

/**
 * Get most removed compliance requirements
 */
export async function getMostRemovedRequirements(
  companyId?: string,
  limit: number = 10
): Promise<{
  requirementId: string;
  requirementTitle: string;
  removalCount: number;
  severity: 'mandatory' | 'recommended';
}[]> {
  // TODO: Implement database queries
  return [];
}

/**
 * Get compliance readiness score for NZ mid-market deployment
 */
export async function getDeploymentReadiness(): Promise<{
  overallScore: number;
  presetAdoptionRate: number;
  averageComplianceScore: number;
  userEngagement: number;
  errorRate: number;
  recommendation: 'ready' | 'needs_improvement' | 'not_ready';
  blockers: string[];
}> {
  // TODO: Implement comprehensive readiness calculation

  return {
    overallScore: 0,
    presetAdoptionRate: 0,
    averageComplianceScore: 0,
    userEngagement: 0,
    errorRate: 0,
    recommendation: 'not_ready',
    blockers: []
  };
}

/**
 * Export compliance analytics for reporting
 */
export async function exportComplianceReport(
  companyId: string,
  startDate: Date,
  endDate: Date,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const metrics = await getComplianceMetrics(companyId, startDate, endDate);

  if (format === 'json') {
    return JSON.stringify(metrics, null, 2);
  }

  // Convert to CSV format
  const csv: string[] = [];
  csv.push('Metric,Value');
  csv.push(`Preset Adoption Rate,${metrics.presetAdoption.adoptionRate}%`);
  csv.push(`Average Compliance Score,${metrics.complianceHealth.averageComplianceScore}%`);
  csv.push(`Compliance Rate,${metrics.complianceHealth.complianceRate}%`);
  csv.push(`Total Overrides,${metrics.overrides.totalOverrides}`);
  csv.push(`Mandatory Steps Removed,${metrics.overrides.mandatoryStepsRemoved}`);
  csv.push(`Contextual Help Views,${metrics.engagement.contextualHelpViews}`);
  csv.push(`Government Resource Clicks,${metrics.engagement.governmentResourceClicks}`);

  return csv.join('\n');
}

/**
 * Generate event ID
 */
function generateEventId(): string {
  return `comp_evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compliance dashboard summary
 */
export type ComplianceDashboard = {
  summary: {
    totalTemplates: number;
    compliantTemplates: number;
    complianceRate: number;
    averageScore: number;
  };
  recentActivity: {
    presetsApplied: number;
    validationsRun: number;
    overridesLogged: number;
    lastActivity: Date | null;
  };
  topRequirements: {
    mostSatisfied: Array<{ id: string; title: string; count: number }>;
    mostRemoved: Array<{ id: string; title: string; count: number }>;
  };
  recommendations: string[];
};

/**
 * Get compliance dashboard data
 */
export async function getComplianceDashboard(companyId: string): Promise<ComplianceDashboard> {
  // TODO: Implement database queries

  return {
    summary: {
      totalTemplates: 0,
      compliantTemplates: 0,
      complianceRate: 0,
      averageScore: 0
    },
    recentActivity: {
      presetsApplied: 0,
      validationsRun: 0,
      overridesLogged: 0,
      lastActivity: null
    },
    topRequirements: {
      mostSatisfied: [],
      mostRemoved: []
    },
    recommendations: []
  };
}
