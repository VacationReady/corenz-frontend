/**
 * Template Title Validation Tests
 * 
 * Verifies that:
 * 1. Empty step titles are rejected before save
 * 2. Duplicate step titles are rejected before save
 * 3. Admin-controlled labels are preserved exactly (no index appending)
 * 4. Validation errors provide clear, actionable feedback
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import { mapSteps } from "../app/api/onboarding/templates/stepMapper";

test("Title validation in template mapper", async (t) => {
  const run = async (name: string, fn: () => void | Promise<void>) => {
    await t.test(name, fn);
  };

  await run("rejects empty step titles", () => {
    const stepsWithEmptyTitles = [
      { type: "payroll-setup", title: "Payroll Setup", description: "Setup payroll" },
      { type: "fill-form", title: "", description: "Fill form" }, // Empty title
      { type: "equipment-checklist", title: "Equipment", description: "Sign off" },
    ];

    assert.throws(
      () => mapSteps(stepsWithEmptyTitles),
      /Steps 2 have empty labels/,
      "Should throw error for empty title at position 2",
    );
  });

  await run("rejects multiple empty step titles", () => {
    const stepsWithMultipleEmptyTitles = [
      { type: "payroll-setup", title: "", description: "Setup payroll" },
      { type: "fill-form", title: "Form", description: "Fill form" },
      { type: "equipment-checklist", title: "", description: "Sign off" },
    ];

    assert.throws(
      () => mapSteps(stepsWithMultipleEmptyTitles),
      /Steps 1, 3 have empty labels/,
      "Should throw error listing all positions with empty titles",
    );
  });

  await run("rejects duplicate step titles", () => {
    const stepsWithDuplicates = [
      { type: "payroll-setup", title: "Complete Setup", description: "Payroll" },
      { type: "fill-form", title: "Complete Setup", description: "Form" }, // Duplicate
      { type: "equipment-checklist", title: "Equipment", description: "Gear" },
    ];

    assert.throws(
      () => mapSteps(stepsWithDuplicates),
      /Duplicate step labels detected: Complete Setup/,
      "Should throw error for duplicate title 'Complete Setup'",
    );
  });

  await run("rejects multiple sets of duplicate titles", () => {
    const stepsWithMultipleDuplicates = [
      { type: "payroll-setup", title: "Setup", description: "Payroll" },
      { type: "fill-form", title: "Setup", description: "Form" }, // Duplicate 1
      { type: "equipment-checklist", title: "Review", description: "Equipment" },
      { type: "upload-document", title: "Review", description: "Documents" }, // Duplicate 2
    ];

    let capturedError: any = null;
    assert.throws(
      () => {
        try {
          mapSteps(stepsWithMultipleDuplicates);
        } catch (err: any) {
          capturedError = err;
          throw err;
        }
      },
      /Duplicate step labels detected:/,
      "Should throw error for multiple duplicate titles",
    );

    // Verify both duplicates are mentioned
    assert.ok(capturedError, "Expected an error to be captured");
    assert.ok(
      capturedError.message.includes("Setup"),
      "Error should mention 'Setup' as duplicate",
    );
    assert.ok(
      capturedError.message.includes("Review"),
      "Error should mention 'Review' as duplicate",
    );
  });

  await run("preserves admin titles exactly without appending indices", () => {
    const steps = [
      { type: "payroll-setup", title: "Complete IRD Number", description: "IRD details" },
      { type: "fill-form", title: "Enter Personal Details", description: "Name, address" },
      { type: "equipment-checklist", title: "Sign Equipment Form", description: "Laptop" },
    ];

    const mapped = mapSteps(steps);

    assert.equal(mapped.length, 3, "Should map all 3 steps");
    assert.equal(
      mapped[0].label,
      "Complete IRD Number",
      "Step 1 label should match exactly",
    );
    assert.equal(
      mapped[1].label,
      "Enter Personal Details",
      "Step 2 label should match exactly",
    );
    assert.equal(
      mapped[2].label,
      "Sign Equipment Form",
      "Step 3 label should match exactly",
    );

    // Verify no indices were appended
    assert.ok(
      !mapped[0].label.includes("1"),
      "Label should not include step index",
    );
    assert.ok(
      !mapped[1].label.includes("2"),
      "Label should not include step index",
    );
    assert.ok(
      !mapped[2].label.includes("3"),
      "Label should not include step index",
    );
  });

  await run("handles whitespace-only titles as empty", () => {
    const stepsWithWhitespace = [
      { type: "payroll-setup", title: "  ", description: "Setup" }, // Whitespace only
      { type: "fill-form", title: "\t\n", description: "Form" }, // Tabs and newlines
    ];

    assert.throws(
      () => mapSteps(stepsWithWhitespace),
      /have empty labels/,
      "Should treat whitespace-only titles as empty",
    );
  });

  await run("accepts unique non-empty titles", () => {
    const validSteps = [
      { type: "payroll-setup", title: "Complete Payroll Setup", description: "Setup" },
      { type: "fill-form", title: "Personal Information Form", description: "Form" },
      { type: "equipment-checklist", title: "Equipment Checklist", description: "Items" },
      { type: "upload-document", title: "Upload Passport", description: "Passport", uploadType: "passport" },
      { type: "acknowledge-document", title: "Review Company Policy", description: "Policy", documentId: "doc1" },
    ];

    const mapped = mapSteps(validSteps);

    assert.equal(mapped.length, 5, "Should successfully map all 5 steps");
    
    // Verify all labels are preserved
    assert.equal(mapped[0].label, "Complete Payroll Setup");
    assert.equal(mapped[1].label, "Personal Information Form");
    assert.equal(mapped[2].label, "Equipment Checklist");
    assert.equal(mapped[3].label, "Upload Passport");
    assert.equal(mapped[4].label, "Review Company Policy");
  });

  await run("case-sensitive duplicate detection", () => {
    // These should be treated as duplicates (case-sensitive)
    const stepsWithCaseDuplicates = [
      { type: "payroll-setup", title: "Complete Setup", description: "Setup" },
      { type: "fill-form", title: "Complete Setup", description: "Form" },
    ];

    assert.throws(
      () => mapSteps(stepsWithCaseDuplicates),
      /Duplicate step labels detected/,
      "Should detect exact case-sensitive duplicates",
    );

    // These should be allowed (different case)
    const stepsWithDifferentCase = [
      { type: "payroll-setup", title: "Complete Setup", description: "Setup" },
      { type: "fill-form", title: "complete setup", description: "Form" },
    ];

    assert.doesNotThrow(
      () => mapSteps(stepsWithDifferentCase),
      "Should allow titles that differ only in case",
    );
  });

  await run("preserves metadata when validating titles", () => {
    const stepsWithMetadata = [
      {
        type: "payroll-setup",
        title: "NZ Payroll",
        description: "IRD details",
        metadata: {
          fields: [
            {
              id: "irdNumber",
              label: "IRD number",
              placeholder: "123-456-789",
              required: true,
              fieldType: "irdNumber",
            },
            {
              id: "taxCode",
              label: "Tax code",
              placeholder: "e.g. M SL",
              required: true,
              fieldType: "text",
            },
          ],
          presetSlug: "nz-ird-number",
          tenantScope: ["company1"],
        },
      },
    ];

    const mapped = mapSteps(stepsWithMetadata);

    assert.equal(mapped.length, 1, "Should map step");
    assert.equal(mapped[0].label, "NZ Payroll", "Label should be preserved");
    const mappedMetadata: any = mapped[0].metadata;
    assert.ok(mappedMetadata, "Metadata should be present");
    assert.ok(Array.isArray(mappedMetadata.fields), "Fields should be an array");
    assert.equal(mappedMetadata.fields.length, 2, "Should have 2 fields");
    
    // Verify normalized fields contain expected IDs
    const fieldIds = mappedMetadata.fields.map((f: any) => f.id);
    assert.ok(fieldIds.includes("irdNumber"), "Should include irdNumber field");
    assert.ok(fieldIds.includes("taxCode"), "Should include taxCode field");
    
    assert.equal(
      mappedMetadata.presetSlug,
      "nz-ird-number",
      "Preset slug should be preserved",
    );
  });

  await run("handles label property as fallback to title", () => {
    const stepsWithLabel = [
      { type: "payroll-setup", label: "Payroll from label", description: "Setup" },
      { type: "fill-form", title: "Form from title", description: "Form" },
    ];

    const mapped = mapSteps(stepsWithLabel);

    assert.equal(mapped.length, 2, "Should map both steps");
    assert.equal(
      mapped[0].label,
      "Payroll from label",
      "Should use label property when title is missing",
    );
    assert.equal(
      mapped[1].label,
      "Form from title",
      "Should use title property when present",
    );
  });
});
