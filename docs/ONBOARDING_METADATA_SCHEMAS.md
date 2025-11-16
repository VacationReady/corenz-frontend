# Onboarding Step Metadata JSON Schemas

**Complete reference for all 16 onboarding step types with validation rules, persistence guarantees, and multi-tenant isolation.**

---

## Overview

Each onboarding step type has a strongly-typed metadata schema that:
- **Validates** on normalization (client & server)
- **Persists** in `OnboardingStep.metadata` (JSON field)
- **Deep-clones** before entering React state to prevent mutations
- **Filters** by `companyId` at API layer for multi-tenant isolation
- **Encrypts** at rest via database-level encryption (PostgreSQL)

---

## Schema Definitions

### 1. acknowledge-document

**Purpose**: Require employees to read and acknowledge a document.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "acknowledgementText": {
      "type": "string",
      "description": "Checkbox label shown to the employee",
      "default": "I have read and acknowledge this document",
      "minLength": 1
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  acknowledgementText: string;
}
```

**Default Value**:
```json
{
  "acknowledgementText": "I have read and acknowledge this document"
}
```

**Editable Fields**: `acknowledgementText`

---

### 2. upload-document

**Purpose**: Collect document uploads from employees during onboarding.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "instructions": {
      "type": "string",
      "description": "Helper text shown above the upload field"
    },
    "category": {
      "type": "string",
      "description": "Document category assigned to the uploaded file",
      "default": "Onboarding"
    },
    "allowedFileTypes": {
      "type": "array",
      "description": "Array of accepted file extensions",
      "items": { "type": "string" },
      "minItems": 1,
      "default": [".pdf", ".jpg", ".png"]
    }
  },
  "required": ["allowedFileTypes"]
}
```

**TypeScript Type**:
```typescript
{
  instructions: string;
  category: string;
  allowedFileTypes: string[];
}
```

**Default Value**:
```json
{
  "instructions": "Upload a PDF, JPG, or PNG copy of the document.",
  "allowedFileTypes": [".pdf", ".jpg", ".png"],
  "category": "Onboarding"
}
```

**Editable Fields**: `instructions`, `category`, `allowedFileTypes`

---

### 3. collect-document

**Purpose**: Manager manually confirms document collection.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "instructions": {
      "type": "string",
      "description": "Guidance displayed to the assignee"
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  instructions: string;
}
```

**Default Value**:
```json
{
  "instructions": "Confirm the document has been provided."
}
```

**Editable Fields**: `instructions`

---

### 4. fill-form

**Purpose**: Embed a form for data collection.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "guidance": {
      "type": "string",
      "description": "Additional helper text to show with the form"
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  guidance: string;
}
```

**Default Value**:
```json
{
  "guidance": ""
}
```

**Editable Fields**: `guidance`

---

### 5. instructions

**Purpose**: Display welcome message or instructions.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "buttonLabel": {
      "type": "string",
      "description": "Primary button label",
      "default": "Next"
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  buttonLabel: string;
}
```

**Default Value**:
```json
{
  "buttonLabel": "Next"
}
```

**Editable Fields**: `buttonLabel`

---

### 6. training-assignment

**Purpose**: Assign training modules to complete.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "modules": {
      "type": "array",
      "description": "Training modules assigned to the employee",
      "default": [],
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "required": { "type": "boolean", "default": true },
          "url": { "type": "string", "description": "Optional resource link" }
        }
      }
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  modules: Array<{
    id: string;
    label: string;
    required?: boolean;
    url?: string;
  }>;
}
```

**Default Value**:
```json
{
  "modules": [
    { "id": "module-1", "label": "Health & Safety", "required": true },
    { "id": "module-2", "label": "Code of Conduct", "required": true }
  ]
}
```

**Editable Fields**: `modules[]` (add/remove/edit items)

---

### 7. equipment-checklist

**Purpose**: Track equipment issued to new hires.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "items": {
      "type": "array",
      "description": "Equipment line items",
      "default": [],
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "required": { "type": "boolean" },
          "notes": { "type": "string" }
        }
      }
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  items: Array<{
    id: string;
    label: string;
    required?: boolean;
    notes?: string;
  }>;
}
```

**Default Value**:
```json
{
  "items": [
    { "id": "laptop", "label": "Laptop", "required": true },
    { "id": "access-card", "label": "Access card", "required": true }
  ]
}
```

**Editable Fields**: `items[]` (add/remove/edit items)

---

### 8. system-access

**Purpose**: Provision system access and permissions.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "instructions": {
      "type": "string",
      "description": "Helper text for IT administrators"
    },
    "systems": {
      "type": "array",
      "description": "System access requirements",
      "default": [],
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "required": { "type": "boolean", "default": true },
          "url": { "type": "string" },
          "notes": { "type": "string" }
        }
      }
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  instructions: string;
  systems: Array<{
    id: string;
    label: string;
    required?: boolean;
    url?: string;
    notes?: string;
  }>;
}
```

**Default Value**:
```json
{
  "systems": [
    { "id": "email", "label": "Email", "required": true },
    { "id": "hris", "label": "HRIS", "required": true }
  ],
  "instructions": "Provision system access for the new starter."
}
```

**Editable Fields**: `instructions`, `systems[]`

---

### 9. manager-checkin

**Purpose**: Schedule manager check-ins during probation.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "instructions": {
      "type": "string",
      "description": "Helper text for managers"
    },
    "timeline": {
      "type": "array",
      "description": "Check-in schedule",
      "default": [],
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "scheduledAt": { "type": "string" }
        }
      }
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  instructions: string;
  timeline: Array<{
    id: string;
    label: string;
    scheduledAt?: string;
  }>;
}
```

**Default Value**:
```json
{
  "timeline": [
    { "id": "day-7", "label": "Day 7 check-in", "scheduledAt": "7" },
    { "id": "day-30", "label": "Day 30 review", "scheduledAt": "30" }
  ],
  "instructions": "Schedule regular check-ins to track progress."
}
```

**Editable Fields**: `instructions`, `timeline[]`

---

### 10. buddy-introduction

**Purpose**: Assign and introduce onboarding buddy.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "notes": {
      "type": "string",
      "description": "Notes displayed to the buddy"
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  notes: string;
}
```

**Default Value**:
```json
{
  "notes": "Introduce the new starter to their buddy and set expectations."
}
```

**Editable Fields**: `notes`

---

### 11. compliance-training

**Purpose**: Track mandatory compliance training.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "courses": {
      "type": "array",
      "description": "Mandatory compliance training",
      "default": [],
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "required": { "type": "boolean", "default": true },
          "url": { "type": "string" }
        }
      }
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  courses: Array<{
    id: string;
    label: string;
    required?: boolean;
    url?: string;
  }>;
}
```

**Default Value**:
```json
{
  "courses": [
    { "id": "compliance-1", "label": "GDPR essentials", "required": true },
    { "id": "compliance-2", "label": "Health & Safety", "required": true }
  ]
}
```

**Editable Fields**: `courses[]`

---

### 12. payroll-setup

**Purpose**: Collect payroll information (bank details, IRD, KiwiSaver).

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "instructions": {
      "type": "string",
      "description": "Guidance displayed with the payroll form"
    },
    "fields": {
      "type": "array",
      "description": "Payroll data points to collect",
      "default": [],
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "defaultValue": { "type": "string" },
          "placeholder": { "type": "string" },
          "required": { "type": "boolean", "default": true },
          "fieldType": {
            "type": "string",
            "enum": ["text", "number", "select", "irdNumber", "kiwiSaverStatus", "kiwiSaverEmployeeRate", "kiwiSaverEmployerRate"],
            "default": "text"
          },
          "options": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Dropdown options for select-type payroll fields"
          }
        }
      }
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  instructions: string;
  fields: Array<{
    id: string;
    label: string;
    defaultValue?: string;
    placeholder?: string;
    required?: boolean;
    fieldType?: "text" | "number" | "select" | "irdNumber" | "kiwiSaverStatus" | "kiwiSaverEmployeeRate" | "kiwiSaverEmployerRate";
    options?: string[];
  }>;
}
```

**Default Value**:
```json
{
  "instructions": "Collect bank details, IRD information, and KiwiSaver preferences.",
  "fields": [
    {
      "id": "bankAccountNumber",
      "label": "Bank account number",
      "placeholder": "00-0000-0000000-00",
      "required": true,
      "fieldType": "text"
    },
    {
      "id": "irdNumber",
      "label": "IRD number",
      "placeholder": "123-456-789",
      "required": true,
      "fieldType": "irdNumber"
    },
    {
      "id": "taxCode",
      "label": "Tax code",
      "placeholder": "e.g. M SL",
      "required": true,
      "fieldType": "text"
    },
    {
      "id": "kiwiSaverStatus",
      "label": "KiwiSaver status",
      "required": true,
      "defaultValue": "enrolled",
      "fieldType": "kiwiSaverStatus",
      "options": ["enrolled", "opted_out", "contributions_holiday"]
    },
    {
      "id": "kiwiSaverEmployeeRate",
      "label": "KiwiSaver employee rate",
      "required": false,
      "defaultValue": "0.03",
      "fieldType": "kiwiSaverEmployeeRate",
      "options": ["0.03", "0.04", "0.06", "0.08", "0.10"]
    },
    {
      "id": "kiwiSaverEmployerRate",
      "label": "KiwiSaver employer rate",
      "required": false,
      "placeholder": "Minimum 3%",
      "fieldType": "kiwiSaverEmployerRate"
    }
  ]
}
```

**Editable Fields**: `instructions`, `fields[]` (full CRUD on payroll fields)

**Special Validation**:
- `irdNumber`: Must be 8-9 digits
- `kiwiSaverEmployeeRate`: Must be one of [3%, 4%, 6%, 8%, 10%]
- `kiwiSaverEmployerRate`: Minimum 3% when employee is enrolled

---

### 13. benefits-enrollment

**Purpose**: Link to benefit providers and enrollment portals.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "links": {
      "type": "array",
      "description": "Benefit resource links",
      "default": [],
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "url": { "type": "string" },
          "required": { "type": "boolean", "default": true }
        }
      }
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  links: Array<{
    id: string;
    label: string;
    url?: string;
    required?: boolean;
  }>;
}
```

**Default Value**:
```json
{
  "links": [
    { "id": "health", "label": "Health insurance portal", "url": "" },
    { "id": "pension", "label": "Retirement plan overview", "url": "" }
  ]
}
```

**Editable Fields**: `links[]`

---

### 14. probation-goals

**Purpose**: Set probation milestones and expectations.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "milestones": {
      "type": "array",
      "description": "Probation goals",
      "default": [],
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "notes": { "type": "string" },
          "required": { "type": "boolean", "default": true }
        }
      }
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  milestones: Array<{
    id: string;
    label: string;
    notes?: string;
    required?: boolean;
  }>;
}
```

**Default Value**:
```json
{
  "milestones": [
    { "id": "goal-30", "label": "30-day milestone", "notes": "" },
    { "id": "goal-60", "label": "60-day milestone", "notes": "" }
  ]
}
```

**Editable Fields**: `milestones[]`

---

### 15. welcome-survey

**Purpose**: Gather feedback on onboarding experience.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "questionSet": {
      "type": "string",
      "description": "Question set identifier saved with survey responses"
    },
    "instructions": {
      "type": "string",
      "description": "Helper text shown with the survey"
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  questionSet: string;
  instructions: string;
}
```

**Default Value**:
```json
{
  "questionSet": "welcome-baseline",
  "instructions": "Gather initial feedback on the onboarding experience."
}
```

**Editable Fields**: `questionSet`, `instructions`

---

### 16. journey-automation

**Purpose**: Trigger automated journey templates.

**JSON Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "journeyTemplateId": {
      "type": "string",
      "description": "Identifier of the journey template to invoke"
    },
    "trigger": {
      "type": "string",
      "enum": ["on_start", "on_completion", "manual"],
      "default": "on_start"
    },
    "notes": {
      "type": "string",
      "description": "Freeform notes for administrators"
    }
  }
}
```

**TypeScript Type**:
```typescript
{
  journeyTemplateId: string;
  trigger: "on_start" | "on_completion" | "manual";
  notes: string;
}
```

**Default Value**:
```json
{
  "journeyTemplateId": "",
  "trigger": "on_start",
  "notes": ""
}
```

**Editable Fields**: `journeyTemplateId`, `trigger`, `notes`

---

## Multi-Tenant Isolation

### API Layer Protection

**GET `/api/onboarding/templates`**:
```typescript
// ✅ Enforces companyId filter
const templates = await prisma.onboardingTemplate.findMany({
  where: { companyId: session.user.companyId },
  // ...
});

// ✅ Validates tenant ownership
if (template.companyId !== session.user.companyId) {
  throw new Error("Template not found");
}
```

**PUT `/api/onboarding/templates`**:
```typescript
// ✅ Validates all related resources belong to tenant
await validateScopedResources(session.user.companyId, prismaClient, {
  departmentIds,
  jobRoleIds,
  steps: normalizedSteps,
});

// ✅ Normalizes metadata before save
const normalizedSteps = normalizeSteps(steps);
```

### React State Protection

**Deep Cloning**:
```typescript
// MetadataPanel.tsx - Line 942
const normalized = useMemo(() => {
  if (!config) return {};
  const hydrated = value ? config.normalize(value) : config.defaults();
  return clone(hydrated); // ✅ Deep clone prevents mutation
}, [config, value]);

// OnboardingTemplateEditor.tsx - Line 1326
metadata: normalizeStepMetadata(s.type, s.metadata), // ✅ Normalized before save
```

### Database Encryption

**Prisma Schema**:
```prisma
model OnboardingStep {
  id         String   @id
  metadata   Json?    // ✅ Encrypted at rest via PostgreSQL
  templateId String
  // ...
}
```

**Encryption Configuration**:
- PostgreSQL transparent data encryption (TDE) for `metadata` column
- Field-level encryption for sensitive payroll data
- Backup encryption with tenant-specific keys

---

## Persistence Guarantees

### Save Flow

1. **Client Normalization**: `normalizeStepMetadata(type, value)` in `MetadataPanel`
2. **Deep Clone**: `clone(metadata)` before state update
3. **API Validation**: `normalizeSteps(steps)` in `actions.ts`
4. **Server Normalization**: `normalizeStepMetadata(type, metadata)` before DB write
5. **Database Write**: `OnboardingStep.metadata` JSON field
6. **Reload**: `serializeTemplate()` with `normalizeStepMetadata()` on read

### No Seed Data Override

**Template Hydration**:
```typescript
// OnboardingTemplateEditor.tsx - Line 136
const hydrateTemplateStep = (step: any) => {
  // ...
  metadata: normalizeStepMetadata(uiType, step.metadata), // ✅ Uses DB value, not defaults
};
```

**Normalization Logic**:
```typescript
// stepMetadata.ts - Line 834
export function normalizeStepMetadata(stepType: string, value: unknown) {
  const def = getStepMetadataDefinition(stepType);
  const normalized = def
    ? def.normalize(value) // ✅ Preserves existing values
    : (typeof value === "object" && value) || {};
  return normalized;
}
```

---

## Testing Strategy

See `ONBOARDING_CYPRESS_TESTS.md` for comprehensive test suite covering:
- Round-trip metadata persistence
- Multi-tenant isolation
- Payroll field validation
- Checklist CRUD operations
- Buddy assignment flow
- Conflict resolution
