"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  X,
  GripVertical,
  FileText,
  UploadCloud,
  FileEdit,
  Info,
  RotateCcw,
  Wrench,
  KeySquare,
  CalendarClock,
  UserRoundPlus,
  ShieldCheck,
  Wallet,
  HeartPulse,
  Target,
  Smile,
  Workflow,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DialogFooter } from "@/components/ui/dialog";
import { StepPalette } from "./builder/StepPalette";
import { OnboardingPreviewPane } from "./builder/OnboardingPreviewPane";
import { StepsDroppableArea } from "./builder/StepsDroppableArea";
import {
  MetadataPanel,
  getDefaultMetadataForStep,
  getMetadataConfig,
  normalizeStepMetadata,
} from "./builder/MetadataPanel";
import {
  mapDbStepTypeToUi,
  mapDbUploadTypeToUi,
} from "@/lib/onboarding/stepTypeMapping";
import {
  NZ_ONBOARDING_PRESETS,
  NZ_PRESET_STEP_LOOKUP,
  type NzOnboardingPreset,
} from "@/lib/onboarding/nzPresets";
import { useTenantMetadataVersioning, type PendingVersion } from "./builder/useTenantMetadataVersioning";
import { useSession } from "next-auth/react";
import {
  createTemplateSnapshot,
  diffTemplates,
  describeTemplateDiff,
  type TemplateDiff,
  type TemplateSnapshot,
} from "@/lib/onboarding/templateDiff";

// --- Step Types
const STEP_TYPES = [
        { value: "acknowledge-document", label: "Acknowledge Document", icon: FileText },
        { value: "upload-document", label: "Upload Document", icon: UploadCloud },
	{ value: "collect-document", label: "Collect Existing Document", icon: UploadCloud },
	{ value: "fill-form", label: "Fill Form", icon: FileEdit },
	{ value: "instructions", label: "Welcome/Instructions", icon: Info },
	{ value: "training-assignment", label: "Assign Training", icon: ShieldCheck },
	{ value: "equipment-checklist", label: "Equipment Checklist", icon: Wrench },
	{ value: "system-access", label: "System Access", icon: KeySquare },
	{ value: "manager-checkin", label: "Manager Check-in", icon: CalendarClock },
	{ value: "buddy-introduction", label: "Buddy Introduction", icon: UserRoundPlus },
	{ value: "compliance-training", label: "Compliance Training", icon: ShieldCheck },
	{ value: "payroll-setup", label: "Payroll Setup", icon: Wallet },
	{ value: "benefits-enrollment", label: "Benefits Enrollment", icon: HeartPulse },
	{ value: "probation-goals", label: "Probation Goals", icon: Target },
	{ value: "welcome-survey", label: "Welcome Survey", icon: Smile },
        { value: "journey-automation", label: "Journey Automation", icon: Workflow },
];

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [20, 25, 50, 100];

// --- Key generator utility
function getStepKey(step: any) {
  return step.id || step.key;
}

function createStep(type: string) {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return {
    key: uuid,
    type,
    title: "",
    description: "",
    required: true,
    documentId: "",
    uploadType: "",
    formId: "", // For reusable forms
    formFields: [], // For inline fields (backward compatibility)
    metadata: getDefaultMetadataForStep(type),
  };
}

const clone = <T,>(value: T): T => {
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { structuredClone?: <V>(payload: V) => V }).structuredClone === "function"
  ) {
    return (globalThis as { structuredClone: <V>(payload: V) => V }).structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const hydrateTemplateStep = (step: any) => {
  const baseType =
    (step && typeof step === "object" && (step as any).uiType)
      ? (step as any).uiType
      : step.type;
  const uiType = mapDbStepTypeToUi(baseType) ||
    (typeof baseType === "string"
      ? baseType.toLowerCase().replace(/_/g, "-")
      : baseType);
  return {
    key:
      step.id ||
      step.key ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)),
    id: step.id,
    type: uiType,
    title: step.label || "",
    description: step.instruction || "",
    required: step.required ?? true,
    documentId: step.documentId || "",
    uploadType: mapDbUploadTypeToUi(step.uploadType),
    formId: step.formId || "",
    formFields: step.formFields || [],
    metadata: normalizeStepMetadata(uiType, step.metadata),
  };
};

const hydrateTemplateSteps = (template?: any) =>
  template?.steps?.length ? template.steps.map(hydrateTemplateStep) : [];

type ConflictState = {
  type: "stale-on-load" | "save-conflict";
  latestTemplate: any;
  latestSnapshot: TemplateSnapshot;
  diff: TemplateDiff;
  message: string;
  detectedAt: number;
};

const buildAuditSummaryDescription = (version: PendingVersion) => {
  const changeLines = version.changes.map((change) => {
    const fields = change.changes.map((item) => item.field).join(", ");
    return (
      <li key={change.stepKey} className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{change.stepTitle || "Step"}</span>
        {fields ? ` — ${fields}` : " — metadata updated"}
      </li>
    );
  });

  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-muted-foreground">
        Tenant {version.tenantId} • Metadata version {version.version}
      </div>
      <ul className="list-disc space-y-1 pl-4">{changeLines}</ul>
    </div>
  );
};

// --- Document dropdown (API)
function DocumentDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/documents/list")
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []));
  }, []);

  return (
    <select
      className="w-full border rounded-md p-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select a document…</option>
      {docs.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name} ({d.category})
        </option>
      ))}
    </select>
  );
}

// Built-in screen templates (always available)
const BUILTIN_SCREEN_TEMPLATES = [
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
    slug: "equipment-allocation",
    name: "Equipment Allocation",
    description: "Devices & assets issued",
    formType: "DATA_SCREEN",
    schema: { version: 2, sections: [ { id: "s1", title: "Equipment", columns: 1, fields: [
      { id: "laptop", type: "checkbox", label: "Laptop issued", required: false },
      { id: "phone", type: "checkbox", label: "Phone issued", required: false },
      { id: "notes", type: "textarea", label: "Notes", required: false },
    ] } ] },
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

// --- Screen/Form dropdown (API) - Shows FORM, DATA_SCREEN, TABLE types (NOT surveys)
function FormDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [forms, setForms] = useState<any[]>([]);
  // Initialize builtins with the templates immediately
  const [builtins, setBuiltins] = useState<any[]>(BUILTIN_SCREEN_TEMPLATES);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Only fetch screens (FORM, DATA_SCREEN, TABLE) - NOT surveys
        const fRes = await fetch("/api/forms?type=FORM,DATA_SCREEN,TABLE");
        if (fRes.ok) {
          const fJson = await fRes.json();
          setForms(Array.isArray(fJson) ? fJson : []);
        }
        
        // Try to fetch additional defaults from API
        const bRes = await fetch("/api/forms/defaults");
        if (bRes.ok) {
          const bJson = await bRes.json();
          const curated = Array.isArray(bJson) ? bJson : [];
          // Merge API defaults with our templates, avoiding duplicates
          const allBuiltins = [...BUILTIN_SCREEN_TEMPLATES];
          for (const c of curated) {
            if (!allBuiltins.some((b) => b.slug === c.slug) && c.formType !== "SURVEY") {
              allBuiltins.push(c);
            }
          }
          setBuiltins(allBuiltins);
        }
      } catch {
        // On error, keep the default builtins (already set in state)
        setForms([]);
      }
    };
    load();
  }, []);

  const handleChange = async (raw: string) => {
    if (!raw) return onChange("");
    if (raw.startsWith("builtin:")) {
      const slug = raw.replace("builtin:", "");
      const def = builtins.find((b) => b.slug === slug);
      if (!def) return;
      try {
        setCreating(true);
        // 1) Reuse if it already exists by slug
        const existingRes = await fetch(`/api/forms/by-slug/${encodeURIComponent(slug)}`);
        if (existingRes.ok) {
          const existing = await existingRes.json();
          setForms((prev) => [existing, ...prev.filter((f) => f.id !== existing.id)]);
          onChange(existing.id);
          return;
        }

        // 2) Create if not existing yet
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
            visibleToDepartments: [],
            visibleToJobRoles: [],
          }),
        });
        if (createRes.ok) {
          const created = await createRes.json();
          setForms((prev) => [created, ...prev]);
          onChange(created.id);
          return;
        }

        // 3) If server rejects (e.g., duplicate by name), try to find by name
        const allRes = await fetch("/api/forms");
        if (allRes.ok) {
          const all = await allRes.json();
          const found = (Array.isArray(all) ? all : []).find(
            (f: any) => String(f.name).toLowerCase() === String(def.name).toLowerCase(),
          );
          if (found) {
            onChange(found.id);
            return;
          }
        }
        toast.error("Failed to create built-in form");
      } catch {
        toast.error("Failed to create built-in form");
      } finally {
        setCreating(false);
      }
      return;
    }
    onChange(raw);
  };

  return (
    <select
      className="w-full border rounded-md p-2"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={creating}
    >
      <option value="">Select a form…</option>
      {forms.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name} {f.description && `(${f.description})`}
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

// Built-in survey templates (always available)
const BUILTIN_SURVEY_TEMPLATES = [
  {
    slug: "welcome-feedback",
    name: "Welcome Feedback Survey",
    description: "First week feedback from new hire",
    formType: "SURVEY",
    schema: [
      { id: "overallExperience", type: "rating", label: "How would you rate your onboarding experience so far?", required: true },
      { id: "clarity", type: "rating", label: "How clear were the instructions provided?", required: true },
      { id: "support", type: "rating", label: "How supported did you feel during your first days?", required: true },
      { id: "suggestions", type: "textarea", label: "Any suggestions for improvement?", required: false },
    ],
  },
  {
    slug: "30-day-checkin",
    name: "30-Day Check-in Survey",
    description: "First month feedback survey",
    formType: "SURVEY",
    schema: [
      { id: "settledIn", type: "rating", label: "How settled do you feel in your role?", required: true },
      { id: "teamIntegration", type: "rating", label: "How well have you integrated with your team?", required: true },
      { id: "roleClarity", type: "rating", label: "How clear are you about your role expectations?", required: true },
      { id: "concerns", type: "textarea", label: "Any concerns or feedback?", required: false },
    ],
  },
  {
    slug: "onboarding-completion",
    name: "Onboarding Completion Survey",
    description: "Final onboarding feedback",
    formType: "SURVEY",
    schema: [
      { id: "overallSatisfaction", type: "rating", label: "Overall satisfaction with onboarding", required: true },
      { id: "preparedness", type: "rating", label: "How prepared do you feel for your role?", required: true },
      { id: "recommend", type: "select", label: "Would you recommend our onboarding process?", required: true, options: ["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"] },
      { id: "bestPart", type: "textarea", label: "What was the best part of your onboarding?", required: false },
      { id: "improvements", type: "textarea", label: "What could we improve?", required: false },
    ],
  },
];

// --- Survey dropdown (API) - Shows only SURVEY type forms
function SurveyDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [surveys, setSurveys] = useState<any[]>([]);
  // Initialize builtins with the templates immediately
  const [builtins, setBuiltins] = useState<any[]>(BUILTIN_SURVEY_TEMPLATES);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Only fetch SURVEY type forms
        const fRes = await fetch("/api/forms?type=SURVEY");
        if (fRes.ok) {
          const fJson = await fRes.json();
          setSurveys(Array.isArray(fJson) ? fJson : []);
        }
      } catch {
        // On error, keep empty surveys list but builtins remain available
        setSurveys([]);
      }
    };
    load();
  }, []);

  const handleChange = async (raw: string) => {
    if (!raw) return onChange("");
    if (raw.startsWith("builtin:")) {
      const slug = raw.replace("builtin:", "");
      const def = builtins.find((b) => b.slug === slug);
      if (!def) return;
      try {
        setCreating(true);
        // 1) Reuse if it already exists by slug
        const existingRes = await fetch(`/api/forms/by-slug/${encodeURIComponent(slug)}`);
        if (existingRes.ok) {
          const existing = await existingRes.json();
          setSurveys((prev) => [existing, ...prev.filter((f) => f.id !== existing.id)]);
          onChange(existing.id);
          return;
        }

        // 2) Create if not existing yet
        const createRes = await fetch("/api/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: def.name,
            slug: def.slug,
            description: def.description,
            formType: "SURVEY",
            schema: def.schema,
            visibleToRoles: ["ADMIN", "MANAGER", "EMPLOYEE"],
            visibleToDepartments: [],
            visibleToJobRoles: [],
          }),
        });
        if (createRes.ok) {
          const created = await createRes.json();
          setSurveys((prev) => [created, ...prev]);
          onChange(created.id);
          return;
        }

        // 3) If server rejects (e.g., duplicate by name), try to find by name
        const allRes = await fetch("/api/forms?type=SURVEY");
        if (allRes.ok) {
          const all = await allRes.json();
          const found = (Array.isArray(all) ? all : []).find(
            (f: any) => String(f.name).toLowerCase() === String(def.name).toLowerCase(),
          );
          if (found) {
            onChange(found.id);
            return;
          }
        }
        toast.error("Failed to create survey");
      } catch {
        toast.error("Failed to create survey");
      } finally {
        setCreating(false);
      }
      return;
    }
    onChange(raw);
  };

  return (
    <select
      className="w-full border rounded-md p-2"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={creating}
    >
      <option value="">Select a survey…</option>
      {surveys.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name} {f.description && `(${f.description})`}
        </option>
      ))}
      {builtins.length > 0 && (
        <optgroup label="Survey templates (create on select)">
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

// --- Custom FormFields Editor
function FormFieldsEditor({
  fields,
  onChange,
}: {
  fields: any[];
  onChange: (fields: any[]) => void;
}) {
  const [editFields, setEditFields] = useState<any[]>(fields || []);
  useEffect(() => {
    onChange(editFields);
  }, [editFields]);

  return (
    <div>
      <div className="space-y-2 mb-3">
        {editFields.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="w-1/3"
              placeholder="Field label"
              value={f.label}
              onChange={(e) => {
                const arr = [...editFields];
                arr[i].label = e.target.value;
                setEditFields(arr);
              }}
            />
            <select
              className="w-1/4 border rounded-md p-2"
              value={f.type}
              onChange={(e) => {
                const arr = [...editFields];
                arr[i].type = e.target.value;
                setEditFields(arr);
              }}
            >
              <option value="text">Text</option>
              <option value="date">Date</option>
              <option value="file">File Upload</option>
              <option value="number">Number</option>
              <option value="select">Dropdown</option>
            </select>
            <Button
              type="button"
              size="md"
              variant="ghost"
              onClick={() =>
                setEditFields(editFields.filter((_, idx) => idx !== i))
              }
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          setEditFields([...editFields, { label: "", type: "text" }])
        }
      >
        + Add Field
      </Button>
    </div>
  );
}

// --- StepEditor (memoized)
const StepEditor = React.memo(function StepEditor({
  step,
  idx,
  updateStep,
  removeStep,
  onSelect,
  isSelected,
}: {
  step: any;
  idx: number;
  updateStep: (idx: number, data: any) => void;
  removeStep: (idx: number) => void;
  onSelect?: () => void;
  isSelected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: getStepKey(step),
  });
  const metadataConfig = getMetadataConfig(step.type);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group mb-3 relative bg-white rounded-2xl p-6 border transition-all duration-150 ${
        isSelected ? "border-blue-500 ring-2 ring-blue-200 shadow-md" : "border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex gap-2 items-center" onMouseDown={onSelect}>
          <GripVertical
            className="text-gray-400 cursor-grab w-4 h-4 opacity-70 group-hover:opacity-100"
            {...attributes}
            {...listeners}
          />
          <span className="uppercase text-xs font-semibold text-gray-500">
            {STEP_TYPES.find((t) => t.value === step.type)?.label}
          </span>
        </div>
        <Button size="md" variant="ghost" className="opacity-70 hover:opacity-100" onClick={() => removeStep(idx)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Step Title</Label>
          <Input
            className="border border-gray-300"
            value={step.title}
            onChange={(e) => updateStep(idx, { title: e.target.value })}
            onFocus={onSelect}
            maxLength={80}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            className="border border-gray-300"
            value={step.description}
            onChange={(e) => updateStep(idx, { description: e.target.value })}
            onFocus={onSelect}
            maxLength={200}
          />
        </div>
        {/* Required toggle removed - all steps are mandatory */}

        {/* --- Type-specific fields --- */}
        {step.type === "acknowledge-document" && (
          <div className="col-span-2">
            <Label>Document to Acknowledge</Label>
            <DocumentDropdown
              value={step.documentId}
              onChange={(docId) => updateStep(idx, { documentId: docId })}
            />
          </div>
        )}

        {step.type === "upload-document" && (
          <div className="col-span-2">
            <Label>Type of Document to Upload</Label>
            <select
              className="w-full border rounded-md p-2"
              value={step.uploadType || ""}
              onChange={(e) => updateStep(idx, { uploadType: e.target.value })}
              onFocus={onSelect}
            >
              <option value="">Select type…</option>
              <option value="passport">Passport</option>
              <option value="right-to-work">Right to Work</option>
              <option value="driver-licence">Driver Licence</option>
              <option value="training-certificate">Training Certificate</option>
              <option value="other">Other/Custom</option>
            </select>
          </div>
        )}

        {step.type === "fill-form" && (
          <div className="col-span-2">
            <div className="space-y-4">
              <div>
                <Label>Select Screen or Custom Form</Label>
                <FormDropdown
                  value={step.formId || ""}
                  onChange={(formId) =>
                    updateStep(idx, {
                      formId,
                      formFields: formId ? [] : step.formFields,
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a screen from the Screen Designer (e.g., emergency contacts, driver licence details).
                </p>
              </div>
              {!step.formId && (
                <div>
                  <Label>Or Create Inline Fields (Legacy)</Label>
                  <FormFieldsEditor
                    fields={step.formFields || []}
                    onChange={(fields) =>
                      updateStep(idx, { formFields: fields })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Inline fields are harder to manage. Consider creating
                    a reusable screen instead.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step.type === "welcome-survey" && (
          <div className="col-span-2">
            <div className="space-y-4">
              <div>
                <Label>Select Survey Form</Label>
                <SurveyDropdown
                  value={step.formId || ""}
                  onChange={(formId) =>
                    updateStep(idx, {
                      formId,
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a survey to collect feedback from the new hire.
                </p>
              </div>
            </div>
          </div>
        )}

        {metadataConfig && (
          <MetadataPanel
            stepType={step.type}
            value={step.metadata}
            onChange={(metadata) =>
              updateStep(idx, {
                metadata,
              })
            }
          />
        )}
      </div>
    </div>
  );
});

// --- Main Component
export default function OnboardingTemplateEditor({
  template,
  onSaved,
  onCancel,
}: {
  template?: any;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { data: session } = useSession();
  const tenantId = session?.user?.companyId ?? null;
  const { queueMetadataChange, prepareCommit, commit, rollback } =
    useTenantMetadataVersioning();
  const baselineSnapshotRef = useRef<TemplateSnapshot>(
    createTemplateSnapshot(template),
  );
  const serverVersionRef = useRef<string | null>(
    baselineSnapshotRef.current.updatedAt,
  );
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const latestSyncAttemptedRef = useRef<string | null>(null);
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [departments, setDepartments] = useState<string[]>(
    template?.departments?.map((d: any) => d.id) || [],
  );
  const [jobRoles, setJobRoles] = useState<string[]>(
    template?.jobRoles?.map((j: any) => j.id) || [],
  );
  const [departmentsList, setDepartmentsList] = useState<
    { label: string; value: string }[]
  >([]);
  const [jobRolesList, setJobRolesList] = useState<
    { label: string; value: string }[]
  >([]);
  const [steps, setSteps] = useState<any[]>(() => hydrateTemplateSteps(template));
  const [baselineSteps, setBaselineSteps] = useState<any[]>(() =>
    hydrateTemplateSteps(template),
  );
  const [isPresetLibraryOpen, setIsPresetLibraryOpen] = useState(false);
  const [tenantScopeOptions, setTenantScopeOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [tenantScopeSelection, setTenantScopeSelection] = useState<string[]>(
    () => (tenantId ? [tenantId] : []),
  );

  const [selectedIndex, setSelectedIndexState] = useState<number | null>(
    () => (template?.steps?.length ? 0 : null),
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const baselineMapRef = useRef<Map<string, any>>(new Map());
  const stepsRef = useRef<any[]>(steps);
  const baselineStepsRef = useRef<any[]>(baselineSteps);
  const previousTenantIdRef = useRef<string | null>(tenantId);
  const fallbackTenantScope = useMemo(
    () => (tenantId ? [tenantId] : ["default"]),
    [tenantId],
  );
  const activeTenantScope = useMemo(
    () => (tenantScopeSelection.length ? tenantScopeSelection : fallbackTenantScope),
    [tenantScopeSelection, fallbackTenantScope],
  );
  const presetUsage = useMemo(() => {
    const coverage = new Map<string, Set<string>>();
    const fallback = fallbackTenantScope;
    steps.forEach((step) => {
      const slug = step?.metadata?.presetSlug;
      if (!slug) return;
      const lookup = NZ_PRESET_STEP_LOOKUP.get(slug);
      if (!lookup) return;
      const scope =
        Array.isArray(step?.metadata?.tenantScope) && step.metadata.tenantScope.length
          ? step.metadata.tenantScope
          : fallback;
      const entry = coverage.get(lookup.presetId) ?? new Set<string>();
      scope.forEach((tenantKey: string) => entry.add(tenantKey));
      coverage.set(lookup.presetId, entry);
    });
    return coverage;
  }, [steps, fallbackTenantScope]);

  const applyPreset = useCallback(
    (preset: NzOnboardingPreset) => {
      if (!preset) return;
      const scope = [...activeTenantScope];
      let added = 0;
      let extended = 0;
      const createdSteps: { key: string; title: string; metadata: any }[] = [];
      const updatedSteps: { key: string; title: string; metadata: any }[] = [];

      setSteps((prev) => {
        const next = [...prev];
        preset.steps.forEach((presetStep) => {
          const slug = presetStep.slug;
          const metadataPayload = {
            ...(presetStep.metadata || {}),
            presetSlug: slug,
            tenantScope: scope,
          };
          const existingIndex = next.findIndex(
            (step) => step?.metadata?.presetSlug === slug,
          );

          if (existingIndex >= 0) {
            const existing = next[existingIndex];
            const existingScope =
              Array.isArray(existing.metadata?.tenantScope) &&
              existing.metadata?.tenantScope.length
                ? existing.metadata.tenantScope
                : fallbackTenantScope;
            const addsNewTenant = scope.some(
              (tenantKey: string) => !existingScope.includes(tenantKey),
            );
            if (!addsNewTenant) {
              return;
            }
            const mergedScope = Array.from(new Set([...existingScope, ...scope]));
            const mergedMetadata = normalizeStepMetadata(existing.type, {
              ...existing.metadata,
              presetSlug: slug,
              tenantScope: mergedScope,
            });
            const updated = { ...existing, metadata: mergedMetadata };
            next[existingIndex] = updated;
            updatedSteps.push({
              key: getStepKey(updated),
              title: updated.title || updated.type,
              metadata: mergedMetadata,
            });
            extended += 1;
            return;
          }

          const baseStep = createStep(presetStep.type);
          const hydratedMetadata = normalizeStepMetadata(
            presetStep.type,
            metadataPayload,
          );
          const newStep = {
            ...baseStep,
            title: presetStep.title,
            description: presetStep.description,
            required: presetStep.required ?? baseStep.required,
            documentId: presetStep.documentId ?? baseStep.documentId,
            uploadType: presetStep.uploadType ?? baseStep.uploadType,
            formId: presetStep.formId ?? baseStep.formId,
            formFields: presetStep.formFields ?? baseStep.formFields,
            metadata: hydratedMetadata,
          };
          next.push(newStep);
          createdSteps.push({
            key: getStepKey(newStep),
            title: newStep.title || newStep.type,
            metadata: hydratedMetadata,
          });
          added += 1;
        });
        return next;
      });

      const affected = [...createdSteps, ...updatedSteps];
      if (tenantId && affected.length) {
        affected.forEach((entry) => {
          const baseline = baselineMapRef.current.get(entry.key);
          queueMetadataChange(
            tenantId,
            entry.key,
            entry.title,
            baseline?.metadata ?? {},
            entry.metadata,
          );
        });
      }

      if (added === 0 && extended === 0) {
        toast.info("Preset already applied", {
          description: "Every step already covers the selected tenants.",
        });
        return;
      }

      toast.success(`Injected ${added + extended} NZ compliance step${
        added + extended === 1 ? "" : "s"
      }`, {
        description:
          [
            added ? `${added} new step${added === 1 ? "" : "s"}` : null,
            extended
              ? `${extended} existing step${extended === 1 ? "" : "s"} now cover${
                  extended === 1 ? "s" : ""
                } more tenants`
              : null,
          ]
            .filter(Boolean)
            .join(" • ") || undefined,
      });
    },
    [activeTenantScope, fallbackTenantScope, queueMetadataChange, tenantId],
  );

  useEffect(() => {
    if (!tenantId) return;
    if (previousTenantIdRef.current === tenantId) {
      return;
    }
    previousTenantIdRef.current = tenantId;
    setTenantScopeSelection([tenantId]);
  }, [tenantId]);

  useEffect(() => {
    const baseOption = tenantId
      ? [
          {
            value: tenantId,
            label:
              (session?.user as any)?.companyName ||
              `Tenant ${tenantId.slice(0, 8).toUpperCase()}`,
          },
        ]
      : [];
    setTenantScopeOptions(baseOption);

    if (session?.user?.role !== "SUPER_ADMIN") {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    fetch("/api/tenants", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load tenants");
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const options = Array.isArray(payload?.companies)
          ? payload.companies.map((company: any) => ({
              value: company.id,
              label:
                typeof company.name === "string" && company.name.trim().length
                  ? company.name
                  : `Tenant ${company.id.slice(0, 8).toUpperCase()}`,
            }))
          : baseOption;
        setTenantScopeOptions(options);
      })
      .catch(() => {
        if (!cancelled) {
          setTenantScopeOptions(baseOption);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [session?.user?.role, tenantId]);

  const selectStep = useCallback(
    (index: number | null) => {
      if (index == null || Number.isNaN(index)) {
        setSelectedIndexState(null);
        setCurrentPage(0);
        return;
      }
      setSelectedIndexState(index);
      setCurrentPage(Math.max(0, Math.floor(index / pageSize)));
    },
    [pageSize],
  );

  const goToPage = useCallback(
    (page: number) => {
      const total = stepsRef.current.length;
      const maxPage = Math.max(0, Math.ceil(Math.max(total, 1) / pageSize) - 1);
      const clamped = Math.min(Math.max(page, 0), maxPage);
      const start = clamped * pageSize;
      const end = Math.min(start + pageSize, total);
      setCurrentPage(clamped);
      setSelectedIndexState((prev) => {
        if (total === 0) {
          return null;
        }
        if (prev == null || prev < start || prev >= end) {
          return start < end ? start : Math.max(0, total - 1);
        }
        return prev;
      });
    },
    [pageSize],
  );

  useEffect(() => {
    setCurrentPage((prev) => {
      const maxPage = Math.max(
        0,
        Math.ceil(Math.max(steps.length, 1) / pageSize) - 1,
      );
      return prev > maxPage ? maxPage : prev;
    });
  }, [steps.length, pageSize]);

  useEffect(() => {
    if (selectedIndex == null) {
      if (!steps.length) {
        setCurrentPage(0);
      }
      return;
    }
    const targetPage = Math.max(0, Math.floor(selectedIndex / pageSize));
    setCurrentPage((prev) => (prev === targetPage ? prev : targetPage));
  }, [selectedIndex, pageSize, steps.length]);
  const getEditorSnapshot = useCallback(() =>
    createTemplateSnapshot({
      id: template?.id ?? baselineSnapshotRef.current.id,
      name,
      description,
      isActive: template?.isActive ?? false,
      updatedAt: baselineSnapshotRef.current.updatedAt,
      departments: departments.map((id) => ({ id })),
      jobRoles: jobRoles.map((id) => ({ id })),
      steps: steps.map((step, index) => ({
        id: step.id,
        key: step.key,
        type: step.type,
        title: step.title,
        description: step.description,
        documentId: step.documentId ?? null,
        uploadType: step.uploadType ?? null,
        formId: step.formId ?? null,
        metadata: step.metadata,
        order: index + 1,
      })),
    }),
  [
    template?.id,
    template?.isActive,
    name,
    description,
    departments,
    jobRoles,
    steps,
    baselineSnapshotRef,
  ]);

  useEffect(() => {
    baselineMapRef.current = new Map(
      baselineSteps.map((step: any) => [getStepKey(step), step]),
    );
  }, [baselineSteps]);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    baselineStepsRef.current = baselineSteps;
  }, [baselineSteps]);

  useEffect(() => {
    const snapshot = createTemplateSnapshot(template);
    baselineSnapshotRef.current = snapshot;
    serverVersionRef.current = snapshot.updatedAt;
    latestSyncAttemptedRef.current = null;
    setConflictState(null);
    setName(template?.name || "");
    setDescription(template?.description || "");
    setDepartments(template?.departments?.map((d: any) => d.id) || []);
    setJobRoles(template?.jobRoles?.map((j: any) => j.id) || []);
    const hydrated = hydrateTemplateSteps(template);
    setSteps(hydrated);
    setBaselineSteps(hydrated);
    selectStep(hydrated.length ? 0 : null);
  }, [template, selectStep]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetch("/api/departments/active"),
          fetch("/api/job-roles/active"),
        ]);
        const deptData = await deptRes.json();
        const roleData = await roleRes.json();
        setDepartmentsList(
          Array.isArray(deptData)
            ? deptData.map((d: any) => ({ label: d.name, value: d.id }))
            : [],
        );
        setJobRolesList(
          Array.isArray(roleData)
            ? roleData.map((j: any) => ({ label: j.name, value: j.id }))
            : [],
        );
      } catch {
        setDepartmentsList([]);
        setJobRolesList([]);
      }
    };
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (!template?.id) return;
    if (latestSyncAttemptedRef.current === template.id) return;
    latestSyncAttemptedRef.current = template.id;

    const controller = new AbortController();

    const run = async () => {
      try {
        const res = await fetch(`/api/onboarding/templates?id=${template.id}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const payload = await res.json();
        if (controller.signal.aborted) return;

        const latestSnapshot = createTemplateSnapshot(payload);
        const baselineSnapshot = baselineSnapshotRef.current;
        const diff = diffTemplates(baselineSnapshot, latestSnapshot);

        if (diff.hasChanges) {
          setConflictState({
            type: "stale-on-load",
            latestTemplate: payload,
            latestSnapshot,
            diff,
            message:
              payload?.updatedBy?.name || payload?.updatedBy?.email
                ? `Latest update by ${
                    payload.updatedBy.name || payload.updatedBy.email
                  }`
                : "A newer version of this template is available.",
            detectedAt: Date.now(),
          });
          return;
        }

        baselineSnapshotRef.current = latestSnapshot;
        serverVersionRef.current = latestSnapshot.updatedAt;

        const hasLocalChanges =
          JSON.stringify(stepsRef.current) !==
          JSON.stringify(baselineStepsRef.current);

        if (!hasLocalChanges) {
          const hydrated = hydrateTemplateSteps(payload);
          setSteps(hydrated);
          setBaselineSteps(hydrated);
          selectStep(hydrated.length ? 0 : null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Failed to sync latest onboarding template", error);
        }
      }
    };

    run();

    return () => controller.abort();
  }, [template?.id, baselineStepsRef, stepsRef, selectStep]);

  const addStep = useCallback(
    (type: string) => {
      setSteps((prev) => {
        const next = [...prev, createStep(type)];
        const created = next[next.length - 1];
        selectStep(next.length - 1);
        if (created && tenantId) {
          const key = getStepKey(created);
          const baseline = baselineMapRef.current.get(key);
          queueMetadataChange(
            tenantId,
            key,
            created.title || created.label || created.type,
            baseline?.metadata ?? {},
            created.metadata,
          );
        }
        return next;
      });
    },
    [tenantId, queueMetadataChange, selectStep],
  );

  const updateStep = useCallback(
    (idx: number, data: any) => {
      setSteps((prev) => {
        const arr = [...prev];
        const original = arr[idx];
        if (!original) return prev;
        const merged = { ...original, ...data };
        if ("metadata" in data) {
          merged.metadata = normalizeStepMetadata(
            merged.type,
            (data as any).metadata,
          );
        }
        arr[idx] = merged;
        if (tenantId) {
          const key = getStepKey(merged);
          const baseline = baselineMapRef.current.get(key);
          queueMetadataChange(
            tenantId,
            key,
            merged.title || merged.label || merged.type,
            baseline?.metadata ?? {},
            merged.metadata,
          );
        }
        return arr;
      });
    },
    [tenantId, queueMetadataChange],
  );

  const removeStep = useCallback(
    (idx: number) => {
      setSteps((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        const removed = prev[idx];
        if (tenantId && removed) {
          const key = getStepKey(removed);
          const baseline = baselineMapRef.current.get(key);
          queueMetadataChange(
            tenantId,
            key,
            removed.title || removed.label || removed.type,
            baseline?.metadata ?? {},
            baseline?.metadata ?? {},
          );
        }
        if (selectedIndex !== null) {
          const nextIndex = next.length
            ? Math.min(selectedIndex, next.length - 1)
            : null;
          selectStep(nextIndex);
        }
        return next;
      });
    },
    [tenantId, queueMetadataChange, selectedIndex, selectStep],
  );

  const loadLatestVersion = useCallback(
    (state: ConflictState) => {
      const latest = state.latestTemplate;
      const snapshot = state.latestSnapshot;

      baselineSnapshotRef.current = snapshot;
      serverVersionRef.current = snapshot.updatedAt;

      const hydrated = hydrateTemplateSteps(latest);
      setName(latest?.name || "");
      setDescription(latest?.description || "");
      setDepartments(
        Array.isArray(latest?.departments)
          ? latest.departments
              .map((d: any) => (typeof d?.id === "string" ? d.id : null))
              .filter(Boolean)
          : [],
      );
      setJobRoles(
        Array.isArray(latest?.jobRoles)
          ? latest.jobRoles
              .map((j: any) => (typeof j?.id === "string" ? j.id : null))
              .filter(Boolean)
          : [],
      );
      setSteps(hydrated);
      setBaselineSteps(hydrated);
      stepsRef.current = hydrated;
      baselineStepsRef.current = hydrated;
      selectStep(hydrated.length ? 0 : null);
      setConflictState(null);
      toast.success("Loaded the latest template from the server.", {
        description: describeTemplateDiff(state.diff).join(" • ") || undefined,
      });
    },
    [
      setDepartments,
      setDescription,
      setJobRoles,
      setName,
      setBaselineSteps,
      setSteps,
      selectStep,
    ],
  );

  const acknowledgeConflict = useCallback((state: ConflictState) => {
    baselineSnapshotRef.current = {
      ...baselineSnapshotRef.current,
      updatedAt: state.latestSnapshot.updatedAt,
    };
    serverVersionRef.current = state.latestSnapshot.updatedAt;
    setConflictState(null);
    const summary = describeTemplateDiff(state.diff);
    toast.warning("Your next save will overwrite the remote changes.", {
      description: summary.length ? summary.join(" • ") : undefined,
    });
  }, []);

	const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

		// If dragging from the left palette, create a new step at the drop index
		const dragged = (active.data?.current as any) || {};
                if (dragged?.source === "step-palette" && dragged?.type) {
                        setSteps((prev) => {
                                const total = prev.length;
                                const maxPage = Math.max(0, Math.ceil(Math.max(total, 1) / pageSize) - 1);
                                const safeCurrentPage = Math.min(Math.max(currentPage, 0), maxPage);
                                const pageStartIndex = safeCurrentPage * pageSize;
                                const pageEndIndex = Math.min(pageStartIndex + pageSize, total);
                                const defaultInsertIndex = pageEndIndex;
                                const targetIndex =
                                        over.id === "steps-canvas"
                                                ? defaultInsertIndex
                                                : Math.max(
                                                        0,
                                                        prev.findIndex((item) => getStepKey(item) === over.id),
                                                );
                                const normalizedIndex =
                                        targetIndex === -1 ? defaultInsertIndex : targetIndex;
                                const next = [...prev];
                                next.splice(normalizedIndex, 0, createStep(dragged.type));
                                selectStep(normalizedIndex);
                                return next;
                        });
                        return;
                }

		// Reordering existing steps
                setSteps((prevSteps) => {
                        const oldIndex = prevSteps.findIndex(
                                (item) => getStepKey(item) === active.id,
                        );
                        const newIndex = prevSteps.findIndex(
                                (item) => getStepKey(item) === over.id,
                        );

                        if (oldIndex === -1 || newIndex === -1) {
                                return prevSteps;
                        }

                        return arrayMove(prevSteps, oldIndex, newIndex);
                });
  }, [selectStep, currentPage, pageSize]);

  const handleSave = async (publish = false) => {
    if (conflictState) {
      toast.warning("Resolve conflicts before saving your changes.");
      return;
    }

    if (!name.trim()) {
      toast.error("Template name required");
      return;
    }

    // Validate that all steps have non-empty titles
    const emptyTitleSteps: number[] = [];
    const labelCounts = new Map<string, number>();
    
    steps.forEach((step, idx) => {
      const label = (step.title || "").trim();
      if (!label) {
        emptyTitleSteps.push(idx + 1);
      } else {
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      }
    });

    // Reject empty titles - admins must provide explicit labels
    if (emptyTitleSteps.length > 0) {
      toast.error("Empty step titles detected", {
        description: `Steps ${emptyTitleSteps.join(", ")} have no title. All steps must have a unique, non-empty title.`,
      });
      return;
    }

    // Validate step label uniqueness
    const duplicateLabels = Array.from(labelCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([label]) => label);

    if (duplicateLabels.length > 0) {
      toast.error("Duplicate step labels detected", {
        description: `Each step must have a unique label. Duplicates: ${duplicateLabels.join(", ")}`,
      });
      return;
    }

    toast.info(
      "This will not affect previously completed versions of this template, and any outstanding templates will not be altered. This will purely be for any future new starters onboarding using this template",
    );

    const pendingVersion = prepareCommit(tenantId);
    const previousBaselineSnapshot = clone(baselineSteps);
    const currentStepsSnapshot = clone(steps);
    const previousSelectedIndex = selectedIndex;
    const editorSnapshot = getEditorSnapshot();

    class SaveConflictError extends Error {}

    try {
      setSaving(true);
      if (publish) setPublishing(true);

      const body = {
        id: template?.id,
        name,
        description,
        departments,
        jobRoles,
        steps: steps.map((s, i) => ({
          id: s.id,
          key: s.key,
          type: s.type,
          title: s.title,
          description: s.description,
          required: true,
          order: i + 1,
          documentId: s.documentId || null,
          uploadType: s.uploadType || null,
          formId: s.formId || null,
          formFields: s.formFields || [],
          metadata: normalizeStepMetadata(s.type, s.metadata),
        })),
        isActive: publish,
        lastKnownUpdatedAt: serverVersionRef.current,
      };

      const res = await fetch("/api/onboarding/templates", {
        method: template?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 409 && payload?.latestTemplate) {
          const latestSnapshot = createTemplateSnapshot(payload.latestTemplate);
          const diff = diffTemplates(payload.latestTemplate, editorSnapshot);
          setConflictState({
            type: "save-conflict",
            latestTemplate: payload.latestTemplate,
            latestSnapshot,
            diff,
            message:
              payload?.error || "Another editor saved changes to this template.",
            detectedAt: Date.now(),
          });
          const summary = describeTemplateDiff(diff);
          toast.warning(payload?.error || "Template has changed on the server.", {
            description: summary.length ? summary.join(" • ") : undefined,
          });
          throw new SaveConflictError(payload?.error || "Conflict detected");
        }
        throw new Error(payload?.error || "Error saving template");
      }

      if (tenantId && pendingVersion) {
        commit(tenantId, pendingVersion);
      }

      if (payload) {
        const snapshot = createTemplateSnapshot(payload);
        baselineSnapshotRef.current = snapshot;
        serverVersionRef.current = snapshot.updatedAt;
        const hydrated = hydrateTemplateSteps(payload);
        setBaselineSteps(hydrated);
        setSteps(hydrated);
        selectStep(
          hydrated.length
            ? Math.min(previousSelectedIndex ?? 0, hydrated.length - 1)
            : null,
        );
      } else {
        setBaselineSteps(currentStepsSnapshot);
        setSteps(currentStepsSnapshot);
      }

      const summaryDescription =
        tenantId && pendingVersion && pendingVersion.changes.length
          ? buildAuditSummaryDescription(pendingVersion)
          : undefined;

      toast.success(`Template ${publish ? "published" : "saved"}!`, {
        description:
          summaryDescription ??
          (tenantId && pendingVersion
            ? `Tenant ${tenantId} • Metadata version ${pendingVersion.version}`
            : undefined),
      });

      onSaved();
    } catch (error) {
      if (error instanceof SaveConflictError) {
        setBaselineSteps(previousBaselineSnapshot);
        setSteps(currentStepsSnapshot);
        selectStep(previousSelectedIndex ?? null);
      } else {
        if (tenantId) {
          rollback(tenantId);
        }
        setBaselineSteps(previousBaselineSnapshot);
        setSteps(previousBaselineSnapshot);
        selectStep(
          previousBaselineSnapshot.length
            ? Math.min(
                previousSelectedIndex ?? 0,
                previousBaselineSnapshot.length - 1,
              )
            : null,
        );
        const message =
          error instanceof Error ? error.message : "Error saving template";
        toast.error(message);
      }
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

	const StepTypePicker = () => (
    <Accordion type="single" collapsible className="mt-3 mb-6">
      <AccordionItem value="step-types">
        <AccordionTrigger className="text-sm font-semibold">
          Add Step
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-2">
            {STEP_TYPES.map((t) => (
              <Button
                key={t.value}
                variant="ghost"
                onClick={() => addStep(t.value)}
                className="flex items-center gap-2"
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </Button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  

  const PreviewBlock = () => (
    <div className="bg-muted border p-6 rounded-xl mt-6 mb-4">
      <h3 className="font-semibold mb-2">
        Onboarding preview (as new starter):
      </h3>
      <ol className="list-decimal ml-5 space-y-2">
        {steps.map((s) => (
          <li key={getStepKey(s)}>
            <span className="font-bold">
              {s.title || STEP_TYPES.find((t) => t.value === s.type)?.label}
            </span>{" "}
            <span className="text-xs text-gray-500">{s.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );

  const totalSteps = steps.length;
  const totalPages = totalSteps === 0 ? 1 : Math.ceil(totalSteps / pageSize);
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalSteps);
  const visibleSteps = steps.slice(pageStart, pageEnd);
  const showingRangeStart = totalSteps ? pageStart + 1 : 0;
  const showingRangeEnd = totalSteps ? pageEnd : 0;
  const canGoPrevious = safePage > 0;
  const canGoNext = safePage < totalPages - 1;
  const previewStep =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < totalSteps
      ? steps[selectedIndex]
      : null;

  return (
    <div className="p-6">
      {conflictState && (
        <Alert
          variant={conflictState.type === "save-conflict" ? "destructive" : "default"}
          className="mb-4"
        >
          <AlertTitle>
            {conflictState.type === "save-conflict"
              ? "Changes detected on the server"
              : "Newer version available"}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-3">
              <p>
                {conflictState.message}
                {conflictState.latestSnapshot.updatedAt && (
                  <>
                    {" "}(last updated {" "}
                    {new Date(conflictState.latestSnapshot.updatedAt).toLocaleString()})
                  </>
                )}
              </p>
              {(() => {
                const summary = describeTemplateDiff(conflictState.diff);
                if (!summary.length) return null;
                return (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {summary.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                );
              })()}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => loadLatestVersion(conflictState)}>
                  Load latest version
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => acknowledgeConflict(conflictState)}
                >
                  {conflictState.type === "save-conflict"
                    ? "Overwrite with my edits"
                    : "Continue with my version"}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">
          {template ? "Edit Onboarding Template" : "New Onboarding Template"}
        </h2>
        {template?.updatedAt && (
          <div className="flex items-center text-sm text-gray-500 gap-2 mb-2">
            <RotateCcw className="h-4 w-4" />
            <span>
              Last updated {new Date(template.updatedAt).toLocaleString()} by{" "}
              {template.updatedBy?.name ||
                template.updatedBy?.email ||
                "Unknown"}
            </span>
          </div>
        )}
        <Label>Template Name</Label>
        <Input
          className="mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        <Label>Description</Label>
        <Textarea
          className="mb-3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <Label>Departments (optional)</Label>
            <MultiSelect
              options={departmentsList}
              selected={departments}
              onChange={setDepartments}
              placeholder="All Departments"
            />
          </div>
          <div className="flex-1">
            <Label>Job Roles (optional)</Label>
            <MultiSelect
              options={jobRolesList}
              selected={jobRoles}
              onChange={setJobRoles}
              placeholder="All Job Roles"
            />
          </div>
        </div>
      </div>

                        <div className="space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                                <h3 className="text-lg font-semibold mb-1">Steps</h3>
                                                <p className="text-gray-500 mb-2">
                                                        Drag from the left to add steps. Drag within the list to reorder.
                                                </p>
                                        </div>
                                        <div className="flex flex-col items-start gap-1 text-left sm:items-end sm:text-right">
                                                <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setIsPresetLibraryOpen(true)}
                                                >
                                                        <ShieldCheck className="mr-2 h-4 w-4" /> NZ compliance presets
                                                </Button>
                                                <p className="text-xs text-muted-foreground max-w-[240px]">
                                                        Apply IRD, KiwiSaver, and H&S starter packs without overwriting tenant-specific steps.
                                                </p>
                                        </div>
                                </div>
                                <StepTypePicker />
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                        <div className="text-sm text-muted-foreground">
                                                {totalSteps === 0
                                                        ? "No steps yet. Start adding items from the palette."
                                                        : `Showing ${showingRangeStart}-${showingRangeEnd} of ${totalSteps} steps`}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        Page size
                                                        <select
                                                                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                value={pageSize}
                                                                onChange={(event) => {
                                                                        const nextSize = Number(event.target.value);
                                                                        setPageSize(
                                                                                Number.isFinite(nextSize) && nextSize > 0
                                                                                        ? nextSize
                                                                                        : DEFAULT_PAGE_SIZE,
                                                                        );
                                                                }}
                                                        >
                                                                {PAGE_SIZE_OPTIONS.map((size) => (
                                                                        <option key={size} value={size}>
                                                                                {size}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                        <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => goToPage(safePage - 1)}
                                                                disabled={!canGoPrevious || totalSteps === 0}
                                                                aria-label="Previous page"
                                                        >
                                                                <ChevronLeft className="h-4 w-4" />
                                                        </Button>
                                                        <span className="text-sm font-medium">
                                                                Page {totalPages ? safePage + 1 : 1} of {totalPages}
                                                        </span>
                                                        <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => goToPage(safePage + 1)}
                                                                disabled={!canGoNext || totalSteps === 0}
                                                                aria-label="Next page"
                                                        >
                                                                <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                </div>
                                        </div>
                                </div>
                                <DndContext onDragEnd={handleDragEnd}>
                                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                                                <StepPalette
                                                        stepTypes={STEP_TYPES.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
                                                />
                                                <StepsDroppableArea>
                                                        <SortableContext items={visibleSteps.map(getStepKey)}>
                <div className="xl:col-span-2">
                  <div className="space-y-2">
                    {visibleSteps.map((step, idx) => {
                      const globalIndex = pageStart + idx;
                      return (
                        <div key={step.key} className="relative">
                          {/* Insertion indicator above */}
                          <div className="h-2 -mt-1">
                            <div className="mx-2 border-t border-transparent group-[.dragging]:border-blue-300" />
                          </div>
                          <StepEditor
                            step={step}
                            idx={globalIndex}
                            updateStep={updateStep}
                            removeStep={removeStep}
                            onSelect={() => selectStep(globalIndex)}
                            isSelected={selectedIndex === globalIndex}
                          />
                          {/* Insertion indicator below */}
                          <div className="h-2 -mb-1">
                            <div className="mx-2 border-t border-transparent group-[.dragging]:border-blue-300" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                                                        </SortableContext>
                                                </StepsDroppableArea>
                                                <OnboardingPreviewPane step={previewStep} />
                                        </div>
                                </DndContext>
                        </div>

      {steps.length > 0 && <PreviewBlock />}

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleSave(false)}
          disabled={saving || Boolean(conflictState)}
        >
          {saving ? "Saving…" : "Save as Draft"}
        </Button>
        <Button
          onClick={() => {
            handleSave(true);
          }}
          disabled={
            publishing ||
            saving ||
            !name.trim() ||
            Boolean(conflictState)
          }
        >
          {publishing ? "Publishing…" : "Publish"}
        </Button>
      </DialogFooter>
      <Sheet open={isPresetLibraryOpen} onOpenChange={setIsPresetLibraryOpen}>
        <SheetContent side="right" className="w-full sm:w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>NZ compliance preset library</SheetTitle>
            <SheetDescription>
              Inject IRD, KiwiSaver, and WorkSafe steps across one or more tenants without overwriting custom content.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tenant scope</Label>
              <MultiSelect
                options={tenantScopeOptions}
                selected={tenantScopeSelection}
                onChange={setTenantScopeSelection}
                placeholder="Select tenants"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                We only add steps for the tenants you select. Existing preset steps for a tenant stay untouched.
              </p>
            </div>
            <div className="space-y-4">
              {NZ_ONBOARDING_PRESETS.map((preset) => {
                const coverage = presetUsage.get(preset.id);
                return (
                  <div key={preset.id} className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{preset.name}</h3>
                        <p className="text-sm text-muted-foreground">{preset.summary}</p>
                      </div>
                      <Button size="sm" onClick={() => applyPreset(preset)}>
                        Inject steps
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {preset.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                      <p className="font-medium text-foreground">{preset.headline}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                        {preset.steps.map((step) => (
                          <li key={step.slug}>{step.title}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {coverage?.size
                          ? `Applied in ${coverage.size} tenant${coverage.size === 1 ? "" : "s"}`
                          : "Not applied yet"}
                      </span>
                      <span>•</span>
                      <span>{preset.complianceReferences.join(", ")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
