/**
 * Step Type Mapping for Onboarding
 * 
 * Ensures complete, bidirectional mapping between database enum values
 * and UI-friendly hyphenated keys for the onboarding renderer.
 * 
 * CRITICAL: Every backend enum must have an explicit mapping to prevent
 * runtime errors when the renderer hydrates metadata.
 */

/**
 * Complete mapping of all backend OnboardingStepType enum values
 * to their hyphenated UI equivalents expected by the renderer.
 */
export const DB_STEP_TYPE_TO_UI: Record<string, string> = {
  // Document-related steps
  ACKNOWLEDGE_DOCUMENT: "acknowledge-document",
  UPLOAD_DOCUMENT: "upload-document",
  COLLECT_DOCUMENT: "collect-document",
  
  // Form and data collection
  FORM_FILL: "fill-form",
  FILL_FORM_BY_SLUG: "fill-form-by-slug",
  
  // Task and workflow
  CREATE_TASK: "create-task",
  INSTRUCTION: "instructions",
  
  // Training and development
  TRAINING_ASSIGNMENT: "training-assignment",
  COMPLIANCE_TRAINING: "compliance-training",
  
  // HR onboarding specifics
  EQUIPMENT_CHECKLIST: "equipment-checklist",
  SYSTEM_ACCESS: "system-access",
  PAYROLL_SETUP: "payroll-setup",
  BENEFITS_ENROLLMENT: "benefits-enrollment",
  
  // People and relationships
  MANAGER_CHECKIN: "manager-checkin",
  BUDDY_INTRODUCTION: "buddy-introduction",
  
  // Goals and feedback
  PROBATION_GOALS: "probation-goals",
  WELCOME_SURVEY: "welcome-survey",
  
  // Automation
  JOURNEY_AUTOMATION: "journey-automation",
} as const;

/**
 * Reverse mapping for UI to database conversion
 */
export const UI_STEP_TYPE_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(DB_STEP_TYPE_TO_UI).map(([db, ui]) => [ui, db]),
);

/**
 * TypeScript type for UI step types
 */
export type UiStepType = typeof DB_STEP_TYPE_TO_UI[keyof typeof DB_STEP_TYPE_TO_UI];

/**
 * TypeScript type for database step types
 */
export type DbStepType = keyof typeof DB_STEP_TYPE_TO_UI;

/**
 * Maps a database step type enum to its UI-friendly hyphenated key.
 * 
 * This is the primary function used when loading onboarding instances
 * from the database to ensure the renderer receives correctly formatted
 * step types.
 * 
 * @param dbType - Database enum value (e.g., "PAYROLL_SETUP")
 * @returns Hyphenated UI key (e.g., "payroll-setup")
 * 
 * @example
 * ```ts
 * mapDbStepTypeToUi("PAYROLL_SETUP") // "payroll-setup"
 * mapDbStepTypeToUi("EQUIPMENT_CHECKLIST") // "equipment-checklist"
 * ```
 */
export function mapDbStepTypeToUi(dbType: string | null | undefined): string {
  if (!dbType) return "";
  
  // Check explicit mapping first
  if (dbType in DB_STEP_TYPE_TO_UI) {
    return DB_STEP_TYPE_TO_UI[dbType];
  }
  
  // Fallback: Convert UPPER_SNAKE_CASE to hyphenated-lowercase
  // This ensures forward compatibility if new types are added
  return String(dbType)
    .toLowerCase()
    .replace(/_/g, "-");
}

/**
 * Maps a UI step type to its database enum value.
 * 
 * Used when saving template configurations or creating steps
 * from the builder UI.
 * 
 * @param uiType - Hyphenated UI key (e.g., "payroll-setup")
 * @returns Database enum value (e.g., "PAYROLL_SETUP")
 * 
 * @example
 * ```ts
 * mapUiStepTypeToDb("payroll-setup") // "PAYROLL_SETUP"
 * mapUiStepTypeToDb("equipment-checklist") // "EQUIPMENT_CHECKLIST"
 * ```
 */
export function mapUiStepTypeToDb(uiType: string | null | undefined): string | null {
  if (!uiType) return null;
  
  // Check explicit mapping
  if (uiType in UI_STEP_TYPE_TO_DB) {
    return UI_STEP_TYPE_TO_DB[uiType];
  }
  
  // Fallback: Convert hyphenated-lowercase to UPPER_SNAKE_CASE
  return String(uiType)
    .toUpperCase()
    .replace(/-/g, "_");
}

/**
 * Validates that a database step type is recognized.
 * 
 * @param dbType - Database enum value to validate
 * @returns True if the type is explicitly mapped
 */
export function isValidDbStepType(dbType: string): dbType is DbStepType {
  return dbType in DB_STEP_TYPE_TO_UI;
}

/**
 * Validates that a UI step type is recognized.
 * 
 * @param uiType - UI step type to validate
 * @returns True if the type is explicitly mapped
 */
export function isValidUiStepType(uiType: string): uiType is UiStepType {
  return uiType in UI_STEP_TYPE_TO_DB;
}

/**
 * Gets all recognized database step types.
 * Useful for validation and documentation.
 */
export function getAllDbStepTypes(): DbStepType[] {
  return Object.keys(DB_STEP_TYPE_TO_UI) as DbStepType[];
}

/**
 * Gets all recognized UI step types.
 * Useful for UI dropdowns and validation.
 */
export function getAllUiStepTypes(): UiStepType[] {
  return Object.values(DB_STEP_TYPE_TO_UI) as UiStepType[];
}
