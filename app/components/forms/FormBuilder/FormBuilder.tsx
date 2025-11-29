"use client";

import { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
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
import { FormField, FormSection, AnyFormSchema, upgradeLegacySchema } from "@/api/forms/[id]/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
    formType: "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN";
    schema: AnyFormSchema;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
    transactionalEnabled?: boolean;
    autoSave?: boolean;
  }) => void | Promise<void>;
  initialData?: {
    name: string;
    slug?: string;
    description?: string;
    formType?: "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN";
    schema: AnyFormSchema;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
    transactionalEnabled?: boolean;
    autoSave?: boolean;
  };
}

export default function FormBuilder({ onSave, initialData }: FormBuilderProps) {
  // Normalize incoming schema into sections (single page model in builder)
  const initialSections: FormSection[] = (() => {
    const defaultSection: FormSection = { id: uuidv4(), title: "Section 1", columns: 1, layout: "single", hidden: false, fields: [] };
    const incoming = initialData?.schema as any;
    if (!incoming) return [defaultSection];
    if (Array.isArray(incoming)) {
      const upgraded = upgradeLegacySchema(incoming).sections;
      return upgraded && upgraded.length > 0 ? upgraded : [
        { id: uuidv4(), title: "Section 1", columns: 1, layout: "single", hidden: false, fields: incoming as FormField[] } as FormSection,
      ];
    }
    if (incoming.sections && Array.isArray(incoming.sections)) {
      // Ensure we always have at least one section for dropping fields
      return incoming.sections.length > 0 ? incoming.sections as FormSection[] : [defaultSection];
    }
    if (incoming.pages && Array.isArray(incoming.pages) && incoming.pages.length) {
      const pageSections = incoming.pages[0].sections || [];
      return pageSections.length > 0 ? pageSections as FormSection[] : [defaultSection];
    }
    return [defaultSection];
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
  // Handle DATA_SCREEN migration: convert to FORM with autoSave
  const [formType, setFormType] = useState<"SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN">(
    initialData?.formType === "DATA_SCREEN" ? "FORM" : (initialData?.formType || "FORM"),
  );
  // FORM type always has autoSave enabled (data screens with save functionality)
  const autoSave = formType === "FORM" ? true : Boolean(initialData?.autoSave);
  const [transactionalEnabled, setTransactionalEnabled] = useState<boolean>(
    Boolean(initialData?.transactionalEnabled) || false,
  );
  const vis = useVisibility({
    roles: initialData?.visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],
    departments: initialData?.visibleToDepartments || [],
    jobRoles: initialData?.visibleToJobRoles || [],
  });
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const slugIsValid = useMemo(() => /^[a-z0-9-]+$/.test(formSlug), [formSlug]);

  // Custom collision detection that prefers section droppables but falls back to canvas
  const customCollisionDetection = useCallback((args: Parameters<typeof rectIntersection>[0]) => {
    // First try pointer within - more accurate for nested droppables
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      // Prefer section droppables over the canvas
      const sectionCollision = pointerCollisions.find(c => String(c.id).startsWith('section-'));
      if (sectionCollision) return [sectionCollision];
      return pointerCollisions;
    }
    
    // Fall back to rect intersection
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      const sectionCollision = rectCollisions.find(c => String(c.id).startsWith('section-'));
      if (sectionCollision) return [sectionCollision];
      return rectCollisions;
    }
    
    return [];
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragField(null);
    const { active, over } = event;
    if (!over) return;

    // Add new field from palette
    const dragged = active.data?.current as
      | { kind?: string; type: string; label: string; defaults?: Partial<FormField> }
      | undefined;
    // Only add new when the source is the palette
    if (dragged && dragged.kind === "palette") {
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

    // Reorder/move existing fields (within or across sections)
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId) {
      setSections((prev) => {
        // Locate source section and index
        const srcSectionIndex = prev.findIndex((s) => s.fields.some((f) => f.id === activeId));
        if (srcSectionIndex === -1) return prev;
        const srcFields = [...prev[srcSectionIndex].fields];
        const srcIndex = srcFields.findIndex((f) => f.id === activeId);
        const moving = srcFields[srcIndex];

        // Destination: over a field or over a section container
        let dstSectionIndex = prev.findIndex((s) => s.fields.some((f) => f.id === overId));
        let dstIndex = -1;
        if (overId.startsWith("section-")) {
          const secId = overId.replace("section-", "");
          dstSectionIndex = prev.findIndex((s) => s.id === secId);
          dstIndex = prev[dstSectionIndex]?.fields.length ?? -1;
        } else if (dstSectionIndex !== -1) {
          dstIndex = prev[dstSectionIndex].fields.findIndex((f) => f.id === overId);
        }

        if (dstSectionIndex === -1) return prev;

        const next = prev.map((s) => ({ ...s, fields: [...s.fields] }));

        // Remove from source
        next[srcSectionIndex].fields.splice(srcIndex, 1);

        // Adjust dst index if moving within same section and removing before insert
        if (srcSectionIndex === dstSectionIndex && dstIndex > srcIndex) dstIndex -= 1;

        // Insert at destination
        next[dstSectionIndex].fields.splice(dstIndex, 0, moving);
        return next;
      });
      return;
    }
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
      transactionalEnabled,
      autoSave,
    });

    toast.success("Form saved successfully");
  };

  const goToForms = () => {
    window.location.href = "/forms";
  };

  return (
    <div className="relative">
      <div className="mb-4">
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                Form Name
              </Label>
              <Input
                value={formName}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Enter form name"
                className="bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Form Type
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white max-w-xs p-3 rounded-lg shadow-xl">
                      <p className="text-sm">
                        <strong>Form:</strong> Data screen with save functionality<br/>
                        <strong>Table:</strong> Multiple records per employee<br/>
                        <strong>Survey:</strong> One-time submission
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select value={formType} onValueChange={(value) => setFormType(value as "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN")}>
                <SelectTrigger className="bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-lg">
                  <SelectItem value="FORM">Form</SelectItem>
                  <SelectItem value="TABLE">Table</SelectItem>
                  <SelectItem value="SURVEY">Survey</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={goToForms} className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
              <Button
                onClick={saveForm}
                disabled={false || !slugIsValid}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 font-semibold px-6"
              >
                {false ? "Saving..." : "Save Form"}
              </Button>
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragEnd={handleDragEnd}
          onDragStart={(event) => {
            const dragged = event.active.data?.current as
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
          onDragCancel={() => setActiveDragField(null)}
        >
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-3">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:sticky lg:top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    Form Elements
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSections(initialSections)}
                    className="hover:text-indigo-600 hover:bg-indigo-50 text-slate-500"
                    aria-label="Reset builder"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <FieldPalette />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-6">
              <div className="bg-white rounded-2xl p-6 min-h-[600px] shadow-sm border border-slate-200">
                <FormCanvas
                  sections={sections}
                  setSections={setSections}
                  selectedField={selectedField}
                  onSelectField={setSelectedField}
                />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-3">
              {selectedField ? (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:sticky lg:top-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-slate-900">
                      Field Properties
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedField(null)}
                      className="hover:text-red-600 hover:bg-red-50 text-slate-500"
                      aria-label="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <FieldEditor
                    key={selectedField.id}
                    field={selectedField}
                    allFields={sections.flatMap(s => s.fields)}
                    onChange={(updated) => {
                      setSections((prev) =>
                        prev.map((section) => ({
                          ...section,
                          fields: section.fields.map((field) =>
                            field.id === updated.id ? updated : field,
                          ),
                        })),
                      );
                      setSelectedField(updated);
                    }}
                  />
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-300 text-center">
                  <p className="text-slate-500 text-sm font-medium">Select a field to edit its properties</p>
                </div>
              )}
            </div>
          </div>
          <DragOverlay>
            {activeDragField ? (
              <div className="bg-white rounded-xl p-4 shadow-xl border border-slate-200 text-slate-900 font-medium">
                {activeDragField.label}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  Form Preview
                </h3>
                <Button
                  variant="outline"
                  onClick={goToForms}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  View All Forms
                </Button>
              </div>
              <FormPreview fields={sections.flatMap((section) => section.fields)} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:sticky lg:top-6">
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Visibility Settings
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Control who can see and access this form
              </p>
              <VisibilitySettings
                visibleToRoles={vis.roles}
                visibleToDepartments={vis.departments}
                visibleToJobRoles={vis.jobRoles}
                onChange={(updated) => {
                  vis.setRoles(updated.visibleToRoles);
                  vis.setDepartments(updated.visibleToDepartments);
                  vis.setJobRoles(updated.visibleToJobRoles);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
