"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  DndContext, 
  type DragEndEvent, 
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useDroppable,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { 
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Progress } from "@/components/ui/progress";
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
  Plus,
  Eye,
  Save,
  Send,
  Sparkles,
  Palette,
  Layers,
  Settings2,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Check,
  ArrowRight,
  Rocket,
  Users,
  Wand2,
  Zap,
  Clock,
  CheckCircle,
  Circle,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OnboardingSimulator } from "./OnboardingSimulator";
import { EnhancedStepPalette } from "./EnhancedStepPalette";
import { EnhancedStepCard } from "./EnhancedStepCard";
import { LivePreviewPane } from "./LivePreviewPane";
import { QuickAddCompliance, ComplianceSummaryBadge } from "./QuickAddCompliance";
import { 
  getDefaultMetadataForStep, 
  normalizeStepMetadata 
} from "./MetadataPanel";
import {
  NZ_ONBOARDING_PRESETS,
  type NzOnboardingPreset,
} from "@/lib/onboarding/nzPresets";

// Step Types with beautiful icons and colors
export const STEP_TYPES = [
  { value: "acknowledge-document", label: "Acknowledge Document", icon: FileText, color: "from-blue-500 to-indigo-600", description: "Have employees read and acknowledge a document" },
  { value: "upload-document", label: "Upload Document", icon: UploadCloud, color: "from-emerald-500 to-teal-600", description: "Request employees to upload required documents" },
  { value: "collect-document", label: "Collect Document", icon: UploadCloud, color: "from-cyan-500 to-blue-600", description: "Collect an existing document from employee" },
  { value: "fill-form", label: "Fill Form", icon: FileEdit, color: "from-purple-500 to-violet-600", description: "Have employees complete a form" },
  { value: "instructions", label: "Welcome/Instructions", icon: Info, color: "from-amber-500 to-orange-600", description: "Display welcome message or instructions" },
  { value: "training-assignment", label: "Assign Training", icon: ShieldCheck, color: "from-rose-500 to-pink-600", description: "Assign training modules to complete" },
  { value: "equipment-checklist", label: "Equipment Checklist", icon: Wrench, color: "from-slate-500 to-gray-600", description: "Track equipment provisioning" },
  { value: "system-access", label: "System Access", icon: KeySquare, color: "from-indigo-500 to-blue-600", description: "Manage system access provisioning" },
  { value: "manager-checkin", label: "Manager Check-in", icon: CalendarClock, color: "from-teal-500 to-cyan-600", description: "Schedule manager check-in meetings" },
  { value: "buddy-introduction", label: "Buddy Introduction", icon: UserRoundPlus, color: "from-green-500 to-emerald-600", description: "Introduce to assigned buddy" },
  { value: "compliance-training", label: "Compliance Training", icon: ShieldCheck, color: "from-red-500 to-rose-600", description: "Complete mandatory compliance training" },
  { value: "payroll-setup", label: "Payroll Setup", icon: Wallet, color: "from-yellow-500 to-amber-600", description: "Collect payroll information" },
  { value: "benefits-enrollment", label: "Benefits Enrollment", icon: HeartPulse, color: "from-pink-500 to-rose-600", description: "Enroll in employee benefits" },
  { value: "probation-goals", label: "Probation Goals", icon: Target, color: "from-violet-500 to-purple-600", description: "Set probation period goals" },
  { value: "welcome-survey", label: "Welcome Survey", icon: Smile, color: "from-orange-500 to-red-600", description: "Collect feedback from new hire" },
  { value: "journey-automation", label: "Journey Automation", icon: Workflow, color: "from-blue-600 to-indigo-700", description: "Trigger automated journey workflows" },
];

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
    uploadType: "",
    formId: "",
    formFields: [],
    metadata: getDefaultMetadataForStep(type),
  };
}

interface OnboardingBuilderEnhancedProps {
  template?: any;
  onSaved: () => void;
  onCancel: () => void;
}

// Droppable Canvas Component
function StepsCanvas({
  canvasRef,
  steps,
  selectedStepIndex,
  setSelectedStepIndex,
  updateStep,
  removeStep,
  duplicateStep,
  addStep,
  setShowPalette,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  steps: any[];
  selectedStepIndex: number | null;
  setSelectedStepIndex: (index: number | null) => void;
  updateStep: (index: number, data: any) => void;
  removeStep: (index: number) => void;
  duplicateStep: (index: number) => void;
  addStep: (type: string) => void;
  setShowPalette: (show: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "steps-canvas" });

  return (
    <div 
      ref={canvasRef}
      className="flex-1 overflow-y-auto px-6 py-6"
    >
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-full rounded-2xl transition-all duration-300",
          isOver && "bg-indigo-50/50 dark:bg-indigo-900/20 ring-2 ring-indigo-300 dark:ring-indigo-700 ring-dashed"
        )}
      >
        {steps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center py-20"
          >
            <div className="text-center max-w-lg">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 mb-6"
              >
                <Layers className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
              </motion.div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Start Building Your Journey
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Drag steps from the palette on the left to create an amazing onboarding experience for your new hires.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {STEP_TYPES.slice(0, 4).map((type) => (
                  <motion.button
                    key={type.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addStep(type.value)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className={cn("w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center", type.color)}>
                      <type.icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">{type.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <SortableContext items={steps.map(s => s.key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 max-w-4xl mx-auto">
              <AnimatePresence mode="popLayout">
                {steps.map((step, index) => (
                  <EnhancedStepCard
                    key={step.key}
                    step={step}
                    index={index}
                    isSelected={selectedStepIndex === index}
                    onSelect={() => setSelectedStepIndex(index)}
                    onUpdate={(data) => updateStep(index, data)}
                    onRemove={() => removeStep(index)}
                    onDuplicate={() => duplicateStep(index)}
                    stepType={STEP_TYPES.find((t) => t.value === step.type)}
                  />
                ))}
              </AnimatePresence>

              {/* Add Step Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowPalette(true)}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add another step</span>
              </motion.button>
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

export function OnboardingBuilderEnhanced({
  template,
  onSaved,
  onCancel,
}: OnboardingBuilderEnhancedProps) {
  // State
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [departments, setDepartments] = useState<string[]>(
    template?.departments?.map((d: any) => d.id) || []
  );
  const [jobRoles, setJobRoles] = useState<string[]>(
    template?.jobRoles?.map((j: any) => j.id) || []
  );
  const [departmentsList, setDepartmentsList] = useState<{ label: string; value: string }[]>([]);
  const [jobRolesList, setJobRolesList] = useState<{ label: string; value: string }[]>([]);
  const [steps, setSteps] = useState<any[]>(() => {
    if (template?.steps?.length) {
      return template.steps.map((step: any) => ({
        key: step.id || step.key || crypto.randomUUID(),
        id: step.id,
        type: step.type?.toLowerCase().replace(/_/g, "-") || step.type,
        title: step.label || step.title || "",
        description: step.instruction || step.description || "",
        required: step.required ?? true,
        documentId: step.documentId || "",
        uploadType: step.uploadType || "",
        formId: step.formId || "",
        formFields: step.formFields || [],
        metadata: normalizeStepMetadata(step.type, step.metadata),
      }));
    }
    return [];
  });
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    steps.length > 0 ? 0 : null
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [activeDragStep, setActiveDragStep] = useState<any>(null);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load dropdown data
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
            : []
        );
        setJobRolesList(
          Array.isArray(roleData)
            ? roleData.map((j: any) => ({ label: j.name, value: j.id }))
            : []
        );
      } catch {
        setDepartmentsList([]);
        setJobRolesList([]);
      }
    };
    fetchDropdownData();
  }, []);

  // Step operations
  const addStep = useCallback((type: string) => {
    const newStep = createStep(type);
    setSteps((prev) => [...prev, newStep]);
    setSelectedStepIndex(steps.length);
    toast.success(`Added "${STEP_TYPES.find(t => t.value === type)?.label}" step`);
  }, [steps.length]);

  const updateStep = useCallback((index: number, data: any) => {
    setSteps((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], ...data };
      if ("metadata" in data) {
        arr[index].metadata = normalizeStepMetadata(arr[index].type, data.metadata);
      }
      return arr;
    });
  }, []);

  const removeStep = useCallback((index: number) => {
    const stepToRemove = steps[index];
    setSteps((prev) => prev.filter((_, i) => i !== index));
    if (selectedStepIndex === index) {
      setSelectedStepIndex(index > 0 ? index - 1 : steps.length > 1 ? 0 : null);
    } else if (selectedStepIndex !== null && selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
    toast.success(`Step "${stepToRemove?.title || 'Untitled'}" removed`);
  }, [selectedStepIndex, steps]);

  const duplicateStep = useCallback((index: number) => {
    const step = steps[index];
    const duplicated = {
      ...step,
      key: crypto.randomUUID(),
      id: undefined,
      title: `${step.title} (Copy)`,
    };
    setSteps((prev) => {
      const arr = [...prev];
      arr.splice(index + 1, 0, duplicated);
      return arr;
    });
    setSelectedStepIndex(index + 1);
    toast.success("Step duplicated");
  }, [steps]);

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    setSteps((prev) => {
      const arr = [...prev];
      const [removed] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, removed);
      return arr;
    });
    setSelectedStepIndex(toIndex);
  }, []);

  // Apply NZ compliance preset
  const applyPreset = useCallback((preset: NzOnboardingPreset) => {
    if (!preset) return;

    let added = 0;
    const createdSteps: any[] = [];

    setSteps((prev) => {
      const next = [...prev];
      preset.steps.forEach((presetStep) => {
        const slug = presetStep.slug;
        const metadataPayload = {
          ...(presetStep.metadata || {}),
          presetSlug: slug,
        };

        // Check if step already exists
        const existingIndex = next.findIndex(
          (step) => step?.metadata?.presetSlug === slug
        );

        if (existingIndex >= 0) {
          // Already exists, skip
          return;
        }

        const baseStep = createStep(presetStep.type);
        const hydratedMetadata = normalizeStepMetadata(
          presetStep.type,
          metadataPayload
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
        createdSteps.push(newStep);
        added += 1;
      });
      return next;
    });

    if (added === 0) {
      toast.info("Preset already applied", {
        description: "All steps from this preset are already in your template.",
      });
      return;
    }

    setSelectedStepIndex(steps.length + createdSteps.length - 1);
    toast.success(`Added ${added} NZ compliance step${added === 1 ? "" : "s"}`, {
      description: preset.name,
    });
  }, [steps.length]);

  // Track applied presets
  const appliedPresets = useMemo(() => {
    const applied = new Set<string>();
    steps.forEach((step) => {
      const slug = step?.metadata?.presetSlug;
      if (slug) {
        NZ_ONBOARDING_PRESETS.forEach((preset) => {
          if (preset.steps.some((s) => s.slug === slug)) {
            applied.add(preset.id);
          }
        });
      }
    });
    return applied;
  }, [steps]);

  // Drag and drop handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragStep(null);

    if (!over) return;

    const dragged = active.data?.current as any;
    
    // Adding from palette
    if (dragged?.source === "step-palette" && dragged?.type) {
      const newStep = createStep(dragged.type);
      
      // Check if dropped on the canvas itself (empty area or canvas drop zone)
      if (over.id === "steps-canvas") {
        // Add to the end of the list
        setSteps((prev) => [...prev, newStep]);
        setSelectedStepIndex(steps.length);
        toast.success(`Added "${STEP_TYPES.find(t => t.value === dragged.type)?.label}" step`);
        return;
      }
      
      // Dropped over an existing step - insert at that position
      const overIndex = steps.findIndex((s) => s.key === over.id);
      const insertIndex = overIndex === -1 ? steps.length : overIndex;
      
      setSteps((prev) => {
        const arr = [...prev];
        arr.splice(insertIndex, 0, newStep);
        return arr;
      });
      setSelectedStepIndex(insertIndex);
      toast.success(`Added "${STEP_TYPES.find(t => t.value === dragged.type)?.label}" step`);
      return;
    }

    // Reordering existing steps
    if (over.id === "steps-canvas") {
      // Dropped on canvas but not over a specific step - no reorder needed
      return;
    }
    
    const activeIndex = steps.findIndex((s) => s.key === active.id);
    const overIndex = steps.findIndex((s) => s.key === over.id);
    
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      moveStep(activeIndex, overIndex);
    }
  }, [steps, moveStep]);

  // Save handler
  const handleSave = async (publish = false) => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (steps.length === 0) {
      toast.error("Add at least one step before saving");
      return;
    }

    // Validate step titles
    const emptyTitles = steps.filter((s) => !s.title.trim());
    if (emptyTitles.length > 0) {
      toast.error(`${emptyTitles.length} step(s) need a title`);
      return;
    }

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
      };

      const res = await fetch("/api/onboarding/templates", {
        method: template?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Error saving template");
      }

      toast.success(`Template ${publish ? "published" : "saved"} successfully!`);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error saving template";
      toast.error(message);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  // Calculate progress
  const completedSteps = steps.filter((s) => s.title.trim()).length;
  const progressPercent = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  const selectedStep = selectedStepIndex !== null ? steps[selectedStepIndex] : null;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-none border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-6 py-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25"
            >
              <Rocket className="w-6 h-6 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0 max-w-md">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Untitled Template"
                className="text-xl font-bold border-0 bg-transparent px-0 focus:ring-0 placeholder:text-slate-400"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="text-sm text-muted-foreground border-0 bg-transparent px-0 focus:ring-0 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Progress */}
          <div className="hidden lg:flex items-center gap-4 px-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {completedSteps} of {steps.length} steps
              </p>
              <p className="text-xs text-muted-foreground">configured</p>
            </div>
            <div className="w-32">
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>

          {/* Compliance Summary */}
          <ComplianceSummaryBadge steps={steps} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Add Compliance */}
            <QuickAddCompliance
              onApplyPreset={applyPreset}
              appliedPresets={appliedPresets}
              steps={steps}
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={() => setIsSimulating(true)}
                className="gap-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:border-indigo-700"
                disabled={steps.length === 0}
              >
                <Play className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Simulate</span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">{saving ? "Saving..." : "Save Draft"}</span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving || publishing}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{publishing ? "Publishing..." : "Publish"}</span>
              </Button>
            </motion.div>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DndContext
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onDragStart={(event) => {
            const dragged = event.active.data?.current as any;
            if (dragged) {
              setActiveDragStep(dragged);
            }
          }}
          onDragCancel={() => setActiveDragStep(null)}
        >
          {/* Step Palette */}
          <AnimatePresence mode="wait">
            {showPalette && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-none w-72 border-r bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden flex flex-col"
              >
                <EnhancedStepPalette 
                  stepTypes={STEP_TYPES} 
                  onAddStep={addStep}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Palette Button */}
          <button
            onClick={() => setShowPalette(!showPalette)}
            className="flex-none w-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-r dark:border-slate-700"
          >
            {showPalette ? (
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Canvas */}
          <StepsCanvas 
            canvasRef={canvasRef}
            steps={steps}
            selectedStepIndex={selectedStepIndex}
            setSelectedStepIndex={setSelectedStepIndex}
            updateStep={updateStep}
            removeStep={removeStep}
            duplicateStep={duplicateStep}
            addStep={addStep}
            setShowPalette={setShowPalette}
          />

          {/* Toggle Preview Button */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex-none w-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-l dark:border-slate-700"
          >
            {showPreview ? (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Live Preview Pane */}
          <AnimatePresence mode="wait">
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex-none w-96 border-l bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden flex flex-col"
              >
                <LivePreviewPane 
                  step={selectedStep}
                  totalSteps={steps.length}
                  currentIndex={selectedStepIndex}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drag Overlay */}
          <DragOverlay modifiers={[snapCenterToCursor]}>
            {activeDragStep ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-2xl border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                    STEP_TYPES.find((t) => t.value === activeDragStep.type)?.color || "from-gray-500 to-gray-600"
                  )}>
                    {(() => {
                      const Icon = STEP_TYPES.find((t) => t.value === activeDragStep.type)?.icon || FileText;
                      return <Icon className="w-4 h-4 text-white" />;
                    })()}
                  </div>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {activeDragStep.label || STEP_TYPES.find((t) => t.value === activeDragStep.type)?.label}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Simulation Modal */}
      <OnboardingSimulator
        isOpen={isSimulating}
        onClose={() => setIsSimulating(false)}
        steps={steps}
        templateName={name || "Onboarding Template"}
      />

      {/* Audience Settings Sheet */}
      <Sheet>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Audience Settings</SheetTitle>
            <SheetDescription>
              Configure which employees this template applies to
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <Label>Departments</Label>
              <MultiSelect
                options={departmentsList}
                selected={departments}
                onChange={setDepartments}
                placeholder="All departments"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to apply to all departments
              </p>
            </div>
            <div>
              <Label>Job Roles</Label>
              <MultiSelect
                options={jobRolesList}
                selected={jobRoles}
                onChange={setJobRoles}
                placeholder="All job roles"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to apply to all job roles
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default OnboardingBuilderEnhanced;



