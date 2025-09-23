"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
  X,
  GripVertical,
  FileText,
  UploadCloud,
  FileEdit,
  Info,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DialogFooter } from "@/components/ui/dialog";

// --- Step Types
const STEP_TYPES = [
  {
    value: "acknowledge-document",
    label: "Acknowledge Document",
    icon: FileText,
  },
  { value: "upload-document", label: "Upload Document", icon: UploadCloud },
  { value: "fill-form", label: "Fill Form", icon: FileEdit },
  { value: "instructions", label: "Welcome/Instructions", icon: Info },
];

const dbTypeToUi: Record<string, string> = {
  ACKNOWLEDGE_DOCUMENT: "acknowledge-document",
  UPLOAD_DOCUMENT: "upload-document",
  INSTRUCTION: "instructions",
  FORM_FILL: "fill-form",
};

const dbUploadTypeToUi: Record<string, string> = {
  PASSPORT: "passport",
  RIGHT_TO_WORK: "right-to-work",
  DRIVER_LICENSE: "driver-licence",
  TRAINING_CERTIFICATE: "training-certificate",
  OTHER: "other",
};

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
    formId: "", // For reusable forms
    formFields: [], // For inline fields (backward compatibility)
  };
}

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

// --- Form dropdown (API)
function FormDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [forms, setForms] = useState<any[]>([]);
  const [builtins, setBuiltins] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [fRes, bRes] = await Promise.all([
          fetch("/api/forms"),
          fetch("/api/forms/defaults"),
        ]);
        const fJson = await fRes.json();
        const bJson = await bRes.json();
        setForms(Array.isArray(fJson) ? fJson : []);
        setBuiltins(Array.isArray(bJson) ? bJson : []);
      } catch {
        setForms([]);
        setBuiltins([]);
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
        const res = await fetch("/api/forms", {
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
        if (!res.ok) {
          toast.error("Failed to create built-in form");
          setCreating(false);
          return;
        }
        const created = await res.json();
        setForms((prev) => [created, ...prev]);
        onChange(created.id);
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
}: {
  step: any;
  idx: number;
  updateStep: (idx: number, data: any) => void;
  removeStep: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: getStepKey(step),
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="mb-3 relative bg-white rounded-2xl p-6 shadow-sm border"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex gap-2 items-center">
          <GripVertical
            className="text-gray-400 cursor-grab w-4 h-4"
            {...attributes}
            {...listeners}
          />
          <span className="uppercase text-xs font-semibold text-gray-500">
            {STEP_TYPES.find((t) => t.value === step.type)?.label}
          </span>
        </div>
        <Button size="md" variant="ghost" onClick={() => removeStep(idx)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Step Title</Label>
          <Input
            value={step.title}
            onChange={(e) => updateStep(idx, { title: e.target.value })}
            maxLength={80}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            value={step.description}
            onChange={(e) => updateStep(idx, { description: e.target.value })}
            maxLength={200}
          />
        </div>
        <div>
          <Label>Required?</Label>
          <Switch
            checked={!!step.required}
            onChange={(val) => updateStep(idx, { required: val })}
          />
        </div>

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
                <Label>Select Existing Form (Recommended)</Label>
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
                  Choose a form created in the Forms section for better
                  management and reusability.
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
                    a reusable form instead.
                  </p>
                </div>
              )}
            </div>
          </div>
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
  const [steps, setSteps] = useState<any[]>(() =>
    template?.steps?.length
      ? template.steps.map((step: any) => ({
          key:
            step.id ||
            step.key ||
            (typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2)),
          id: step.id,
          type: dbTypeToUi[step.type] || step.type,
          title: step.label || "",
          description: step.instruction || "",
          required: step.required ?? true,
          documentId: step.documentId || "",
          uploadType: step.uploadType ? dbUploadTypeToUi[step.uploadType] : "",
          formId: step.formId || "",
          formFields: step.formFields || [],
        }))
      : [],
  );

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

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

  const addStep = useCallback((type: string) => {
    setSteps((prev) => [...prev, createStep(type)]);
  }, []);

  const updateStep = useCallback((idx: number, data: any) => {
    setSteps((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], ...data };
      return arr;
    });
  }, []);

  const removeStep = useCallback((idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

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
  }, []);

  const handleSave = async (publish = false) => {
    if (!name.trim()) {
      toast.error("Template name required");
      return;
    }
    toast.info(
      "This will not affect previously completed versions of this template, and any outstanding templates will not be altered. This will purely be for any future new starters onboarding using this template",
    );
    setSaving(true);
    const body = {
      id: template?.id,
      name,
      description,
      departments,
      jobRoles,
      steps: steps.map((s, i) => ({
        ...s,
        order: i + 1,
        formId: s.formId || null,
        formFields: s.formFields || [],
      })),
      isActive: publish,
    };
    const res = await fetch("/api/onboarding/templates", {
      method: template?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setPublishing(false);

    if (res.ok) {
      toast.success(`Template ${publish ? "published" : "saved"}!`);
      onSaved();
    } else {
      toast.error("Error saving template");
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
        {steps.map((s, idx) => (
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

  return (
    <div className="p-6">
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

      <div>
        <h3 className="text-lg font-semibold mb-1">Steps</h3>
        <p className="text-gray-500 mb-2">
          Drag and drop to reorder. Each step can require a document to be
          acknowledged, uploaded, or a custom form.
        </p>
        <StepTypePicker />
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map(getStepKey)}>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <StepEditor
                  key={step.key}
                  step={step}
                  idx={idx}
                  updateStep={updateStep}
                  removeStep={removeStep}
                />
              ))}
            </div>
          </SortableContext>
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
          disabled={saving}
        >
          {saving ? "Saving…" : "Save as Draft"}
        </Button>
        <Button
          onClick={() => {
            setPublishing(true);
            handleSave(true);
          }}
          disabled={publishing || saving}
        >
          {publishing ? "Publishing…" : "Publish"}
        </Button>
      </DialogFooter>
    </div>
  );
}
