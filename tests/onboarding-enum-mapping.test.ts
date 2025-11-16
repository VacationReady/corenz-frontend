/**
 * Comprehensive enum mapping tests for onboarding step types
 * 
 * Verifies that:
 * 1. All database enum values map correctly to UI types
 * 2. All UI types map back to database enums
 * 3. The mapStepType functions handle all known types
 * 4. Unknown types fall back gracefully
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import {
  mapDbStepTypeToUi,
  mapUiStepTypeToDb,
  DB_STEP_TYPE_TO_UI,
  UI_STEP_TYPE_TO_DB,
  getAllDbStepTypes,
  getAllUiStepTypes,
  isValidDbStepType,
  isValidUiStepType,
} from "../lib/onboarding/mapStepType";

test("mapDbStepTypeToUi handles all known database enums", () => {
  const dbTypes = getAllDbStepTypes();
  
  assert.ok(dbTypes.length > 0, "Should have at least one database step type");
  
  // Verify all known types map correctly
  const testCases = [
    { db: "ACKNOWLEDGE_DOCUMENT", ui: "acknowledge-document" },
    { db: "UPLOAD_DOCUMENT", ui: "upload-document" },
    { db: "COLLECT_DOCUMENT", ui: "collect-document" },
    { db: "FORM_FILL", ui: "fill-form" },
    { db: "FILL_FORM_BY_SLUG", ui: "fill-form-by-slug" },
    { db: "INSTRUCTION", ui: "instructions" },
    { db: "TRAINING_ASSIGNMENT", ui: "training-assignment" },
    { db: "EQUIPMENT_CHECKLIST", ui: "equipment-checklist" },
    { db: "SYSTEM_ACCESS", ui: "system-access" },
    { db: "MANAGER_CHECKIN", ui: "manager-checkin" },
    { db: "BUDDY_INTRODUCTION", ui: "buddy-introduction" },
    { db: "COMPLIANCE_TRAINING", ui: "compliance-training" },
    { db: "PAYROLL_SETUP", ui: "payroll-setup" },
    { db: "BENEFITS_ENROLLMENT", ui: "benefits-enrollment" },
    { db: "PROBATION_GOALS", ui: "probation-goals" },
    { db: "WELCOME_SURVEY", ui: "welcome-survey" },
    { db: "JOURNEY_AUTOMATION", ui: "journey-automation" },
    { db: "CREATE_TASK", ui: "create-task" },
  ];
  
  testCases.forEach(({ db, ui }) => {
    const mapped = mapDbStepTypeToUi(db);
    assert.equal(
      mapped,
      ui,
      `Database type ${db} should map to ${ui}, got ${mapped}`,
    );
    assert.ok(
      isValidDbStepType(db),
      `${db} should be recognized as a valid database type`,
    );
  });
});

test("mapUiStepTypeToDb handles all known UI types", () => {
  const uiTypes = getAllUiStepTypes();
  
  assert.ok(uiTypes.length > 0, "Should have at least one UI step type");
  
  const testCases = [
    { ui: "acknowledge-document", db: "ACKNOWLEDGE_DOCUMENT" },
    { ui: "upload-document", db: "UPLOAD_DOCUMENT" },
    { ui: "collect-document", db: "COLLECT_DOCUMENT" },
    { ui: "fill-form", db: "FORM_FILL" },
    { ui: "fill-form-by-slug", db: "FILL_FORM_BY_SLUG" },
    { ui: "instructions", db: "INSTRUCTION" },
    { ui: "training-assignment", db: "TRAINING_ASSIGNMENT" },
    { ui: "equipment-checklist", db: "EQUIPMENT_CHECKLIST" },
    { ui: "system-access", db: "SYSTEM_ACCESS" },
    { ui: "manager-checkin", db: "MANAGER_CHECKIN" },
    { ui: "buddy-introduction", db: "BUDDY_INTRODUCTION" },
    { ui: "compliance-training", db: "COMPLIANCE_TRAINING" },
    { ui: "payroll-setup", db: "PAYROLL_SETUP" },
    { ui: "benefits-enrollment", db: "BENEFITS_ENROLLMENT" },
    { ui: "probation-goals", db: "PROBATION_GOALS" },
    { ui: "welcome-survey", db: "WELCOME_SURVEY" },
    { ui: "journey-automation", db: "JOURNEY_AUTOMATION" },
    { ui: "create-task", db: "CREATE_TASK" },
  ];
  
  testCases.forEach(({ ui, db }) => {
    const mapped = mapUiStepTypeToDb(ui);
    assert.equal(
      mapped,
      db,
      `UI type ${ui} should map to ${db}, got ${mapped}`,
    );
    assert.ok(
      isValidUiStepType(ui),
      `${ui} should be recognized as a valid UI type`,
    );
  });
});

test("Bidirectional mapping is consistent", () => {
  // Every DB type should map to UI and back to the same DB type
  Object.entries(DB_STEP_TYPE_TO_UI).forEach(([dbType, uiType]) => {
    const mappedUi = mapDbStepTypeToUi(dbType);
    assert.equal(mappedUi, uiType, `DB->UI mapping failed for ${dbType}`);
    
    const mappedBack = mapUiStepTypeToDb(mappedUi);
    assert.equal(mappedBack, dbType, `UI->DB reverse mapping failed for ${dbType}`);
  });
  
  // Every UI type should map to DB and back to the same UI type
  Object.entries(UI_STEP_TYPE_TO_DB).forEach(([uiType, dbType]) => {
    const mappedDb = mapUiStepTypeToDb(uiType);
    assert.equal(mappedDb, dbType, `UI->DB mapping failed for ${uiType}`);
    
    const mappedBack = mapDbStepTypeToUi(mappedDb!);
    assert.equal(mappedBack, uiType, `DB->UI reverse mapping failed for ${uiType}`);
  });
});

test("Fallback behavior for unknown types", () => {
  // Unknown DB types should fallback to lowercase hyphenated
  const unknownDb = "NEW_FUTURE_TYPE";
  const fallbackUi = mapDbStepTypeToUi(unknownDb);
  assert.equal(
    fallbackUi,
    "new-future-type",
    "Unknown DB type should convert to lowercase hyphenated",
  );
  
  // Unknown UI types should fallback to uppercase underscored
  const unknownUi = "new-future-type";
  const fallbackDb = mapUiStepTypeToDb(unknownUi);
  assert.equal(
    fallbackDb,
    "NEW_FUTURE_TYPE",
    "Unknown UI type should convert to uppercase underscored",
  );
});

test("Handles null and undefined gracefully", () => {
  assert.equal(mapDbStepTypeToUi(null), "", "null should return empty string");
  assert.equal(mapDbStepTypeToUi(undefined), "", "undefined should return empty string");
  assert.equal(mapUiStepTypeToDb(null), null, "null should return null");
  assert.equal(mapUiStepTypeToDb(undefined), null, "undefined should return null");
});

test("No enum types are lowercase before mapping", () => {
  // This test ensures we're not receiving pre-lowercased enums from the renderer
  // which was the original issue mentioned in the audit
  const allDbTypes = getAllDbStepTypes();
  
  allDbTypes.forEach((dbType: string) => {
    assert.notEqual(
      dbType,
      dbType.toLowerCase(),
      `Database enum ${dbType} should not be pre-lowercased`,
    );
    assert.ok(
      dbType === dbType.toUpperCase() || dbType.includes("_"),
      `Database enum ${dbType} should be UPPER_SNAKE_CASE`,
    );
  });
});
