"use client";

import React, { useState, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { hrCategories, hrReportTemplates, ReportTemplate } from "@/lib/hrReportFields";
import FieldSelection from "./FieldSelection";
import FilterConfiguration, { ReportFilter, SortConfig } from "./FilterConfiguration";

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Report
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {steps[currentStepIndex].description}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                const isUpcoming = index > currentStepIndex;

                return (
                  <li key={step.id} className="flex items-center">
                    <div className="flex items-center">
                      <div
                        className={`
                          flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                          ${isActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : isCompleted
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-gray-300 bg-white text-gray-500"
                          }
                        `}
                      >
                        {isCompleted ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="ml-3">
                        <p
                          className={`text-sm font-medium ${
                            isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {step.title}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`ml-4 w-16 h-0.5 ${
                          isCompleted ? "bg-green-600" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === "template" && (
            <TemplateSelection
              selectedTemplate={config.template}
              onSelectTemplate={(template) => {
                updateConfig({
                  template,
                  selectedFields: template?.defaultFields || [],
                  filters: template?.suggestedFilters?.map((f, index) => ({
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-2" />
            {isFirstStep ? "Cancel" : "Back"}
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center"
          >
            {isLastStep ? "Create Report" : "Next"}
            {!isLastStep && <ChevronRightIcon className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
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
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Choose a Report Template
        </h3>
        <p className="text-gray-600">
          Start with a pre-built template or create a custom report from scratch.
        </p>
      </div>

      {/* Custom Report Option */}
      <div
        className={`
          border-2 rounded-lg p-4 cursor-pointer transition-all hover:border-blue-300
          ${!selectedTemplate ? "border-blue-500 bg-blue-50" : "border-gray-200"}
        `}
        onClick={() => onSelectTemplate(undefined)}
      >
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Custom Report</h4>
            <p className="text-sm text-gray-600">
              Build a report from scratch with your own field selection
            </p>
          </div>
        </div>
      </div>

      {/* Template Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hrReportTemplates.map((template) => (
          <div
            key={template.id}
            className={`
              border-2 rounded-lg p-4 cursor-pointer transition-all hover:border-blue-300
              ${selectedTemplate?.id === template.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}
            `}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-start">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <span className="text-2xl">{template.icon}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {template.name}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {template.description}
                </p>
                <div className="text-xs text-gray-500">
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


// Report Preview Component (placeholder)
function ReportPreview({
  config,
  onUpdateName,
}: {
  config: ReportConfig;
  onUpdateName: (name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Preview & Save Report
      </h3>
      <p className="text-gray-600">
        Review your report configuration and give it a name.
      </p>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="report-name" className="block text-sm font-medium text-gray-700 mb-2">
            Report Name
          </label>
          <input
            type="text"
            id="report-name"
            value={config.name || ""}
            onChange={(e) => onUpdateName(e.target.value)}
            placeholder="Enter a name for your report"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Report Summary</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Template:</span>{" "}
              {config.template?.name || "Custom Report"}
            </div>
            <div>
              <span className="font-medium">Fields:</span>{" "}
              {config.selectedFields.length} selected
            </div>
            <div>
              <span className="font-medium">Filters:</span>{" "}
              {config.filters.length} applied
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
