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
  pointerWithin,
  rectIntersection,
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

// Step icons imported at top - actual STEPS config is inside component for dynamic labels

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
  /** When set, locks the form type and hides the selector */
  lockedFormType?: "SURVEY" | "FORM" | "TABLE";
  /** Custom cancel URL - defaults to /settings/forms */
  cancelUrl?: string;
  /** Custom labels for UI elements */
  labels?: {
    title?: string;
    namePlaceholder?: string;
    step1Title?: string;
    step1Description?: string;
    step2Title?: string;
    step2Description?: string;
    step3Title?: string;
    step3Description?: string;
    saveButton?: string;
  };
}

// Step indicator component - clean and numbered
function StepIndicator({ 
  currentStep, 
  onStepClick,
  steps
}: { 
  currentStep: number; 
  onStepClick: (step: number) => void;
  steps: Array<{ id: number; title: string; description: string; icon: React.ComponentType<{ className?: string }> }>;
}) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-6">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isClickable = currentStep >= step.id;

        return (
          <div key={step.id} className="flex items-center">
            <motion.button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive && "bg-white/80 shadow-sm",
                !isActive && !isCompleted && "opacity-60",
                isClickable && "cursor-pointer hover:bg-white/60",
                !isClickable && "cursor-not-allowed"
              )}
              whileHover={isClickable ? { scale: 1.01 } : {}}
              whileTap={isClickable ? { scale: 0.99 } : {}}
            >
              {/* Step number circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-200",
                  isActive && "bg-primary text-white",
                  isCompleted && "bg-emerald-600 text-white",
                  !isActive && !isCompleted && "bg-slate-200 text-slate-500"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  step.id
                )}
              </div>
              
              <div className="hidden md:block text-left">
                <p
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isActive && "text-slate-900",
                    isCompleted && "text-emerald-700",
                    !isActive && !isCompleted && "text-slate-500"
                  )}
                >
                  {step.title}
                </p>
                <p className={cn(
                  "text-xs",
                  isActive ? "text-slate-600" : "text-slate-400"
                )}>{step.description}</p>
              </div>
            </motion.button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="hidden sm:block w-8 md:w-12 h-0.5 mx-1">
                <div
                  className={cn(
                    "h-full rounded-full transition-colors duration-300",
                    currentStep > step.id 
                      ? "bg-emerald-500" 
                      : "bg-slate-200"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FormBuilderWizard({ 
  onSave, 
  initialData, 
  lockedFormType,
  cancelUrl = "/settings/forms",
  labels = {}
}: FormBuilderWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward

  // Build dynamic step configuration based on mode
  const isSurveyMode = lockedFormType === "SURVEY";
  const STEPS = [
    { 
      id: 1, 
      title: labels.step1Title || (isSurveyMode ? "Design Survey" : "Build Screen"), 
      description: labels.step1Description || (isSurveyMode ? "Create your survey questions" : "Design your screen structure"), 
      icon: Layers 
    },
    { 
      id: 2, 
      title: labels.step2Title || "Preview", 
      description: labels.step2Description || (isSurveyMode ? "See how your survey looks" : "Review your screen"), 
      icon: Eye 
    },
    { 
      id: 3, 
      title: labels.step3Title || (isSurveyMode ? "Target Audience" : "Set Audience"), 
      description: labels.step3Description || (isSurveyMode ? "Who should receive this survey" : "Control visibility"), 
      icon: Users 
    },
  ];

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
    lockedFormType || (initialData?.formType === "DATA_SCREEN" ? "FORM" : (initialData?.formType || "FORM")),
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
    if (!formName.trim()) return toast.error("Screen name is required");
    if (!formSlug.trim()) return toast.error("Screen slug is required");
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

    toast.success("Screen saved successfully");
  };

  const goToForms = () => {
    window.location.href = cancelUrl;
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
        className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-100"
      >
        {/* Step Indicator */}
        <div className="mb-6">
          <StepIndicator currentStep={currentStep} onStepClick={goToStep} steps={STEPS} />
        </div>

        {/* Form Details Bar - Always visible */}
        <div className={cn(
          "grid gap-4 items-end",
          lockedFormType ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"
        )}>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">
              {isSurveyMode ? "Survey Name" : "Screen Name"}
            </Label>
            <Input
              value={formName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
              placeholder={labels.namePlaceholder || (isSurveyMode ? "Enter survey name" : "Enter screen name")}
              className="bg-white border-slate-200 focus:border-primary/50 transition-all h-11"
            />
          </div>
          {!lockedFormType && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Screen Type
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white max-w-xs p-3">
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong className="text-emerald-400">Data Screen:</strong>
                          <p className="text-slate-300 text-xs mt-0.5">Single editable screen within employee profile. Changes saved with full audit trail.</p>
                        </div>
                        <div>
                          <strong className="text-blue-400">Table:</strong>
                          <p className="text-slate-300 text-xs mt-0.5">Multiple rows of the same fields. For lists like certifications, dependents, etc.</p>
                        </div>
                        <div>
                          <strong className="text-amber-400">Survey:</strong>
                          <p className="text-slate-300 text-xs mt-0.5">One-time submission form. For collecting feedback or responses.</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select value={formType} onValueChange={(value: string) => setFormType(value as "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN")}>
                <SelectTrigger className="bg-white border-slate-200 focus:border-primary/50 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="FORM">Data Screen</SelectItem>
                  <SelectItem value="TABLE">Table</SelectItem>
                  <SelectItem value="SURVEY">Survey</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={goToForms} className="h-11 border-slate-200">
              Cancel
            </Button>
            {currentStep === 3 ? (
              <Button
                onClick={saveForm}
                disabled={!canProceed(3)}
                className="bg-primary hover:bg-primary/90 shadow-sm h-11 px-6"
              >
                <Save className="mr-2 h-4 w-4" />
                {labels.saveButton || (isSurveyMode ? "Save Survey" : "Save Screen")}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed(currentStep)}
                className="bg-primary hover:bg-primary/90 shadow-sm h-11 px-6"
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
                {/* Field Palette */}
                <div className="col-span-12 lg:col-span-3">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lg:sticky lg:top-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                        Elements
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSections(initialSections)}
                        className="hover:text-primary h-7 w-7 text-slate-400"
                        aria-label="Reset builder"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
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
                    className="bg-white rounded-2xl p-6 min-h-[600px] shadow-sm border border-slate-100"
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
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lg:sticky lg:top-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                            Properties
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedField(null)}
                            className="hover:text-primary h-7 w-7 text-slate-400"
                            aria-label="Clear selection"
                          >
                            <X className="h-3.5 w-3.5" />
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
                      <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200 text-center lg:sticky lg:top-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <Sparkles className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-slate-600 font-medium text-sm">Select a field</p>
                        <p className="text-xs text-slate-400 mt-1">Click on any field to edit its properties</p>
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
                        {isSurveyMode ? "Survey Preview" : "Screen Preview"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isSurveyMode 
                          ? "This is how your survey will appear to employees"
                          : "This is how your screen will appear within employee profiles"
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={goToForms}
                    className="glass-subtle border-white/20 hover:border-primary/50"
                  >
                    {isSurveyMode ? "View All Surveys" : "View All Screens"}
                  </Button>
                </div>
                
                {/* Screen title and description preview */}
                <div className="mb-6 pb-6 border-b border-border/50">
                  <h2 className="text-2xl font-bold text-foreground">{formName || "Untitled Screen"}</h2>
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
                      {isSurveyMode ? "Target Audience" : "Visibility Settings"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isSurveyMode 
                        ? "Define who should receive this survey"
                        : "Control who can see and access this screen"
                      }
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
              {labels.saveButton || (isSurveyMode ? "Save Survey" : "Save & Publish")}
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

