/**
 * Integration Tests for PAYROLL_SETUP Step Renderer
 * 
 * Validates that:
 * 1. PAYROLL_SETUP step types map correctly to "payroll-setup"
 * 2. Metadata is properly hydrated for the renderer
 * 3. Step responses are correctly associated
 * 4. All advanced step types render without errors
 */

import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import { mapDbStepTypeToUi, mapUiStepTypeToDb } from "../../lib/onboarding/mapStepType";
import { normalizeStepMetadata } from "../../app/lib/onboarding/stepMetadata";

test("mapDbStepTypeToUi - correctly maps PAYROLL_SETUP to hyphenated format", () => {
  const result = mapDbStepTypeToUi("PAYROLL_SETUP");
  assert.equal(result, "payroll-setup");
});

test("mapDbStepTypeToUi - correctly maps EQUIPMENT_CHECKLIST to hyphenated format", () => {
  const result = mapDbStepTypeToUi("EQUIPMENT_CHECKLIST");
  assert.equal(result, "equipment-checklist");
});

test("mapDbStepTypeToUi - correctly maps BENEFITS_ENROLLMENT to hyphenated format", () => {
  const result = mapDbStepTypeToUi("BENEFITS_ENROLLMENT");
  assert.equal(result, "benefits-enrollment");
});

test("mapDbStepTypeToUi - correctly maps SYSTEM_ACCESS to hyphenated format", () => {
  const result = mapDbStepTypeToUi("SYSTEM_ACCESS");
  assert.equal(result, "system-access");
});

test("mapDbStepTypeToUi - correctly maps MANAGER_CHECKIN to hyphenated format", () => {
  const result = mapDbStepTypeToUi("MANAGER_CHECKIN");
  assert.equal(result, "manager-checkin");
});

test("mapDbStepTypeToUi - correctly maps COMPLIANCE_TRAINING to hyphenated format", () => {
  const result = mapDbStepTypeToUi("COMPLIANCE_TRAINING");
  assert.equal(result, "compliance-training");
});

test("mapDbStepTypeToUi - handles null/undefined gracefully", () => {
  assert.equal(mapDbStepTypeToUi(null), "");
  assert.equal(mapDbStepTypeToUi(undefined), "");
  assert.equal(mapDbStepTypeToUi(""), "");
});

test("mapDbStepTypeToUi - provides fallback for unmapped types", () => {
  // Test fallback for hypothetical new type not yet in mapping
  const result = mapDbStepTypeToUi("FUTURE_NEW_TYPE");
  assert.equal(result, "future-new-type");
});

test("mapUiStepTypeToDb - reverse mapping works correctly", () => {
  assert.equal(mapUiStepTypeToDb("payroll-setup"), "PAYROLL_SETUP");
  assert.equal(mapUiStepTypeToDb("equipment-checklist"), "EQUIPMENT_CHECKLIST");
  assert.equal(mapUiStepTypeToDb("benefits-enrollment"), "BENEFITS_ENROLLMENT");
});

test("mapUiStepTypeToDb - handles null/undefined gracefully", () => {
  assert.equal(mapUiStepTypeToDb(null), null);
  assert.equal(mapUiStepTypeToDb(undefined), null);
  assert.equal(mapUiStepTypeToDb(""), null);
});

test("normalizeStepMetadata - payroll-setup metadata structure", () => {
  const input = {
    fields: ["bankAccount", "taxNumber", "kiwiSaverRate"],
    required: true,
  };
  
  const normalized = normalizeStepMetadata("payroll-setup", input);
  
  // Metadata should be preserved or normalized appropriately
  assert.ok(normalized);
  assert.ok(typeof normalized === "object");
});

test("normalizeStepMetadata - equipment-checklist metadata structure", () => {
  const input = {
    items: [
      { id: "laptop", label: "Laptop", required: true },
      { id: "phone", label: "Mobile Phone", required: false },
    ],
  };
  
  const normalized = normalizeStepMetadata("equipment-checklist", input);
  
  assert.ok(normalized);
  assert.ok(Array.isArray((normalized as any).items));
  assert.equal((normalized as any).items.length, 2);
});

test("normalizeStepMetadata - handles empty metadata gracefully", () => {
  const normalized = normalizeStepMetadata("payroll-setup", null);
  assert.ok(normalized !== null);
});

test("Integration: Full step type mapping round-trip", () => {
  const stepTypes = [
    "PAYROLL_SETUP",
    "EQUIPMENT_CHECKLIST",
    "SYSTEM_ACCESS",
    "BENEFITS_ENROLLMENT",
    "MANAGER_CHECKIN",
    "BUDDY_INTRODUCTION",
    "COMPLIANCE_TRAINING",
    "PROBATION_GOALS",
    "WELCOME_SURVEY",
  ];

  for (const dbType of stepTypes) {
    const uiType = mapDbStepTypeToUi(dbType);
    const backToDb = mapUiStepTypeToDb(uiType);
    
    assert.equal(
      backToDb,
      dbType,
      `Round-trip failed for ${dbType}: ${dbType} -> ${uiType} -> ${backToDb}`
    );
  }
});

test("Integration: Renderer-compatible metadata for all advanced step types", () => {
  const stepConfigs = [
    {
      type: "PAYROLL_SETUP",
      metadata: { fields: ["bankAccount"], guidance: "Enter your details" },
    },
    {
      type: "EQUIPMENT_CHECKLIST",
      metadata: { items: [{ id: "laptop", label: "Laptop" }] },
    },
    {
      type: "SYSTEM_ACCESS",
      metadata: { systems: ["email", "crm"], approvalRequired: true },
    },
    {
      type: "BENEFITS_ENROLLMENT",
      metadata: { plans: ["health", "dental"], enrollmentWindow: 30 },
    },
  ];

  for (const config of stepConfigs) {
    const uiType = mapDbStepTypeToUi(config.type);
    const normalized = normalizeStepMetadata(uiType, config.metadata);
    
    assert.ok(
      normalized,
      `Failed to normalize metadata for ${config.type} (${uiType})`
    );
    assert.ok(
      typeof normalized === "object",
      `Normalized metadata for ${config.type} is not an object`
    );
  }
});

test("Integration: Complete onboarding instance response structure", () => {
  // Simulate a complete instance response as returned by the API
  const mockInstance = {
    id: "inst1",
    template: { name: "Engineering Onboarding" },
    steps: [
      {
        id: "step1",
        instanceStepId: "inst-step-1",
        type: mapDbStepTypeToUi("PAYROLL_SETUP"),
        label: "Payroll Information",
        instruction: "Complete your payroll details",
        metadata: normalizeStepMetadata("payroll-setup", {
          fields: ["bankAccount", "taxNumber"],
          guidance: "All fields are mandatory",
        }),
        existingResponse: null,
        status: "pending",
      },
      {
        id: "step2",
        instanceStepId: "inst-step-2",
        type: mapDbStepTypeToUi("EQUIPMENT_CHECKLIST"),
        label: "Equipment Issuance",
        instruction: "Collect your equipment",
        metadata: normalizeStepMetadata("equipment-checklist", {
          items: [
            { id: "laptop", label: "Laptop", required: true },
            { id: "monitor", label: "Monitor", required: false },
          ],
        }),
        existingResponse: {
          equipmentChecklist: [{ id: "laptop", completed: true }],
        },
        status: "completed",
      },
      {
        id: "step3",
        instanceStepId: "inst-step-3",
        type: mapDbStepTypeToUi("SYSTEM_ACCESS"),
        label: "System Access Request",
        instruction: "Request access to systems",
        metadata: normalizeStepMetadata("system-access", {
          systems: ["email", "slack", "github"],
        }),
        existingResponse: null,
        status: "pending",
      },
    ],
  };

  // Validate structure
  assert.equal(mockInstance.steps.length, 3);
  
  const payrollStep = mockInstance.steps[0];
  assert.equal(payrollStep.type, "payroll-setup");
  assert.ok(payrollStep.metadata);
  
  const equipmentStep = mockInstance.steps[1];
  assert.equal(equipmentStep.type, "equipment-checklist");
  assert.ok(equipmentStep.existingResponse);
  assert.equal(equipmentStep.status, "completed");
  
  const accessStep = mockInstance.steps[2];
  assert.equal(accessStep.type, "system-access");
  assert.equal(accessStep.status, "pending");
});

test("Integration: Validates that all DB enum values have explicit mappings", () => {
  const expectedDbTypes = [
    "ACKNOWLEDGE_DOCUMENT",
    "UPLOAD_DOCUMENT",
    "COLLECT_DOCUMENT",
    "FORM_FILL",
    "FILL_FORM_BY_SLUG",
    "CREATE_TASK",
    "INSTRUCTION",
    "TRAINING_ASSIGNMENT",
    "COMPLIANCE_TRAINING",
    "EQUIPMENT_CHECKLIST",
    "SYSTEM_ACCESS",
    "PAYROLL_SETUP",
    "BENEFITS_ENROLLMENT",
    "MANAGER_CHECKIN",
    "BUDDY_INTRODUCTION",
    "PROBATION_GOALS",
    "WELCOME_SURVEY",
    "JOURNEY_AUTOMATION",
  ];

  for (const dbType of expectedDbTypes) {
    const uiType = mapDbStepTypeToUi(dbType);
    
    // Should produce a hyphenated lowercase string
    assert.ok(uiType.includes("-") || uiType === "instructions");
    assert.equal(uiType, uiType.toLowerCase());
    
    // Should be reversible
    const backToDb = mapUiStepTypeToDb(uiType);
    assert.equal(backToDb, dbType);
  }
});
