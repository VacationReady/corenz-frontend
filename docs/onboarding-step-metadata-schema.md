# Onboarding step metadata schema

The onboarding template builder uses step-specific metadata to drive both the admin configuration panels and the runtime employee experience. Each step type publishes an explicit JSON schema and normalisation routine in [`app/lib/onboarding/stepMetadata.ts`](../app/lib/onboarding/stepMetadata.ts). The builder UI enforces these schemas and stores normalised payloads so that metadata remains tenant isolated and loads without unexpected mutation.

Below are the schemas that back each metadata panel together with the editable fields exposed in the UI.

## acknowledge-document

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

* **Editable fields:** acknowledgement text.

## upload-document

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["allowedFileTypes"],
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
      "default": [".pdf", ".jpg", ".png"],
      "items": { "type": "string" },
      "minItems": 1
    }
  }
}
```

* **Editable fields:** helper text, document category, accepted file extensions (comma separated).

## collect-document

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

* **Editable fields:** manager instructions.

## fill-form

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

* **Editable fields:** inline guidance copy.

## instructions

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

* **Editable fields:** instruction button label.

## training-assignment

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

* **Editable fields:** list of modules with optional resource links and required flags.

## equipment-checklist

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

* **Editable fields:** equipment items with optional notes and required flags.

## system-access

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "instructions": {
      "type": "string",
      "description": "Guidance for IT administrators"
    },
    "systems": {
      "type": "array",
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

* **Editable fields:** IT instructions, systems with optional URLs/notes and required flags.

## manager-checkin

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "template": {
      "type": "string",
      "description": "Talking points or meeting template"
    },
    "timeline": {
      "type": "array",
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

* **Editable fields:** meeting template text and the timeline of check-ins.

## buddy-introduction

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "notes": {
      "type": "string",
      "description": "Talking points or expectations for the buddy"
    }
  }
}
```

* **Editable fields:** buddy notes.

## compliance-training

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "courses": {
      "type": "array",
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

* **Editable fields:** compliance courses with optional URLs and required flags.

## payroll-setup

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "instructions": {
      "type": "string",
      "description": "Helper text shown above the payroll fields"
    },
    "fields": {
      "type": "array",
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
          "required": { "type": "boolean", "default": true }
        }
      }
    }
  }
}
```

* **Editable fields:** payroll field definitions (key, label, default value, placeholder, required) plus instructions.

## benefits-enrollment

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "links": {
      "type": "array",
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

* **Editable fields:** benefit links with optional URLs and completion requirement.

## probation-goals

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "milestones": {
      "type": "array",
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

* **Editable fields:** probation milestones (title, optional notes, required flag).

## welcome-survey

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

* **Editable fields:** question set identifier and survey instructions.

## journey-automation

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

* **Editable fields:** journey template ID, trigger behaviour, administrative notes.

---

Every metadata payload is normalised via `normalizeStepMetadata` before saving or rendering, ensuring stale defaults are stripped and tenant-specific data is isolated from other organisations.
