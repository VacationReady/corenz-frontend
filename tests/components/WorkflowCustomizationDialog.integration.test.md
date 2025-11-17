# WorkflowCustomizationDialog Integration Test

## Test Scenario: Template Selection and State Reset

This integration test verifies that the WorkflowCustomizationDialog correctly resets its state when a new template is selected.

### Setup
1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000/workflows
3. Open browser DevTools Console

### Test Execution

#### Step 1: Select First Template
1. Find a workflow template with customizable fields (e.g., "Pre-Onboarding Welcome")
2. Click the "Customize" button
3. **Verify**: Dialog opens with the first category tab selected
4. **Verify**: Workflow name shows the template name
5. **Verify**: "Activate Immediately" switch is ON

#### Step 2: Modify Fields
1. Change the "Workflow Name" to "Custom Test Name"
2. Toggle "Activate Immediately" to OFF
3. If there are tabs, click on a different tab (not the first one)
4. Modify any customization field value (e.g., change a number field)
5. **Record**: Note which tab you're on and the modified values

#### Step 3: Close Without Saving
1. Click "Cancel" or close the dialog
2. **Verify**: Dialog closes

#### Step 4: Select Different Template
1. Click "Customize" on a DIFFERENT workflow template
2. **Verify**: Dialog opens immediately
3. **Verify**: First category tab is selected (not the tab you were on before)
4. **Verify**: Workflow name shows the NEW template's name (not "Custom Test Name")
5. **Verify**: "Activate Immediately" switch is ON (reset to default)
6. **Verify**: All customization fields show default values (not your modified values)

#### Step 5: Select Same Template Again
1. Close the dialog
2. Click "Customize" on the SAME template from Step 4
3. **Verify**: All state is still reset to defaults
4. **Verify**: First tab is selected

### Expected Behavior Summary

| State Property | Before Change | After Template Change |
|---------------|---------------|----------------------|
| selectedTab | Any tab | First category tab |
| workflowName | "Custom Test Name" | New template's name |
| autoActivate | false (OFF) | true (ON) |
| customizations | Modified values | Template defaults |

### Success Criteria

✅ **PASS** if:
- First tab is always selected when opening the dialog
- Workflow name always shows the current template's name
- Auto-activate always defaults to ON
- Customization fields always show template defaults
- No errors in the browser console

❌ **FAIL** if:
- Previous tab selection persists
- Custom workflow name persists
- Auto-activate state persists
- Modified customization values persist
- Console shows errors or warnings

### Code Reference

The implementation is in:
```
app/(withSidebar)/workflows/components/WorkflowCustomizationDialog.tsx
Lines 225-237
```

The key useEffect hook:
```typescript
useEffect(() => {
  const categoryKeys = Object.keys(fieldsByCategory);
  const firstCategory = categoryKeys.length > 0 ? categoryKeys[0] : 'basic';
  
  setSelectedTab(firstCategory);
  setWorkflowName(workflow.name);
  setAutoActivate(true);
  initializeCustomizations();
}, [fieldsByCategory, workflow]);
```

### Troubleshooting

If the test fails:
1. Check browser console for errors
2. Verify the useEffect hook is present in the component
3. Ensure React DevTools shows the component re-rendering when workflow changes
4. Check that the workflow prop is actually changing (not the same object reference)

### Additional Edge Cases to Test

1. **No Customizations**: Select a template with no customizable fields
   - Should show basic settings only
   - Should display alert about default settings

2. **Single Category**: Select a template with only one category
   - Should not show tabs
   - Should show fields directly

3. **Multiple Categories**: Select a template with 3+ categories
   - Should show all category tabs
   - First tab should be selected
   - Can navigate between tabs
   - State resets when switching templates
