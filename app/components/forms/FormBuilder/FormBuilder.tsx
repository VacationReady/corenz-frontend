"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { v4 as uuidv4 } from "uuid";
import { FieldPalette } from "./FieldPalette";
import { FormCanvas } from "./FormCanvas";
import { FieldEditor } from "./FieldEditor";
import { FormPreview } from "./FormPreview";
import { VisibilitySettings } from "./VisibilitySettings";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FormField, FormSection, AnyFormSchema, isLegacySchema, upgradeLegacySchema } from "@/api/forms/[id]/types";

function useSlug(initialName: string, initialSlug: string) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const generate = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .trim();
  const onNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generate(name)) setSlug(generate(value));
  };
  return { name, slug, setSlug, onNameChange };
}

function useVisibility(initial: {
  roles: string[];
  departments: string[];
  jobRoles: string[];
}) {
  const [roles, setRoles] = useState(initial.roles);
  const [departments, setDepartments] = useState(initial.departments);
  const [jobRoles, setJobRoles] = useState(initial.jobRoles);
  return {
    roles,
    departments,
    jobRoles,
    setRoles,
    setDepartments,
    setJobRoles,
  };
}

interface FormBuilderProps {
  onSave: (data: {
    name: string;
    slug: string;
    description?: string;
    formType: "SUBMISSION" | "DATA_SCREEN";
    schema: AnyFormSchema;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
  }) => void | Promise<void>;
  initialData?: {
    name: string;
    slug?: string;
    description?: string;
    formType?: "SUBMISSION" | "DATA_SCREEN";
    schema: AnyFormSchema;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
  };
}

export default function FormBuilder({ onSave, initialData }: FormBuilderProps) {
  // Normalize incoming schema into sections (single page model in builder)
  const initialSections: FormSection[] = (() => {
    const incoming = initialData?.schema as any;
    if (!incoming) return [{ id: uuidv4(), title: "Section 1", columns: 1, layout: "single", hidden: false, fields: [] }];
    if (Array.isArray(incoming)) {
      return upgradeLegacySchema(incoming).sections || [
        { id: uuidv4(), title: "Section 1", columns: 1, layout: "single", hidden: false, fields: incoming as FormField[] },
      ];
    }
    if (incoming.sections && Array.isArray(incoming.sections)) {
      return incoming.sections as FormSection[];
    }
    if (incoming.pages && Array.isArray(incoming.pages) && incoming.pages.length) {
      return (incoming.pages[0].sections || []) as FormSection[];
    }
    return [{ id: uuidv4(), title: "Section 1", columns: 1, layout: "single", hidden: false, fields: [] }];
  })();

  const [sections, setSections] = useState<FormSection[]>(initialSections);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [activeDragField, setActiveDragField] = useState<FormField | null>(
    null,
  );
  const {
    name: formName,
    slug: formSlug,
    setSlug: setFormSlug,
    onNameChange: handleNameChange,
  } = useSlug(initialData?.name || "New Form", initialData?.slug || "");
  const [formDescription, setFormDescription] = useState(
    initialData?.description || "",
  );
  const [formType, setFormType] = useState<"SUBMISSION" | "DATA_SCREEN">(
    initialData?.formType || "SUBMISSION",
  );
  const vis = useVisibility({
    roles: initialData?.visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],
    departments: initialData?.visibleToDepartments || [],
    jobRoles: initialData?.visibleToJobRoles || [],
  });

  const slugIsValid = useMemo(() => /^[a-z0-9-]+$/.test(formSlug), [formSlug]);

  // (slug generation handled by useSlug)

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragField(null);
    const { active, over } = event;
    if (!over) return;

    // Add new field from palette
    const dragged = active.data?.current as
      | { type: string; label: string; defaults?: Partial<FormField> }
      | undefined;
    if (dragged) {
      const defaults = (dragged as any)?.defaults || {};
      const newField: FormField = {
        id: uuidv4(),
        type: dragged.type,
        label: dragged.label || "Untitled Field",
        required: false,
        ...defaults,
      } as FormField;
      const overId = String(over.id || "");
      const isSection = overId.startsWith("section-");
      const targetSectionId = isSection
        ? overId.replace("section-", "")
        : sections[0]?.id;
      if (targetSectionId) {
        setSections((prev) =>
          prev.map((s) =>
            s.id === targetSectionId ? { ...s, fields: [...s.fields, newField] } : s,
          ),
        );
        setSelectedField(newField);
        toast.success(`Added ${newField.type} field`);
        return;
      }
    }

    // Reordering within the same section is handled by each section's SortableContext directly via child
  };

  const saveForm = () => {
    if (!formName.trim()) return toast.error("Form name is required");
    if (!formSlug.trim()) return toast.error("Form slug is required");
    if (!slugIsValid)
      return toast.error(
        "Slug can only contain lowercase letters, numbers, and hyphens",
      );
    const allFields = sections.flatMap((s) => s.fields);
    if (!allFields.length)
      return toast.error("Add at least one field before saving");
    if (allFields.some((f) => !f.label.trim()))
      return toast.error("All fields must have labels");
    if (!vis.roles.length)
      return toast.error("At least one role must be selected for visibility");

    // Choose schema shape: if single default section without layout metadata -> legacy array for compatibility; else V2
    const shouldUseLegacy = sections.length === 1 && !sections[0].title && !sections[0].description && (sections[0].columns ?? 1) === 1;
    const schema: AnyFormSchema = shouldUseLegacy ? (sections[0].fields as FormField[]) : ({ version: 2, sections } as any);

    onSave({
      name: formName,
      slug: formSlug,
      description: formDescription,
      formType,
      schema,
      visibleToRoles: vis.roles,
      visibleToDepartments: vis.departments,
      visibleToJobRoles: vis.jobRoles,
    });

    toast.success("Form saved successfully");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Form Metadata */}
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-3 text-lg">Form Details</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter form name"
              className={
                !formName.trim() ? "border-red-500 focus:ring-red-500" : ""
              }
            />
            {!formName.trim() && (
              <p className="text-xs text-red-600 mt-1">Name is required</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Path (slug) <span className="text-red-500">*</span>
            </label>
            <Input
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="form-path"
              className={`font-mono text-sm ${!formSlug.trim() || !slugIsValid ? "border-red-500 focus:ring-red-500" : ""}`}
            />
            {!formSlug.trim() && (
              <p className="text-xs text-red-600 mt-1">Slug is required</p>
            )}
            {formSlug.trim() && !slugIsValid && (
              <p className="text-xs text-red-600 mt-1">
                Only lowercase letters, numbers and hyphens are allowed
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Used in URL: /employees/[id]/{"{"}formSlug{"}"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional form description"
              className="min-h-[80px]"
            />
          </div>
        </div>
      </div>

      {/* Form Type Selection */}
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-3 text-lg">Form Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              formType === "SUBMISSION"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setFormType("SUBMISSION")}
          >
            <div className="flex items-center mb-2">
              <input
                type="radio"
                checked={formType === "SUBMISSION"}
                onChange={() => setFormType("SUBMISSION")}
                className="mr-2"
              />
              <h4 className="font-medium">Submission Form</h4>
            </div>
            <p className="text-sm text-gray-600">
              One-time form submissions. Data is submitted and stored as
              records.
            </p>
          </div>
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              formType === "DATA_SCREEN"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setFormType("DATA_SCREEN")}
          >
            <div className="flex items-center mb-2">
              <input
                type="radio"
                checked={formType === "DATA_SCREEN"}
                onChange={() => setFormType("DATA_SCREEN")}
                className="mr-2"
              />
              <h4 className="font-medium">Data Screen</h4>
            </div>
            <p className="text-sm text-gray-600">
              Persistent data that can be viewed, edited, and updated. Perfect
              for employee profiles.
            </p>
          </div>
        </div>
      </div>

      {/* Visibility Settings */}
      <VisibilitySettings
        visibleToRoles={vis.roles}
        visibleToDepartments={vis.departments}
        visibleToJobRoles={vis.jobRoles}
        onChange={(v) => {
          vis.setRoles(v.visibleToRoles);
          vis.setDepartments(v.visibleToDepartments);
          vis.setJobRoles(v.visibleToJobRoles);
        }}
      />

      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={(e) => {
      const dragged = e.active.data?.current as
        | { type: string; label: string; defaults?: Partial<FormField> }
        | undefined;
          if (!dragged) return;
          setActiveDragField({
            id: "temp",
            type: dragged.type,
            label: dragged.label,
            required: false,
          });
        }}
      >
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <FieldPalette />
          <FormCanvas
            sections={sections}
            setSections={setSections}
            selectedField={selectedField}
            onSelectField={setSelectedField}
          />
          <div className="xl:col-span-1 xl:sticky xl:top-4 self-start">
            {selectedField ? (
              <FieldEditor
                key={selectedField.id}
                field={selectedField}
                onChange={(updated) => {
                  setSections((prev) => prev.map((s) => ({ ...s, fields: s.fields.map((f) => (f.id === updated.id ? updated : f)) })));
                  setSelectedField(updated);
                }}
              />
            ) : (
              <p className="text-gray-500 italic mt-4">
                Select a field to edit its properties
              </p>
            )}
          </div>
          <FormPreview fields={sections.flatMap((s) => s.fields)} />
        </div>
        <DragOverlay>
          {activeDragField ? (
            <div className="p-2 px-3 bg-white border rounded shadow text-sm font-medium shadow-lg">
              {activeDragField.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Button
        onClick={saveForm}
        className="self-end mt-4"
        disabled={
          !formName.trim() ||
          sections.flatMap((s) => s.fields).length === 0 ||
          !vis.roles.length ||
          !slugIsValid
        }
      >
        Save Form
      </Button>
    </div>
  );
}
