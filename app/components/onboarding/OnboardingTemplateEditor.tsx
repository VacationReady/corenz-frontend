'use client';

import React, { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { X, GripVertical, FileText, UploadCloud, FileEdit, Info } from "lucide-react";
import { toast } from "sonner";
import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// --- Step Types
const STEP_TYPES = [
  { value: "acknowledge-document", label: "Acknowledge Document", icon: FileText },
  { value: "upload-document", label: "Upload Document", icon: UploadCloud },
  { value: "fill-form", label: "Fill Form", icon: FileEdit },
  { value: "instructions", label: "Welcome/Instructions", icon: Info },
];

// --- Key generator utility
function getStepKey(step: any) {
  return step.id || step.key;
}

function createStep(type: string) {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  return {
    key: uuid,
    type,
    title: "",
    description: "",
    required: true,
    documentId: "",
    formFields: [],
  };
}

// --- Document dropdown (API)
function DocumentDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/documents/list")
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []));
  }, []);
  return (
    <select className="w-full border rounded-md p-2" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Select a document…</option>
      {docs.map((d) => (
        <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
      ))}
    </select>
  );
}

// --- Custom FormFields Editor
function FormFieldsEditor({ fields, onChange }: { fields: any[]; onChange: (fields: any[]) => void }) {
  const [editFields, setEditFields] = useState<any[]>(fields || []);
  useEffect(() => { onChange(editFields); }, [editFields]);
  return (
    <div>
      <div className="space-y-2 mb-3">
        {editFields.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="w-1/3" placeholder="Field label" value={f.label} onChange={e => {
              const arr = [...editFields]; arr[i].label = e.target.value; setEditFields(arr);
            }} />
            <select
              className="w-1/4 border rounded-md p-2"
              value={f.type}
              onChange={e => {
                const arr = [...editFields]; arr[i].type = e.target.value; setEditFields(arr);
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
              onClick={() => setEditFields(editFields.filter((_, idx) => idx !== i))}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" onClick={() =>
        setEditFields([...editFields, { label: "", type: "text" }])}>
        + Add Field
      </Button>
    </div>
  );
}

// --- StepEditor (memoized)
const StepEditor = React.memo(function StepEditor({
  step, idx, updateStep, removeStep
}: {
  step: any;
  idx: number;
  updateStep: (idx: number, data: any) => void;
  removeStep: (idx: number) => void;
}) {
  return (
    <div className="mb-3 relative bg-white rounded-2xl p-6 shadow-sm border">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex gap-2 items-center">
          <GripVertical className="text-gray-400 cursor-grab w-4 h-4" />
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
          <Input value={step.title} onChange={e => updateStep(idx, { title: e.target.value })} maxLength={80} />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={step.description} onChange={e => updateStep(idx, { description: e.target.value })} maxLength={200} />
        </div>
        <div>
          <Label>Required?</Label>
          <Switch checked={!!step.required} onChange={val => updateStep(idx, { required: val })} />
        </div>
        {/* --- Type-specific fields --- */}
        {step.type === "acknowledge-document" && (
          <div className="col-span-2">
            <Label>Document to Acknowledge</Label>
            <DocumentDropdown
              value={step.documentId}
              onChange={docId => updateStep(idx, { documentId: docId })}
            />
          </div>
        )}
        {step.type === "upload-document" && (
          <div className="col-span-2">
            <Label>Type of Document to Upload</Label>
            <select
              className="w-full border rounded-md p-2"
              value={step.uploadType || ""}
              onChange={e => updateStep(idx, { uploadType: e.target.value })}
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
            <FormFieldsEditor
              fields={step.formFields || []}
              onChange={fields => updateStep(idx, { formFields: fields })}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default function OnboardingTemplateEditor({
  template,
  onSaved,
  onCancel,
}: {
  template?: any;
  onSaved: () => void;
  onCancel: () => void;
}) {
  // --- General
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [departments, setDepartments] = useState<string[]>(template?.departments?.map((d: any) => d.id) || []);
  const [jobRoles, setJobRoles] = useState<string[]>(template?.jobRoles?.map((j: any) => j.id) || []);

  // --- Dropdown sources
  const [departmentsList, setDepartmentsList] = useState<{ label: string; value: string }[]>([]);
  const [jobRolesList, setJobRolesList] = useState<{ label: string; value: string }[]>([]);

  // --- Steps (drag/drop)
  const [steps, setSteps] = useState<any[]>(() =>
    template?.steps?.length
      ? template.steps.map((step: any) => ({
        ...step,
        key: step.id || step.key || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
      }))
      : []
  );

  // --- State
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);

  // --- Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      const [deptRes, roleRes] = await Promise.all([
        fetch("/api/departments/active"),
        fetch("/api/job-roles/active"),
      ]);
      const deptData = await deptRes.json();
      const roleData = await roleRes.json();

      setDepartmentsList(deptData.map((d: any) => ({ label: d.name, value: d.id })));
      setJobRolesList(roleData.map((j: any) => ({ label: j.name, value: j.id })));
    };
    fetchDropdownData();
  }, []);

  // --- Add new step
  const addStep = useCallback((type: string) => {
    setSteps(prev => [...prev, createStep(type)]);
  }, []);

  // --- Update a step (memoized)
  const updateStep = useCallback((idx: number, data: any) => {
    setSteps(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], ...data };
      return arr;
    });
  }, []);

  // --- Remove a step (memoized)
  const removeStep = useCallback((idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // --- Save/publish
  const handleSave = async (publish = false) => {
    if (!name.trim()) {
      toast.error("Template name required");
      return;
    }
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
        formFields: s.formFields || [],
      })),
      isActive: publish,
    };

    const res = await fetch(
      template?.id ? `/api/onboarding/templates/${template.id}` : "/api/onboarding/templates",
      {
        method: template?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setSaving(false);
    setPublishing(false);

    if (res.ok) {
      toast.success(`Template ${publish ? "published" : "saved"}!`);
      onSaved();
    } else {
      toast.error("Error saving template");
    }
  };

  // --- Step type selector
  const StepTypePicker = () => (
    <div className="flex flex-wrap gap-2 mt-3 mb-6">
      {STEP_TYPES.map((t) => (
        <Button key={t.value} variant="ghost" onClick={() => addStep(t.value)} className="flex items-center gap-2">
          <t.icon className="w-4 h-4" /> {t.label}
        </Button>
      ))}
    </div>
  );

  // --- Preview block
  const PreviewBlock = () => (
    <div className="bg-muted border p-6 rounded-xl mt-6 mb-4">
      <h3 className="font-semibold mb-2">Onboarding preview (as new starter):</h3>
      <ol className="list-decimal ml-5 space-y-2">
        {steps.map((s, idx) => (
          <li key={getStepKey(s)}>
            <span className="font-bold">{s.title || STEP_TYPES.find(t => t.value === s.type)?.label}</span>{" "}
            <span className="text-xs text-gray-500">{s.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );

  // --- Main render
  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">{template ? "Edit Onboarding Template" : "New Onboarding Template"}</h2>
        <Label>Template Name</Label>
        <Input className="mb-3" value={name} onChange={e => setName(e.target.value)} maxLength={60} />
        <Label>Description</Label>
        <Textarea className="mb-3" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <Label>Departments (optional)</Label>
            <MultiSelect options={departmentsList} selected={departments} onChange={setDepartments} placeholder="All Departments" />
          </div>
          <div className="flex-1">
            <Label>Job Roles (optional)</Label>
            <MultiSelect options={jobRolesList} selected={jobRoles} onChange={setJobRoles} placeholder="All Job Roles" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-1">Steps</h3>
        <p className="text-gray-500 mb-2">Drag and drop to reorder. Each step can require a document to be acknowledged, uploaded, or a custom form.</p>
        <StepTypePicker />
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
      </div>

      {steps.length > 0 && <PreviewBlock />}

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="ghost" onClick={() => handleSave(false)} disabled={saving}>Save as Draft</Button>
        <Button onClick={() => { setPublishing(true); handleSave(true); }} disabled={publishing || saving}>Publish</Button>
      </DialogFooter>
    </div>
  );
}
