# WorkflowCustomizationDialog Manual Test Guide

## Purpose
This document describes manual tests to verify that the `WorkflowCustomizationDialog` component correctly resets state when the `workflow` or `fieldsByCategory` props change.

## Implementation Details

The component now includes a `useEffect` hook (lines 225-237) that watches both `fieldsByCategory` and `workflow` props:

```typescript
useEffect(() => {
  const categoryKeys = Object.keys(fieldsByCategory);
  const firstCategory = categoryKeys.length > 0 ? categoryKeys[0] : 'basic';
  
  // Reset to first available category
  setSelectedTab(firstCategory);
  
  // Reset to template defaults
  setWorkflowName(workflow.name);
  setAutoActivate(true);
  initializeCustomizations();
}, [fieldsByCategory, workflow]);
```

## Manual Test Cases

### Test 1: Initial Tab Selection
**Objective**: Verify that the first available category tab is selected immediately when opening the dialog.

**Steps**:
1. Navigate to the Workflows page (`/workflows`)
2. Click "Customize" on any workflow template that has multiple customization categories
3. Observe the dialog opens

**Expected Result**:
- The dialog should open with the first category tab already selected and visible
- The tab content should be immediately displayed without requiring user interaction

---

### Test 2: Tab Reset on Workflow Change
**Objective**: Verify that `selectedTab` resets to the first category when switching workflows.

**Steps**:
1. Open the customization dialog for a workflow with multiple categories (e.g., "Onboarding Workflow")
2. Navigate to a different tab (e.g., click on "Notifications" tab)
3. Close the dialog
4. Open the customization dialog for a different workflow
5. Observe which tab is selected

**Expected Result**:
- The first category tab should be selected, not the previously selected tab
- The tab content should match the first category of the new workflow

---

### Test 3: Workflow Name Reset
**Objective**: Verify that `workflowName` resets to the template default when the workflow changes.

**Steps**:
1. Open the customization dialog for any workflow
2. Modify the "Workflow Name" field to a custom value (e.g., "My Custom Name")
3. Close the dialog (without confirming)
4. Open the customization dialog for a different workflow
5. Check the "Workflow Name" field value

**Expected Result**:
- The "Workflow Name" field should display the new workflow's default name
- The custom name from the previous workflow should not persist

---

### Test 4: Auto-Activate Reset
**Objective**: Verify that `autoActivate` resets to `true` when the workflow changes.

**Steps**:
1. Open the customization dialog for any workflow
2. Toggle the "Activate Immediately" switch to OFF
3. Close the dialog (without confirming)
4. Open the customization dialog for a different workflow
5. Check the "Activate Immediately" switch state

**Expected Result**:
- The "Activate Immediately" switch should be ON (checked)
- The previous OFF state should not persist

---

### Test 5: Customizations Reset
**Objective**: Verify that all customization field values reset to template defaults when the workflow changes.

**Steps**:
1. Open the customization dialog for a workflow with customizable fields (e.g., "Days Before Trigger")
2. Modify one or more customization field values (e.g., change "Days Before Trigger" from 30 to 60)
3. Close the dialog (without confirming)
4. Open the customization dialog for the same or different workflow
5. Check the customization field values

**Expected Result**:
- All customization fields should display their default values from the workflow template
- Modified values from the previous session should not persist

---

### Test 6: Category-less Workflow Handling
**Objective**: Verify graceful handling when a workflow has no customization categories.

**Steps**:
1. Open the customization dialog for a workflow with no customizable fields
2. Observe the dialog content

**Expected Result**:
- The dialog should display basic settings (Workflow Name, Activate Immediately)
- An alert message should indicate "This workflow will be added with default settings"
- No tabs should be displayed
- No errors should occur

---

### Test 7: Single Category Workflow
**Objective**: Verify correct behavior when a workflow has only one customization category.

**Steps**:
1. Open the customization dialog for a workflow with only one category of customizable fields
2. Observe the dialog layout

**Expected Result**:
- Customization fields should be displayed without tabs
- All fields should be visible in a single list
- The component should not crash or show empty content

---

### Test 8: Rapid Workflow Switching
**Objective**: Verify state consistency when rapidly switching between workflows.

**Steps**:
1. Open the customization dialog for Workflow A
2. Modify some fields
3. Close the dialog
4. Immediately open the customization dialog for Workflow B
5. Close and open for Workflow C
6. Return to Workflow A

**Expected Result**:
- Each time a workflow is opened, it should show its default values
- No state from previous workflows should leak through
- The correct first tab should be selected for each workflow

---

## Automated Test Coverage

While manual testing is recommended due to the complexity of the component's dependencies, automated tests have been created in `tests/components/WorkflowCustomizationDialog.test.tsx` that cover:

1. ✅ Reset selectedTab to first category when workflow changes
2. ✅ Reset workflowName to template default when workflow changes
3. ✅ Reset autoActivate to true when workflow changes
4. ✅ Reset customizations when workflow changes
5. ✅ Show first available category tab immediately after selecting template
6. ✅ Handle workflow with no customizations gracefully
7. ✅ Preserve dialog functionality after workflow change
8. ✅ Reset to 'basic' tab when fieldsByCategory is empty

## Notes

- The `useEffect` dependency array includes both `fieldsByCategory` and `workflow` to ensure state resets whenever either changes
- The `initializeCustomizations()` function is called within the effect to reset customization values to defaults
- The fallback to `'basic'` ensures the component doesn't break when no categories are available
