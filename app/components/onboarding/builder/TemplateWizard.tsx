"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/MultiSelect";
import Checkbox from "@/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  ArrowLeft,
  Rocket,
  FileText,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Sparkles,
  Building2,
  Users,
  Star,
  Wallet,
  HeartPulse,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NZ_ONBOARDING_PRESETS,
  type NzOnboardingPreset,
} from "@/lib/onboarding/nzPresets";
import { getDefaultMetadataForStep, normalizeStepMetadata } from "./MetadataPanel";

// Wizard step definitions
type WizardStep = "start" | "compliance" | "audience" | "details";

// Starting point options
const STARTING_POINTS = [
  {
    id: "blank",
    title: "Blank Template",
    description: "Start from scratch with a clean slate",
    icon: FileText,
    color: "from-slate-500 to-gray-600",
    recommended: false,
  },
  {
    id: "nz-standard",
    title: "NZ Standard Onboarding",
    description: "Pre-configured with IRD, KiwiSaver, and H&S compliance steps",
    icon: ShieldCheck,
    color: "from-emerald-500 to-teal-600",
    recommended: true,
    badge: "Most Popular",
  },
  {
    id: "quick-start",
    title: "Quick Start",
    description: "Welcome message, basic documents, and payroll setup",
    icon: Zap,
    color: "from-amber-500 to-orange-600",
    recommended: false,
  },
  {
    id: "clone",
    title: "Clone Existing",
    description: "Start from an existing template",
    icon: Copy,
    color: "from-indigo-500 to-purple-600",
    recommended: false,
  },
];

// Compliance options for step 2
const COMPLIANCE_OPTIONS = [
  {
    id: "ird",
    title: "IRD & Tax Collection",
    description: "IR330 declaration, IRD number, tax codes",
    icon: Wallet,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    presetId: "nz-ird-forms",
    required: true,
    references: ["Tax Administration Act 1994"],
  },
  {
    id: "kiwisaver",
    title: "KiwiSaver Enrollment",
    description: "Contribution rates, opt-in/opt-out preferences",
    icon: HeartPulse,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    presetId: "nz-kiwisaver",
    required: false,
    references: ["KiwiSaver Act 2006"],
  },
  {
    id: "health-safety",
    title: "Health & Safety",
    description: "WorkSafe briefing, H&S acknowledgement, hazard training",
    icon: ShieldCheck,
    color: "text-rose-600",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    presetId: "nz-health-safety",
    required: true,
    references: ["HSWA 2015"],
  },
];

interface TemplateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: WizardConfig) => void;
  existingTemplates?: { id: string; name: string }[];
}

export interface WizardConfig {
  name: string;
  description: string;
  startingPoint: string;
  complianceOptions: string[];
  departments: string[];
  jobRoles: string[];
  steps: any[];
}

function createStep(type: string, title: string, description: string, metadata?: any) {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return {
    key: uuid,
    type,
    title,
    description,
    required: true,
    documentId: "",
    uploadType: "",
    formId: "",
    formFields: [],
    metadata: normalizeStepMetadata(type, metadata || getDefaultMetadataForStep(type)),
  };
}

// Generate steps based on selections
function generateSteps(startingPoint: string, complianceOptions: string[]): any[] {
  const steps: any[] = [];

  // Add welcome step for all except blank
  if (startingPoint !== "blank") {
    steps.push(
      createStep(
        "instructions",
        "Welcome to the Team!",
        "We're excited to have you join us. This onboarding journey will help you get set up and ready for success.",
        { buttonLabel: "Let's get started" }
      )
    );
  }

  // Add quick start steps
  if (startingPoint === "quick-start") {
    steps.push(
      createStep(
        "acknowledge-document",
        "Employment Agreement",
        "Please review and acknowledge your employment agreement.",
        { acknowledgementText: "I have read, understood, and agree to the terms of my employment agreement." }
      )
    );
    steps.push(
      createStep(
        "payroll-setup",
        "Payroll Information",
        "Enter your bank and tax details so we can pay you correctly."
      )
    );
  }

  // Add compliance steps based on selections
  if (startingPoint === "nz-standard" || complianceOptions.length > 0) {
    const optionsToAdd =
      startingPoint === "nz-standard"
        ? ["ird", "kiwisaver", "health-safety"]
        : complianceOptions;

    optionsToAdd.forEach((optionId) => {
      const preset = NZ_ONBOARDING_PRESETS.find(
        (p) => COMPLIANCE_OPTIONS.find((co) => co.id === optionId)?.presetId === p.id
      );
      if (preset) {
        preset.steps.forEach((presetStep) => {
          const hydratedMetadata = normalizeStepMetadata(presetStep.type, {
            ...(presetStep.metadata || {}),
            presetSlug: presetStep.slug,
          });
          steps.push({
            key:
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2),
            type: presetStep.type,
            title: presetStep.title,
            description: presetStep.description,
            required: presetStep.required ?? true,
            documentId: presetStep.documentId ?? "",
            uploadType: presetStep.uploadType ?? "",
            formId: presetStep.formId ?? "",
            formFields: presetStep.formFields ?? [],
            metadata: hydratedMetadata,
          });
        });
      }
    });
  }

  return steps;
}

export function TemplateWizard({
  isOpen,
  onClose,
  onComplete,
  existingTemplates = [],
}: TemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("start");
  const [startingPoint, setStartingPoint] = useState<string>("");
  const [selectedCompliance, setSelectedCompliance] = useState<string[]>(["ird", "health-safety"]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [jobRoles, setJobRoles] = useState<string[]>([]);
  const [departmentsList, setDepartmentsList] = useState<{ label: string; value: string }[]>([]);
  const [jobRolesList, setJobRolesList] = useState<{ label: string; value: string }[]>([]);
  const [cloneTemplateId, setCloneTemplateId] = useState<string>("");

  // Load departments and job roles
  useEffect(() => {
    const fetchData = async () => {
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
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep("start");
      setStartingPoint("");
      setSelectedCompliance(["ird", "health-safety"]);
      setTemplateName("");
      setTemplateDescription("");
      setDepartments([]);
      setJobRoles([]);
      setCloneTemplateId("");
    }
  }, [isOpen]);

  const canProceed = () => {
    switch (currentStep) {
      case "start":
        return startingPoint !== "" && (startingPoint !== "clone" || cloneTemplateId !== "");
      case "compliance":
        return true; // Optional step
      case "audience":
        return true; // Optional step
      case "details":
        return templateName.trim() !== "";
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case "start":
        // Skip compliance if blank or clone
        if (startingPoint === "blank" || startingPoint === "clone") {
          setCurrentStep("audience");
        } else {
          setCurrentStep("compliance");
        }
        break;
      case "compliance":
        setCurrentStep("audience");
        break;
      case "audience":
        setCurrentStep("details");
        break;
      case "details":
        handleComplete();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "compliance":
        setCurrentStep("start");
        break;
      case "audience":
        if (startingPoint === "blank" || startingPoint === "clone") {
          setCurrentStep("start");
        } else {
          setCurrentStep("compliance");
        }
        break;
      case "details":
        setCurrentStep("audience");
        break;
    }
  };

  const handleComplete = () => {
    const steps = generateSteps(startingPoint, selectedCompliance);

    onComplete({
      name: templateName,
      description: templateDescription,
      startingPoint,
      complianceOptions: selectedCompliance,
      departments,
      jobRoles,
      steps,
    });
  };

  const toggleCompliance = (id: string) => {
    setSelectedCompliance((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const stepIndicators = [
    { key: "start", label: "Start" },
    ...(startingPoint !== "blank" && startingPoint !== "clone"
      ? [{ key: "compliance", label: "Compliance" }]
      : []),
    { key: "audience", label: "Audience" },
    { key: "details", label: "Details" },
  ];

  const currentStepIndex = stepIndicators.findIndex((s) => s.key === currentStep);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/20">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Create Onboarding Template
              </h2>
              <p className="text-muted-foreground">
                Let's set up your new hire journey
              </p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {stepIndicators.map((step, index) => (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                      index < currentStepIndex
                        ? "bg-emerald-500 text-white"
                        : index === currentStepIndex
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    )}
                  >
                    {index < currentStepIndex ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium hidden sm:inline",
                      index === currentStepIndex
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < stepIndicators.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2",
                      index < currentStepIndex
                        ? "bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* Step 1: Starting Point */}
            {currentStep === "start" && (
              <motion.div
                key="start"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Choose a starting point
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Select how you'd like to begin building your template
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STARTING_POINTS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = startingPoint === option.id;

                    return (
                      <button
                        key={option.id}
                        onClick={() => setStartingPoint(option.id)}
                        className={cn(
                          "relative p-5 rounded-2xl border-2 text-left transition-all",
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-500/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md"
                        )}
                      >
                        {option.badge && (
                          <Badge className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">
                            <Star className="w-2.5 h-2.5 mr-0.5" />
                            {option.badge}
                          </Badge>
                        )}
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4",
                            option.color
                          )}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                          {option.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                        {isSelected && (
                          <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {startingPoint === "clone" && existingTemplates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select template to clone</Label>
                    <select
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3"
                      value={cloneTemplateId}
                      onChange={(e) => setCloneTemplateId(e.target.value)}
                    >
                      <option value="">Choose a template...</option>
                      {existingTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Compliance */}
            {currentStep === "compliance" && (
              <motion.div
                key="compliance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    NZ Compliance Requirements
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Select the compliance areas relevant to your organisation
                  </p>
                </div>

                <div className="space-y-3">
                  {COMPLIANCE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedCompliance.includes(option.id);

                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleCompliance(option.id)}
                        className={cn(
                          "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                          isSelected
                            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-none",
                            option.bgColor
                          )}
                        >
                          <Icon className={cn("w-5 h-5", option.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {option.title}
                            </h4>
                            {option.required && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px]">
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {option.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {option.references.map((ref, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {ref}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-none",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-slate-300 dark:border-slate-600"
                          )}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-none mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">
                        You can always add or remove compliance steps later
                      </p>
                      <p className="text-blue-600 dark:text-blue-400">
                        These selections will pre-populate your template with the relevant
                        steps, but you can customize everything in the builder.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Audience */}
            {currentStep === "audience" && (
              <motion.div
                key="audience"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Who is this template for?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Optionally restrict this template to specific departments or roles
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      Departments
                    </Label>
                    <MultiSelect
                      options={departmentsList}
                      selected={departments}
                      onChange={setDepartments}
                      placeholder="All departments (leave empty for all)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to apply this template to all departments
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      Job Roles
                    </Label>
                    <MultiSelect
                      options={jobRolesList}
                      selected={jobRoles}
                      onChange={setJobRoles}
                      placeholder="All job roles (leave empty for all)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to apply this template to all job roles
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Details */}
            {currentStep === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Template Details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Give your template a name and description
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Template Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Standard NZ Onboarding"
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Brief description of what this template is for..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Starting point:</span>
                      <span className="font-medium">
                        {STARTING_POINTS.find((s) => s.id === startingPoint)?.title}
                      </span>
                    </div>
                    {selectedCompliance.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Compliance:</span>
                        <span className="font-medium">
                          {selectedCompliance
                            .map(
                              (c) =>
                                COMPLIANCE_OPTIONS.find((co) => co.id === c)?.title
                            )
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Departments:</span>
                      <span className="font-medium">
                        {departments.length > 0
                          ? departments
                              .map(
                                (d) =>
                                  departmentsList.find((dl) => dl.value === d)?.label
                              )
                              .join(", ")
                          : "All"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Job roles:</span>
                      <span className="font-medium">
                        {jobRoles.length > 0
                          ? jobRoles
                              .map(
                                (j) => jobRolesList.find((jl) => jl.value === j)?.label
                              )
                              .join(", ")
                          : "All"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={currentStep === "start" ? onClose : handleBack}
            className="gap-2"
          >
            {currentStep === "start" ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                Back
              </>
            )}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {currentStep === "details" ? (
              <>
                <Sparkles className="w-4 h-4" />
                Create Template
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateWizard;

