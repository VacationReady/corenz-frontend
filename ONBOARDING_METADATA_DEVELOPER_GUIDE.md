# Onboarding Metadata Developer Guide

**Quick Reference for Working with Onboarding Metadata**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Adding a New Step Type](#adding-a-new-step-type)
3. [Modifying Existing Metadata](#modifying-existing-metadata)
4. [Troubleshooting](#troubleshooting)
5. [Testing Changes](#testing-changes)
6. [Common Patterns](#common-patterns)

---

## Quick Start

### Understanding the Flow

```
User Edits Template → MetadataPanel → OnboardingTemplateEditor → API
                                                                    ↓
Employee Views Step ← OnboardingStepRenderer ← Instance API ← Database
```

### Key Files

| Purpose | File | Lines of Interest |
|---------|------|-------------------|
| Metadata definitions | `app/lib/onboarding/stepMetadata.ts` | 128-804 |
| API GET handler | `app/api/onboarding/templates/route.ts` | 10-53 |
| API PUT handler | `app/api/onboarding/templates/actions.ts` | 172-253 |
| React editor | `app/components/onboarding/OnboardingTemplateEditor.tsx` | 1281-1423 |
| Metadata panel | `app/components/onboarding/builder/MetadataPanel.tsx` | 532-916 |
| Employee renderer | `app/components/onboarding/OnboardingStepRenderer.tsx` | 1-1453 |

---

## Adding a New Step Type

### Step 1: Define Metadata Schema

**File**: `app/lib/onboarding/stepMetadata.ts`

Add to `metadataDefinitions` object:

```typescript
"my-new-step": {
  defaults: () => ({
    myField: "default value",
    myItems: [
      { id: "item-1", label: "First Item" }
    ],
  }),
  normalize: (value: unknown) => {
    const base = (typeof value === "object" && value) || {};
    const myItems = ensureArray<MyItemType>((base as any).myItems).map(
      (item, index) => ({
        id: asTrimmedString(item?.id, createStableId("item", index)),
        label: asTrimmedString(item?.label, `Item ${index + 1}`),
      }),
    );
    return {
      myField: asString((base as any).myField, ""),
      myItems,
    };
  },
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    additionalProperties: false,
    properties: {
      myField: {
        type: "string",
        description: "My custom field",
      },
      myItems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
          },
        },
      },
    },
  },
},
```

### Step 2: Add to Step Palette

**File**: `app/components/onboarding/OnboardingTemplateEditor.tsx`

Add to `STEP_TYPES` array (Lines 79-96):

```typescript
{ value: "my-new-step", label: "My New Step", icon: SomeIcon },
```

### Step 3: Create Metadata Editor

**File**: `app/components/onboarding/builder/MetadataPanel.tsx`

Add to `metadataConfigs` object (Lines 532-916):

```typescript
"my-new-step": {
  type: "my-new-step",
  title: "My New Step Configuration",
  description: "Configure settings for my new step",
  defaults: () => getDefaultMetadataForStepBase("my-new-step"),
  normalize: (value: unknown) =>
    normalizeStepMetadataBase("my-new-step", value),
  schema: onboardingStepMetadataSchemas["my-new-step"],
  Editor: ({ value, onChange }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>My Field</Label>
        <Input
          value={value.myField}
          onChange={(e) => onChange({ ...value, myField: e.target.value })}
        />
      </div>
      {/* Add more UI components for other fields */}
    </div>
  ),
},
```

### Step 4: Add Database Enum

**File**: `prisma/schema.prisma`

Add to `OnboardingStepType` enum:

```prisma
enum OnboardingStepType {
  // ... existing types
  MY_NEW_STEP
}
```

Run migration:
```bash
npx prisma migrate dev --name add_my_new_step
```

### Step 5: Add Type Mapping

**File**: `app/lib/onboarding/stepTypeMapping.ts`

Add to mappings:

```typescript
export const UI_TO_DB_STEP_TYPE: Record<string, string> = {
  // ... existing mappings
  "my-new-step": "MY_NEW_STEP",
};

export const DB_TO_UI_STEP_TYPE: Record<string, string> = {
  // ... existing mappings
  MY_NEW_STEP: "my-new-step",
};
```

### Step 6: Add Employee Renderer

**File**: `app/components/onboarding/OnboardingStepRenderer.tsx`

Add rendering logic:

```typescript
if (stepType === "my-new-step") {
  const myField = (metadata as any).myField || "";
  const myItems = parseChecklist((metadata as any).myItems);
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{step.label}</h3>
      <p className="text-sm text-muted-foreground mb-4">{myField}</p>
      
      {myItems.map((item) => (
        <div key={item.id} className="flex items-center gap-2 mb-2">
          <Checkbox checked={item.completed} />
          <span>{item.label}</span>
        </div>
      ))}
      
      <Button onClick={() => onComplete({ myField, myItems })} className="mt-4">
        Complete
      </Button>
    </Card>
  );
}
```

### Step 7: Add Cypress Test

**File**: `tests/e2e/onboarding-metadata-persistence.cy.ts`

Add test case:

```typescript
it('should persist metadata for my-new-step', () => {
  cy.contains('button', 'New Template').click();
  cy.get('input[placeholder*="Template Name"]').type('My New Step Test');
  
  cy.contains('button', 'Add Step').click();
  cy.contains('button', 'My New Step').click();
  
  cy.get('[data-testid="step-editor"]').first().within(() => {
    cy.get('input').first().clear().type('Custom Value');
  });
  
  cy.contains('button', 'Publish').click();
  cy.contains('Template published!').should('be.visible');
  
  // Reload and verify
  cy.reload();
  cy.wait(1000);
  cy.get('[data-testid="template-row"]').first().within(() => {
    cy.get('button[aria-label="Edit"]').click();
  });
  
  cy.get('[data-testid="step-editor"]').first().within(() => {
    cy.contains('Custom Value').should('exist');
  });
});
```

---

## Modifying Existing Metadata

### Changing Field Types

**Example**: Adding a new field to `payroll-setup`

1. **Update defaults** in `stepMetadata.ts`:
```typescript
defaults: () => ({
  instructions: "...",
  fields: [
    // ... existing fields
    {
      id: "newField",
      label: "New Field",
      required: false,
      fieldType: "text",
    },
  ],
}),
```

2. **Update normalize** to handle the new field:
```typescript
normalize: (value: unknown) => {
  const base = (typeof value === "object" && value) || {};
  const fields = ensureArray<PayrollField>((base as any).fields).map(
    (field, index) => {
      // ... existing logic
      return {
        // ... existing fields
        newField: asString(field?.newField, ""), // Add new field
      };
    },
  );
  return { instructions: asString((base as any).instructions, ""), fields };
},
```

3. **Update schema**:
```typescript
schema: {
  properties: {
    fields: {
      items: {
        properties: {
          // ... existing properties
          newField: { type: "string" },
        },
      },
    },
  },
},
```

4. **Update editor UI** in `MetadataPanel.tsx`:
```typescript
<div>
  <Label>New Field</Label>
  <Input
    value={field.newField || ""}
    onChange={(e) => updateField(index, { newField: e.target.value })}
  />
</div>
```

5. **Run migration** to update existing data:
```bash
npx tsx scripts/backfill-onboarding-metadata.ts
```

---

## Troubleshooting

### Issue: Metadata not persisting after save

**Check**:
1. Is `normalizeStepMetadata()` being called in the save flow?
   ```typescript
   metadata: normalizeStepMetadata(s.type, s.metadata), // Line 1326
   ```

2. Is the API returning the saved template?
   ```typescript
   const hydrated = hydrateTemplateSteps(payload); // Line 1370
   setSteps(hydrated);
   ```

3. Check browser console for errors during save

4. Verify database contains the metadata:
   ```sql
   SELECT metadata FROM "OnboardingStep" WHERE id = 'step_id';
   ```

### Issue: Default values overriding saved data

**Check**:
1. Hydration should use DB values:
   ```typescript
   metadata: normalizeStepMetadata(uiType, step.metadata), // NOT getDefaultMetadataForStep()
   ```

2. Normalize function should preserve existing values:
   ```typescript
   asTrimmedString(item?.label, `Item ${index + 1}`) // Uses item.label if present
   ```

3. Check if `getDefaultMetadataForStep()` is being called during hydration (it shouldn't be)

### Issue: Metadata mutating between steps

**Check**:
1. Deep clone is being used in MetadataPanel:
   ```typescript
   return clone(hydrated); // Line 323
   ```

2. onChange also clones:
   ```typescript
   onChange(clone(config.normalize(next))); // Line 333
   ```

3. Check browser console for `structuredClone is not a function` errors

### Issue: Cross-tenant data leakage

**Check**:
1. API filters by `companyId`:
   ```typescript
   where: { companyId: session.user.companyId }
   ```

2. Template validation:
   ```typescript
   if (template.companyId !== session.user.companyId) {
     return NextResponse.json({ error: "Template not found" }, { status: 404 });
   }
   ```

3. Resource scoping validation is called:
   ```typescript
   await validateScopedResources(session.user.companyId, prismaClient, {
     departmentIds,
     jobRoleIds,
     steps: normalizedSteps,
   });
   ```

### Issue: Concurrent edit conflicts not detected

**Check**:
1. `lastKnownUpdatedAt` is being sent:
   ```typescript
   lastKnownUpdatedAt: serverVersionRef.current, // Line 1329
   ```

2. API is validating timestamps:
   ```typescript
   if (existingTemplate.updatedAt.getTime() !== baseline.getTime()) {
     throw new TemplateConflictError(...);
   }
   ```

3. Conflict state is being handled:
   ```typescript
   if (res.status === 409 && payload?.latestTemplate) {
     setConflictState({ ... });
   }
   ```

---

## Testing Changes

### Unit Tests

Run metadata normalization tests:
```bash
npm test -- stepMetadata.test.ts
```

### E2E Tests

Run full Cypress suite:
```bash
npm run cypress:run
```

Run specific test:
```bash
npm run cypress:run -- --spec "tests/e2e/onboarding-metadata-persistence.cy.ts"
```

### Manual Testing Checklist

1. **Create Template**
   - [ ] Add step with metadata
   - [ ] Edit metadata fields
   - [ ] Save template

2. **Persistence**
   - [ ] Reload page
   - [ ] Edit template again
   - [ ] Verify all metadata fields preserved

3. **Multi-Tenant**
   - [ ] Create template in Tenant A
   - [ ] Switch to Tenant B
   - [ ] Verify Tenant A template not visible

4. **Deep Cloning**
   - [ ] Add two steps of same type
   - [ ] Edit metadata in step 1
   - [ ] Verify step 2 metadata unchanged

5. **Employee Renderer**
   - [ ] Assign template to employee
   - [ ] Open employee onboarding
   - [ ] Verify metadata renders correctly

6. **Conflict Resolution**
   - [ ] Open template in two browser tabs
   - [ ] Save in tab 1
   - [ ] Try to save in tab 2
   - [ ] Verify conflict warning appears

---

## Common Patterns

### Pattern 1: Adding a Checklist-Style Field

```typescript
// In stepMetadata.ts
myItems: ensureArray<ChecklistItem>((base as any).myItems).map(
  (item, index) => ({
    id: asTrimmedString(item?.id, createStableId("item", index)),
    label: asTrimmedString(item?.label, `Item ${index + 1}`),
    required: asBoolean(item?.required, true),
    notes: asString(item?.notes, ""),
  }),
);
```

```typescript
// In MetadataPanel.tsx
<EditableChecklist
  items={value.myItems}
  onChange={(myItems) => onChange({ ...value, myItems })}
  addLabel="Add item"
  allowNotes
  emptyLabel="No items configured yet."
  itemLabel="Item"
/>
```

### Pattern 2: Adding a Simple Text Field

```typescript
// In stepMetadata.ts
myField: asString((base as any).myField, "default value"),
```

```typescript
// In MetadataPanel.tsx
<div className="space-y-2">
  <Label>My Field</Label>
  <Input
    value={value.myField}
    onChange={(e) => onChange({ ...value, myField: e.target.value })}
  />
</div>
```

### Pattern 3: Adding a Dropdown Field

```typescript
// In stepMetadata.ts
myOption: asTrimmedString((base as any).myOption, "option1"),
```

```typescript
// In MetadataPanel.tsx
<div className="space-y-2">
  <Label>My Option</Label>
  <select
    className="w-full rounded-md border p-2"
    value={value.myOption}
    onChange={(e) => onChange({ ...value, myOption: e.target.value })}
  >
    <option value="option1">Option 1</option>
    <option value="option2">Option 2</option>
    <option value="option3">Option 3</option>
  </select>
</div>
```

### Pattern 4: Adding a Rich Text Field

```typescript
// In stepMetadata.ts
myRichText: asString((base as any).myRichText, ""),
```

```typescript
// In MetadataPanel.tsx
<div className="space-y-2">
  <Label>My Rich Text</Label>
  <Textarea
    rows={5}
    value={value.myRichText}
    onChange={(e) => onChange({ ...value, myRichText: e.target.value })}
    placeholder="Enter formatted text..."
  />
</div>
```

### Pattern 5: Conditional Fields

```typescript
// In MetadataPanel.tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label>Enable Feature</Label>
    <Checkbox
      checked={value.featureEnabled}
      onCheckedChange={(checked) =>
        onChange({ ...value, featureEnabled: checked === true })
      }
    />
  </div>
  
  {value.featureEnabled && (
    <div className="space-y-2">
      <Label>Feature Settings</Label>
      <Input
        value={value.featureSettings}
        onChange={(e) => onChange({ ...value, featureSettings: e.target.value })}
      />
    </div>
  )}
</div>
```

---

## Best Practices

### 1. Always Use Normalization Helpers

❌ **Bad**:
```typescript
const label = value.label || "Default";
```

✅ **Good**:
```typescript
const label = asTrimmedString(value?.label, "Default");
```

### 2. Preserve IDs with createStableId

❌ **Bad**:
```typescript
id: `item-${index}` // Changes if items are reordered
```

✅ **Good**:
```typescript
id: asTrimmedString(item?.id, createStableId("item", index))
```

### 3. Always Clone Before Mutating

❌ **Bad**:
```typescript
onChange({ ...value, field: newValue }); // Shallow copy
```

✅ **Good**:
```typescript
onChange(clone({ ...value, field: newValue })); // Deep clone
```

### 4. Test Multi-Tenant Isolation

Always add a test case that:
1. Creates data in Tenant A
2. Switches to Tenant B
3. Verifies Tenant A data is not visible

### 5. Document Schema Changes

When adding new fields:
1. Update `ONBOARDING_METADATA_SCHEMAS.md`
2. Add to the 16 step types table
3. Include validation rules if applicable

---

## Performance Tips

### 1. Use useMemo for Heavy Computations

```typescript
const normalized = useMemo(() => {
  return clone(config.normalize(value));
}, [config, value]);
```

### 2. Debounce onChange Handlers

```typescript
const [debouncedValue, setDebouncedValue] = useState(value);

useEffect(() => {
  const timer = setTimeout(() => {
    onChange(debouncedValue);
  }, 300);
  return () => clearTimeout(timer);
}, [debouncedValue]);
```

### 3. Lazy Load Form Schemas

```typescript
const [formSchema, setFormSchema] = useState(null);

useEffect(() => {
  if (step.formId) {
    fetch(`/api/forms/${step.formId}/schema`)
      .then(res => res.json())
      .then(setFormSchema);
  }
}, [step.formId]);
```

---

## Getting Help

### 1. Check Existing Documentation
- `ONBOARDING_METADATA_COMPLETE_VALIDATION.md` - Full system trace
- `docs/ONBOARDING_METADATA_AUDIT.md` - Detailed audit
- `docs/ONBOARDING_METADATA_SCHEMAS.md` - All schemas

### 2. Review Test Cases
- `tests/e2e/onboarding-metadata-persistence.cy.ts` - E2E examples

### 3. Console Logging

Add debug logging:
```typescript
console.log('[OnboardingTemplateEditor] Saving steps:', {
  steps: steps.map(s => ({
    type: s.type,
    metadata: s.metadata,
  })),
});
```

### 4. Database Inspection

```sql
-- View all templates for a tenant
SELECT id, name, "companyId", "isActive"
FROM "OnboardingTemplate"
WHERE "companyId" = 'your-company-id';

-- View steps with metadata
SELECT id, type, label, metadata
FROM "OnboardingStep"
WHERE "templateId" = 'your-template-id';

-- View recent audit logs
SELECT *
FROM "OnboardingStepAuditLog"
WHERE "companyId" = 'your-company-id'
ORDER BY "changedAt" DESC
LIMIT 10;
```

---

## Migration Guide

### Migrating Old Templates Without Metadata

Run the backfill script:

```bash
npx tsx scripts/backfill-onboarding-metadata.ts
```

This will:
1. Find all steps with `metadata: null`
2. Apply default metadata for each step type
3. Save to database

### Manual Migration

```typescript
import { prisma } from '@/lib/prisma';
import { normalizeStepMetadata } from '@/lib/onboarding/stepMetadata';
import { mapDbStepTypeToUi } from '@/lib/onboarding/stepTypeMapping';

async function migrateTemplate(templateId: string) {
  const steps = await prisma.onboardingStep.findMany({
    where: { templateId },
  });

  for (const step of steps) {
    const uiType = mapDbStepTypeToUi(step.type) || step.type;
    const normalized = normalizeStepMetadata(uiType, step.metadata || {});
    
    await prisma.onboardingStep.update({
      where: { id: step.id },
      data: { metadata: normalized },
    });
  }
}
```

---

## Appendix: Type Definitions

```typescript
// ChecklistItem
type ChecklistItem = {
  id: string;
  label: string;
  required?: boolean;
  url?: string;
  notes?: string;
};

// TimelineItem
type TimelineItem = {
  id: string;
  label: string;
  scheduledAt?: string;
};

// PayrollField
type PayrollField = {
  id: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  fieldType?: PayrollFieldType;
  options?: string[];
};

// PayrollFieldType
type PayrollFieldType =
  | "text"
  | "number"
  | "select"
  | "irdNumber"
  | "kiwiSaverStatus"
  | "kiwiSaverEmployeeRate"
  | "kiwiSaverEmployerRate";

// JourneyAutomationMetadata
type JourneyAutomationMetadata = {
  journeyTemplateId: string;
  trigger: "on_start" | "on_completion" | "manual";
  notes: string;
};
```

---

**Last Updated**: November 16, 2025  
**Version**: 1.0.0
