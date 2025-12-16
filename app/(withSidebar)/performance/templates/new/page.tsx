"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Sparkles,
  LayoutTemplate,
  Users,
  UserCheck,
  Layers,
  CheckCircle,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateWizardState, TemplateType } from "@/types/performance-templates";
import { TemplateTypeSelector } from "@/components/performance/wizard/TemplateTypeSelector";
import { AudienceFilterStep } from "@/components/performance/wizard/AudienceFilterStep";
import { ReviewerAssignmentStep } from "@/components/performance/wizard/ReviewerAssignmentStep";
import { BestPracticePackStep } from "@/components/performance/wizard/BestPracticePackStep";
import { TemplateBuilderStep } from "@/components/performance/wizard/TemplateBuilderStep";
import { cn } from "@/lib/utils";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";

const STEPS = [
  { id: 1, label: "Template Type", description: "Choose the type", icon: LayoutTemplate },
  { id: 2, label: "Audience", description: "Define scope", icon: Users },
  { id: 3, label: "Reviewers", description: "Configure feedback", icon: UserCheck },
  { id: 4, label: "Best Practices", description: "Import content", icon: Sparkles },
  { id: 5, label: "Build", description: "Design template", icon: Layers },
];

function NewTemplatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
 
  const breadcrumbItems = [
    { label: "Performance", href: "/performance" },
    { label: "Templates", href: "/performance/templates" },
    { label: "Create Template", isCurrentPage: true },
  ];
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [wizardState, setWizardState] = useState<TemplateWizardState>({
    step: 1,
    type: (searchParams.get("type")?.toUpperCase() as TemplateType) || undefined,
    name: "",
    description: "",
    audienceFilters: {},
    reviewerAssignments: [],
    bestPracticePackIds: [],
    sections: [],
    tags: [],
  });

  const canCreateTemplate = 
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";

  useEffect(() => {
    if (session && !canCreateTemplate) {
      toast.error("You don't have permission to create templates");
      router.push("/performance");
    }
  }, [session, canCreateTemplate, router]);

  const updateWizardState = (updates: Partial<TemplateWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!wizardState.type;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return (
          wizardState.name.trim().length > 0 &&
          wizardState.sections.length > 0
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!canProceed()) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/performance/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wizardState.name,
          description: wizardState.description,
          type: wizardState.type,
          icon: wizardState.icon,
          tags: wizardState.tags,
          audienceFilters: wizardState.audienceFilters,
          reviewerAssignments: wizardState.reviewerAssignments,
          bestPracticePackIds: wizardState.bestPracticePackIds,
          sections: wizardState.sections,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create template");
      }

      const { template } = await response.json();
      setShowSuccess(true);
      
      setTimeout(() => {
        router.push(`/performance/templates/${template.id}`);
      }, 1500);
    } catch (error) {
      console.error("Failed to create template:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create template");
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <PageShell
      title="Create Performance Template"
      description="Build a custom template for performance management"
      icon={<LayoutTemplate className="h-6 w-6" />}
      breadcrumbs={{ items: breadcrumbItems }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Progress Stepper */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="font-medium text-slate-900">
                      Step {currentStep} of {STEPS.length}
                    </span>
                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                      {Math.round(progressPercent)}% Complete
                    </Badge>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center justify-between relative">
                  {/* Connection lines */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 -z-10" />
                  <div 
                    className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 -z-10 transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                  />

                  {STEPS.map((step, index) => {
                    const StepIcon = step.icon;
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    
                    return (
                      <div 
                        key={step.id} 
                        className="flex flex-col items-center"
                        style={{ width: `${100 / STEPS.length}%` }}
                      >
                        <motion.div
                          initial={false}
                          animate={{
                            scale: isCurrent ? 1.1 : 1,
                            backgroundColor: isCompleted ? "#10b981" : isCurrent ? "#8b5cf6" : "#e2e8f0"
                          }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow-md",
                            isCompleted && "text-white",
                            isCurrent && "text-white ring-4 ring-violet-200",
                            !isCompleted && !isCurrent && "text-slate-400"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <StepIcon className="h-5 w-5" />
                          )}
                        </motion.div>
                        <div className="mt-3 text-center">
                          <div
                            className={cn(
                              "text-xs font-medium",
                              isCurrent ? "text-violet-700" : isCompleted ? "text-emerald-700" : "text-muted-foreground"
                            )}
                          >
                            {step.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground hidden md:block">
                            {step.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Step Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="min-h-[500px]"
        >
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TemplateTypeSelector
                  selectedType={wizardState.type}
                  onSelect={(type) => updateWizardState({ type })}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <AudienceFilterStep
                  filters={wizardState.audienceFilters}
                  onChange={(filters) => updateWizardState({ audienceFilters: filters })}
                />
              </motion.div>
            )}

            {currentStep === 3 && wizardState.type && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ReviewerAssignmentStep
                  templateType={wizardState.type}
                  assignments={wizardState.reviewerAssignments}
                  onChange={(assignments) =>
                    updateWizardState({ reviewerAssignments: assignments })
                  }
                />
              </motion.div>
            )}

            {currentStep === 4 && wizardState.type && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <BestPracticePackStep
                  templateType={wizardState.type}
                  selectedPackIds={wizardState.bestPracticePackIds}
                  onSelect={(packIds, sections) =>
                    updateWizardState({
                      bestPracticePackIds: packIds,
                      sections: [...wizardState.sections, ...sections],
                    })
                  }
                />
              </motion.div>
            )}

            {currentStep === 5 && wizardState.type && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TemplateBuilderStep
                  templateType={wizardState.type}
                  name={wizardState.name}
                  description={wizardState.description}
                  sections={wizardState.sections}
                  reviewerAssignments={wizardState.reviewerAssignments}
                  onChange={(data) => updateWizardState(data)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentStep === 1) {
                      router.push("/performance");
                    } else {
                      handleBack();
                    }
                  }}
                  disabled={isSaving}
                  className="rounded-xl hover:bg-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {currentStep === 1 ? "Cancel" : "Back"}
                </Button>

                <div className="flex items-center gap-3">
                  {/* Progress indicators */}
                  <div className="hidden md:flex items-center gap-1">
                    {STEPS.map((step) => (
                      <div
                        key={step.id}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          step.id < currentStep && "bg-emerald-500",
                          step.id === currentStep && "bg-violet-500",
                          step.id > currentStep && "bg-slate-300"
                        )}
                      />
                    ))}
                  </div>

                  {currentStep < STEPS.length ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed() || isSaving}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg rounded-xl"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSave}
                      disabled={!canProceed() || isSaving}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg rounded-xl"
                    >
                      {isSaving ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Sparkles className="h-4 w-4" />
                          </motion.div>
                          Creating Template...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Create Template
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {!canProceed() && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert className="mt-4 bg-amber-50 border-amber-200">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Action Required</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      {currentStep === 1 && "Please select a template type to continue"}
                      {currentStep === 5 && "Please provide a name and add at least one section"}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Success Animation */}
      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName="Template"
      />
    </PageShell>
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <NewTemplatePageContent />
    </Suspense>
  );
}
