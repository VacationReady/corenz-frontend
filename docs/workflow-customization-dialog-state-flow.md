# WorkflowCustomizationDialog State Flow

## Component State Reset Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Actions                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  User clicks "Customize" on Template   │
         └────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  Parent passes new `workflow` prop     │
         └────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              WorkflowCustomizationDialog                     │
│                                                              │
│  1. workflow prop changes                                   │
│  2. getCustomizationFields() runs                           │
│  3. fieldsByCategory is recalculated                        │
│  4. useEffect detects changes                               │
│                                                              │
│  useEffect([fieldsByCategory, workflow]) {                  │
│    ┌──────────────────────────────────────────┐            │
│    │ Reset Logic                               │            │
│    ├──────────────────────────────────────────┤            │
│    │ • selectedTab → first category           │            │
│    │ • workflowName → workflow.name           │            │
│    │ • autoActivate → true                    │            │
│    │ • customizations → defaults              │            │
│    └──────────────────────────────────────────┘            │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  Dialog renders with reset state       │
         │  • First tab selected                  │
         │  • Template name shown                 │
         │  • Auto-activate ON                    │
         │  • Default field values                │
         └────────────────────────────────────────┘
```

## State Lifecycle

### Initial Render
```
workflow prop → getCustomizationFields() → fieldsByCategory
                                                   │
                                                   ▼
                                          useEffect triggers
                                                   │
                                                   ▼
                                          State initialized
```

### Template Change
```
New workflow prop → fieldsByCategory recalculates
                              │
                              ▼
                    useEffect detects change
                              │
                              ▼
                    All state resets to defaults
                              │
                              ▼
                    Component re-renders
```

## State Variables

| Variable | Type | Default | Reset Trigger |
|----------|------|---------|---------------|
| `selectedTab` | string | 'basic' | workflow or fieldsByCategory change |
| `workflowName` | string | workflow.name | workflow change |
| `autoActivate` | boolean | true | workflow change |
| `customizations` | Record<string, any> | {} | workflow change |

## Dependencies

```
useEffect dependencies: [fieldsByCategory, workflow]
                              │              │
                              │              └─ Direct prop
                              │
                              └─ Derived from workflow.nodes
```

### Why Both Dependencies?

1. **`workflow`**: Ensures reset when template changes
2. **`fieldsByCategory`**: Ensures reset if field structure changes independently

## Example Scenarios

### Scenario 1: User switches templates
```
Template A (3 categories) → User on tab 2 → Switch to Template B
                                                      │
                                                      ▼
                                            Reset to tab 1 of Template B
```

### Scenario 2: User modifies fields
```
Template A → User changes name to "Custom" → Close dialog → Reopen Template A
                                                                    │
                                                                    ▼
                                                          Name resets to "Template A"
```

### Scenario 3: No customizations
```
Template with no fields → fieldsByCategory = {} → selectedTab = 'basic'
                                                         │
                                                         ▼
                                                Shows basic settings only
```

## Edge Cases Handled

1. **Empty categories**: Falls back to 'basic' tab
2. **Single category**: No tabs shown, fields displayed directly
3. **Rapid switching**: Each change triggers reset
4. **Same template reopened**: State still resets to defaults

## Testing Checkpoints

- [ ] First tab selected on dialog open
- [ ] Workflow name shows template default
- [ ] Auto-activate is ON
- [ ] Customization fields show defaults
- [ ] State resets when switching templates
- [ ] No errors in console
- [ ] Smooth UX without flicker

## Code References

**Component**: `app/(withSidebar)/workflows/components/WorkflowCustomizationDialog.tsx`

**Key sections**:
- Lines 217-223: `fieldsByCategory` calculation
- Lines 225-237: State reset `useEffect`
- Lines 62-65: State declarations
- Lines 77-96: `initializeCustomizations()` function

**Parent component**: `app/(withSidebar)/workflows/page.tsx`
- Lines 85: `customizeWorkflow` state
- Lines 665-672: Dialog usage
