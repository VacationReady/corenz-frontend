export type JsonSchema = {
  $schema?: string;
  type: "object";
  description?: string;
  additionalProperties: boolean;
  required?: string[];
  properties: Record<string, any>;
};

export type ChecklistItem = {
  id: string;
  label: string;
  required?: boolean;
  url?: string;
  link?: string;
  notes?: string;
};

export type TimelineItem = {
  id: string;
  label: string;
  scheduledAt?: string;
};

export const PAYROLL_FIELD_TYPES = [
  "text",
  "number",
  "select",
  "irdNumber",
  "kiwiSaverStatus",
  "kiwiSaverEmployeeRate",
  "kiwiSaverEmployerRate",
] as const;

export type PayrollFieldType = (typeof PAYROLL_FIELD_TYPES)[number];

export const DEFAULT_KIWISAVER_STATUS_OPTIONS = [
  "enrolled",
  "opted_out",
  "contributions_holiday",
] as const;

export const DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS = [
  "0.03",
  "0.04",
  "0.06",
  "0.08",
  "0.10",
] as const;

export type PayrollField = {
  id: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  fieldType?: PayrollFieldType;
  options?: string[];
};

export type JourneyAutomationMetadata = {
  journeyTemplateId: string;
  trigger: "on_start" | "on_completion" | "manual";
  notes: string;
};

type MetadataDefinition<T> = {
  defaults: () => T;
  normalize: (value: unknown) => T;
  schema: JsonSchema;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createStableId = (prefix: string, index: number) => `${prefix}-${index + 1}`;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asTrimmedString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : fallback;
  }
  return fallback;
};

const asBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : Boolean(value ?? fallback);

const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const asPresetSlug = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
};

const asTenantScope = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const unique = Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
  return unique.length ? unique : undefined;
};

const asPayrollFieldType = (value: unknown): PayrollFieldType => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((PAYROLL_FIELD_TYPES as readonly string[]).includes(trimmed)) {
      return trimmed as PayrollFieldType;
    }
  }
  return "text";
};

const asStringArray = (value: unknown): string[] =>
  ensureArray<string>(value)
    .map((entry) => asTrimmedString(entry))
    .filter(Boolean);

const metadataDefinitions: Record<string, MetadataDefinition<any>> = {
  "acknowledge-document": {
    defaults: () => ({
      acknowledgementText: "I have read, understood, and agree to comply with the contents of this document.",
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      return {
        acknowledgementText: asTrimmedString(
          (base as any).acknowledgementText,
          "I have read and acknowledge this document",
        ),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        acknowledgementText: {
          type: "string",
          description: "Checkbox label shown to the employee",
          default: "I have read and acknowledge this document",
          minLength: 1,
        },
      },
    },
  },
  "upload-document": {
    defaults: () => ({
      instructions: "Upload a PDF, JPG, or PNG copy of the document.",
      allowedFileTypes: [".pdf", ".jpg", ".png"],
      category: "Onboarding",
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const allowed = ensureArray<string>((base as any).allowedFileTypes)
        .map((entry) => asTrimmedString(entry))
        .filter(Boolean);
      return {
        instructions: asString((base as any).instructions, ""),
        category: asTrimmedString((base as any).category, "Onboarding"),
        allowedFileTypes: allowed.length ? allowed : [".pdf", ".jpg", ".png"],
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        instructions: {
          type: "string",
          description: "Helper text shown above the upload field",
        },
        category: {
          type: "string",
          description: "Document category assigned to the uploaded file",
          default: "Onboarding",
        },
        allowedFileTypes: {
          type: "array",
          description: "Array of accepted file extensions",
          items: { type: "string" },
          minItems: 1,
          default: [".pdf", ".jpg", ".png"],
        },
      },
      required: ["allowedFileTypes"],
    },
  },
  "collect-document": {
    defaults: () => ({ instructions: "Confirm the document has been provided." }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      return {
        instructions: asString((base as any).instructions, ""),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        instructions: {
          type: "string",
          description: "Guidance displayed to the assignee",
        },
      },
    },
  },
  "fill-form": {
    defaults: () => ({ guidance: "" }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      return {
        guidance: asTrimmedString((base as any).guidance, ""),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        guidance: {
          type: "string",
          description: "Additional helper text to show with the form",
        },
      },
    },
  },
  instructions: {
    defaults: () => ({ buttonLabel: "Next" }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      return {
        buttonLabel: asTrimmedString((base as any).buttonLabel, "Next"),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        buttonLabel: {
          type: "string",
          description: "Primary button label",
          default: "Next",
        },
      },
    },
  },
  "training-assignment": {
    defaults: () => ({
      modules: [
        { id: "hs-induction", label: "Health & Safety Induction", required: true, url: "https://worksafe.govt.nz/managing-health-and-safety/getting-started/worker-engagement-and-participation/" },
        { id: "code-of-conduct", label: "Code of Conduct", required: true },
        { id: "privacy-act", label: "Privacy Act 2020 Basics", required: false },
      ],
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const modules = ensureArray<ChecklistItem>((base as any).modules).map(
        (item, index) => ({
          id: asTrimmedString(item?.id, createStableId("module", index)),
          label: asTrimmedString(item?.label, `Module ${index + 1}`),
          required: asBoolean(item?.required, true),
          url: asTrimmedString(item?.url || item?.link, ""),
        }),
      );
      return {
        modules,
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        modules: {
          type: "array",
          description: "Training modules assigned to the employee",
          default: [],
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              required: { type: "boolean", default: true },
              url: { type: "string", description: "Optional resource link" },
            },
          },
        },
      },
    },
  },
  "equipment-checklist": {
    defaults: () => ({
      items: [
        { id: "laptop", label: "Laptop/Computer", required: true, notes: "Including charger and any docking station" },
        { id: "access-card", label: "Building access card/key", required: true },
        { id: "phone", label: "Mobile phone (if applicable)", required: false },
        { id: "ppe", label: "PPE - Personal Protective Equipment", required: false, notes: "As required for role - safety glasses, hi-vis, etc." },
      ],
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const items = ensureArray<ChecklistItem>((base as any).items).map(
        (item, index) => ({
          id: asTrimmedString(item?.id, createStableId("item", index)),
          label: asTrimmedString(item?.label, `Item ${index + 1}`),
          required: asBoolean(item?.required, true),
          notes: asString(item?.notes, ""),
        }),
      );
      return {
        items,
        instructions: asString((base as any).instructions, ""),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          description: "Equipment line items",
          default: [],
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              required: { type: "boolean" },
              notes: { type: "string" },
            },
          },
        },
      },
    },
  },
  "system-access": {
    defaults: () => ({
      systems: [
        { id: "email", label: "Email", required: true },
        { id: "hris", label: "HRIS", required: true },
      ],
      instructions: "Provision system access for the new starter.",
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const systems = ensureArray<ChecklistItem>((base as any).systems).map(
        (item, index) => ({
          id: asTrimmedString(item?.id, createStableId("system", index)),
          label: asTrimmedString(item?.label, `System ${index + 1}`),
          required: asBoolean(item?.required, true),
          url: asTrimmedString(item?.url, ""),
          notes: asString(item?.notes, ""),
        }),
      );
      return {
        systems,
        instructions: asString((base as any).instructions, ""),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        instructions: {
          type: "string",
          description: "Helper text for IT administrators",
        },
        systems: {
          type: "array",
          description: "System access requirements",
          default: [],
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              required: { type: "boolean", default: true },
              url: { type: "string" },
              notes: { type: "string" },
            },
          },
        },
      },
    },
  },
  "manager-checkin": {
    defaults: () => ({
      timeline: [
        { id: "day-7", label: "Day 7 check-in", scheduledAt: "7" },
        { id: "day-30", label: "Day 30 review", scheduledAt: "30" },
      ],
      instructions: "Schedule regular check-ins to track progress.",
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const timeline = ensureArray<TimelineItem>((base as any).timeline).map(
        (item, index) => ({
          id: asTrimmedString(item?.id, createStableId("checkin", index)),
          label: asTrimmedString(item?.label, `Check-in ${index + 1}`),
          scheduledAt: asTrimmedString(item?.scheduledAt, ""),
        }),
      );
      return {
        timeline,
        instructions: asString((base as any).instructions, ""),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        instructions: {
          type: "string",
          description: "Helper text for managers",
        },
        timeline: {
          type: "array",
          description: "Check-in schedule",
          default: [],
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              scheduledAt: { type: "string" },
            },
          },
        },
      },
    },
  },
  "buddy-introduction": {
    defaults: () => ({
      notes: "Introduce the new starter to their buddy and set expectations.",
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      return {
        notes: asString((base as any).notes, ""),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        notes: {
          type: "string",
          description: "Notes displayed to the buddy",
        },
      },
    },
  },
  "compliance-training": {
    defaults: () => ({
      courses: [
        { id: "hswa-2015", label: "Health & Safety at Work Act 2015 - Worker Responsibilities", required: true, url: "https://worksafe.govt.nz/laws-and-regulations/acts/hswa/" },
        { id: "privacy-2020", label: "Privacy Act 2020 Awareness", required: true },
        { id: "harassment-prevention", label: "Harassment Prevention & Workplace Conduct", required: true },
        { id: "first-aid", label: "First Aid Awareness", required: false },
      ],
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const courses = ensureArray<ChecklistItem>((base as any).courses).map(
        (item, index) => ({
          id: asTrimmedString(item?.id, createStableId("course", index)),
          label: asTrimmedString(item?.label, `Course ${index + 1}`),
          required: asBoolean(item?.required, true),
          url: asTrimmedString(item?.url, ""),
        }),
      );
      return {
        courses,
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        courses: {
          type: "array",
          description: "Mandatory compliance training",
          default: [],
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              required: { type: "boolean", default: true },
              url: { type: "string" },
            },
          },
        },
      },
    },
  },
  "payroll-setup": {
    defaults: () => ({
      instructions:
        "Please complete your payroll details below. Your IRD number is required for tax purposes under New Zealand law. If you're unsure about your tax code, the most common is 'M' for main income with no student loan, or 'M SL' if you have a student loan. Visit ird.govt.nz for more information.",
      fields: [
        {
          id: "bankAccountNumber",
          label: "Bank account number",
          placeholder: "00-0000-0000000-00",
          required: true,
          fieldType: "text",
        },
        {
          id: "irdNumber",
          label: "IRD number",
          placeholder: "123-456-785",
          required: true,
          fieldType: "irdNumber",
        },
        {
          id: "taxCode",
          label: "Tax code",
          placeholder: "e.g. M, M SL, S, S SL, SH, SH SL",
          required: true,
          fieldType: "text",
        },
        {
          id: "kiwiSaverStatus",
          label: "KiwiSaver status",
          required: true,
          defaultValue: DEFAULT_KIWISAVER_STATUS_OPTIONS[0],
          fieldType: "kiwiSaverStatus",
          options: Array.from(DEFAULT_KIWISAVER_STATUS_OPTIONS),
        },
        {
          id: "kiwiSaverEmployeeRate",
          label: "KiwiSaver employee rate",
          required: false,
          defaultValue: DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS[0],
          fieldType: "kiwiSaverEmployeeRate",
          options: Array.from(DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS),
        },
        {
          id: "kiwiSaverEmployerRate",
          label: "KiwiSaver employer rate",
          required: false,
          placeholder: "Minimum 3%",
          fieldType: "kiwiSaverEmployerRate",
        },
      ],
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const fields = ensureArray<PayrollField>((base as any).fields).map(
        (field, index) => {
          const fieldType = asPayrollFieldType(
            (field as any).fieldType ?? (field as any).type,
          );
          const normalizedOptions = (() => {
            if (fieldType === "kiwiSaverEmployeeRate") {
              return Array.from(DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS);
            }
            if (fieldType === "kiwiSaverStatus") {
              return Array.from(DEFAULT_KIWISAVER_STATUS_OPTIONS);
            }
            if (fieldType === "select") {
              return asStringArray((field as any).options);
            }
            return [] as string[];
          })();
          const defaultValue = asString(
            (field as any).defaultValue,
            normalizedOptions.length ? normalizedOptions[0] : "",
          );
          return {
            id: asTrimmedString(field?.id, createStableId("payroll", index)),
            label: asTrimmedString(field?.label, `Field ${index + 1}`),
            defaultValue,
            placeholder: asString(field?.placeholder, ""),
            required: asBoolean(field?.required, true),
            fieldType,
            options: normalizedOptions,
          } satisfies PayrollField;
        },
      );
      return {
        instructions: asString((base as any).instructions, ""),
        fields,
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        instructions: {
          type: "string",
          description: "Guidance displayed with the payroll form",
        },
        fields: {
          type: "array",
          description: "Payroll data points to collect",
          default: [],
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              defaultValue: { type: "string" },
              placeholder: { type: "string" },
              required: { type: "boolean", default: true },
              fieldType: {
                type: "string",
                enum: Array.from(PAYROLL_FIELD_TYPES),
                default: "text",
              },
              options: {
                type: "array",
                items: { type: "string" },
                description:
                  "Dropdown options for select-type payroll fields",
              },
            },
          },
        },
      },
    },
  },
  "benefits-enrollment": {
    defaults: () => ({
      links: [
        { id: "health", label: "Health insurance portal", url: "" },
        { id: "pension", label: "Retirement plan overview", url: "" },
      ],
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const links = ensureArray<ChecklistItem>((base as any).links).map(
        (item, index) => ({
          id: asTrimmedString(item?.id, createStableId("link", index)),
          label: asTrimmedString(item?.label, `Link ${index + 1}`),
          url: asTrimmedString(item?.url, ""),
          required: asBoolean(item?.required, true),
        }),
      );
      return {
        links,
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        links: {
          type: "array",
          description: "Benefit resource links",
          default: [],
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              url: { type: "string" },
              required: { type: "boolean", default: true },
            },
          },
        },
      },
    },
  },
  "probation-goals": {
    defaults: () => ({
      milestones: [
        { id: "goal-30", label: "30-day milestone", notes: "" },
        { id: "goal-60", label: "60-day milestone", notes: "" },
      ],
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const milestones = ensureArray<ChecklistItem>((base as any).milestones).map(
        (item, index) => ({
          id: asTrimmedString(item?.id, createStableId("goal", index)),
          label: asTrimmedString(item?.label || (item as any).title, `Goal ${index + 1}`),
          notes: asString(item?.notes, ""),
          required: asBoolean(item?.required, true),
        }),
      );
      return {
        milestones,
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        milestones: {
          type: "array",
          description: "Probation goals",
          default: [],
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              notes: { type: "string" },
              required: { type: "boolean", default: true },
            },
          },
        },
      },
    },
  },
  "welcome-survey": {
    defaults: () => ({
      questionSet: "welcome-baseline",
      instructions: "Gather initial feedback on the onboarding experience.",
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      return {
        questionSet: asTrimmedString((base as any).questionSet, ""),
        instructions: asString((base as any).instructions, ""),
      };
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        questionSet: {
          type: "string",
          description: "Question set identifier saved with survey responses",
        },
        instructions: {
          type: "string",
          description: "Helper text shown with the survey",
        },
      },
    },
  },
  "journey-automation": {
    defaults: () => ({
      journeyTemplateId: "",
      trigger: "on_start" as JourneyAutomationMetadata["trigger"],
      notes: "",
    }),
    normalize: (value: unknown) => {
      const base = (typeof value === "object" && value) || {};
      const trigger = asTrimmedString((base as any).trigger, "on_start");
      return {
        journeyTemplateId: asString((base as any).journeyTemplateId, ""),
        trigger: ["on_start", "on_completion", "manual"].includes(trigger)
          ? (trigger as JourneyAutomationMetadata["trigger"])
          : "on_start",
        notes: asString((base as any).notes, ""),
      } satisfies JourneyAutomationMetadata;
    },
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        journeyTemplateId: {
          type: "string",
          description: "Identifier of the journey template to invoke",
        },
        trigger: {
          type: "string",
          enum: ["on_start", "on_completion", "manual"],
          default: "on_start",
        },
        notes: {
          type: "string",
          description: "Freeform notes for administrators",
        },
      },
    },
  },
};

export type OnboardingStepMetadataType = keyof typeof metadataDefinitions;

export const onboardingStepMetadataSchemas = Object.fromEntries(
  Object.entries(metadataDefinitions).map(([type, config]) => [type, clone(config.schema)]),
);

export function getStepMetadataDefinition<T = any>(
  stepType: string,
): MetadataDefinition<T> | null {
  return (metadataDefinitions as Record<string, MetadataDefinition<T>>)[stepType] ?? null;
}

export function getDefaultMetadataForStep(stepType: string) {
  const def = getStepMetadataDefinition(stepType);
  return def ? clone(def.defaults()) : {};
}

function extractPresetMetadata(value: unknown) {
  if (typeof value !== "object" || !value) {
    return { presetSlug: undefined as string | undefined, tenantScope: undefined as string[] | undefined };
  }
  const base = value as { presetSlug?: unknown; tenantScope?: unknown };
  return {
    presetSlug: asPresetSlug(base.presetSlug),
    tenantScope: asTenantScope(base.tenantScope),
  };
}

export function normalizeStepMetadata(stepType: string, value: unknown) {
  const def = getStepMetadataDefinition(stepType);
  const { presetSlug, tenantScope } = extractPresetMetadata(value);
  const normalized = def
    ? def.normalize(value)
    : (typeof value === "object" && value) || {};
  return {
    ...normalized,
    ...(presetSlug ? { presetSlug } : null),
    ...(tenantScope && tenantScope.length ? { tenantScope } : null),
  };
}

export function listOnboardingMetadataTypes() {
  return Object.keys(metadataDefinitions);
}
