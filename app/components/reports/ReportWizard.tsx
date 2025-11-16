"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Check, ChevronLeft, ChevronRight, X, Search, Filter, Eye, Info, ChevronDown, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportTemplate, hrReportFields, hrCategories, getFieldsByCategory } from "@/lib/hrReportFields";
import type { ReportFilter, SortConfig, FilterOperator } from "@/lib/reportFilters";
import FieldSelection from "./FieldSelection";
import FilterConfiguration from "./FilterConfiguration";
import { cn } from "@/lib/utils";
import { useReportingTimeConfig } from "@/hooks/useReportingTimeConfig";
import { reportLibrary, type ReportLibraryEntry } from "@/lib/reportLibrary";
import { Badge } from "@/components/ui/badge";

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
  const REQUIRED_FIELDS = ["User.firstName", "User.lastName"];
  const [currentStep, setCurrentStep] = useState<WizardStep>("template");
  const [config, setConfig] = useState<ReportConfig>({
    selectedFields: REQUIRED_FIELDS,
    filters: [],
  });
  const [fieldsPanelKey, setFieldsPanelKey] = useState<string>("all");
  const { timeZone, locale } = useReportingTimeConfig();

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
    setConfig(prev => {
      const next = { ...prev, ...updates };
      if (Array.isArray(next.selectedFields)) {
        // Ensure required fields are always included
        REQUIRED_FIELDS.forEach((req) => {
          if (!next.selectedFields!.includes(req)) {
            next.selectedFields!.unshift(req);
          }
        });
      }
      return next;
    });
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

const allowedOperators: FilterOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "greater_than_equal",
  "less_than_equal",
  "between",
  "is_null",
  "is_not_null",
  "in",
  "not_in",
  "date_equals",
  "date_before",
  "date_after",
  "date_between",
  "date_in_last",
  "date_in_next",
  "date_preset",
];

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
              <AreaOrTemplateSelection
                onStartCustom={(areaId?: string) => {
                  // Move to fields step, expand the chosen area
                  setCurrentStep("fields");
                  // Ensure required fields are present for a fresh custom report
                  updateConfig({ selectedFields: Array.from(new Set([...
                    REQUIRED_FIELDS,
                  ])) });
                  // Pass hint to FieldSelection via key prop so it re-mounts with desired expansion
                  setFieldsPanelKey(areaId || "all");
                }}
                selectedTemplate={config.template}
                onSelectTemplate={(template) => {
                  const base = template?.defaultFields || [];
                  const withRequired = Array.from(new Set([...
                    REQUIRED_FIELDS,
                    ...base,
                  ]));
                  updateConfig({
                    template,
                    selectedFields: withRequired,
                    filters:
                      template?.suggestedFilters?.map((filter, index) => ({
                        id: `filter_${index}`,
                        field: filter.field,
                        operator: allowedOperators.includes(filter.operator as FilterOperator)
                          ? (filter.operator as FilterOperator)
                          : "equals",
                        value: filter.value,
                        value2: filter.value2,
                      })) || [],
                    sort: template?.defaultSort,
                  });
                  setCurrentStep("fields");
                }}
              />
            )}

            {currentStep === "fields" && (
              <FieldSelection
                key={fieldsPanelKey}
                selectedFields={config.selectedFields}
                onUpdateFields={(selectedFields) => updateConfig({ selectedFields })}
                initialExpandedCategories={
                  fieldsPanelKey && fieldsPanelKey !== "all" ? [fieldsPanelKey] : undefined
                }
              />
            )}

            {currentStep === "filters" && (
              <FilterConfiguration
                filters={config.filters}
                sort={config.sort}
                selectedFields={config.selectedFields}
                onUpdateFilters={(filters) => updateConfig({ filters })}
                onUpdateSort={(sort) => updateConfig({ sort })}
                timeZone={timeZone}
                locale={locale}
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

// Area or Template Selection Component (areas-first for custom reports)
function AreaOrTemplateSelection({
  onStartCustom,
  selectedTemplate,
  onSelectTemplate,
}: {
  onStartCustom: (areaId?: string) => void;
  selectedTemplate?: ReportTemplate;
  onSelectTemplate: (template: ReportTemplate | undefined) => void;
}) {
  const areas = [...hrCategories].sort((a, b) => a.order - b.order);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [detailsModalTemplate, setDetailsModalTemplate] = useState<ReportLibraryEntry | null>(null);

  // Get unique categories from template library
  const templateCategories = useMemo(() => {
    const categories = new Set(reportLibrary.map((t) => t.category));
    return Array.from(categories).sort();
  }, []);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return reportLibrary.filter((template) => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = 
        selectedCategory === "all" || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Check if a field contains PII (simplified heuristic)
  const containsPII = (fields: string[]) => {
    const piiKeywords = ['email', 'phone', 'address', 'irdNumber', 'bankAccountNumber', 'licenceNumber'];
    return fields.some(field => 
      piiKeywords.some(keyword => field.toLowerCase().includes(keyword.toLowerCase()))
    );
  };

  // Convert library entry to template format
  const libraryToTemplate = (entry: ReportLibraryEntry): ReportTemplate => ({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    category: entry.category,
    icon: entry.icon,
    defaultFields: entry.defaultFields,
    suggestedFilters: entry.suggestedFilters,
    defaultSort: entry.defaultSort,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Start a Custom Report</h3>
        <p className="text-sm text-muted-foreground">Choose an area to report on. You can add fields from multiple areas later.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            className={cn(
              "text-left rounded-2xl border p-5 transition hover:border-primary/40 hover:shadow-glass focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              area.color,
            )}
            onClick={() => onStartCustom(area.id)}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/70">
                <span className="text-2xl">{area.icon}</span>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-semibold text-foreground">{area.name}</h4>
                <p className="text-sm text-muted-foreground">{area.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Or Use a Pre-Built Template</h3>
        <p className="text-sm text-muted-foreground">
          Browse our library of ready-to-use report templates with pre-configured fields and filters.
        </p>

        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-glass bg-background py-2.5 pl-10 pr-4 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary",
                selectedCategory === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-glass bg-background hover:border-primary/40"
              )}
            >
              All Categories
            </button>
            {templateCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary",
                  selectedCategory === category
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-glass bg-background hover:border-primary/40"
                )}
              >
                {category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Template Gallery */}
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-glass bg-muted/30 py-12">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h4 className="mb-1 text-sm font-semibold text-foreground">No templates found</h4>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search or category filter
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
              {/* Blank Template Card */}
              <div
                className={cn(
                  "min-w-[280px] flex-shrink-0 cursor-pointer rounded-2xl border bg-gradient-to-br from-background to-muted/30 p-5 transition hover:border-primary/40 hover:shadow-glass focus:outline-none focus:ring-2 focus:ring-primary",
                  !selectedTemplate && "border-primary bg-primary/10 shadow-warm"
                )}
                onClick={() => onSelectTemplate(undefined)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTemplate(undefined);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="Create blank custom report"
              >
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <span className="text-2xl">⚡</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h5 className="text-sm font-semibold text-foreground">Blank Template</h5>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Start from scratch with your own field selection
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold text-primary">Custom</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Template Cards */}
              {filteredTemplates.map((template) => {
                const hasPII = containsPII(template.defaultFields);
                const isRecommended = ['annual-leave-balances', 'department-roster', 'new-starters'].includes(template.id);
                
                return (
                  <div
                    key={template.id}
                    className="group relative min-w-[280px] flex-shrink-0 cursor-pointer rounded-2xl border border-glass bg-gradient-to-br from-background to-muted/30 p-5 transition hover:border-primary/40 hover:shadow-glass focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={() => onSelectTemplate(libraryToTemplate(template))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectTemplate(libraryToTemplate(template));
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Use ${template.name} template`}
                  >
                    <div className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                          <span className="text-2xl">{template.icon}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsModalTemplate(template);
                          }}
                          className="rounded-lg p-1.5 opacity-0 transition hover:bg-muted/80 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label={`View details for ${template.name}`}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                      
                      <div className="flex-1 space-y-1.5">
                        <h5 className="text-sm font-semibold leading-tight text-foreground">
                          {template.name}
                        </h5>
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {template.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {template.category.replace(/-/g, ' ')}
                        </Badge>
                        {isRecommended && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
                            ⭐ Recommended
                          </Badge>
                        )}
                        {hasPII && (
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">
                            🔒 PII
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-glass pt-2.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold text-foreground">{template.defaultFields.length}</span> fields
                        </span>
                        {template.suggestedFilters && template.suggestedFilters.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Filter className="h-3 w-3" />
                            {template.suggestedFilters.length} filter{template.suggestedFilters.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Template Details Modal */}
      {detailsModalTemplate && (
        <TemplateDetailsModal
          template={detailsModalTemplate}
          onClose={() => setDetailsModalTemplate(null)}
          onUseTemplate={() => {
            onSelectTemplate(libraryToTemplate(detailsModalTemplate));
            setDetailsModalTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Template Details Modal Component
function TemplateDetailsModal({
  template,
  onClose,
  onUseTemplate,
}: {
  template: ReportLibraryEntry;
  onClose: () => void;
  onUseTemplate: () => void;
}) {
  const containsPII = (fields: string[]) => {
    const piiKeywords = ['email', 'phone', 'address', 'irdNumber', 'bankAccountNumber', 'licenceNumber'];
    return fields.some(field => 
      piiKeywords.some(keyword => field.toLowerCase().includes(keyword.toLowerCase()))
    );
  };

  const hasPII = containsPII(template.defaultFields);

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-glass bg-background shadow-glass"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-glass bg-background/95 backdrop-blur-sm px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <span className="text-2xl">{template.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-6">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {template.category.replace(/-/g, ' ')}
            </Badge>
            {hasPII && (
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs">
                🔒 Contains PII
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {template.engine}
            </Badge>
          </div>

          {/* Fields */}
          {template.defaultFields.length > 0 && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4" />
                Included Fields ({template.defaultFields.length})
              </h4>
              <div className="rounded-xl border border-glass bg-muted/30 p-4">
                <div className="flex flex-wrap gap-2">
                  {template.defaultFields.map((field, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center rounded-lg bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm"
                    >
                      {field.split('.').pop()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {template.suggestedFilters && template.suggestedFilters.length > 0 && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="h-4 w-4" />
                Pre-configured Filters ({template.suggestedFilters.length})
              </h4>
              <div className="space-y-2">
                {template.suggestedFilters.map((filter, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-glass bg-muted/30 px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium text-foreground">{filter.field}</span>
                    <span className="mx-2 text-muted-foreground">{filter.operator}</span>
                    <span className="text-muted-foreground">
                      {typeof filter.value === 'object' 
                        ? JSON.stringify(filter.value) 
                        : String(filter.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Sort */}
          {template.defaultSort && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ChevronDown className="h-4 w-4" />
                Default Sorting
              </h4>
              <div className="rounded-xl border border-glass bg-muted/30 px-4 py-2.5 text-sm">
                <span className="font-medium text-foreground">{template.defaultSort.field}</span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="text-muted-foreground capitalize">{template.defaultSort.direction}</span>
              </div>
            </div>
          )}

          {/* Info banner for external/custom templates */}
          {template.engine !== 'dynamic' && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900">
                  {template.engine === 'custom' ? 'Custom Template' : 'External Report'}
                </p>
                <p className="mt-1 text-blue-700">
                  {template.engine === 'custom' 
                    ? 'This template uses specialized logic and cannot be fully customized in the wizard.' 
                    : 'This report uses an external tool or page for data processing.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-glass bg-background/95 backdrop-blur-sm px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onUseTemplate} className="flex items-center gap-2">
            Use This Template
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
