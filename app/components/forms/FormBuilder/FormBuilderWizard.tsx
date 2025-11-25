"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { FieldPalette } from "./FieldPalette";
import { FormCanvas } from "./FormCanvas";
import { FieldEditor } from "./FieldEditor";
import { FormPreviewEnhanced } from "./FormPreviewEnhanced";
import { VisibilitySettingsEnhanced } from "./VisibilitySettingsEnhanced";
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
import { 
  Info, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Sparkles,
  Layers,
  Eye,
  Users,
  RotateCcw,
  X,
  Save,
  Wand2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

// Step configuration
const STEPS = [
  { id: 1, title: "Build Form", description: "Design your form structure", icon: Layers },
  { id: 2, title: "Preview", description: "See how it looks", icon: Eye },
  { id: 3, title: "Set Audience", description: "Control who sees this", icon: Users },
];

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

interface FormBuilderWizardProps {
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

// Step indicator component with enhanced animations
function StepIndicator({ 
  currentStep, 
  onStepClick 
}: { 
  currentStep: number; 
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      {STEPS.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isClickable = currentStep >= step.id;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <motion.button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300",
                isActive && "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent",
                !isActive && !isCompleted && "opacity-50",
                isClickable && "cursor-pointer hover:bg-white/50",
                !isClickable && "cursor-not-allowed"
              )}
              whileHover={isClickable ? { scale: 1.02 } : {}}
              whileTap={isClickable ? { scale: 0.98 } : {}}
            >
              <motion.div
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                  isActive && "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30",
                  isCompleted && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30",
                  !isActive && !isCompleted && "bg-white/60 text-muted-foreground border border-white/40"
                )}
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Active ring animation */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-primary"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
              
              <div className="hidden md:block text-left">
                <motion.p
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isActive && "text-foreground",
                    isCompleted && "text-emerald-600",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </motion.p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </motion.button>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div className="hidden sm:block w-8 md:w-16 h-0.5 mx-2">
                <motion.div
                  className={cn(
                    "h-full rounded-full transition-colors duration-500",
                    currentStep > step.id 
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                      : "bg-border/50"
                  )}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2 * index }}
                  style={{ transformOrigin: "left" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FormBuilderWizard({ onSave, initialData }: FormBuilderWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward

  // Normalize incoming schema into sections
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
  const [activeDragField, setActiveDragField] = useState<FormField | null>(null);
  const {
    name: formName,
    slug: formSlug,
    setSlug: setFormSlug,
    onNameChange: handleNameChange,
  } = useSlug(initialData?.name || "New Form", initialData?.slug || "");
  const [formDescription, setFormDescription] = useState(
    initialData?.description || "",
  );
  const [formType, setFormType] = useState<"SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN">(
    initialData?.formType === "DATA_SCREEN" ? "FORM" : (initialData?.formType || "FORM"),
  );
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

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragField(null);
    const { active, over } = event;
    if (!over) return;

    const dragged = active.data?.current as
      | { kind?: string; type: string; label: string; defaults?: Partial<FormField> }
      | undefined;
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

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId) {
      setSections((prev) => {
        const srcSectionIndex = prev.findIndex((s) => s.fields.some((f) => f.id === activeId));
        if (srcSectionIndex === -1) return prev;
        const srcFields = [...prev[srcSectionIndex].fields];
        const srcIndex = srcFields.findIndex((f) => f.id === activeId);
        const moving = srcFields[srcIndex];

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
        next[srcSectionIndex].fields.splice(srcIndex, 1);
        if (srcSectionIndex === dstSectionIndex && dstIndex > srcIndex) dstIndex -= 1;
        next[dstSectionIndex].fields.splice(dstIndex, 0, moving);
        return next;
      });
      return;
    }
  };

  const canProceed = useCallback((step: number) => {
    switch (step) {
      case 1:
        const allFields = sections.flatMap((s) => s.fields);
        return formName.trim() && slugIsValid && allFields.length > 0;
      case 2:
        return true; // Preview step has no validation
      case 3:
        return vis.roles.length > 0;
      default:
        return false;
    }
  }, [sections, formName, slugIsValid, vis.roles]);

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setDirection(-1);
      setCurrentStep(step);
    } else if (step > currentStep && canProceed(currentStep)) {
      setDirection(1);
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < 3 && canProceed(currentStep)) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const saveForm = () => {
    if (!formName.trim()) return toast.error("Form name is required");
    if (!formSlug.trim()) return toast.error("Form slug is required");
    if (!slugIsValid)
      return toast.error("Slug can only contain lowercase letters, numbers, and hyphens");
    const allFields = sections.flatMap((s) => s.fields);
    if (!allFields.length)
      return toast.error("Add at least one field before saving");
    if (allFields.some((f) => !f.label.trim()))
      return toast.error("All fields must have labels");
    if (!vis.roles.length)
      return toast.error("At least one role must be selected for visibility");

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
    window.location.href = "/settings/forms";
  };

  // Animation variants for step transitions
  const pageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <div className="relative min-h-[calc(100vh-200px)]">
      {/* Header with form details and step indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-premium rounded-3xl p-6 mb-6 shadow-premium"
      >
        {/* Step Indicator */}
        <div className="mb-6">
          <StepIndicator currentStep={currentStep} onStepClick={goToStep} />
        </div>

        {/* Form Details Bar - Always visible */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Form Name</Label>
            <Input
              value={formName}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Enter form name"
              className="glass-subtle border-white/20 focus:border-primary/50 transition-all h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Slug</Label>
            <Input
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="form-slug"
              className={cn(
                "glass-subtle border-white/20 focus:border-primary/50 transition-all h-11 font-mono text-sm",
                !slugIsValid && formSlug && "border-destructive/50"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Form Type
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="glass-premium max-w-xs">
                    <p>
                      <strong>Form:</strong> Editable data screen<br/>
                      <strong>Table:</strong> Multiple records<br/>
                      <strong>Survey:</strong> One-time submission
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select value={formType} onValueChange={(value) => setFormType(value as any)}>
              <SelectTrigger className="glass-subtle border-white/20 focus:border-primary/50 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-premium">
                <SelectItem value="FORM">Form</SelectItem>
                <SelectItem value="TABLE">Table</SelectItem>
                <SelectItem value="SURVEY">Survey</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToForms} className="glass-subtle h-11">
              Cancel
            </Button>
            {currentStep === 3 ? (
              <Button
                onClick={saveForm}
                disabled={!canProceed(3)}
                className="bg-gradient-to-r from-primary to-[hsl(var(--sunset-2))] hover:from-primary/90 hover:to-[hsl(var(--sunset-2))]/90 shadow-lg h-11 px-6"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Form
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed(currentStep)}
                className="bg-gradient-to-r from-primary to-[hsl(var(--sunset-2))] hover:from-primary/90 hover:to-[hsl(var(--sunset-2))]/90 shadow-lg h-11 px-6"
              >
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Step Content with animated transitions */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Step 1: Build Form */}
          {currentStep === 1 && (
            <DndContext
              sensors={sensors}
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
                {/* Field Palette */}
                <div className="col-span-12 lg:col-span-3">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-premium rounded-3xl p-6 shadow-premium lg:sticky lg:top-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                          <Wand2 className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">
                          Elements
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSections(initialSections)}
                        className="hover:text-primary h-8 w-8"
                        aria-label="Reset builder"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <FieldPalette />
                  </motion.div>
                </div>

                {/* Form Canvas */}
                <div className="col-span-12 lg:col-span-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-premium rounded-3xl p-8 min-h-[600px] shadow-premium"
                  >
                    <FormCanvas
                      sections={sections}
                      setSections={setSections}
                      selectedField={selectedField}
                      onSelectField={setSelectedField}
                    />
                  </motion.div>
                </div>

                {/* Field Editor */}
                <div className="col-span-12 lg:col-span-3">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {selectedField ? (
                      <div className="glass-premium rounded-3xl p-6 shadow-premium lg:sticky lg:top-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                              <Sparkles className="h-5 w-5 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Properties
                            </h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedField(null)}
                            className="hover:text-primary h-8 w-8"
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
                      <div className="glass-subtle rounded-3xl p-8 border-2 border-dashed border-white/20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/30 flex items-center justify-center mx-auto mb-4">
                          <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground font-medium">Select a field</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Click on any field to edit its properties</p>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
              <DragOverlay>
                {activeDragField ? (
                  <div className="glass-premium rounded-xl p-4 shadow-xl border-2 border-primary/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Layers className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{activeDragField.label}</span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {/* Step 2: Preview */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="glass-premium rounded-3xl p-8 shadow-premium">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
                      <Eye className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        Form Preview
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        This is how your form will appear to users
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={goToForms}
                    className="glass-subtle border-white/20 hover:border-primary/50"
                  >
                    View All Forms
                  </Button>
                </div>
                
                {/* Form title and description preview */}
                <div className="mb-6 pb-6 border-b border-border/50">
                  <h2 className="text-2xl font-bold text-foreground">{formName || "Untitled Form"}</h2>
                  {formDescription && (
                    <p className="text-muted-foreground mt-2">{formDescription}</p>
                  )}
                </div>

                <FormPreviewEnhanced fields={sections.flatMap((section) => section.fields)} />
              </div>
            </motion.div>
          )}

          {/* Step 3: Set Audience */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-3xl mx-auto"
            >
              <div className="glass-premium rounded-3xl p-8 shadow-premium">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10">
                    <Users className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      Visibility Settings
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Control who can see and access this form
                    </p>
                  </div>
                </div>
                
                <VisibilitySettingsEnhanced
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
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-premium rounded-3xl p-4 mt-6 shadow-premium"
      >
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="glass-subtle h-11 px-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            {STEPS.map((_, index) => (
              <motion.div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentStep === index + 1 ? "w-8 bg-primary" : "bg-border"
                )}
                animate={{
                  scale: currentStep === index + 1 ? 1 : 0.8
                }}
              />
            ))}
          </div>

          {currentStep === 3 ? (
            <Button
              onClick={saveForm}
              disabled={!canProceed(3)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg h-11 px-8"
            >
              <Save className="mr-2 h-4 w-4" />
              Save & Publish
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed(currentStep)}
              className="bg-gradient-to-r from-primary to-[hsl(var(--sunset-2))] hover:from-primary/90 hover:to-[hsl(var(--sunset-2))]/90 shadow-lg h-11 px-6"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

