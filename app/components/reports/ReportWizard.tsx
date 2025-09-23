"use client";

import React, { useState, useCallback } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { hrReportTemplates, ReportTemplate } from "@/lib/hrReportFields";
import FieldSelection from "./FieldSelection";
import FilterConfiguration, { ReportFilter, SortConfig } from "./FilterConfiguration";
import { cn } from "@/lib/utils";

export type WizardStep = "template" | "fields" | "filters" | "preview";

export interface ReportConfig {
  template?: ReportTemplate;
  selectedFields: string[];
  filters: ReportFilter[];
  sort?: SortConfig;
  name?: string;
}

interface ReportWizardProps {
  onComplete: (config: ReportConfig) => void;
  onCancel: () => void;
}

const steps: Array<{ id: WizardStep; title: string; description: string }> = [
  {
    id: "template",
    title: "Choose Report Type",
    description: "Select a pre-built template or start from scratch",
  },
  {
    id: "fields",
    title: "Select Fields",
    description: "Choose the data fields to include in your report",
  },
  {
    id: "filters",
    title: "Configure Filters",
    description: "Set up filters and sorting options",
  },
  {
    id: "preview",
    title: "Preview & Save",
    description: "Review your report configuration and save",
  },
];

export default function ReportWizard({ onComplete, onCancel }: ReportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("template");
  const [config, setConfig] = useState<ReportConfig>({
    selectedFields: [],
    filters: [],
  });

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete(config);
    } else {
      const nextStepIndex = currentStepIndex + 1;
      setCurrentStep(steps[nextStepIndex].id);
    }
  }, [currentStepIndex, isLastStep, config, onComplete]);

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      onCancel();
    } else {
      const prevStepIndex = currentStepIndex - 1;
      setCurrentStep(steps[prevStepIndex].id);
    }
  }, [currentStepIndex, isFirstStep, onCancel]);

  const updateConfig = useCallback((updates: Partial<ReportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case "template":
        return true; // Can always proceed from template selection
      case "fields":
        return config.selectedFields.length > 0;
      case "filters":
        return true; // Filters are optional
      case "preview":
        return config.name && config.name.trim().length > 0;
      default:
        return false;
    }
  };

  const canMoveForward = canProceed();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="flex min-h-0 w-full max-w-5xl max-h-[90vh] flex-col overflow-y-auto">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl">Create New Report</CardTitle>
            <CardDescription>{steps[currentStepIndex].description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            aria-label="Close report wizard"
            className="self-end sm:self-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col space-y-0 p-0">
          <div className="border-b border-glass bg-muted/40 px-6 py-4">
            <nav aria-label="Progress">
              <ol className="flex flex-wrap gap-4">
                {steps.map((step, index) => {
                  const isActive = step.id === currentStep;
                  const isCompleted = index < currentStepIndex;

                  return (
                    <li key={step.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-warm"
                            : isCompleted
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-glass text-muted-foreground",
                        )}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="min-w-[120px] space-y-1">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isActive
                              ? "text-primary"
                              : isCompleted
                              ? "text-emerald-600"
                              : "text-foreground/70",
                          )}
                        >
                          {step.title}
                        </p>
                        <p className="hidden text-xs text-muted-foreground sm:block">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {currentStep === "template" && (
              <TemplateSelection
                selectedTemplate={config.template}
                onSelectTemplate={(template) => {
                  updateConfig({
                    template,
                    selectedFields: template?.defaultFields || [],
                    filters:
                      template?.suggestedFilters?.map((f, index) => ({
                        id: `filter_${index}`,
                        field: f.field,
                        operator: f.operator as any,
                        value: f.value,
                      })) || [],
                  });
                }}
              />
            )}

            {currentStep === "fields" && (
              <FieldSelection
                selectedFields={config.selectedFields}
                onUpdateFields={(selectedFields) => updateConfig({ selectedFields })}
              />
            )}

            {currentStep === "filters" && (
              <FilterConfiguration
                filters={config.filters}
                sort={config.sort}
                selectedFields={config.selectedFields}
                onUpdateFilters={(filters) => updateConfig({ filters })}
                onUpdateSort={(sort) => updateConfig({ sort })}
              />
            )}

            {currentStep === "preview" && (
              <ReportPreview
                config={config}
                onUpdateName={(name) => updateConfig({ name })}
              />
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            {isFirstStep ? "Cancel" : "Back"}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canMoveForward}
            className="flex items-center gap-2"
          >
            {isLastStep ? "Create Report" : "Next"}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Template Selection Component
function TemplateSelection({
  selectedTemplate,
  onSelectTemplate,
}: {
  selectedTemplate?: ReportTemplate;
  onSelectTemplate: (template: ReportTemplate | undefined) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Choose a Report Template</h3>
        <p className="text-sm text-muted-foreground">
          Start with a pre-built template or create a custom report from scratch.
        </p>
      </div>

      <div
        className={cn(
          "cursor-pointer rounded-2xl border border-glass bg-background/80 p-5 transition hover:border-primary/40 hover:shadow-glass",
          !selectedTemplate && "border-primary bg-primary/10",
        )}
        onClick={() => onSelectTemplate(undefined)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <span className="text-2xl">⚡</span>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Custom Report</h4>
            <p className="text-sm text-muted-foreground">
              Build a report from scratch with your own field selection
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {hrReportTemplates.map((template) => (
          <div
            key={template.id}
            className={cn(
              "cursor-pointer rounded-2xl border border-glass bg-background/80 p-5 transition hover:border-primary/40 hover:shadow-glass",
              selectedTemplate?.id === template.id && "border-primary bg-primary/10",
            )}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-muted">
                <span className="text-2xl">{template.icon}</span>
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {template.name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  {template.defaultFields.length} fields included
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// Report Preview Component
function ReportPreview({
  config,
  onUpdateName,
}: {
  config: ReportConfig;
  onUpdateName: (name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        Preview & Save Report
      </h3>
      <p className="text-sm text-muted-foreground">
        Review your report configuration and give it a name.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="report-name" className="mb-2 block text-sm font-semibold text-foreground">
            Report Name *
          </label>
          <input
            type="text"
            id="report-name"
            value={config.name || ""}
            onChange={(e) => onUpdateName(e.target.value)}
            placeholder="Enter a name for your report"
            className="w-full rounded-2xl border border-glass bg-background px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div className="rounded-2xl border border-glass bg-muted/40 p-4">
          <h4 className="mb-2 text-sm font-semibold text-foreground">Report Summary</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-semibold text-foreground">Template:</span>
              {config.template?.name || "Custom Report"}
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-foreground">Fields:</span>{" "}
              {config.selectedFields.length} selected
              {config.selectedFields.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {config.selectedFields.slice(0, 3).join(", ")}
                  {config.selectedFields.length > 3 && ` and ${config.selectedFields.length - 3} more`}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-semibold text-foreground">Filters:</span>
              {config.filters.length} applied
            </div>
            {config.sort && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-semibold text-foreground">Sorting:</span>
                {config.sort.field} ({config.sort.direction})
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
