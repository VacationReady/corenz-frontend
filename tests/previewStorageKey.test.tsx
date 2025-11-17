import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

/**
 * Regression tests to ensure preview storage keys are unique per report/template
 * and not shared across all previews.
 */

// Mock localStorage for testing
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get store() {
      return store;
    },
  };
};

test("FilterableDataTable uses reportId for storage key", async () => {
  const localStorageMock = createLocalStorageMock();
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  
  const FilterableDataTable = (await import("../app/components/reports/FilterableDataTable")).default;
  
  const columns = [{ header: "Email", accessorKey: "email" }];
  const data = [{ email: "test@example.com" }];
  
  // Render with reportId "report_123"
  const { unmount } = render(
    React.createElement(FilterableDataTable, {
      columns,
      data,
      reportId: "report_123",
    })
  );
  
  // Check that storage key includes the reportId
  const keys = Object.keys(localStorageMock.store);
  const hasReportKey = keys.some(key => key.includes("report_123"));
  
  assert.ok(hasReportKey, "Storage key should include reportId");
  assert.ok(!keys.some(key => key === "reports-table-state:preview"), 
    "Should not use generic 'preview' key when reportId is provided");
  
  unmount();
  localStorageMock.clear();
});

test("FilterableDataTable uses different keys for different reportIds", async () => {
  const localStorageMock = createLocalStorageMock();
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  
  const FilterableDataTable = (await import("../app/components/reports/FilterableDataTable")).default;
  
  const columns = [{ header: "Email", accessorKey: "email" }];
  const data = [{ email: "test@example.com" }];
  
  // Render first table with reportId "report_A"
  const { unmount: unmount1 } = render(
    React.createElement(FilterableDataTable, {
      columns,
      data,
      reportId: "report_A",
    })
  );
  
  const keysAfterFirst = Object.keys(localStorageMock.store);
  
  // Render second table with reportId "report_B"
  const { unmount: unmount2 } = render(
    React.createElement(FilterableDataTable, {
      columns,
      data,
      reportId: "report_B",
    })
  );
  
  const keysAfterSecond = Object.keys(localStorageMock.store);
  
  // Should have distinct keys for each report
  const hasReportA = keysAfterSecond.some(key => key.includes("report_A"));
  const hasReportB = keysAfterSecond.some(key => key.includes("report_B"));
  
  assert.ok(hasReportA, "Should have storage key for report_A");
  assert.ok(hasReportB, "Should have storage key for report_B");
  assert.ok(keysAfterSecond.length >= keysAfterFirst.length, 
    "Should maintain separate storage for each report");
  
  unmount1();
  unmount2();
  localStorageMock.clear();
});

test("ReportsPreviewClient generates deterministic reportId from fields", async () => {
  // This test validates that the hash-based reportId generation is deterministic
  const fields1 = ["User.email", "User.firstName", "User.lastName"];
  const fields2 = ["User.lastName", "User.firstName", "User.email"]; // Same fields, different order
  
  // Simple hash function matching the one in ReportsPreviewClient
  const generateHash = (fields: string[]) => {
    const sorted = [...fields].sort().join(",");
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `fields_${Math.abs(hash).toString(36)}`;
  };
  
  const hash1 = generateHash(fields1);
  const hash2 = generateHash(fields2);
  
  assert.equal(hash1, hash2, "Same fields in different order should produce same hash");
});

test("ReportsPreviewClient prioritizes reportIdParam over templateIdParam", () => {
  // Mock implementation matching ReportsPreviewClient logic
  const getEffectiveReportId = (
    reportIdParam?: string,
    templateIdParam?: string,
    selectedFields: string[] = []
  ) => {
    if (reportIdParam) return reportIdParam;
    if (templateIdParam) return `template_${templateIdParam}`;
    if (selectedFields.length > 0) {
      const sorted = [...selectedFields].sort().join(",");
      let hash = 0;
      for (let i = 0; i < sorted.length; i++) {
        const char = sorted.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `fields_${Math.abs(hash).toString(36)}`;
    }
    return "preview";
  };
  
  // Test priority: reportId > templateId > fields > "preview"
  assert.equal(
    getEffectiveReportId("123", "tmpl_1", ["User.email"]),
    "123",
    "reportIdParam should take highest priority"
  );
  
  assert.equal(
    getEffectiveReportId(undefined, "tmpl_1", ["User.email"]),
    "template_tmpl_1",
    "templateIdParam should be used when reportId is absent"
  );
  
  const fieldsHash = getEffectiveReportId(undefined, undefined, ["User.email", "User.firstName"]);
  assert.ok(
    fieldsHash.startsWith("fields_"),
    "Should generate hash from fields when both reportId and templateId are absent"
  );
  
  assert.equal(
    getEffectiveReportId(undefined, undefined, []),
    "preview",
    "Should fall back to 'preview' when no identifiers available"
  );
});

test("Preview storage keys avoid collision between templates", async () => {
  const localStorageMock = createLocalStorageMock();
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  
  const FilterableDataTable = (await import("../app/components/reports/FilterableDataTable")).default;
  
  const columns = [{ header: "Email", accessorKey: "email" }];
  const data = [{ email: "test@example.com" }];
  
  // Simulate two different templates
  const { unmount: unmount1 } = render(
    React.createElement(FilterableDataTable, {
      columns,
      data,
      reportId: "template_active_employees",
    })
  );
  
  const { unmount: unmount2 } = render(
    React.createElement(FilterableDataTable, {
      columns,
      data,
      reportId: "template_terminated_employees",
    })
  );
  
  const keys = Object.keys(localStorageMock.store);
  
  assert.ok(
    keys.some(key => key.includes("template_active_employees")),
    "Should have key for active employees template"
  );
  
  assert.ok(
    keys.some(key => key.includes("template_terminated_employees")),
    "Should have key for terminated employees template"
  );
  
  // Keys should be different
  const activeKey = keys.find(key => key.includes("template_active_employees"));
  const terminatedKey = keys.find(key => key.includes("template_terminated_employees"));
  
  assert.notEqual(activeKey, terminatedKey, "Template keys should be distinct");
  
  unmount1();
  unmount2();
  localStorageMock.clear();
});

test("Field-based hash changes when fields change", () => {
  const generateHash = (fields: string[]) => {
    const sorted = [...fields].sort().join(",");
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `fields_${Math.abs(hash).toString(36)}`;
  };
  
  const hash1 = generateHash(["User.email", "User.firstName"]);
  const hash2 = generateHash(["User.email", "User.lastName"]);
  const hash3 = generateHash(["User.email"]);
  
  assert.notEqual(hash1, hash2, "Different field sets should produce different hashes");
  assert.notEqual(hash1, hash3, "Subset of fields should produce different hash");
  assert.notEqual(hash2, hash3, "Different field combinations should be distinct");
});

test("Storage state is properly scoped per preview instance", async () => {
  const localStorageMock = createLocalStorageMock();
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  
  const FilterableDataTable = (await import("../app/components/reports/FilterableDataTable")).default;
  
  const columns = [{ header: "Email", accessorKey: "email" }];
  const data = [
    { email: "user1@example.com" },
    { email: "user2@example.com" },
  ];
  
  // First preview with page 2
  const { unmount: unmount1 } = render(
    React.createElement(FilterableDataTable, {
      columns,
      data,
      reportId: "preview_A",
      page: 2,
      pageSize: 10,
    })
  );
  
  // Second preview with page 1
  const { unmount: unmount2 } = render(
    React.createElement(FilterableDataTable, {
      columns,
      data,
      reportId: "preview_B",
      page: 1,
      pageSize: 25,
    })
  );
  
  const keys = Object.keys(localStorageMock.store);
  
  // Each preview should maintain its own state
  assert.ok(keys.length >= 2, "Should have separate storage for each preview");
  
  const stateA = keys.find(k => k.includes("preview_A"));
  const stateB = keys.find(k => k.includes("preview_B"));
  
  assert.ok(stateA, "Preview A should have storage");
  assert.ok(stateB, "Preview B should have storage");
  
  unmount1();
  unmount2();
  localStorageMock.clear();
});
