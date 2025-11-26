"use client";

import { useMemo, useState, type ReactElement } from "react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/Badge";
import { JourneyTemplatePicker } from "@/components/onboarding/JourneyTemplatePicker";
import { ContextualHelpButton } from "@/components/onboarding/ContextualHelpOverlay";
import { Zap, Check, ChevronDown, Star, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  ChecklistItem,
  TimelineItem,
  PayrollField,
  type PayrollFieldType,
  PAYROLL_FIELD_TYPES,
  DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS,
  DEFAULT_KIWISAVER_STATUS_OPTIONS,
  JsonSchema,
  getDefaultMetadataForStep as getDefaultMetadataForStepBase,
  normalizeStepMetadata as normalizeStepMetadataBase,
  onboardingStepMetadataSchemas,
} from "@/lib/onboarding/stepMetadata";

type MetadataEditorProps<T> = {
  value: T;
  onChange: (value: T) => void;
};

type MetadataConfig<T> = {
  type: string;
  title: string;
  description: string;
  defaults: () => T;
  normalize: (value: unknown) => T;
  schema: JsonSchema;
  Editor: (props: MetadataEditorProps<T>) => ReactElement;
};

const clone = <T,>(value: T): T => {
  const globalClone =
    typeof globalThis === "object" && (globalThis as { structuredClone?: <V>(value: V) => V })
      ? (globalThis as { structuredClone?: <V>(value: V) => V }).structuredClone
      : undefined;
  if (typeof globalClone === "function") {
    return globalClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const randomId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type MetadataPanelProps = {
  stepType: string;
  value: any;
  onChange: (value: any) => void;
};

function EditableChecklist({
  items,
  onChange,
  addLabel,
  allowUrl = false,
  allowNotes = false,
  allowRequired = true,
  emptyLabel,
  itemLabel,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  addLabel: string;
  allowUrl?: boolean;
  allowNotes?: boolean;
  allowRequired?: boolean;
  emptyLabel: string;
  itemLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id || index} className="rounded-lg border bg-white p-3 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>{itemLabel}</Label>
              <Input
                value={item.label}
                onChange={(e) => {
                  const next = items.map((entry, i) =>
                    i === index ? { ...entry, label: e.target.value } : entry,
                  );
                  onChange(next);
                }}
              />
            </div>
            {allowUrl && (
              <div>
                <Label>Link (optional)</Label>
                <Input
                  value={item.url || ""}
                  onChange={(e) => {
                    const next = items.map((entry, i) =>
                      i === index ? { ...entry, url: e.target.value } : entry,
                    );
                    onChange(next);
                  }}
                />
              </div>
            )}
            {allowNotes && (
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={item.notes || ""}
                  onChange={(e) => {
                    const next = items.map((entry, i) =>
                      i === index ? { ...entry, notes: e.target.value } : entry,
                    );
                    onChange(next);
                  }}
                />
              </div>
            )}
            {allowRequired && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(item.required)}
                  onCheckedChange={(checked) => {
                    const next = items.map((entry, i) =>
                      i === index ? { ...entry, required: checked === true } : entry,
                    );
                    onChange(next);
                  }}
                />
                Required
              </label>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      {!items.length && (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange([
            ...items,
            {
              id: randomId(),
              label: "",
              required: true,
            },
          ])
        }
      >
        {addLabel}
      </Button>
    </div>
  );
}

function EditableTimeline({
  items,
  onChange,
  addLabel,
  emptyLabel,
}: {
  items: TimelineItem[];
  onChange: (items: TimelineItem[]) => void;
  addLabel: string;
  emptyLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id || index} className="rounded-lg border bg-white p-3 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label>Label</Label>
              <Input
                value={item.label}
                onChange={(e) => {
                  const next = items.map((entry, i) =>
                    i === index ? { ...entry, label: e.target.value } : entry,
                  );
                  onChange(next);
                }}
              />
            </div>
            <div>
              <Label>Suggested timing</Label>
              <Input
                placeholder="e.g. Week 1"
                value={item.scheduledAt || ""}
                onChange={(e) => {
                  const next = items.map((entry, i) =>
                    i === index ? { ...entry, scheduledAt: e.target.value } : entry,
                  );
                  onChange(next);
                }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      {!items.length && (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange([
            ...items,
            {
              id: randomId(),
              label: "",
              scheduledAt: "",
            },
          ])
        }
      >
        {addLabel}
      </Button>
    </div>
  );
}

const payrollFieldTypeOptions: { value: PayrollFieldType; label: string }[] = [
  { value: "text", label: "Text input" },
  { value: "number", label: "Number input" },
  { value: "irdNumber", label: "IRD number (NZ validation)" },
  { value: "select", label: "Dropdown (custom options)" },
  { value: "kiwiSaverStatus", label: "KiwiSaver status" },
  { value: "kiwiSaverEmployeeRate", label: "KiwiSaver employee rate" },
  { value: "kiwiSaverEmployerRate", label: "KiwiSaver employer rate" },
];

const kiwiSaverStatusLabels: Record<string, string> = {
  enrolled: "Enrolled",
  opted_out: "Opted out",
  contributions_holiday: "Contributions holiday",
};

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatOptionLabel = (option: string, type: PayrollFieldType) => {
  if (type === "kiwiSaverEmployeeRate") {
    const numeric = Number(option);
    if (Number.isFinite(numeric)) {
      return `${(numeric * 100).toFixed(numeric * 100 % 1 === 0 ? 0 : 1)}%`;
    }
  }
  if (type === "kiwiSaverStatus") {
    return kiwiSaverStatusLabels[option] ?? toTitleCase(option);
  }
  return option;
};

function EditablePayrollFields({
  fields,
  onChange,
}: {
  fields: PayrollField[];
  onChange: (fields: PayrollField[]) => void;
}) {
  const updateField = (index: number, patch: Partial<PayrollField>) => {
    const next = fields.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    onChange(next);
  };

  const handleFieldTypeChange = (
    index: number,
    nextType: PayrollFieldType,
    current: PayrollField,
  ) => {
    let nextOptions: string[] | undefined;
    if (nextType === "kiwiSaverEmployeeRate") {
      nextOptions = Array.from(DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS);
    } else if (nextType === "kiwiSaverStatus") {
      nextOptions = Array.from(DEFAULT_KIWISAVER_STATUS_OPTIONS);
    } else if (nextType === "select") {
      nextOptions = current.options && current.options.length
        ? current.options
        : ["Option 1", "Option 2"];
    }

    const nextDefault = (() => {
      if (!nextOptions || !nextOptions.length) {
        return current.defaultValue ?? "";
      }
      if (current.defaultValue && nextOptions.includes(current.defaultValue)) {
        return current.defaultValue;
      }
      return nextOptions[0];
    })();

    updateField(index, {
      fieldType: nextType,
      options: nextOptions,
      defaultValue: nextDefault,
    });
  };

  return (
    <div className="space-y-3">
      {fields.map((field, index) => {
        const fieldType = (PAYROLL_FIELD_TYPES.includes(
          field.fieldType as PayrollFieldType,
        )
          ? field.fieldType
          : "text") as PayrollFieldType;
        const options = field.options
          ? field.options
          : fieldType === "kiwiSaverEmployeeRate"
            ? Array.from(DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS)
            : fieldType === "kiwiSaverStatus"
              ? Array.from(DEFAULT_KIWISAVER_STATUS_OPTIONS)
              : [];

        const defaultValue =
          fieldType === "select" || fieldType === "kiwiSaverEmployeeRate" || fieldType === "kiwiSaverStatus"
            ? field.defaultValue && options.includes(field.defaultValue)
              ? field.defaultValue
              : options[0] ?? ""
            : field.defaultValue ?? "";

        return (
          <div
            key={field.id || index}
            className="rounded-lg border bg-white p-3 space-y-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Field key</Label>
                <Input
                  value={field.id}
                  onChange={(e) => updateField(index, { id: e.target.value })}
                />
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                />
              </div>
              <div>
                <Label>Field type</Label>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={fieldType}
                  onChange={(e) =>
                    handleFieldTypeChange(index, e.target.value as PayrollFieldType, field)
                  }
                >
                  {payrollFieldTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {fieldType === "select" && (
                <div className="md:col-span-2 space-y-1">
                  <Label>Options (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={options.join("\n")}
                    onChange={(e) => {
                      const entries = e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean);
                      updateField(index, {
                        options: entries,
                        defaultValue:
                          entries.length && (!defaultValue || !entries.includes(defaultValue))
                            ? entries[0]
                            : defaultValue,
                      });
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide the dropdown options exactly as you want them stored.
                  </p>
                </div>
              )}
              {(fieldType === "select" ||
                fieldType === "kiwiSaverEmployeeRate" ||
                fieldType === "kiwiSaverStatus") && (
                <div>
                  <Label>Default option</Label>
                  <select
                    className="w-full rounded-md border p-2 text-sm"
                    value={defaultValue}
                    onChange={(e) => updateField(index, { defaultValue: e.target.value })}
                  >
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {formatOptionLabel(option, fieldType)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(fieldType === "text" ||
                fieldType === "number" ||
                fieldType === "irdNumber" ||
                fieldType === "kiwiSaverEmployerRate") && (
                <div>
                  <Label>Default value (optional)</Label>
                  <Input
                    value={defaultValue}
                    onChange={(e) => updateField(index, { defaultValue: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>Placeholder (optional)</Label>
                <Input
                  value={field.placeholder || ""}
                  onChange={(e) => updateField(index, { placeholder: e.target.value })}
                  disabled={
                    fieldType === "kiwiSaverStatus" || fieldType === "kiwiSaverEmployeeRate"
                  }
                />
              </div>
            </div>
            {fieldType === "irdNumber" && (
              <p className="text-xs text-muted-foreground">
                NZ IRD numbers must be 8–9 digits. Employees will be blocked from saving
                invalid numbers.
              </p>
            )}
            {fieldType === "kiwiSaverEmployeeRate" && (
              <p className="text-xs text-muted-foreground">
                Supported employee rates: {DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS.map((rate) =>
                  `${Number(rate) * 100}%`,
                ).join(", ")}.
              </p>
            )}
            {fieldType === "kiwiSaverEmployerRate" && (
              <p className="text-xs text-muted-foreground">
                Employer contributions must be at least 3% when the employee is enrolled in
                KiwiSaver.
              </p>
            )}
            {fieldType === "kiwiSaverStatus" && (
              <p className="text-xs text-muted-foreground">
                Track whether the employee is enrolled, opted out, or on a contributions
                holiday.
              </p>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(field.required)}
                onCheckedChange={(checked) =>
                  updateField(index, { required: checked === true })
                }
              />
              Required from employee
            </label>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(fields.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          </div>
        );
      })}
      {!fields.length && (
        <p className="text-sm text-muted-foreground">
          Add payroll fields to collect during onboarding.
        </p>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange([
            ...fields,
            {
              id: randomId(),
              label: "",
              defaultValue: "",
              required: true,
              fieldType: "text",
              placeholder: "",
            },
          ])
        }
      >
        Add payroll field
      </Button>
    </div>
  );
}

// Payroll field presets
type PayrollPreset = {
  name: string;
  description: string;
  badge?: string;
  instructions: string;
  fields: Array<{
    id: string;
    label: string;
    placeholder?: string;
    required: boolean;
    fieldType: PayrollFieldType;
    defaultValue?: string;
    options?: string[];
  }>;
};

const PAYROLL_PRESETS: Record<string, PayrollPreset> = {
  "nz-standard": {
    name: "NZ Standard",
    description: "Complete NZ payroll setup with IRD, tax code, bank details, and KiwiSaver",
    badge: "Recommended",
    instructions: "Please complete your payroll details below. Your IRD number is required for tax purposes under New Zealand law. If you're unsure about your tax code, the most common is 'M' for main income with no student loan, or 'M SL' if you have a student loan.",
    fields: [
      {
        id: "bankAccountNumber",
        label: "Bank account number",
        placeholder: "00-0000-0000000-00",
        required: true,
        fieldType: "text" as PayrollFieldType,
      },
      {
        id: "irdNumber",
        label: "IRD number",
        placeholder: "123-456-789",
        required: true,
        fieldType: "irdNumber" as PayrollFieldType,
      },
      {
        id: "taxCode",
        label: "Tax code",
        placeholder: "e.g. M, M SL, S, S SL, SH, SH SL",
        required: true,
        fieldType: "text" as PayrollFieldType,
      },
      {
        id: "kiwiSaverStatus",
        label: "KiwiSaver status",
        required: true,
        defaultValue: DEFAULT_KIWISAVER_STATUS_OPTIONS[0],
        fieldType: "kiwiSaverStatus" as PayrollFieldType,
        options: Array.from(DEFAULT_KIWISAVER_STATUS_OPTIONS),
      },
      {
        id: "kiwiSaverEmployeeRate",
        label: "KiwiSaver employee contribution rate",
        required: false,
        defaultValue: DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS[0],
        fieldType: "kiwiSaverEmployeeRate" as PayrollFieldType,
        options: Array.from(DEFAULT_KIWISAVER_EMPLOYEE_RATE_OPTIONS),
      },
    ],
  },
  "minimal": {
    name: "Minimal",
    description: "Just bank account details - for contractors or when IRD is collected separately",
    instructions: "Please enter your bank account details for payment.",
    fields: [
      {
        id: "bankAccountNumber",
        label: "Bank account number",
        placeholder: "00-0000-0000000-00",
        required: true,
        fieldType: "text" as PayrollFieldType,
      },
    ],
  },
  "ird-only": {
    name: "IRD & Tax Only",
    description: "IRD number and tax code without KiwiSaver - for employees who've already opted out",
    instructions: "Please enter your IRD number and tax code.",
    fields: [
      {
        id: "irdNumber",
        label: "IRD number",
        placeholder: "123-456-789",
        required: true,
        fieldType: "irdNumber" as PayrollFieldType,
      },
      {
        id: "taxCode",
        label: "Tax code",
        placeholder: "e.g. M, M SL, S, S SL",
        required: true,
        fieldType: "text" as PayrollFieldType,
      },
    ],
  },
  "custom": {
    name: "Custom",
    description: "Build your own payroll field configuration",
    instructions: "",
    fields: [],
  },
};

type PayrollPresetKey = "nz-standard" | "minimal" | "ird-only" | "custom";

function PayrollSetupEditor({
  value,
  onChange,
}: MetadataEditorProps<{ instructions: string; fields: PayrollField[] }>) {
  const [selectedPreset, setSelectedPreset] = useState<PayrollPresetKey | null>(null);
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Detect current preset based on fields
  const detectPreset = (): PayrollPresetKey | null => {
    const fieldIds = new Set(value.fields.map((f) => f.id));
    
    if (fieldIds.has("irdNumber") && fieldIds.has("kiwiSaverStatus") && fieldIds.has("bankAccountNumber")) {
      return "nz-standard";
    }
    if (fieldIds.size === 1 && fieldIds.has("bankAccountNumber")) {
      return "minimal";
    }
    if (fieldIds.has("irdNumber") && fieldIds.has("taxCode") && !fieldIds.has("kiwiSaverStatus")) {
      return "ird-only";
    }
    if (fieldIds.size > 0) {
      return "custom";
    }
    return null;
  };

  const applyPreset = (presetKey: PayrollPresetKey) => {
    const preset = PAYROLL_PRESETS[presetKey];
    if (presetKey === "custom") {
      setShowCustomEditor(true);
      setSelectedPreset("custom");
      return;
    }
    
    onChange({
      instructions: preset.instructions,
      fields: preset.fields.map((f) => ({
        ...f,
        id: f.id || randomId(),
      })),
    });
    setSelectedPreset(presetKey);
    setShowCustomEditor(false);
  };

  const currentPreset = selectedPreset || detectPreset();

  return (
    <div className="space-y-4">
      {/* Preset Selection */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Quick Setup</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PAYROLL_PRESETS) as PayrollPresetKey[]).map((key) => {
            const preset = PAYROLL_PRESETS[key];
            const isSelected = currentPreset === key;
            
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={cn(
                  "relative p-3 rounded-lg border text-left transition-all",
                  isSelected
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                {preset.badge && (
                  <Badge className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[9px] px-1 py-0">
                    <Star className="w-2 h-2 mr-0.5" />
                    {preset.badge}
                  </Badge>
                )}
                <div className="flex items-center gap-2 mb-1">
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {preset.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current fields summary */}
      {value.fields.length > 0 && !showCustomEditor && currentPreset !== "custom" && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Fields included ({value.fields.length})
            </span>
            <button
              type="button"
              onClick={() => setShowCustomEditor(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" />
              Customize
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {value.fields.map((field) => (
              <Badge key={field.id} variant="secondary" className="text-[10px]">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Custom Editor */}
      {(showCustomEditor || currentPreset === "custom") && (
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Custom Fields</Label>
            {currentPreset !== "custom" && (
              <button
                type="button"
                onClick={() => setShowCustomEditor(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Hide editor
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              rows={3}
              value={value.instructions}
              onChange={(e) => onChange({ ...value, instructions: e.target.value })}
              placeholder="Instructions shown to the employee..."
            />
          </div>
          
          <EditablePayrollFields
            fields={value.fields}
            onChange={(fields) => onChange({ ...value, fields })}
          />
        </div>
      )}

      {/* NZ Compliance tip */}
      {currentPreset !== "nz-standard" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Zap className="w-4 h-4 text-amber-600 flex-none mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-medium">NZ Compliance Tip:</span> The NZ Standard preset includes all fields required for IRD payday filing and KiwiSaver enrollment.
          </div>
        </div>
      )}
    </div>
  );
}

const metadataConfigs: Record<string, MetadataConfig<any>> = {
  "acknowledge-document": {
    type: "acknowledge-document",
    title: "Acknowledgement settings",
    description: "Customise the acknowledgement text presented to employees.",
    defaults: () => getDefaultMetadataForStepBase("acknowledge-document"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("acknowledge-document", value),
    schema: onboardingStepMetadataSchemas["acknowledge-document"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-2">
        <Label>Acknowledgement text</Label>
        <Textarea
          rows={2}
          value={value.acknowledgementText}
          onChange={(e) =>
            onChange({ ...value, acknowledgementText: e.target.value })
          }
        />
      </div>
    ),
  },
  "upload-document": {
    type: "upload-document",
    title: "Upload configuration",
    description:
      "Define upload guidance and restrict the accepted file types for this step.",
    defaults: () => getDefaultMetadataForStepBase("upload-document"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("upload-document", value),
    schema: onboardingStepMetadataSchemas["upload-document"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Helper text</Label>
          <Textarea
            rows={3}
            value={value.instructions}
            onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Document category</Label>
          <Input
            value={value.category}
            onChange={(e) => onChange({ ...value, category: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Accepted file extensions</Label>
          <Textarea
            rows={2}
            value={value.allowedFileTypes.join(", ")}
            onChange={(e) =>
              onChange({
                ...value,
                allowedFileTypes: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            placeholder=".pdf, .jpg, .png"
          />
          <p className="text-xs text-muted-foreground">
            Provide a comma-separated list of extensions (include the leading dot).
          </p>
        </div>
      </div>
    ),
  },
  "collect-document": {
    type: "collect-document",
    title: "Collection guidance",
    description: "Set the instructions for managers when collecting documents manually.",
    defaults: () => getDefaultMetadataForStepBase("collect-document"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("collect-document", value),
    schema: onboardingStepMetadataSchemas["collect-document"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-2">
        <Label>Instructions</Label>
        <Textarea
          rows={3}
          value={value.instructions}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
        />
      </div>
    ),
  },
  "fill-form": {
    type: "fill-form",
    title: "Form guidance",
    description: "Optional guidance displayed alongside the form widget.",
    defaults: () => getDefaultMetadataForStepBase("fill-form"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("fill-form", value),
    schema: onboardingStepMetadataSchemas["fill-form"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-2">
        <Label>Guidance (optional)</Label>
        <Textarea
          rows={3}
          value={value.guidance}
          onChange={(e) => onChange({ ...value, guidance: e.target.value })}
        />
      </div>
    ),
  },
  instructions: {
    type: "instructions",
    title: "Button configuration",
    description: "Tailor the action button label for instruction-only steps.",
    defaults: () => getDefaultMetadataForStepBase("instructions"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("instructions", value),
    schema: onboardingStepMetadataSchemas.instructions,
    Editor: ({ value, onChange }) => (
      <div className="space-y-2">
        <Label>Button label</Label>
        <Input
          value={value.buttonLabel}
          onChange={(e) => onChange({ ...value, buttonLabel: e.target.value })}
        />
      </div>
    ),
  },
  "training-assignment": {
    type: "training-assignment",
    title: "Training modules",
    description: "List the learning modules that must be completed during onboarding.",
    defaults: () => getDefaultMetadataForStepBase("training-assignment"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("training-assignment", value),
    schema: onboardingStepMetadataSchemas["training-assignment"],
    Editor: ({ value, onChange }) => (
      <EditableChecklist
        items={value.modules}
        onChange={(modules) => onChange({ ...value, modules })}
        addLabel="Add training module"
        allowUrl
        allowNotes={false}
        emptyLabel="No training modules configured yet."
        itemLabel="Module name"
      />
    ),
  },
  "equipment-checklist": {
    type: "equipment-checklist",
    title: "Equipment checklist",
    description: "Track which equipment has been issued to the new hire.",
    defaults: () => getDefaultMetadataForStepBase("equipment-checklist"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("equipment-checklist", value),
    schema: onboardingStepMetadataSchemas["equipment-checklist"],
    Editor: ({ value, onChange }) => (
      <EditableChecklist
        items={value.items}
        onChange={(items) => onChange({ ...value, items })}
        addLabel="Add equipment item"
        allowNotes
        emptyLabel="No equipment configured yet."
        itemLabel="Item"
      />
    ),
  },
  "system-access": {
    type: "system-access",
    title: "System access",
    description: "List the systems and permissions the employee should receive.",
    defaults: () => getDefaultMetadataForStepBase("system-access"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("system-access", value),
    schema: onboardingStepMetadataSchemas["system-access"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Instructions</Label>
          <Textarea
            rows={3}
            value={value.instructions}
            onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          />
        </div>
        <EditableChecklist
          items={value.systems}
          onChange={(systems) => onChange({ ...value, systems })}
          addLabel="Add system"
          allowUrl
          allowNotes
          emptyLabel="No systems configured."
          itemLabel="System name"
        />
      </div>
    ),
  },
  "manager-checkin": {
    type: "manager-checkin",
    title: "Manager check-ins",
    description: "Plan the cadence of manager check-ins during probation.",
    defaults: () => getDefaultMetadataForStepBase("manager-checkin"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("manager-checkin", value),
    schema: onboardingStepMetadataSchemas["manager-checkin"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Meeting template</Label>
          <Textarea
            rows={3}
            value={value.template}
            onChange={(e) => onChange({ ...value, template: e.target.value })}
          />
        </div>
        <EditableTimeline
          items={value.timeline}
          onChange={(timeline) => onChange({ ...value, timeline })}
          addLabel="Add check-in"
          emptyLabel="No check-ins planned yet."
        />
      </div>
    ),
  },
  "buddy-introduction": {
    type: "buddy-introduction",
    title: "Buddy introduction",
    description: "Provide context and notes for the onboarding buddy.",
    defaults: () => getDefaultMetadataForStepBase("buddy-introduction"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("buddy-introduction", value),
    schema: onboardingStepMetadataSchemas["buddy-introduction"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-2">
        <Label>Buddy notes</Label>
        <Textarea
          rows={3}
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </div>
    ),
  },
  "compliance-training": {
    type: "compliance-training",
    title: "Compliance courses",
    description: "Track statutory or mandatory compliance training.",
    defaults: () => getDefaultMetadataForStepBase("compliance-training"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("compliance-training", value),
    schema: onboardingStepMetadataSchemas["compliance-training"],
    Editor: ({ value, onChange }) => (
      <EditableChecklist
        items={value.courses}
        onChange={(courses) => onChange({ ...value, courses })}
        addLabel="Add compliance course"
        allowUrl
        emptyLabel="No compliance courses configured."
        itemLabel="Course name"
      />
    ),
  },
  "payroll-setup": {
    type: "payroll-setup",
    title: "Payroll data requirements",
    description: "Capture the payroll fields and any default values required for setup.",
    defaults: () => getDefaultMetadataForStepBase("payroll-setup"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("payroll-setup", value),
    schema: onboardingStepMetadataSchemas["payroll-setup"],
    Editor: ({ value, onChange }) => (
      <PayrollSetupEditor value={value} onChange={onChange} />
    ),
  },
  "benefits-enrollment": {
    type: "benefits-enrollment",
    title: "Benefits links",
    description: "Keep track of benefit providers and enrollment URLs.",
    defaults: () => getDefaultMetadataForStepBase("benefits-enrollment"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("benefits-enrollment", value),
    schema: onboardingStepMetadataSchemas["benefits-enrollment"],
    Editor: ({ value, onChange }) => (
      <EditableChecklist
        items={value.links}
        onChange={(links) => onChange({ ...value, links })}
        addLabel="Add benefit link"
        allowUrl
        allowRequired
        emptyLabel="No benefits configured yet."
        itemLabel="Benefit name"
      />
    ),
  },
  "probation-goals": {
    type: "probation-goals",
    title: "Probation goals",
    description: "Outline probation milestones and expectations.",
    defaults: () => getDefaultMetadataForStepBase("probation-goals"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("probation-goals", value),
    schema: onboardingStepMetadataSchemas["probation-goals"],
    Editor: ({ value, onChange }) => (
      <EditableChecklist
        items={value.milestones}
        onChange={(milestones) => onChange({ ...value, milestones })}
        addLabel="Add goal"
        allowNotes
        emptyLabel="No probation goals configured."
        itemLabel="Goal"
      />
    ),
  },
  "welcome-survey": {
    type: "welcome-survey",
    title: "Survey metadata",
    description: "Link to a question set and add optional guidance for the survey.",
    defaults: () => getDefaultMetadataForStepBase("welcome-survey"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("welcome-survey", value),
    schema: onboardingStepMetadataSchemas["welcome-survey"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Question set identifier</Label>
          <Input
            value={value.questionSet}
            onChange={(e) => onChange({ ...value, questionSet: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Instructions</Label>
          <Textarea
            rows={3}
            value={value.instructions}
            onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          />
        </div>
      </div>
    ),
  },
  "journey-automation": {
    type: "journey-automation",
    title: "Journey automation",
    description:
      "Configure which journey template should be triggered and when.",
    defaults: () => getDefaultMetadataForStepBase("journey-automation"),
    normalize: (value: unknown) =>
      normalizeStepMetadataBase("journey-automation", value),
    schema: onboardingStepMetadataSchemas["journey-automation"],
    Editor: ({ value, onChange }) => (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Journey template</Label>
          <JourneyTemplatePicker
            value={value.journeyTemplateId || ""}
            onChange={(journeyTemplateId) => onChange({ ...value, journeyTemplateId })}
            placeholder="Select a journey to trigger..."
          />
        </div>
        <div className="space-y-2">
          <Label>Trigger</Label>
          <select
            className="w-full rounded-md border p-2"
            value={value.trigger}
            onChange={(e) => onChange({ ...value, trigger: e.target.value })}
          >
            <option value="on_start">On start</option>
            <option value="on_completion">On completion</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
          />
        </div>
      </div>
    ),
  },
};

export { onboardingStepMetadataSchemas } from "@/lib/onboarding/stepMetadata";

export function getMetadataConfig(stepType: string) {
  return metadataConfigs[stepType] ?? null;
}

export const normalizeStepMetadata = normalizeStepMetadataBase;

export function MetadataPanel({ stepType, value, onChange }: MetadataPanelProps) {
  const config = getMetadataConfig(stepType);
  const normalized = useMemo(() => {
    if (!config) return {};
    const hydrated = value ? config.normalize(value) : config.defaults();
    return clone(hydrated);
  }, [config, value]);

  if (!config) return null;

  return (
    <div className="col-span-2 mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-700">{config.title}</h4>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
      <config.Editor
        value={normalized}
        onChange={(next) => {
          onChange(clone(config.normalize(next)));
        }}
      />
    </div>
  );
}

export const getDefaultMetadataForStep = getDefaultMetadataForStepBase;
