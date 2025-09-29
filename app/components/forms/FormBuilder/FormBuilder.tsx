"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
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
    formType: "SUBMISSION" | "DATA_SCREEN";
    schema: AnyFormSchema;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
    transactionalEnabled?: boolean;
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
    transactionalEnabled?: boolean;
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
  const [transactionalEnabled, setTransactionalEnabled] = useState<boolean>(
    Boolean(initialData?.transactionalEnabled) || false,
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
    });

    toast.success("Form saved successfully");
  };

  const goToForms = () => {
    window.location.href = "/forms";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[hsl(var(--sunset-2))]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="glass-premium rounded-3xl p-8 mb-6 shadow-premium">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-bold text-gradient-premium mb-2">
                  Form Builder
                </h1>
                <p className="text-muted-foreground">
                  Create dynamic forms with drag-and-drop simplicity
                </p>
              </div>
              <TooltipProvider>
                <div className="glass-subtle rounded-2xl border border-white/20 p-4 flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Quick tips</p>
                    <p>Drag elements from the left, drop them onto the canvas, then fine-tune on the right.</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="ml-auto text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        More
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      Use sections to organise long forms. Pick “Data Screen” for data that evolves over time.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={goToForms}>
                Cancel
              </Button>
              <Button
                onClick={saveForm}
                disabled={false || !slugIsValid}
                className="bg-gradient-to-r from-primary to-[hsl(var(--sunset-2))] hover:from-primary/90 hover:to-[hsl(var(--sunset-2))]/90 shadow-premium px-6"
              >
                {false ? "Saving..." : "Save Form"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Form Name
              </Label>
              <Input
                value={formName}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Enter form name"
                className="glass-subtle border-white/20 focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                URL Slug
              </Label>
              <Input
                value={formSlug}
                onChange={(event) => setFormSlug(event.target.value)}
                placeholder="form-url-slug"
                className={cn(
                  "glass-subtle border-white/20 transition-colors",
                  slugIsValid ? "focus:border-primary/50" : "border-destructive/50",
                )}
              />
              {!slugIsValid ? (
                <p className="text-xs text-destructive">
                  Slug must be unique and contain only lowercase letters, numbers, or hyphens.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Form Type
              </Label>
              <Select value={formType} onValueChange={(value) => setFormType(value as "SUBMISSION" | "DATA_SCREEN")}>
                <SelectTrigger className="glass-subtle border-white/20 focus:border-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-premium">
                  <SelectItem value="SUBMISSION">Submission Form</SelectItem>
                  <SelectItem value="DATA_SCREEN">Data Screen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <div className="glass-premium rounded-3xl p-6 shadow-premium lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gradient-premium">
                  Form Elements
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSections(initialSections)}
                  className="hover:text-primary"
                  aria-label="Reset builder"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>
              <FieldPalette />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <DndContext
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
              <div className="glass-premium rounded-3xl p-8 min-h-[600px] shadow-premium">
                <FormCanvas
                  sections={sections}
                  setSections={setSections}
                  selectedField={selectedField}
                  onSelectField={setSelectedField}
                />
              </div>
              <DragOverlay>
                {activeDragField ? (
                  <div className="glass-premium rounded-xl p-4 shadow-xl">
                    {activeDragField.label}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          <div className="col-span-12 lg:col-span-3">
            {selectedField ? (
              <div className="glass-premium rounded-3xl p-6 shadow-premium lg:sticky lg:top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gradient-premium">
                    Field Properties
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedField(null)}
                    className="hover:text-primary"
                    aria-label="Clear selection"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <FieldEditor
                  key={selectedField.id}
                  field={selectedField}
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
              <div className="glass-subtle rounded-3xl p-6 border-2 border-dashed border-white/20 text-center text-muted-foreground">
                Select a field to edit its properties
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 glass-premium rounded-3xl p-8 shadow-premium">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gradient-premium">
              Form Preview
            </h3>
            <Button
              variant="outline"
              onClick={goToForms}
              className="glass-subtle border-white/20 hover:border-primary/50"
            >
              View All Forms
            </Button>
          </div>
          <FormPreview sections={sections} />
        </div>
      </div>
    </div>
  );
}
