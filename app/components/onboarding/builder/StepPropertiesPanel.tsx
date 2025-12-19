"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  Settings2,
  FileText,
  AlertCircle,
  Check,
  Zap,
  Star,
  Trash2,
  Copy,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetadataPanel, getMetadataConfig } from "./MetadataPanel";
import { STEP_TYPE_CONFIG } from "./EnhancedStepPalette";

interface StepType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

interface StepPropertiesPanelProps {
  step: any | null;
  stepIndex: number | null;
  totalSteps: number;
  stepType?: StepType;
  onUpdate: (data: any) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function getStepValidationStatus(step: any): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!step.title?.trim()) {
    errors.push("Step needs a title");
  }

  switch (step.type) {
    case "acknowledge-document":
      if (!step.documentId) {
        warnings.push("No document selected");
      }
      break;
    case "upload-document":
      if (!step.uploadType) {
        warnings.push("Document type not specified");
      }
      break;
    case "fill-form":
      if (!step.formId && (!step.formFields || step.formFields.length === 0)) {
        warnings.push("No form selected");
      }
      break;
    case "payroll-setup":
      const fields = step.metadata?.fields || [];
      const hasIrdField = fields.some(
        (f: any) => f.fieldType === "irdNumber" || f.id?.toLowerCase().includes("ird")
      );
      if (!hasIrdField) {
        warnings.push("Consider adding IRD number field for NZ compliance");
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

function getPrimaryFieldConfig(stepType: string): {
  label: string;
  field: string;
  type: "text" | "select" | "document" | "form" | "none";
  options?: { value: string; label: string }[];
} | null {
  switch (stepType) {
    case "acknowledge-document":
      return { label: "Document", field: "documentId", type: "document" };
    case "upload-document":
      return {
        label: "Document Type",
        field: "uploadType",
        type: "select",
        options: [
          { value: "passport", label: "Passport" },
          { value: "right-to-work", label: "Right to Work" },
          { value: "driver-licence", label: "Driver Licence" },
          { value: "training-certificate", label: "Training Certificate" },
          { value: "other", label: "Other/Custom" },
        ],
      };
    case "fill-form":
      return { label: "Form", field: "formId", type: "form" };
    case "instructions":
      return null;
    default:
      return null;
  }
}

export function StepPropertiesPanel({
  step,
  stepIndex,
  totalSteps,
  stepType,
  onUpdate,
  onRemove,
  onDuplicate,
}: StepPropertiesPanelProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  if (!step) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-none px-4 py-4 border-b dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Properties</h3>
              <p className="text-xs text-muted-foreground">Step configuration</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Select a step to configure
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click on any step in the canvas to edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  const Icon = stepType?.icon || FileText;
  const hasTitle = step.title?.trim();
  const metadataConfig = getMetadataConfig(step.type);
  const validation = getStepValidationStatus(step);
  const primaryField = getPrimaryFieldConfig(step.type);
  const config = STEP_TYPE_CONFIG[step.type];
  const isNzRecommended = config?.isNzRecommended;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex-none px-4 py-4 border-b dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center",
                stepType?.color || "from-gray-500 to-gray-600"
              )}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Properties</h3>
              <p className="text-xs text-muted-foreground">
                Step {(stepIndex || 0) + 1} of {totalSteps}
              </p>
            </div>
          </div>
          {isNzRecommended && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1.5 py-0">
              <Star className="w-2.5 h-2.5 mr-0.5" />
              NZ
            </Badge>
          )}
        </div>

        {/* Validation Status */}
        {!validation.isValid && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-none" />
            <span className="text-xs text-amber-700 dark:text-amber-300">
              {validation.errors[0]}
            </span>
          </div>
        )}
        {validation.isValid && validation.warnings.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Zap className="w-4 h-4 text-blue-600 flex-none" />
            <span className="text-xs text-blue-700 dark:text-blue-300">
              {validation.warnings[0]}
            </span>
          </div>
        )}
        {validation.isValid && validation.warnings.length === 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <Check className="w-4 h-4 text-emerald-600 flex-none" />
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              Step configured correctly
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Step Type Info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div
            className={cn(
              "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm flex-none",
              stepType?.color || "from-gray-500 to-gray-600"
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-900 dark:text-white">
              {stepType?.label || step.type}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {stepType?.description}
            </p>
          </div>
        </div>

        {/* Title Field */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            Step Title
            <span className="text-red-500">*</span>
          </Label>
          <Input
            value={step.title || ""}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="What should employees do?"
            className={cn(
              "transition-all",
              !hasTitle && "border-amber-300 focus:border-amber-400 focus:ring-amber-400/20"
            )}
          />
          {!hasTitle && (
            <p className="text-xs text-amber-600">
              Give this step a clear, action-oriented title
            </p>
          )}
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Description{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            value={step.description || ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Brief instructions for this step..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Primary Field (type-specific) */}
        {primaryField && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{primaryField.label}</Label>
            {primaryField.type === "select" && primaryField.options && (
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-indigo-400/20"
                value={step[primaryField.field] || ""}
                onChange={(e) => onUpdate({ [primaryField.field]: e.target.value })}
              >
                <option value="">Select {primaryField.label.toLowerCase()}...</option>
                {primaryField.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {primaryField.type === "document" && (
              <DocumentDropdown
                value={step[primaryField.field]}
                onChange={(docId) => onUpdate({ [primaryField.field]: docId })}
              />
            )}
            {primaryField.type === "form" && (
              <FormDropdown
                value={step[primaryField.field]}
                onChange={(formId) => onUpdate({ [primaryField.field]: formId })}
              />
            )}
          </div>
        )}

        {/* Contextual tip */}
        {config?.whenToUse && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <Zap className="w-4 h-4 text-amber-500 flex-none mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                When to use:{" "}
              </span>
              {config.whenToUse}
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        {metadataConfig && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="w-full">
              <div
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl transition-all",
                  showAdvanced
                    ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
                    : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Settings2
                    className={cn(
                      "w-4 h-4",
                      showAdvanced
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500"
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      showAdvanced
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    Advanced Settings
                  </span>
                  {!showAdvanced && (
                    <Badge variant="secondary" className="text-[10px]">
                      {metadataConfig.title}
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    showAdvanced
                      ? "rotate-180 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pt-4"
                  >
                    <MetadataPanel
                      stepType={step.type}
                      value={step.metadata}
                      onChange={(metadata) => onUpdate({ metadata })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex-none px-4 py-3 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            className="flex-1 gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="flex-1 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// Document Dropdown Component
function DocumentDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [docs, setDocs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/documents/list")
      .then((r) => r.json())
      .then((data) => {
        setDocs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setDocs([]);
        setLoading(false);
      });
  }, []);

  return (
    <select
      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-indigo-400/20"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      <option value="">
        {loading ? "Loading documents..." : "Select a document..."}
      </option>
      {docs.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name} {d.category && `(${d.category})`}
        </option>
      ))}
    </select>
  );
}

// Built-in screen templates for the form dropdown
const BUILTIN_SCREEN_OPTIONS = [
  {
    slug: "demographics",
    name: "Demographic Information",
    description: "Equality & diversity details",
    formType: "FORM",
    schema: [
      { id: "gender", type: "select", label: "Gender", required: false, options: ["Female","Male","Non-binary","Prefer not to say"] },
      { id: "ethnicity", type: "text", label: "Ethnicity", required: false },
      { id: "disability", type: "checkbox", label: "Disability", required: false },
    ],
  },
  {
    slug: "emergency-contact",
    name: "Emergency Contact",
    description: "Primary emergency contact",
    formType: "FORM",
    schema: [
      { id: "contactName", type: "text", label: "Contact name", required: true },
      { id: "relationship", type: "text", label: "Relationship", required: true },
      { id: "contactPhone", type: "phone", label: "Phone number", required: true },
    ],
  },
  {
    slug: "bank-details",
    name: "Bank & Payment Details",
    description: "Bank account for salary payments",
    formType: "DATA_SCREEN",
    schema: { version: 2, sections: [ { id: "s1", title: "Bank Details", columns: 1, fields: [
      { id: "bankName", type: "text", label: "Bank name", required: true },
      { id: "accountNumber", type: "text", label: "Account number", required: true },
      { id: "sortCode", type: "text", label: "Sort code / BSB", required: false },
    ] } ] },
  },
  {
    slug: "driver-licence",
    name: "Driver Licence Details",
    description: "Driver licence information",
    formType: "FORM",
    schema: [
      { id: "licenceNumber", type: "text", label: "Licence number", required: true },
      { id: "expiryDate", type: "date", label: "Expiry date", required: true },
      { id: "licenceClass", type: "text", label: "Licence class", required: false },
    ],
  },
];

// Form Dropdown Component
function FormDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [forms, setForms] = React.useState<any[]>([]);
  const [builtins] = React.useState<any[]>(BUILTIN_SCREEN_OPTIONS);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/forms?type=FORM,DATA_SCREEN,TABLE")
      .then((r) => r.json())
      .then((data) => {
        setForms(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setForms([]);
        setLoading(false);
      });
  }, []);

  const handleChange = async (raw: string) => {
    if (!raw) return onChange("");
    if (raw.startsWith("builtin:")) {
      const slug = raw.replace("builtin:", "");
      const def = builtins.find((b) => b.slug === slug);
      if (!def) return;
      try {
        setCreating(true);
        const existingRes = await fetch(`/api/forms/by-slug/${encodeURIComponent(slug)}`);
        if (existingRes.ok) {
          const existing = await existingRes.json();
          setForms((prev) => [existing, ...prev.filter((f) => f.id !== existing.id)]);
          onChange(existing.id);
          return;
        }
        const createRes = await fetch("/api/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: def.name,
            slug: def.slug,
            description: def.description,
            formType: def.formType,
            schema: def.schema,
            visibleToRoles: ["ADMIN", "MANAGER", "EMPLOYEE"],
          }),
        });
        if (createRes.ok) {
          const created = await createRes.json();
          setForms((prev) => [created, ...prev]);
          onChange(created.id);
        }
      } catch {
        // Silently fail
      } finally {
        setCreating(false);
      }
      return;
    }
    onChange(raw);
  };

  return (
    <select
      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-indigo-400/20"
      value={value || ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading || creating}
    >
      <option value="">{loading ? "Loading forms..." : "Select a form..."}</option>
      {forms.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
      {builtins.length > 0 && (
        <optgroup label="Built-in screens (create on select)">
          {builtins.map((b) => (
            <option key={b.slug} value={`builtin:${b.slug}`}>
              {b.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

export default StepPropertiesPanel;
