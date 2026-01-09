/**
 * Feature Toggle Types and Constants
 * 
 * This module defines the feature keys, types, and configuration for the
 * tenant-level feature toggle system.
 * 
 * Requirements: 1.4, 3.5
 */

/**
 * Feature keys enum - all toggleable features in the system
 */
export const FEATURE_KEYS = {
  AI_ASSISTANT: 'ai_assistant',
  NEWS: 'news',
  BULK_ACTIONS: 'bulk_actions',
  PERFORMANCE_MANAGEMENT: 'performance_management',
  JOURNEYS: 'journeys',
  ONBOARDING: 'onboarding',
  AUTOMATION_RULES: 'automation_rules',
  EVENT_RULES: 'event_rules',
  ORG_CHART: 'org_chart',
  SURVEYS: 'surveys',
  FORMS: 'forms',
  TIMESHEETS: 'timesheets',
  ROTA_SHIFTS: 'rota_shifts',
  MULTI_STAGE_APPROVALS: 'multi_stage_approvals',
  ANALYTICS: 'analytics',
  BUG_REPORTING: 'bug_reporting',
} as const;

/**
 * Type representing a valid feature key
 */
export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

/**
 * Array of all feature keys for iteration
 */
export const ALL_FEATURE_KEYS: FeatureKey[] = Object.values(FEATURE_KEYS);

/**
 * Features that should default to disabled for new tenants
 * These are typically beta features or features requiring explicit opt-in
 */
export const FEATURES_DISABLED_BY_DEFAULT: FeatureKey[] = [
  FEATURE_KEYS.BUG_REPORTING,
];

/**
 * Interface representing the toggle state for all features
 */
export interface FeatureToggleState {
  [key: string]: boolean;
}

/**
 * Interface for a feature within a category
 */
export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
}

/**
 * Interface for a category of features
 */
export interface FeatureCategory {
  name: string;
  description: string;
  features: FeatureDefinition[];
}


/**
 * Feature categories configuration - groups features for UI display
 */
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    name: 'Core HR Tools',
    description: 'Essential HR management features',
    features: [
      { key: FEATURE_KEYS.PERFORMANCE_MANAGEMENT, label: 'Performance', description: 'Performance reviews and objectives' },
      { key: FEATURE_KEYS.SURVEYS, label: 'Surveys', description: 'Employee surveys and feedback' },
      { key: FEATURE_KEYS.FORMS, label: 'Forms', description: 'Custom forms builder' },
      { key: FEATURE_KEYS.ORG_CHART, label: 'Org Chart', description: 'Organisation visualisation' },
      { key: FEATURE_KEYS.ANALYTICS, label: 'Analytics', description: 'HR analytics and insights' },
    ],
  },
  {
    name: 'Automation',
    description: 'Workflow and process automation',
    features: [
      { key: FEATURE_KEYS.AUTOMATION_RULES, label: 'Automation Rules', description: 'Workflow automation engine' },
      { key: FEATURE_KEYS.EVENT_RULES, label: 'Event Rules', description: 'Event-triggered notifications' },
      { key: FEATURE_KEYS.MULTI_STAGE_APPROVALS, label: 'Multi-stage Approvals', description: 'Complex approval workflows' },
    ],
  },
  {
    name: 'Employee Experience',
    description: 'Employee engagement and onboarding',
    features: [
      { key: FEATURE_KEYS.NEWS, label: 'News', description: 'Company news and communications' },
      { key: FEATURE_KEYS.JOURNEYS, label: 'Journeys', description: 'Employee journey workflows' },
      { key: FEATURE_KEYS.ONBOARDING, label: 'Onboarding', description: 'New employee onboarding' },
    ],
  },
  {
    name: 'Operations',
    description: 'Time tracking and bulk operations',
    features: [
      { key: FEATURE_KEYS.TIMESHEETS, label: 'Timesheets', description: 'Timesheet management' },
      { key: FEATURE_KEYS.ROTA_SHIFTS, label: 'Rota & Shifts', description: 'Scheduling and reconciliation' },
      { key: FEATURE_KEYS.BULK_ACTIONS, label: 'Bulk Actions', description: 'Bulk employee operations' },
    ],
  },
  {
    name: 'AI',
    description: 'AI-powered features',
    features: [
      { key: FEATURE_KEYS.AI_ASSISTANT, label: 'AI Assistant', description: 'AI-powered HR assistant' },
    ],
  },
  {
    name: 'Beta Features',
    description: 'Features in beta testing',
    features: [
      { key: FEATURE_KEYS.BUG_REPORTING, label: 'Bug Reporting', description: 'Allow users to submit bug reports' },
    ],
  },
];

/**
 * Mapping of feature keys to their associated navigation/API paths
 * Used for navigation filtering and API guards
 */
export const FEATURE_TO_PATHS: Record<FeatureKey, string[]> = {
  [FEATURE_KEYS.AI_ASSISTANT]: ['/assistant', '/api/ai'],
  [FEATURE_KEYS.NEWS]: ['/news', '/api/news'],
  [FEATURE_KEYS.BULK_ACTIONS]: ['/bulk-actions', '/api/bulk-actions'],
  [FEATURE_KEYS.PERFORMANCE_MANAGEMENT]: ['/performance', '/api/performance'],
  [FEATURE_KEYS.JOURNEYS]: ['/settings/journeys', '/api/journeys'],
  [FEATURE_KEYS.ONBOARDING]: ['/settings/onboarding', '/api/onboarding'],
  [FEATURE_KEYS.AUTOMATION_RULES]: ['/settings/automation-rules', '/api/automation-rules'],
  [FEATURE_KEYS.EVENT_RULES]: ['/settings/event-rules', '/api/event-rules'],
  [FEATURE_KEYS.ORG_CHART]: ['/org-chart', '/api/org-chart'],
  [FEATURE_KEYS.SURVEYS]: ['/surveys', '/settings/surveys', '/api/surveys'],
  [FEATURE_KEYS.FORMS]: ['/settings/forms', '/api/forms'],
  [FEATURE_KEYS.TIMESHEETS]: ['/admin/timesheets', '/employee/timesheet', '/api/timesheets'],
  [FEATURE_KEYS.ROTA_SHIFTS]: ['/rota', '/admin/reconciliation', '/employee/schedule', '/api/rota-groups', '/api/shifts', '/api/reconciliation'],
  [FEATURE_KEYS.MULTI_STAGE_APPROVALS]: ['/settings/multi-stage-approvals', '/api/approval-workflows'],
  [FEATURE_KEYS.ANALYTICS]: ['/analytics', '/api/analytics'],
  [FEATURE_KEYS.BUG_REPORTING]: ['/bugs', '/api/bugs'],
};

/**
 * Helper function to get the feature key for a given path
 * Returns undefined if the path is not associated with any feature
 */
export function getFeatureKeyForPath(path: string): FeatureKey | undefined {
  for (const [featureKey, paths] of Object.entries(FEATURE_TO_PATHS)) {
    if (paths.some(p => path.startsWith(p))) {
      return featureKey as FeatureKey;
    }
  }
  return undefined;
}

/**
 * Helper function to check if a path is associated with a feature
 */
export function isFeaturePath(path: string): boolean {
  return getFeatureKeyForPath(path) !== undefined;
}

/**
 * Get all paths associated with a feature key
 */
export function getPathsForFeature(featureKey: FeatureKey): string[] {
  return FEATURE_TO_PATHS[featureKey] || [];
}

/**
 * Get the default toggle state for new tenants
 * Most features are enabled by default, except those in FEATURES_DISABLED_BY_DEFAULT
 */
export function getDefaultToggleState(): FeatureToggleState {
  return ALL_FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = !FEATURES_DISABLED_BY_DEFAULT.includes(key);
    return acc;
  }, {} as FeatureToggleState);
}

/**
 * Validate if a string is a valid feature key
 */
export function isValidFeatureKey(key: string): key is FeatureKey {
  return ALL_FEATURE_KEYS.includes(key as FeatureKey);
}
