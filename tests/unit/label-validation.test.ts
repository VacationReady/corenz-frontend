/**
 * Unit Tests for Label Validation
 * 
 * Validates that:
 * 1. Duplicate labels are detected correctly
 * 2. Suggestions are generated appropriately
 * 3. Localization works correctly
 * 4. Edge cases are handled gracefully
 */

import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import {
  validateStepLabel,
  generateUniqueLabel,
  getValidationMessage,
  type StepForValidation,
} from "../../lib/onboarding/label-validation";

test("validateStepLabel - accepts unique label", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Welcome" },
    { id: "step2", title: "Documentation" },
  ];

  const result = validateStepLabel("Onboarding", "step3", steps, "tenant1");

  assert.ok(result.isValid);
  assert.equal(result.error, undefined);
  assert.equal(result.suggestion, undefined);
});

test("validateStepLabel - rejects duplicate label", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Welcome" },
    { id: "step2", title: "Documentation" },
  ];

  const result = validateStepLabel("Welcome", "step3", steps, "tenant1");

  assert.ok(!result.isValid);
  assert.ok(result.error);
  assert.equal(result.suggestion, "Welcome 2");
});

test("validateStepLabel - case-insensitive duplicate detection", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Welcome" },
  ];

  const result = validateStepLabel("WELCOME", "step2", steps, "tenant1");

  assert.ok(!result.isValid);
  assert.ok(result.error);
});

test("validateStepLabel - allows editing current step with same label", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Welcome" },
    { id: "step2", title: "Documentation" },
  ];

  // Editing step1 with its own label should be valid
  const result = validateStepLabel("Welcome", "step1", steps, "tenant1");

  assert.ok(result.isValid);
});

test("validateStepLabel - rejects empty label", () => {
  const steps: StepForValidation[] = [];

  const result = validateStepLabel("", "step1", steps, "tenant1");

  assert.ok(!result.isValid);
  assert.ok(result.error?.includes("empty"));
});

test("validateStepLabel - rejects whitespace-only label", () => {
  const steps: StepForValidation[] = [];

  const result = validateStepLabel("   ", "step1", steps, "tenant1");

  assert.ok(!result.isValid);
});

test("validateStepLabel - rejects label that's too short", () => {
  const steps: StepForValidation[] = [];

  const result = validateStepLabel("ab", "step1", steps, "tenant1");

  assert.ok(!result.isValid);
  assert.ok(result.error?.includes("3 characters"));
});

test("validateStepLabel - rejects label that's too long", () => {
  const steps: StepForValidation[] = [];

  const longLabel = "a".repeat(81);
  const result = validateStepLabel(longLabel, "step1", steps, "tenant1");

  assert.ok(!result.isValid);
  assert.ok(result.error?.includes("80 characters"));
});

test("validateStepLabel - accepts label at maximum length", () => {
  const steps: StepForValidation[] = [];

  const maxLabel = "a".repeat(80);
  const result = validateStepLabel(maxLabel, "step1", steps, "tenant1");

  assert.ok(result.isValid);
});

test("validateStepLabel - generates incremental suggestions", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Welcome" },
    { id: "step2", title: "Welcome 2" },
    { id: "step3", title: "Welcome 3" },
  ];

  const result = validateStepLabel("Welcome", "step4", steps, "tenant1");

  assert.ok(!result.isValid);
  assert.equal(result.suggestion, "Welcome 4");
});

test("validateStepLabel - handles label field as fallback", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "", label: "Welcome" }, // Uses label as fallback
  ];

  const result = validateStepLabel("Welcome", "step2", steps, "tenant1");

  assert.ok(!result.isValid);
});

test("generateUniqueLabel - creates unique label for new step", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Acknowledge Document" },
  ];

  const label = generateUniqueLabel("acknowledge-document", steps);

  assert.equal(label, "Acknowledge Document 2");
});

test("generateUniqueLabel - starts at 1 when no conflicts", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Upload Document" },
  ];

  const label = generateUniqueLabel("acknowledge-document", steps);

  assert.equal(label, "Acknowledge Document");
});

test("generateUniqueLabel - handles unknown step types", () => {
  const steps: StepForValidation[] = [];

  const label = generateUniqueLabel("unknown-type", steps);

  assert.equal(label, "Step");
});

test("generateUniqueLabel - increments correctly for multiple conflicts", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Complete Form" },
    { id: "step2", title: "Complete Form 2" },
  ];

  const label = generateUniqueLabel("fill-form", steps);

  assert.equal(label, "Complete Form 3");
});

test("getValidationMessage - returns English message by default", () => {
  const message = getValidationMessage("empty");

  assert.ok(message.includes("empty"));
  assert.ok(message.length > 0);
});

test("getValidationMessage - returns localized message for Māori", () => {
  const message = getValidationMessage("empty", "mi");

  assert.ok(message.includes("Kāore") || message.includes("ingoa"));
});

test("getValidationMessage - applies replacements correctly", () => {
  const message = getValidationMessage("suggestion", "en", { suggestion: "Test 2" });

  assert.ok(message.includes("Test 2"));
});

test("getValidationMessage - falls back to English for unknown locale", () => {
  const message = getValidationMessage("empty", "unknown-locale");

  assert.ok(message.includes("empty"));
});

test("Integration: Full validation flow with duplicates", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Setup" },
    { id: "step2", title: "Configuration" },
    { id: "step3", title: "Review" },
  ];

  // Try to add duplicate
  const result1 = validateStepLabel("Setup", "step4", steps, "tenant1");
  assert.ok(!result1.isValid);
  assert.equal(result1.suggestion, "Setup 2");

  // Apply suggestion
  steps.push({ id: "step4", title: result1.suggestion! });

  // Try again with new duplicate
  const result2 = validateStepLabel("Setup", "step5", steps, "tenant1");
  assert.ok(!result2.isValid);
  assert.equal(result2.suggestion, "Setup 3");
});

test("Integration: Validates tenant scoping (structural test)", () => {
  // This test verifies the function signature accepts tenantId
  // In production, tenantId would be used for database queries
  const steps: StepForValidation[] = [
    { id: "step1", title: "Welcome" },
  ];

  const result1 = validateStepLabel("Onboarding", "step2", steps, "tenant1");
  const result2 = validateStepLabel("Onboarding", "step2", steps, "tenant2");

  // Both should pass as they're in different tenants (structurally)
  assert.ok(result1.isValid);
  assert.ok(result2.isValid);
});

test("Edge case: Label with leading/trailing whitespace", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Welcome" },
  ];

  // Whitespace should be trimmed before comparison
  const result = validateStepLabel("  Welcome  ", "step2", steps, "tenant1");

  assert.ok(!result.isValid); // Should detect as duplicate after trim
});

test("Edge case: Empty steps array", () => {
  const steps: StepForValidation[] = [];

  const result = validateStepLabel("First Step", "step1", steps, "tenant1");

  assert.ok(result.isValid);
});

test("Edge case: Undefined step ID", () => {
  const steps: StepForValidation[] = [
    { title: "Welcome" }, // No ID
  ];

  const result = validateStepLabel("New Step", undefined, steps, "tenant1");

  assert.ok(result.isValid);
});

test("Edge case: Step with both title and label", () => {
  const steps: StepForValidation[] = [
    { id: "step1", title: "Primary Title", label: "Secondary Label" },
  ];

  // Should check against title, not label
  const result = validateStepLabel("Primary Title", "step2", steps, "tenant1");

  assert.ok(!result.isValid);
});
