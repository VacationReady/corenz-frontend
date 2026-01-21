"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef, useId } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Filter,
  Eye,
  Info,
  ChevronDown,
  FileText,
  ShieldAlert,
  RefreshCcw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { ReportTemplate, hrReportFields, hrCategories, getFieldsByCategory, filterCategoriesByFeatures } from "@/lib/hrReportFields";
import type { ReportFilter, SortConfig, FilterOperator, FilterGroup } from "@/lib/reportFilters";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import {
  createRootFilterGroup,
  createFilterRule,
  normalizeFilterGroupInput,
  flattenFilterRules,
  serializeFilterGroup,
} from "@/lib/reportFilters";
import FieldSelection from "./FieldSelection";
import FilterConfiguration from "./FilterConfiguration";
import { cn } from "@/lib/utils";
import { useReportingTimeConfig } from "@/hooks/useReportingTimeConfig";
import { reportLibrary, type ReportLibraryEntry } from "@/lib/reportLibrary";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDebounce } from "@/hooks/useDebounce";

export type WizardStep = "template" | "fields" | "filters" | "preview";

export interface ReportConfig {
  template?: ReportTemplate;
  selectedFields: string[];
  filterGroup: FilterGroup;
  sorts: SortConfig[];
  name?: string;
}

interface ReportWizardProps {
  onComplete: (config: ReportConfig) => void;
  onCancel: () => void;
  initialConfig?: Partial<ReportConfig>;
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

export default function ReportWizard({ onComplete, onCancel, initialConfig }: ReportWizardProps) {
  const REQUIRED_FIELDS = ["User.firstName", "User.lastName"];
  const { enabledFeatures } = useFeatureToggles();
  const [currentStep, setCurrentStep] = useState<WizardStep>(
    initialConfig ? "fields" : "template"
  );
  const [config, setConfig] = useState<ReportConfig>({
    selectedFields: initialConfig?.selectedFields || REQUIRED_FIELDS,
    filterGroup: initialConfig?.filterGroup || createRootFilterGroup(),
    template: initialConfig?.template,
    sorts: initialConfig?.sorts || [],
    name: initialConfig?.name,
  });
  const [filterValidationErrors, setFilterValidationErrors] = useState<string[]>([]);
  const [isFilterValid, setIsFilterValid] = useState(true);
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

  const goToStep = useCallback((step: WizardStep) => {
    if (steps.some(({ id }) => id === step)) {
      setCurrentStep(step);
    }
  }, []);

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
        return isFilterValid; // Must have valid filters to proceed
      case "preview":
        return config.name && config.name.trim().length > 0;
      default:
        return false;
    }
  };

  const handleValidationChange = useCallback((isValid: boolean, errors: string[]) => {
    setIsFilterValid(isValid);
    setFilterValidationErrors(errors);
  }, []);

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
              <ol className="grid grid-cols-2 gap-4">
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
                  const filterGroup = createRootFilterGroup();
                  if (template?.suggestedFilters && template.suggestedFilters.length > 0) {
                    filterGroup.children = template.suggestedFilters.map((filter, index) =>
                      createFilterRule({
                        id: `filter_${index}`,
                        field: filter.field,
                        operator: allowedOperators.includes(filter.operator as FilterOperator)
                          ? (filter.operator as FilterOperator)
                          : "equals",
                        value: filter.value,
                        value2: filter.value2,
                      })
                    );
                  }
                  updateConfig({
                    template,
                    selectedFields: withRequired,
                    filterGroup,
                    sorts: template?.defaultSort ? [template.defaultSort] : [],
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
                enabledFeatures={enabledFeatures}
              />
            )}

            {currentStep === "filters" && (
              <FilterConfiguration
                filterGroup={config.filterGroup}
                sorts={config.sorts}
                selectedFields={config.selectedFields}
                onUpdateFilterGroup={(filterGroup) => updateConfig({ filterGroup })}
                onUpdateSorts={(sorts) => updateConfig({ sorts })}
                onValidationChange={handleValidationChange}
                onSyncSelectedFields={(fields) => updateConfig({ selectedFields: fields })}
                timeZone={timeZone}
                locale={locale}
              />
            )}  

            {currentStep === "preview" && (
              <ReportPreview
                config={config}
                onUpdateName={(name) => updateConfig({ name })}
                onEditStep={goToStep}
              />
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              {isFirstStep ? "Cancel" : "Back"}
            </Button>
            {currentStep === "filters" && !isFilterValid && filterValidationErrors.length > 0 && (
              <p className="text-xs text-destructive font-medium">
                Please fix {filterValidationErrors.length} filter issue{filterValidationErrors.length > 1 ? 's' : ''} before continuing
              </p>
            )}
          </div>

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
                {area.iconComponent ? (
                  <area.iconComponent className="h-6 w-6 text-foreground" />
                ) : (
                  <span className="text-2xl">{area.icon}</span>
                )}
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
  onEditStep,
}: {
  config: ReportConfig;
  onUpdateName: (name: string) => void;
  onEditStep: (step: WizardStep) => void;
}) {
  const nameInputId = useId();
  const helperId = `${nameInputId}-helper`;
  const errorId = `${nameInputId}-error`;

  const MAX_NAME_LENGTH = 80;
  const PREVIEW_ROW_LIMIT = 25;
  const PREVIEW_COLUMN_LIMIT = 6;

  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [manualRefreshToken, setManualRefreshToken] = useState(0);
  const [piiAcknowledged, setPiiAcknowledged] = useState(true);
  const prevHasPII = useRef(false);

  const fieldMetadata = useMemo(() => {
    const map: Record<string, { label: string; isPII?: boolean }> = {};
    hrReportFields.forEach((field) => {
      map[field.field] = { label: field.label, isPII: field.isPII };
    });
    return map;
  }, []);

  const previewColumns = useMemo(
    () => config.selectedFields.slice(0, PREVIEW_COLUMN_LIMIT),
    [config.selectedFields],
  );

  const getFieldLabel = useCallback(
    (field: string) => {
      return fieldMetadata[field]?.label || field.split(".").pop() || field;
    },
    [fieldMetadata],
  );

  const piiFields = useMemo(
    () =>
      config.selectedFields.filter((field) => {
        return Boolean(fieldMetadata[field]?.isPII);
      }),
    [config.selectedFields, fieldMetadata],
  );
  const hasPIISelected = piiFields.length > 0;

  useEffect(() => {
    if (hasPIISelected && !prevHasPII.current) {
      setPiiAcknowledged(false);
    }
    if (!hasPIISelected) {
      setPiiAcknowledged(true);
    }
    prevHasPII.current = hasPIISelected;
  }, [hasPIISelected]);

  const getValueAtPath = useCallback((row: any, path: string) => {
    return path.split(".").reduce((acc: any, key: string) => {
      if (acc === null || acc === undefined) return acc;
      if (Array.isArray(acc)) {
        acc = acc[0];
      }
      return acc ? acc[key] : acc;
    }, row);
  }, []);

  const formatCellValue = useCallback((value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "—";
      }
    }
    return String(value);
  }, []);

  const flattenedFilters = useMemo(() => flattenFilterRules(config.filterGroup), [config.filterGroup]);

  const previewPayload = useMemo(
    () => ({
      selectedFields: config.selectedFields,
      filters: flattenedFilters,
      filterGroup: serializeFilterGroup(config.filterGroup),
      sort: config.sorts[0], // API still expects single sort, use primary
      sorts: config.sorts, // Include full array for future compatibility
    }),
    [config.selectedFields, flattenedFilters, config.filterGroup, config.sorts],
  );

  const debouncedPayload = useDebounce(previewPayload, 400);

  useEffect(() => {
    if (!debouncedPayload?.selectedFields?.length) {
      setPreviewRows([]);
      setPreviewTotal(null);
      setPreviewError(null);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const response = await fetch("/api/reports/run-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedFields: debouncedPayload.selectedFields,
            filters: debouncedPayload.filters,
            filterGroup: debouncedPayload.filterGroup,
            sort: debouncedPayload.sort,
            limit: PREVIEW_ROW_LIMIT,
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load preview");
        }

        const payload = await response.json();
        if (!isMounted || controller.signal.aborted) return;

        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const total = typeof payload?.total === "number" ? payload.total : null;
        setPreviewRows(rows.slice(0, PREVIEW_ROW_LIMIT));
        setPreviewTotal(total ?? rows.length ?? 0);
      } catch (error) {
        if (controller.signal.aborted || !isMounted) return;
        const message = error instanceof Error ? error.message : "Unable to load preview";
        setPreviewRows([]);
        setPreviewTotal(null);
        setPreviewError(message);
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    };

    void fetchPreview();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [debouncedPayload, PREVIEW_ROW_LIMIT, manualRefreshToken]);

  const handleManualRefresh = () => setManualRefreshToken((value) => value + 1);

  const rowsMatchingDisplay = useMemo(() => {
    if (typeof previewTotal === "number") {
      return previewTotal.toLocaleString();
    }
    if (previewLoading) return "—";
    if (previewRows.length > 0) return previewRows.length.toString();
    return "0";
  }, [previewTotal, previewRows.length, previewLoading]);

  const nameValue = config.name || "";
  const trimmedName = nameValue.trim();
  const nameError = trimmedName.length === 0 ? "Report name is required before saving." : null;
  const charCountText = `${nameValue.length}/${MAX_NAME_LENGTH} characters`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Preview & Save Report</h3>
        <p className="text-sm text-muted-foreground">
          Give your report a clear name and validate the output before saving.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div>
            <label
              htmlFor={nameInputId}
              className="mb-2 block text-sm font-semibold text-foreground"
            >
              Report name
            </label>
            <input
              type="text"
              id={nameInputId}
              value={nameValue}
              onChange={(e) => onUpdateName(e.target.value)}
              onBlur={() => {
                if (!nameError) return;
              }}
              placeholder="e.g. Monthly headcount change"
              maxLength={MAX_NAME_LENGTH}
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={`${helperId} ${nameError ? errorId : ""}`.trim()}
              className={cn(
                "w-full rounded-2xl border bg-background px-4 py-3 text-sm transition focus:outline-none focus:ring-2",
                nameError
                  ? "border-destructive/60 focus:border-destructive focus:ring-destructive/40"
                  : "border-glass focus:border-primary focus:ring-primary/20",
              )}
              required
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span id={helperId} className="text-muted-foreground">
                Provide a memorable name so teammates can locate this report later.
              </span>
              <span
                className={cn(
                  "font-medium",
                  nameValue.length > MAX_NAME_LENGTH - 10
                    ? "text-amber-600"
                    : "text-muted-foreground",
                )}
              >
                {charCountText}
              </span>
            </div>
            {nameError && (
              <p id={errorId} className="mt-1 text-xs font-medium text-destructive">
                {nameError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditStep("fields")}
              className="rounded-full border-glass text-foreground"
            >
              Edit fields
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditStep("filters")}
              className="rounded-full border-glass text-foreground"
            >
              Edit filters
            </Button>
          </div>

          <div className="rounded-2xl border border-glass bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Report summary</h4>
              <Badge variant="outline" className="text-xs">
                Rows matching current criteria: {rowsMatchingDisplay}
              </Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-semibold text-foreground">Template:</span>
                {config.template?.name || "Custom"}
              </div>
              <div>
                <span className="font-semibold text-foreground">Fields:</span> {config.selectedFields.length}
                {config.selectedFields.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {config.selectedFields.slice(0, 3).join(", ")}
                    {config.selectedFields.length > 3 && ` and ${config.selectedFields.length - 3} more`}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-semibold text-foreground">Filters:</span>
                {flattenedFilters.length} applied
              </div>
              {config.sorts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-semibold text-foreground">Sorting:</span>
                  {config.sorts.map((s, i) => (
                    <span key={i}>
                      {i > 0 && ', then '}
                      {s.field} ({s.direction})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-glass bg-background/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground">Live data preview</h4>
                <p className="text-xs text-muted-foreground">
                  We run a lightweight preview with the current fields, filters, and sort order.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={previewLoading}
                className="flex items-center gap-1 text-muted-foreground"
              >
                <RefreshCcw className={cn("h-4 w-4", previewLoading && "animate-spin" )} />
                Refresh
              </Button>
            </div>

            <div aria-live="polite" className="sr-only">
              {previewLoading
                ? "Loading live preview"
                : previewError
                ? "Preview failed to load"
                : `Showing ${previewRows.length} sample rows`}
            </div>

            <div className="mt-4 space-y-3">
              {previewError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {previewError}. Try adjusting your filters or refresh to retry.
                </div>
              )}

              {hasPIISelected && !piiAcknowledged ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-amber-900">Sensitive fields selected</p>
                      <p className="text-amber-900/80">
                        This preview includes personally identifiable information ({piiFields
                          .slice(0, 3)
                          .map(getFieldLabel)
                          .join(", ")}
                        {piiFields.length > 3 && ` and ${piiFields.length - 3} more`}).
                        Confirm you have permission before displaying sample rows.
                      </p>
                      <Button size="sm" onClick={() => setPiiAcknowledged(true)}>
                        Acknowledge & show sample
                      </Button>
                    </div>
                  </div>
                </div>
              ) : previewLoading ? (
                <div className="space-y-2" role="status" aria-live="polite">
                  {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full rounded-xl" />
                  ))}
                </div>
              ) : previewRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-glass bg-muted/30 p-6 text-sm text-muted-foreground">
                  No rows match the current criteria yet. Try widening your filters or selecting additional fields.
                </div>
              ) : (
                <div className="overflow-auto rounded-2xl border border-glass">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        {previewColumns.map((field) => (
                          <th key={field} scope="col" className="px-4 py-2 text-left font-semibold">
                            {getFieldLabel(field)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewRows.map((row, rowIndex) => (
                        <tr key={row?.id ?? rowIndex} className="bg-background/60">
                          {previewColumns.map((field) => (
                            <td key={`${field}-${row?.id ?? rowIndex}`} className="px-4 py-2 text-foreground/90">
                              {formatCellValue(getValueAtPath(row, field))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
