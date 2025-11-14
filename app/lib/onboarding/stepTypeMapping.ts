const UI_TO_DB_STEP_TYPE = {
  "acknowledge-document": "ACKNOWLEDGE_DOCUMENT",
  "upload-document": "UPLOAD_DOCUMENT",
  "collect-document": "COLLECT_DOCUMENT",
  instructions: "INSTRUCTION",
  "fill-form": "FORM_FILL",
  "fill-form-by-slug": "FILL_FORM_BY_SLUG",
  "create-task": "CREATE_TASK",
  "training-assignment": "TRAINING_ASSIGNMENT",
  "equipment-checklist": "EQUIPMENT_CHECKLIST",
  "system-access": "SYSTEM_ACCESS",
  "manager-checkin": "MANAGER_CHECKIN",
  "buddy-introduction": "BUDDY_INTRODUCTION",
  "compliance-training": "COMPLIANCE_TRAINING",
  "payroll-setup": "PAYROLL_SETUP",
  "benefits-enrollment": "BENEFITS_ENROLLMENT",
  "probation-goals": "PROBATION_GOALS",
  "welcome-survey": "WELCOME_SURVEY",
  "journey-automation": "JOURNEY_AUTOMATION",
} as const;

export type UiOnboardingStepType = keyof typeof UI_TO_DB_STEP_TYPE;

export const DB_TO_UI_STEP_TYPE = Object.fromEntries(
  Object.entries(UI_TO_DB_STEP_TYPE).map(([ui, db]) => [db, ui]),
) as Record<string, UiOnboardingStepType>;

export function mapDbStepTypeToUi(dbType: string | null | undefined) {
  if (!dbType) return "";
  if (dbType in DB_TO_UI_STEP_TYPE) {
    return DB_TO_UI_STEP_TYPE[dbType];
  }
  return String(dbType)
    .toLowerCase()
    .replace(/_/g, "-") as UiOnboardingStepType;
}

export function mapUiStepTypeToDb(uiType: string | null | undefined) {
  if (!uiType) return null;
  return UI_TO_DB_STEP_TYPE[uiType as UiOnboardingStepType] ?? uiType;
}

const UI_TO_DB_UPLOAD_TYPE = {
  passport: "PASSPORT",
  "right-to-work": "RIGHT_TO_WORK",
  "driver-licence": "DRIVER_LICENSE",
  "training-certificate": "TRAINING_CERTIFICATE",
  other: "OTHER",
} as const;

export type UiOnboardingUploadType = keyof typeof UI_TO_DB_UPLOAD_TYPE;

export const DB_TO_UI_UPLOAD_TYPE = Object.fromEntries(
  Object.entries(UI_TO_DB_UPLOAD_TYPE).map(([ui, db]) => [db, ui]),
) as Record<string, UiOnboardingUploadType>;

export function mapDbUploadTypeToUi(dbType: string | null | undefined) {
  if (!dbType) return "";
  return DB_TO_UI_UPLOAD_TYPE[dbType] ?? "";
}

export function mapUiUploadTypeToDb(uiType: string | null | undefined) {
  if (!uiType) return null;
  return UI_TO_DB_UPLOAD_TYPE[uiType as UiOnboardingUploadType] ?? null;
}

export { UI_TO_DB_STEP_TYPE, UI_TO_DB_UPLOAD_TYPE };
