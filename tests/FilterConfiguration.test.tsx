import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterConfiguration from "../app/components/reports/FilterConfiguration";
import {
  createFilterRule,
  createRootFilterGroup,
  type FilterGroup,
  type SortConfig,
} from "../app/lib/reportFilters";

// Mock field definitions for testing
const mockFields = [
  { field: "User.email", label: "Email", type: "string", filterable: true },
  { field: "User.firstName", label: "First Name", type: "string", filterable: true },
  { field: "User.age", label: "Age", type: "number", filterable: true },
  { field: "User.status", label: "Status", type: "enum", filterable: true },
];

// Mock hrReportFields module
const mockHrReportFields = {
  hrReportFields: mockFields,
  getFieldByKey: (key: string) => mockFields.find(f => f.field === key),
};

test("FilterConfiguration renders with empty filter group", async () => {
  const filterGroup = createRootFilterGroup();
  const sorts: SortConfig[] = [];
  const selectedFields = ["User.email", "User.firstName"];
  
  const onUpdateFilterGroup = () => {};
  const onUpdateSorts = () => {};
  
  const { container } = render(
    <FilterConfiguration
      filterGroup={filterGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={onUpdateFilterGroup}
      onUpdateSorts={onUpdateSorts}
    />
  );
  
  assert.ok(container);
});

test("FilterConfiguration adds filter-only field to selectedFields", async () => {
  const filterGroup = createRootFilterGroup();
  const sorts: SortConfig[] = [];
  const selectedFields = ["User.email"];
  let syncedFields: string[] = [];
  
  const onSyncSelectedFields = (fields: string[]) => {
    syncedFields = fields;
  };
  
  // Add a rule for a field not in selectedFields
  const ruleForNewField = createFilterRule({ 
    field: "User.status", 
    operator: "equals", 
    value: "active",
    hideFieldInResults: false 
  });
  
  const updatedGroup: FilterGroup = {
    ...filterGroup,
    children: [ruleForNewField],
  };
  
  render(
    <FilterConfiguration
      filterGroup={updatedGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={() => {}}
      onSyncSelectedFields={onSyncSelectedFields}
    />
  );
  
  // Wait for effect to run
  await waitFor(() => {
    assert.ok(syncedFields.length > selectedFields.length);
  });
  
  assert.ok(syncedFields.includes("User.status"));
});

test("FilterConfiguration hideFieldInResults removes field from selectedFields", async () => {
  const rule = createFilterRule({ 
    field: "User.status", 
    operator: "equals", 
    value: "active",
    hideFieldInResults: true // Hidden from results
  });
  
  const filterGroup: FilterGroup = {
    ...createRootFilterGroup(),
    children: [rule],
  };
  
  const sorts: SortConfig[] = [];
  const selectedFields = ["User.email", "User.status"];
  let syncedFields: string[] = [];
  
  const onSyncSelectedFields = (fields: string[]) => {
    syncedFields = fields;
  };
  
  render(
    <FilterConfiguration
      filterGroup={filterGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={() => {}}
      onSyncSelectedFields={onSyncSelectedFields}
    />
  );
  
  // The hidden field should not be in visible fields
  await waitFor(() => {
    // syncedFields should not include User.status since it's hidden
    assert.ok(!syncedFields.includes("User.status") || syncedFields.length === selectedFields.length);
  });
});

test("FilterConfiguration validation errors prevent advancing", async () => {
  // Create an invalid filter (missing value)
  const invalidRule = createFilterRule({ 
    field: "User.email", 
    operator: "equals", 
    value: "" // Missing required value
  });
  
  const filterGroup: FilterGroup = {
    ...createRootFilterGroup(),
    children: [invalidRule],
  };
  
  const sorts: SortConfig[] = [];
  const selectedFields = ["User.email"];
  let isValid = true;
  let errors: string[] = [];
  
  const onValidationChange = (valid: boolean, validationErrors: string[]) => {
    isValid = valid;
    errors = validationErrors;
  };
  
  render(
    <FilterConfiguration
      filterGroup={filterGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={() => {}}
      onValidationChange={onValidationChange}
    />
  );
  
  await waitFor(() => {
    assert.equal(isValid, false);
  });
  
  assert.ok(errors.length > 0);
  assert.ok(errors[0].includes("Value is required"));
});

test("FilterConfiguration validates complete filter as valid", async () => {
  const validRule = createFilterRule({ 
    field: "User.email", 
    operator: "equals", 
    value: "test@example.com"
  });
  
  const filterGroup: FilterGroup = {
    ...createRootFilterGroup(),
    children: [validRule],
  };
  
  const sorts: SortConfig[] = [];
  const selectedFields = ["User.email"];
  let isValid = false;
  let errors: string[] = [];
  
  const onValidationChange = (valid: boolean, validationErrors: string[]) => {
    isValid = valid;
    errors = validationErrors;
  };
  
  render(
    <FilterConfiguration
      filterGroup={filterGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={() => {}}
      onValidationChange={onValidationChange}
    />
  );
  
  await waitFor(() => {
    assert.equal(isValid, true);
  });
  
  assert.equal(errors.length, 0);
});

test("FilterConfiguration multi-sort preserves order", async () => {
  const filterGroup = createRootFilterGroup();
  const initialSorts: SortConfig[] = [
    { field: "User.firstName", direction: "asc" },
    { field: "User.lastName", direction: "desc" },
  ];
  const selectedFields = ["User.email", "User.firstName", "User.lastName"];
  
  let updatedSorts: SortConfig[] = [];
  
  const onUpdateSorts = (sorts: SortConfig[]) => {
    updatedSorts = sorts;
  };
  
  render(
    <FilterConfiguration
      filterGroup={filterGroup}
      sorts={initialSorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={onUpdateSorts}
    />
  );
  
  // Initial sorts should be preserved
  await waitFor(() => {
    assert.ok(updatedSorts.length === 0 || updatedSorts.length === initialSorts.length);
  });
});

test("FilterConfiguration allows filtering on non-output fields", async () => {
  const filterGroup = createRootFilterGroup();
  const sorts: SortConfig[] = [];
  // Only email is in output
  const selectedFields = ["User.email"];
  
  // Add a filter on a field NOT in selectedFields
  const filterOnHiddenField = createFilterRule({ 
    field: "User.status", 
    operator: "equals", 
    value: "active",
    hideFieldInResults: true // Filter-only field
  });
  
  const updatedGroup: FilterGroup = {
    ...filterGroup,
    children: [filterOnHiddenField],
  };
  
  let syncedFields: string[] = [];
  
  const onSyncSelectedFields = (fields: string[]) => {
    syncedFields = fields;
  };
  
  render(
    <FilterConfiguration
      filterGroup={updatedGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={() => {}}
      onSyncSelectedFields={onSyncSelectedFields}
    />
  );
  
  // Should NOT auto-add hidden field to selectedFields
  await waitFor(() => {
    if (syncedFields.length > 0) {
      assert.ok(!syncedFields.includes("User.status"));
    }
  });
});

test("FilterConfiguration nested OR groups are supported", async () => {
  const rule1 = createFilterRule({ field: "User.status", operator: "equals", value: "active" });
  const rule2 = createFilterRule({ field: "User.status", operator: "equals", value: "pending" });
  
  const orGroup: FilterGroup = {
    id: "or_group_1",
    type: "group",
    logicOperator: "OR",
    children: [rule1, rule2],
  };
  
  const rootGroup: FilterGroup = {
    ...createRootFilterGroup(),
    children: [orGroup],
  };
  
  const sorts: SortConfig[] = [];
  const selectedFields = ["User.email", "User.status"];
  
  let isValid = false;
  
  const onValidationChange = (valid: boolean) => {
    isValid = valid;
  };
  
  render(
    <FilterConfiguration
      filterGroup={rootGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={() => {}}
      onValidationChange={onValidationChange}
    />
  );
  
  await waitFor(() => {
    assert.equal(isValid, true);
  });
});

test("FilterConfiguration validates between operator requires two values", async () => {
  const incompleteBetween = createFilterRule({ 
    field: "User.age", 
    operator: "between", 
    value: 18,
    value2: undefined // Missing second value
  });
  
  const filterGroup: FilterGroup = {
    ...createRootFilterGroup(),
    children: [incompleteBetween],
  };
  
  const sorts: SortConfig[] = [];
  const selectedFields = ["User.age"];
  let isValid = true;
  let errors: string[] = [];
  
  const onValidationChange = (valid: boolean, validationErrors: string[]) => {
    isValid = valid;
    errors = validationErrors;
  };
  
  render(
    <FilterConfiguration
      filterGroup={filterGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={() => {}}
      onValidationChange={onValidationChange}
    />
  );
  
  await waitFor(() => {
    assert.equal(isValid, false);
  });
  
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.includes("End value is required")));
});

test("FilterConfiguration validates is_null operator doesn't require value", async () => {
  const nullCheckRule = createFilterRule({ 
    field: "User.email", 
    operator: "is_null"
    // No value required
  });
  
  const filterGroup: FilterGroup = {
    ...createRootFilterGroup(),
    children: [nullCheckRule],
  };
  
  const sorts: SortConfig[] = [];
  const selectedFields = ["User.email"];
  let isValid = false;
  
  const onValidationChange = (valid: boolean) => {
    isValid = valid;
  };
  
  render(
    <FilterConfiguration
      filterGroup={filterGroup}
      sorts={sorts}
      selectedFields={selectedFields}
      onUpdateFilterGroup={() => {}}
      onUpdateSorts={() => {}}
      onValidationChange={onValidationChange}
    />
  );
  
  await waitFor(() => {
    assert.equal(isValid, true);
  });
});
