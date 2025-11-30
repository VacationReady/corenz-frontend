"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Trash2,
  Settings2,
  Check,
  AlertCircle,
  FileText,
  Sparkles,
  HelpCircle,
  Zap,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetadataPanel, getMetadataConfig } from "./MetadataPanel";
import { STEP_TYPE_CONFIG } from "./EnhancedStepPalette";
import { StepTypeHelpButton } from "./StepTypeHelp";

// Expansion levels for progressive disclosure
type ExpansionLevel = "collapsed" | "basic" | "advanced";

interface StepType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

interface EnhancedStepCardProps {
  step: any;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (data: any) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  stepType?: StepType;
}

// Validation helpers
function getStepValidationStatus(step: any): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Title is required
  if (!step.title?.trim()) {
    errors.push("Step needs a title");
  }

  // Type-specific validation
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

// Get the primary field for a step type (shown in basic view)
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
      return null; // No primary field needed
    default:
      return null;
  }
}

export function EnhancedStepCard({
  step,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  stepType,
}: EnhancedStepCardProps) {
  const [expansionLevel, setExpansionLevel] = useState<ExpansionLevel>(
    isSelected ? "basic" : "collapsed"
  );

  // Auto-expand when selected
  useEffect(() => {
    if (isSelected && expansionLevel === "collapsed") {
      setExpansionLevel("basic");
    }
  }, [isSelected]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.key,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = stepType?.icon || FileText;
  const hasTitle = step.title?.trim();
  const hasDescription = step.description?.trim();
  const metadataConfig = getMetadataConfig(step.type);
  const validation = getStepValidationStatus(step);
  const primaryField = getPrimaryFieldConfig(step.type);
  const config = STEP_TYPE_CONFIG[step.type];
  const isNzRecommended = config?.isNzRecommended;

  const isExpanded = expansionLevel !== "collapsed";
  const isAdvanced = expansionLevel === "advanced";

  const handleExpand = () => {
    if (expansionLevel === "collapsed") {
      setExpansionLevel("basic");
    } else if (expansionLevel === "basic") {
      setExpansionLevel("collapsed");
    } else {
      setExpansionLevel("basic");
    }
    onSelect();
  };

  const toggleAdvanced = () => {
    setExpansionLevel(isAdvanced ? "basic" : "advanced");
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "group relative rounded-2xl border bg-white dark:bg-slate-800 transition-all duration-200",
          isSelected
            ? "border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/20 shadow-lg shadow-indigo-500/10"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md",
          isDragging && "opacity-50 shadow-2xl scale-[1.02] z-50",
          !validation.isValid && "border-amber-300 dark:border-amber-700"
        )}
      >
        {/* Selection indicator line */}
        {isSelected && (
          <motion.div
            layoutId="selection-indicator"
            className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"
          />
        )}

        {/* Header - Always Visible */}
        <div
          onClick={handleExpand}
          className={cn(
            "flex items-center gap-3 p-4 cursor-pointer",
            isExpanded && "border-b border-slate-100 dark:border-slate-700"
          )}
        >
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex-none cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>

          {/* Step Number Badge */}
          <div className="flex-none w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {index + 1}
            </span>
          </div>

          {/* Step Icon */}
          <div
            className={cn(
              "flex-none w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
              stepType?.color || "from-gray-500 to-gray-600"
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={cn(
                  "font-semibold truncate",
                  hasTitle
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500 italic"
                )}
              >
                {hasTitle ? step.title : "Untitled step"}
              </h4>
              {isNzRecommended && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1.5 py-0 flex-none">
                  <Star className="w-2.5 h-2.5 mr-0.5" />
                  NZ
                </Badge>
              )}
              {!validation.isValid && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-[10px]"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {validation.errors[0]}
                </Badge>
              )}
              {validation.isValid && validation.warnings.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="outline"
                      className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-[10px]"
                    >
                      <HelpCircle className="w-3 h-3 mr-1" />
                      Tip
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{validation.warnings[0]}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {stepType?.label}
              {hasDescription && ` • ${step.description}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex-none flex items-center gap-1">
            {/* Status indicator */}
            {validation.isValid && hasTitle && (
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}

            {/* Help button */}
            <StepTypeHelpButton stepType={step.type} />

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleAdvanced}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  {isAdvanced ? "Hide advanced" : "Advanced settings"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onRemove}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Expand/Collapse */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Basic Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Essential Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Step Title
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={step.title}
                      onChange={(e) => onUpdate({ title: e.target.value })}
                      placeholder="What should employees do?"
                      className={cn(
                        "transition-all",
                        !hasTitle &&
                          "border-amber-300 focus:border-amber-400 focus:ring-amber-400/20"
                      )}
                    />
                    {!hasTitle && (
                      <p className="text-xs text-amber-600">
                        Give this step a clear, action-oriented title
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Description{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      value={step.description}
                      onChange={(e) => onUpdate({ description: e.target.value })}
                      placeholder="Brief instructions for this step..."
                    />
                  </div>
                </div>

                {/* Primary Field (type-specific) */}
                {primaryField && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{primaryField.label}</Label>
                    {primaryField.type === "select" && primaryField.options && (
                      <select
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-indigo-400/20"
                        value={step[primaryField.field] || ""}
                        onChange={(e) =>
                          onUpdate({ [primaryField.field]: e.target.value })
                        }
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

                {/* Advanced Settings Toggle */}
                {metadataConfig && (
                  <div className="pt-2">
                    <button
                      onClick={toggleAdvanced}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all",
                        isAdvanced
                          ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
                          : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Settings2
                          className={cn(
                            "w-4 h-4",
                            isAdvanced
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-500"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isAdvanced
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-slate-700 dark:text-slate-300"
                          )}
                        >
                          Advanced Settings
                        </span>
                        {!isAdvanced && (
                          <Badge variant="secondary" className="text-[10px]">
                            {metadataConfig.title}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isAdvanced
                            ? "rotate-180 text-indigo-600 dark:text-indigo-400"
                            : "text-slate-400"
                        )}
                      />
                    </button>

                    {/* Advanced Metadata Panel */}
                    <AnimatePresence>
                      {isAdvanced && metadataConfig && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4">
                            <MetadataPanel
                              stepType={step.type}
                              value={step.metadata}
                              onChange={(metadata) => onUpdate({ metadata })}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
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

// Form Dropdown Component - Shows screens (FORM, DATA_SCREEN, TABLE) not surveys
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
    // Only fetch screens (FORM, DATA_SCREEN, TABLE) - NOT surveys
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
        // Check if it already exists
        const existingRes = await fetch(`/api/forms/by-slug/${encodeURIComponent(slug)}`);
        if (existingRes.ok) {
          const existing = await existingRes.json();
          setForms((prev) => [existing, ...prev.filter((f) => f.id !== existing.id)]);
          onChange(existing.id);
          return;
        }
        // Create if not existing
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

export default EnhancedStepCard;
