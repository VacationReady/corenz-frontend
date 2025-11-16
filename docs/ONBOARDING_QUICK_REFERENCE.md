# Onboarding Metadata - Quick Reference Guide

**For developers working with onboarding template metadata**

---

## 🎯 Key Concepts

### Metadata Flow
```
API (GET) → Normalize → Deep Clone → React State → Edit → Deep Clone → Normalize → API (PUT) → Database
```

### Multi-Tenant Isolation
- **API Layer**: Filters by `session.user.companyId`
- **React State**: Deep clones prevent mutations
- **Database**: Encrypted at rest with tenant-specific keys

---

## 📋 All 16 Step Types

| Step Type | Metadata Complexity | Key Fields |
|-----------|---------------------|------------|
| acknowledge-document | Simple | `acknowledgementText` |
| upload-document | Medium | `instructions`, `category`, `allowedFileTypes[]` |
| collect-document | Simple | `instructions` |
| fill-form | Simple | `guidance` |
| instructions | Simple | `buttonLabel` |
| training-assignment | Complex | `modules[]` (id, label, required, url) |
| equipment-checklist | Complex | `items[]` (id, label, required, notes) |
| system-access | Complex | `instructions`, `systems[]` |
| manager-checkin | Complex | `instructions`, `timeline[]` |
| buddy-introduction | Simple | `notes` |
| compliance-training | Complex | `courses[]` (id, label, required, url) |
| **payroll-setup** | **Very Complex** | `instructions`, `fields[]` (7 field types) |
| benefits-enrollment | Complex | `links[]` (id, label, url, required) |
| probation-goals | Complex | `milestones[]` (id, label, notes, required) |
| welcome-survey | Simple | `questionSet`, `instructions` |
| journey-automation | Simple | `journeyTemplateId`, `trigger`, `notes` |

---

## 🔧 Common Tasks

### Add a New Step Type

1. **Define metadata schema** in `app/lib/onboarding/stepMetadata.ts`:
```typescript
"new-step-type": {
  defaults: () => ({ field1: "default value" }),
  normalize: (value: unknown) => {
    const base = (typeof value === "object" && value) || {};
    return {
      field1: asTrimmedString((base as any).field1, "default value"),
    };
  },
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    additionalProperties: false,
    properties: {
      field1: { type: "string", description: "Field description" },
    },
  },
},
```

2. **Add editor** in `app/components/onboarding/builder/MetadataPanel.tsx`:
```typescript
"new-step-type": {
  type: "new-step-type",
  title: "New Step Configuration",
  description: "Configure the new step type",
  defaults: () => getDefaultMetadataForStepBase("new-step-type"),
  normalize: (value: unknown) => normalizeStepMetadataBase("new-step-type", value),
  schema: onboardingStepMetadataSchemas["new-step-type"],
  Editor: ({ value, onChange }) => (
    <div className="space-y-2">
      <Label>Field 1</Label>
      <Input
        value={value.field1}
        onChange={(e) => onChange({ ...value, field1: e.target.value })}
      />
    </div>
  ),
},
```

3. **Add to step palette** in `OnboardingTemplateEditor.tsx`:
```typescript
{ value: "new-step-type", label: "New Step Type", icon: IconComponent },
```

4. **Update Prisma enum** in `prisma/schema.prisma`:
```prisma
enum OnboardingStepType {
  // ... existing types
  NEW_STEP_TYPE
}
```

5. **Add type mapping** in `app/lib/onboarding/stepTypeMapping.ts`:
```typescript
export const UI_TO_DB_STEP_TYPE = {
  // ... existing mappings
  "new-step-type": "NEW_STEP_TYPE",
};
```

### Edit Existing Metadata

**Client-Side** (React):
```typescript
// In MetadataPanel.tsx
const updateMetadata = (newValue: any) => {
  onChange(clone(config.normalize(newValue))); // ← Always deep clone
};
```

**Server-Side** (API):
```typescript
// In actions.ts
const normalizedSteps = normalizeSteps(steps); // ← Normalize before save
await prisma.onboardingStep.update({
  where: { id: stepId },
  data: { metadata: normalizedSteps[0].metadata },
});
```

### Query Metadata

**Get template with metadata**:
```typescript
const template = await prisma.onboardingTemplate.findUnique({
  where: { id: templateId },
  include: {
    OnboardingStep: {
      select: {
        id: true,
        type: true,
        label: true,
        metadata: true, // ← JSON field
      },
    },
  },
});
```

**Filter by metadata field** (PostgreSQL JSON operators):
```typescript
const steps = await prisma.onboardingStep.findMany({
  where: {
    templateId: templateId,
    metadata: {
      path: ['items'],
      array_contains: [{ label: 'Laptop' }],
    },
  },
});
```

---

## 🛡️ Security Best Practices

### Always Validate Tenant Ownership

```typescript
// ❌ BAD: No tenant validation
const template = await prisma.onboardingTemplate.findUnique({
  where: { id: templateId },
});

// ✅ GOOD: Validate tenant ownership
const template = await prisma.onboardingTemplate.findUnique({
  where: { id: templateId },
});
if (!template || template.companyId !== session.user.companyId) {
  throw new Error("Template not found");
}
```

### Always Deep Clone Metadata

```typescript
// ❌ BAD: Direct reference (can mutate)
const metadata = step.metadata;
metadata.items.push(newItem);

// ✅ GOOD: Deep clone before mutation
const metadata = clone(step.metadata);
metadata.items.push(newItem);
onChange(metadata);
```

### Always Normalize Before Save

```typescript
// ❌ BAD: Save raw user input
await prisma.onboardingStep.update({
  data: { metadata: userInput },
});

// ✅ GOOD: Normalize before save
const normalized = normalizeStepMetadata(step.type, userInput);
await prisma.onboardingStep.update({
  data: { metadata: normalized },
});
```

---

## 🧪 Testing

### Unit Test: Metadata Normalization

```typescript
import { normalizeStepMetadata } from '@/lib/onboarding/stepMetadata';

test('normalizes equipment checklist metadata', () => {
  const input = {
    items: [
      { id: 'laptop', label: 'Laptop', required: true },
    ],
  };
  
  const normalized = normalizeStepMetadata('equipment-checklist', input);
  
  expect(normalized).toEqual({
    items: [
      { id: 'laptop', label: 'Laptop', required: true, notes: '' },
    ],
  });
});
```

### E2E Test: Round-Trip Persistence

```typescript
cy.test('persists equipment metadata', () => {
  // Create template
  cy.visit('/settings/journeys?tab=onboarding');
  cy.contains('New Template').click();
  cy.get('input[name="name"]').type('Test Template');
  
  // Add step
  cy.contains('Add Step').click();
  cy.contains('Equipment Checklist').click();
  
  // Edit metadata
  cy.get('input[value="Laptop"]').clear().type('MacBook Pro');
  
  // Save
  cy.contains('Publish').click();
  
  // Reload
  cy.reload();
  
  // Verify
  cy.get('[data-testid="template-row"]').first().click();
  cy.get('input[value="MacBook Pro"]').should('exist');
});
```

---

## 🐛 Common Issues

### Issue: Metadata Reverts to Defaults

**Cause**: Using `defaults()` instead of `normalize()` on load

**Fix**:
```typescript
// ❌ BAD
const metadata = getDefaultMetadataForStep(step.type);

// ✅ GOOD
const metadata = normalizeStepMetadata(step.type, step.metadata);
```

### Issue: Cross-Tenant Data Leakage

**Cause**: Missing `companyId` filter in query

**Fix**:
```typescript
// ❌ BAD
const templates = await prisma.onboardingTemplate.findMany();

// ✅ GOOD
const templates = await prisma.onboardingTemplate.findMany({
  where: { companyId: session.user.companyId },
});
```

### Issue: Metadata Mutation Between Steps

**Cause**: Shared object reference

**Fix**:
```typescript
// ❌ BAD
const metadata = step.metadata;
onChange(metadata); // Mutates original

// ✅ GOOD
const metadata = clone(step.metadata);
onChange(metadata); // Safe copy
```

---

## 📚 Documentation

### Full Documentation

- **JSON Schemas**: `docs/ONBOARDING_METADATA_SCHEMAS.md`
- **Architecture Audit**: `docs/ONBOARDING_METADATA_AUDIT.md`
- **Implementation Summary**: `ONBOARDING_METADATA_IMPLEMENTATION_COMPLETE.md`
- **Cypress Tests**: `tests/e2e/onboarding-metadata-persistence.cy.ts`

### Key Files

**API Layer**:
- `app/api/onboarding/templates/route.ts` - GET/PUT endpoints
- `app/api/onboarding/templates/actions.ts` - Create/update logic
- `app/api/onboarding/templates/tenantScopedFetch.ts` - Serialization

**React Layer**:
- `app/components/onboarding/OnboardingTemplateEditor.tsx` - Main editor
- `app/components/onboarding/builder/MetadataPanel.tsx` - Metadata UI
- `app/lib/onboarding/stepMetadata.ts` - Schema definitions

**Database**:
- `prisma/schema.prisma` - OnboardingStep model

---

## 🚀 Quick Commands

```bash
# Run metadata tests
npx cypress run --spec "tests/e2e/onboarding-metadata-persistence.cy.ts"

# Backfill metadata for existing templates
npx tsx scripts/backfill-onboarding-metadata.ts

# Generate Prisma types
npx prisma generate

# View database schema
npx prisma studio
```

---

## 💡 Tips

1. **Always use `normalizeStepMetadata()`** when reading from DB or user input
2. **Always use `clone()`** before mutating metadata objects
3. **Always validate `companyId`** in API routes
4. **Use TypeScript types** from `stepMetadata.ts` for type safety
5. **Test round-trip persistence** for any metadata changes
6. **Document new step types** in `ONBOARDING_METADATA_SCHEMAS.md`

---

## 🔗 Related

- **Journey Designer**: `/settings/journeys?tab=onboarding`
- **Employee Onboarding**: `/[id]/onboarding`
- **Onboarding Analytics**: `/analytics/onboarding`
- **Audit Logs**: `OnboardingStepAuditLog` table

---

**Last Updated**: 2025-01-16  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
