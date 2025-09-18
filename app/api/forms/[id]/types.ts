// -----------------------------
// Core field and schema types
// -----------------------------

// Keep string for broad compatibility, but document supported values for IDE hinting
export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "time"
  | "dateRange"
  | "select"
  | "radio"
  | "checkbox"
  | "switch"
  | "multiselect"
  | "chips"
  | "rating"
  | "slider"
  | "currency"
  | "percentage"
  | "address"
  | "file"
  | "attachmentGallery"
  | "signature"
  | "table"
  | "list"
  | "computed"
  | "readOnly"
  // Structural/display elements
  | "sectionHeader"
  | "description"
  | "divider"
  | "pageBreak";

export type FieldWidth = "full" | "half" | "third" | "auto";

export interface OptionItem {
  label: string;
  value: string | number | boolean;
  colorHex?: string;
  iconName?: string; // lucide icon name for UI presentation
}

export interface OptionsSource {
  type: "static" | "api" | "hrField" | "custom";
  // For API-backed options
  url?: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: Record<string, any>;
  labelField?: string; // path to label in API response item
  valueField?: string; // path to value in API response item
  dependsOn?: string[]; // field ids this list depends on
  cacheTtlSeconds?: number;
}

export interface ValidationRules {
  required?: boolean; // mirrors legacy required but scoped under validation for new UI
  min?: number; // number/slider/rating
  max?: number;
  minLength?: number; // text/textarea
  maxLength?: number;
  pattern?: string; // regex string
  patternMessage?: string;
}

export type ComparisonOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "greaterThan"
  | "greaterOrEqual"
  | "lessThan"
  | "lessOrEqual"
  | "isEmpty"
  | "isNotEmpty";

export interface Condition {
  fieldId: string; // referenced field id
  operator: ComparisonOperator;
  value?: any; // optional depending on operator
}

export interface ConditionGroup {
  all?: Condition[]; // AND
  any?: Condition[]; // OR
}

export interface FieldLogic {
  visibleWhen?: ConditionGroup;
  requiredWhen?: ConditionGroup;
  // Future: branching/page navigation
  goToPageWhen?: { when: ConditionGroup; pageId: string }[];
}

export interface CalculationConfig {
  expression: string; // e.g. "baseSalary * 0.1"
  dependsOn?: string[]; // referenced field ids used by expression
  format?: "currency" | "percentage" | "number";
  precision?: number; // decimals
}

export interface AddressConfig {
  fields?: Array<
    | "line1"
    | "line2"
    | "city"
    | "state"
    | "postalCode"
    | "country"
  >;
}

export interface TableColumn {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[]; // For select columns
  required?: boolean;
  width?: FieldWidth;
  min?: number;
  max?: number;
}

export interface FormField {
  id: string;
  type: FieldType | string; // string for legacy compatibility
  label: string;
  placeholder?: string;
  required: boolean; // legacy flag; "validation.required" takes precedence if set
  helpText?: string;
  defaultValue?: any;
  readOnly?: boolean;
  hidden?: boolean; // quick visibility toggle in builder

  // Display/layout
  width?: FieldWidth; // fraction of row
  inline?: boolean; // render label/input inline
  columnSpan?: number; // for grid-based layouts

  // Choice data
  options?: string[]; // legacy static options
  optionItems?: OptionItem[]; // rich options
  optionsSource?: OptionsSource; // API-backed options
  appearance?: "dropdown" | "chips" | "buttons";
  multiple?: boolean; // for select/chips

  // Table/List and repeaters
  allowMultiple?: boolean; // legacy for table/list
  tableColumns?: TableColumn[]; // For table fields
  maxEntries?: number; // Maximum number of entries for table fields

  // Specialized configs
  addressConfig?: AddressConfig;

  // Validation
  validation?: ValidationRules;

  // Logic
  logic?: FieldLogic;

  // Calculations/read-only outputs
  calculation?: string; // legacy single-string expression
  calculationConfig?: CalculationConfig; // new structured config
}

// -----------------------------
// V2 Schema: pages/sections with layout metadata
// -----------------------------

export interface FormSection {
  id: string;
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  layout?: "single" | "two-column" | "three-column";
  hidden?: boolean;
  fields: FormField[];
}

export interface FormPage {
  id: string;
  title?: string;
  description?: string;
  sections: FormSection[];
}

export interface FormSchemaV2 {
  version: 2;
  pages?: FormPage[]; // multi-page
  sections?: FormSection[]; // single-page convenience
}

export type LegacySchema = FormField[]; // existing flat array

export type AnyFormSchema = LegacySchema | FormSchemaV2;

// -----------------------------
// Helpers for backward compatibility
// -----------------------------

export function isLegacySchema(schema: AnyFormSchema): schema is LegacySchema {
  return Array.isArray(schema);
}

export function upgradeLegacySchema(schema: LegacySchema): FormSchemaV2 {
  return {
    version: 2,
    sections: [
      {
        id: "default-section",
        title: undefined,
        description: undefined,
        columns: 1,
        layout: "single",
        hidden: false,
        fields: schema,
      },
    ],
  };
}

export function normalizeToPages(schema: AnyFormSchema): FormPage[] {
  if (isLegacySchema(schema)) {
    const wrapped = upgradeLegacySchema(schema);
    return [
      {
        id: "page-1",
        title: undefined,
        description: undefined,
        sections: wrapped.sections || [],
      },
    ];
  }
  if (schema.pages && schema.pages.length > 0) return schema.pages;
  if (schema.sections) {
    return [
      {
        id: "page-1",
        title: undefined,
        description: undefined,
        sections: schema.sections,
      },
    ];
  }
  return [
    {
      id: "page-1",
      title: undefined,
      description: undefined,
      sections: [
        { id: "default-section", columns: 1, layout: "single", hidden: false, fields: [] },
      ],
    },
  ];
}
