"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import { toast } from "sonner";
import { TemplateWizardState, TemplateType } from "@/types/performance-templates";
import { TemplateTypeSelector } from "@/components/performance/wizard/TemplateTypeSelector";
import { AudienceFilterStep } from "@/components/performance/wizard/AudienceFilterStep";
import { ReviewerAssignmentStep } from "@/components/performance/wizard/ReviewerAssignmentStep";
import { BestPracticePackStep } from "@/components/performance/wizard/BestPracticePackStep";
import { TemplateBuilderStep } from "@/components/performance/wizard/TemplateBuilderStep";

const STEPS = [
  { id: 1, label: "Template Type", description: "Choose the type of template" },
  { id: 2, label: "Audience", description: "Define who this applies to" },
  { id: 3, label: "Reviewers", description: "Configure feedback providers" },
  { id: 4, label: "Best Practices", description: "Import curated content" },
  { id: 5, label: "Build", description: "Design your template" },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
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

  // Check permissions
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
        // Audience filters are optional
        return true;
      case 3:
        // Reviewer assignments are optional
        return true;
      case 4:
        // Best practice packs are optional
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
      toast.success("Template created successfully!");
      router.push(`/performance/templates/${template.id}`);
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
      icon={<FileText className="h-6 w-6" />}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Progress Stepper */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">
                    Step {currentStep} of {STEPS.length}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(progressPercent)}% Complete
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Step Indicators */}
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        step.id < currentStep
                          ? "bg-green-500 border-green-500 text-white"
                          : step.id === currentStep
                          ? "bg-primary border-primary text-white"
                          : "bg-white border-gray-300 text-gray-400"
                      }`}
                    >
                      {step.id < currentStep ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{step.id}</span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div
                        className={`text-xs font-medium ${
                          step.id === currentStep
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="text-xs text-muted-foreground hidden md:block">
                        {step.description}
                      </div>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`absolute h-0.5 w-full top-5 -z-10 ${
                          step.id < currentStep ? "bg-green-500" : "bg-gray-300"
                        }`}
                        style={{
                          left: `${(index + 0.5) * (100 / STEPS.length)}%`,
                          width: `${100 / STEPS.length}%`,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="min-h-[500px]">
          {currentStep === 1 && (
            <TemplateTypeSelector
              selectedType={wizardState.type}
              onSelect={(type) => updateWizardState({ type })}
            />
          )}

          {currentStep === 2 && (
            <AudienceFilterStep
              filters={wizardState.audienceFilters}
              onChange={(filters) => updateWizardState({ audienceFilters: filters })}
            />
          )}

          {currentStep === 3 && wizardState.type && (
            <ReviewerAssignmentStep
              templateType={wizardState.type}
              assignments={wizardState.reviewerAssignments}
              onChange={(assignments) =>
                updateWizardState({ reviewerAssignments: assignments })
              }
            />
          )}

          {currentStep === 4 && wizardState.type && (
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
          )}

          {currentStep === 5 && wizardState.type && (
            <TemplateBuilderStep
              templateType={wizardState.type}
              name={wizardState.name}
              description={wizardState.description}
              sections={wizardState.sections}
              onChange={(data) => updateWizardState(data)}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="pt-6">
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
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {currentStep === 1 ? "Cancel" : "Back"}
              </Button>

              <div className="flex items-center gap-2">
                {currentStep < STEPS.length ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || isSaving}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={!canProceed() || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" />
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
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  {currentStep === 1 && "Please select a template type to continue"}
                  {currentStep === 5 && "Please provide a name and add at least one section"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
