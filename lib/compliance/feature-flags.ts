/**
 * Feature Flags for Compliance Presets
 * 
 * Enables gradual rollout of compliance features per tenant segment
 */

export type TenantSegment = 
  | 'pilot' 
  | 'early_adopter' 
  | 'mid_market' 
  | 'enterprise' 
  | 'all';

export type ComplianceFeatureFlag = {
  key: string;
  name: string;
  description: string;
  enabledForSegments: TenantSegment[];
  enabledForTenants?: string[]; // Specific tenant IDs
  enabledAt?: Date;
  rolloutPercentage?: number; // 0-100 for gradual rollout
  isEnabled: boolean;
};

/**
 * Compliance feature flags
 */
export const COMPLIANCE_FEATURE_FLAGS = {
  NZ_COMPLIANCE_PRESETS: {
    key: 'nz_compliance_presets',
    name: 'NZ Compliance Presets',
    description: 'Enable pre-configured NZ compliance onboarding templates',
    enabledForSegments: ['pilot', 'early_adopter', 'mid_market'],
    rolloutPercentage: 50,
    isEnabled: true
  } as ComplianceFeatureFlag,

  COMPLIANCE_VALIDATION: {
    key: 'compliance_validation',
    name: 'Compliance Validation',
    description: 'Validate templates against statutory requirements and warn on removals',
    enabledForSegments: ['pilot', 'early_adopter', 'mid_market'],
    rolloutPercentage: 75,
    isEnabled: true
  } as ComplianceFeatureFlag,

  COMPLIANCE_WARNINGS: {
    key: 'compliance_warnings',
    name: 'Compliance Warnings',
    description: 'Show warnings when removing mandatory compliance steps',
    enabledForSegments: ['pilot', 'early_adopter', 'mid_market', 'enterprise'],
    rolloutPercentage: 100,
    isEnabled: true
  } as ComplianceFeatureFlag,

  COMPLIANCE_AUDIT_LOG: {
    key: 'compliance_audit_log',
    name: 'Compliance Audit Log',
    description: 'Log all compliance overrides and removals for audit trail',
    enabledForSegments: ['pilot', 'early_adopter', 'mid_market', 'enterprise'],
    rolloutPercentage: 100,
    isEnabled: true
  } as ComplianceFeatureFlag,

  COMPLIANCE_CONTEXTUAL_HELP: {
    key: 'compliance_contextual_help',
    name: 'Compliance Contextual Help',
    description: 'Show contextual tips and government resource links',
    enabledForSegments: ['pilot', 'early_adopter', 'mid_market'],
    rolloutPercentage: 80,
    isEnabled: true
  } as ComplianceFeatureFlag,

  AUTO_COMPLIANCE_TEMPLATES: {
    key: 'auto_compliance_templates',
    name: 'Auto-Provision Compliance Templates',
    description: 'Automatically provision baseline compliance templates for new NZ tenants',
    enabledForSegments: ['pilot', 'early_adopter'],
    rolloutPercentage: 30,
    isEnabled: true
  } as ComplianceFeatureFlag,

  COMPLIANCE_SCORE_DASHBOARD: {
    key: 'compliance_score_dashboard',
    name: 'Compliance Score Dashboard',
    description: 'Show compliance score and coverage metrics in template builder',
    enabledForSegments: ['pilot', 'early_adopter'],
    rolloutPercentage: 50,
    isEnabled: true
  } as ComplianceFeatureFlag,

  INDUSTRY_SPECIFIC_PRESETS: {
    key: 'industry_specific_presets',
    name: 'Industry-Specific Compliance Presets',
    description: 'Enable industry-specific onboarding presets (healthcare, construction, etc.)',
    enabledForSegments: ['pilot'],
    rolloutPercentage: 20,
    isEnabled: false
  } as ComplianceFeatureFlag
};

/**
 * Check if a feature is enabled for a tenant
 */
export function isFeatureEnabled(
  featureKey: string,
  tenantId: string,
  tenantSegment: TenantSegment,
  region?: string
): boolean {
  const feature = Object.values(COMPLIANCE_FEATURE_FLAGS).find(f => f.key === featureKey);
  
  if (!feature || !feature.isEnabled) {
    return false;
  }

  // Check if enabled for specific tenant
  if (feature.enabledForTenants && feature.enabledForTenants.includes(tenantId)) {
    return true;
  }

  // Check if enabled for tenant segment
  if (feature.enabledForSegments.includes(tenantSegment) || feature.enabledForSegments.includes('all')) {
    // Apply rollout percentage if specified
    if (feature.rolloutPercentage !== undefined && feature.rolloutPercentage < 100) {
      // Use tenant ID hash to determine if in rollout percentage
      const hash = hashString(tenantId);
      const bucket = hash % 100;
      return bucket < feature.rolloutPercentage;
    }
    return true;
  }

  return false;
}

/**
 * Get all enabled features for a tenant
 */
export function getEnabledFeatures(
  tenantId: string,
  tenantSegment: TenantSegment,
  region?: string
): ComplianceFeatureFlag[] {
  return Object.values(COMPLIANCE_FEATURE_FLAGS).filter(feature =>
    isFeatureEnabled(feature.key, tenantId, tenantSegment, region)
  );
}

/**
 * Check if NZ compliance features are available for a tenant
 */
export function isNZComplianceAvailable(
  tenantId: string,
  tenantSegment: TenantSegment,
  region: string
): boolean {
  // Must be NZ region
  if (region !== 'NZ') {
    return false;
  }

  // Check if compliance presets feature is enabled
  return isFeatureEnabled(
    COMPLIANCE_FEATURE_FLAGS.NZ_COMPLIANCE_PRESETS.key,
    tenantId,
    tenantSegment,
    region
  );
}

/**
 * Update feature flag rollout percentage
 */
export function updateRolloutPercentage(
  featureKey: string,
  percentage: number
): boolean {
  const feature = Object.values(COMPLIANCE_FEATURE_FLAGS).find(f => f.key === featureKey);
  
  if (!feature) {
    return false;
  }

  if (percentage < 0 || percentage > 100) {
    return false;
  }

  feature.rolloutPercentage = percentage;
  return true;
}

/**
 * Enable feature for specific tenant
 */
export function enableForTenant(featureKey: string, tenantId: string): boolean {
  const feature = Object.values(COMPLIANCE_FEATURE_FLAGS).find(f => f.key === featureKey);
  
  if (!feature) {
    return false;
  }

  if (!feature.enabledForTenants) {
    feature.enabledForTenants = [];
  }

  if (!feature.enabledForTenants.includes(tenantId)) {
    feature.enabledForTenants.push(tenantId);
  }

  return true;
}

/**
 * Disable feature for specific tenant
 */
export function disableForTenant(featureKey: string, tenantId: string): boolean {
  const feature = Object.values(COMPLIANCE_FEATURE_FLAGS).find(f => f.key === featureKey);
  
  if (!feature || !feature.enabledForTenants) {
    return false;
  }

  feature.enabledForTenants = feature.enabledForTenants.filter(id => id !== tenantId);
  return true;
}

/**
 * Enable feature for segment
 */
export function enableForSegment(featureKey: string, segment: TenantSegment): boolean {
  const feature = Object.values(COMPLIANCE_FEATURE_FLAGS).find(f => f.key === featureKey);
  
  if (!feature) {
    return false;
  }

  if (!feature.enabledForSegments.includes(segment)) {
    feature.enabledForSegments.push(segment);
  }

  return true;
}

/**
 * Get feature rollout status
 */
export function getFeatureRolloutStatus(featureKey: string): {
  feature: ComplianceFeatureFlag | null;
  estimatedReach: number;
  segments: TenantSegment[];
  specificTenants: number;
} {
  const feature = Object.values(COMPLIANCE_FEATURE_FLAGS).find(f => f.key === featureKey);
  
  if (!feature) {
    return {
      feature: null,
      estimatedReach: 0,
      segments: [],
      specificTenants: 0
    };
  }

  return {
    feature,
    estimatedReach: feature.rolloutPercentage || 100,
    segments: feature.enabledForSegments,
    specificTenants: feature.enabledForTenants?.length || 0
  };
}

/**
 * Simple string hash function for consistent tenant bucketing
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Feature flag configuration for database storage
 */
export type FeatureFlagConfig = {
  featureKey: string;
  isEnabled: boolean;
  enabledForSegments: TenantSegment[];
  enabledForTenants: string[];
  rolloutPercentage: number;
  updatedAt: Date;
  updatedBy: string;
};

/**
 * Load feature flags from database (placeholder for DB implementation)
 */
export async function loadFeatureFlags(companyId: string): Promise<Record<string, boolean>> {
  // TODO: Implement database lookup
  // This would query a FeatureFlag table to get tenant-specific overrides
  
  return Object.values(COMPLIANCE_FEATURE_FLAGS).reduce((acc, flag) => {
    acc[flag.key] = flag.isEnabled;
    return acc;
  }, {} as Record<string, boolean>);
}

/**
 * Save feature flag configuration (placeholder for DB implementation)
 */
export async function saveFeatureFlagConfig(
  config: FeatureFlagConfig
): Promise<boolean> {
  // TODO: Implement database save
  // This would save to a FeatureFlag table
  
  return true;
}
