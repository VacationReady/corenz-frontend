"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronUp,
  FileText,
  Sparkles,
  Plus,
  Star,
  Zap,
  Clock,
  ArrowRight,
  Settings2,
  Table2,
  GripVertical,
  Users,
  Calendar,
  Cake,
  Rocket,
  Phone,
  DollarSign,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  hrReportFields,
  hrCategories,
  getFieldsByCategory,
  type HRReportField,
  type HRCategory,
} from "@/lib/hrReportFields";
import type { FilterGroup, SortConfig } from "@/lib/reportFilters";
import {
  createRootFilterGroup,
  createFilterRule,
} from "@/lib/reportFilters";
import { cn } from "@/lib/utils";
import { reportLibrary, type ReportLibraryEntry } from "@/lib/reportLibrary";
import { useDebounce } from "@/hooks/useDebounce";
import { Checkbox } from "@/components/ui/Checkbox";

/**
 * Quick Report Builder
 * 
 * A streamlined 2-step wizard for creating reports:
 * 1. Select Fields (with quick templates)
 * 2. Preview & Configure (with inline filters)
 * 
 * Designed for faster report creation with better UX.
 */

export type QuickBuilderStep = "fields" | "preview";

export interface QuickReportConfig {
  selectedFields: string[];
  filterGroup: FilterGroup;
  sorts: SortConfig[];
  name: string;
}

interface QuickReportBuilderProps {
  onComplete: (config: QuickReportConfig) => void;
  onCancel: () => void;
  initialConfig?: Partial<QuickReportConfig>;
}

const REQUIRED_FIELDS = ["User.firstName", "User.lastName"];

const steps = [
  {
    id: "fields" as const,
    title: "Select Data",
    description: "Choose fields and optional template",
    icon: Table2,
  },
  {
    id: "preview" as const,
    title: "Configure & Save",
    description: "Name your report and add filters",
    icon: Settings2,
  },
];

// Quick templates for common reports
const quickTemplates = [
  {
    id: "employee_directory",
    name: "Employee Directory",
    icon: Users,
    description: "Basic employee contact info",
    fields: [
      "User.firstName",
      "User.lastName",
      "User.email",
      "Employee.jobTitle",
      "Employee.department",
      "Employee.phoneNumber",
    ],
  },
  {
    id: "leave_balances",
    name: "Leave Balances",
    icon: Calendar,
    description: "Annual leave entitlements",
    fields: [
      "User.firstName",
      "User.lastName",
      "Employee.department",
      "LeaveEntitlement.leaveType",
      "_computed.remainingEntitlement",
    ],
  },
  {
    id: "birthdays",
    name: "Upcoming Birthdays",
    icon: Cake,
    description: "Employee birthday list",
    fields: [
      "User.firstName",
      "User.lastName",
      "Employee.dateOfBirth",
      "Employee.department",
    ],
  },
  {
    id: "new_starters",
    name: "New Starters",
    icon: Rocket,
    description: "Recent hires in last 30 days",
    fields: [
      "User.firstName",
      "User.lastName",
      "Employee.startDate",
      "Employee.jobTitle",
      "Employee.department",
      "Employee.employmentType",
    ],
  },
  {
    id: "contact_list",
    name: "Emergency Contacts",
    icon: Phone,
    description: "Employee emergency contacts",
    fields: [
      "User.firstName",
      "User.lastName",
      "Employee.phoneNumber",
      "Employee.emergencyContactName",
      "Employee.emergencyContactPhone",
    ],
  },
  {
    id: "payroll_export",
    name: "Payroll Export",
    icon: DollarSign,
    description: "Standard payroll data",
    fields: [
      "User.firstName",
      "User.lastName",
      "PayrollProfile.taxCode",
      "PayrollProfile.bankAccountNumber",
      "PayrollProfile.irdNumber",
      "Employee.salaryAmount",
    ],
  },
];

// Recently used fields (would come from localStorage in production)
const recentFields = [
  "User.firstName",
  "User.lastName",
  "Employee.department",
  "Employee.jobTitle",
  "Employee.startDate",
];

export default function QuickReportBuilder({
  onComplete,
  onCancel,
  initialConfig,
}: QuickReportBuilderProps) {
  const [currentStep, setCurrentStep] = useState<QuickBuilderStep>("fields");
  const [config, setConfig] = useState<QuickReportConfig>({
    selectedFields: initialConfig?.selectedFields || [...REQUIRED_FIELDS],
    filterGroup: initialConfig?.filterGroup || createRootFilterGroup(),
    sorts: initialConfig?.sorts || [],
    name: initialConfig?.name || "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["user"]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  
  const debouncedSearch = useDebounce(searchTerm, 200);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;

  // Filter fields based on search
  const filteredCategories = useMemo(() => {
    if (!debouncedSearch) {
      return hrCategories;
    }

    const searchLower = debouncedSearch.toLowerCase();
    return hrCategories
      .map((category) => {
        const fields = getFieldsByCategory(category.id);
        const matchingFields = fields.filter(
          (field) =>
            field.label.toLowerCase().includes(searchLower) ||
            field.field.toLowerCase().includes(searchLower) ||
            (field.description?.toLowerCase().includes(searchLower) ?? false)
        );
        return matchingFields.length > 0 ? { ...category, fields: matchingFields } : null;
      })
      .filter(Boolean) as typeof hrCategories;
  }, [debouncedSearch]);

  // Handle field toggle
  const toggleField = useCallback((fieldKey: string) => {
    setConfig((prev) => {
      const isSelected = prev.selectedFields.includes(fieldKey);
      const isRequired = REQUIRED_FIELDS.includes(fieldKey);

      if (isRequired && isSelected) return prev;

      const newFields = isSelected
        ? prev.selectedFields.filter((f) => f !== fieldKey)
        : [...prev.selectedFields, fieldKey];

      return { ...prev, selectedFields: newFields };
    });
    setSelectedTemplate(null);
  }, []);

  // Handle template selection
  const selectTemplate = useCallback((templateId: string) => {
    const template = quickTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setConfig((prev) => ({
      ...prev,
      selectedFields: Array.from(new Set([...REQUIRED_FIELDS, ...template.fields])),
    }));
  }, []);

  // Handle navigation
  const handleNext = useCallback(() => {
    if (isLastStep) {
      if (config.name.trim()) {
        onComplete(config);
      }
    } else {
      setCurrentStep("preview");
    }
  }, [isLastStep, config, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep === "fields") {
      onCancel();
    } else {
      setCurrentStep("fields");
    }
  }, [currentStep, onCancel]);

  // Update config
  const updateConfig = useCallback((updates: Partial<QuickReportConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validate current step
  const canProceed = useMemo(() => {
    if (currentStep === "fields") {
      return config.selectedFields.length > REQUIRED_FIELDS.length;
    }
    if (currentStep === "preview") {
      return config.name.trim().length > 0;
    }
    return false;
  }, [currentStep, config.selectedFields, config.name]);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  // Get selected count per category
  const getSelectedCount = useCallback(
    (categoryId: string) => {
      const fields = getFieldsByCategory(categoryId);
      return fields.filter((f) => config.selectedFields.includes(f.field)).length;
    },
    [config.selectedFields]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-5xl max-h-[90vh] bg-background rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-500/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Quick Report Builder</h2>
                <p className="text-muted-foreground mt-0.5">
                  {steps[currentStepIndex].description}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="mt-6 flex items-center gap-4">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              const StepIcon = step.icon;

              return (
                <React.Fragment key={step.id}>
                  <motion.button
                    onClick={() => index < currentStepIndex && setCurrentStep(step.id)}
                    disabled={index > currentStepIndex}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                      isActive && "bg-primary text-primary-foreground shadow-lg",
                      isCompleted && "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                    whileHover={isCompleted ? { scale: 1.02 } : {}}
                    whileTap={isCompleted ? { scale: 0.98 } : {}}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{step.title}</p>
                    </div>
                  </motion.button>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 rounded-full",
                      isCompleted ? "bg-emerald-500" : "bg-muted"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentStep === "fields" && (
              <motion.div
                key="fields"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6"
              >
                {/* Quick Templates */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-foreground">Quick Start Templates</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {quickTemplates.map((template) => {
                      const TemplateIcon = template.icon;
                      return (
                        <motion.button
                          key={template.id}
                          onClick={() => selectTemplate(template.id)}
                          className={cn(
                            "p-4 rounded-xl border-2 text-left transition-all",
                            selectedTemplate === template.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-transparent bg-muted/50 hover:bg-muted hover:border-border"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              selectedTemplate === template.id
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}>
                              <TemplateIcon className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-sm">{template.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Search and Field Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search fields..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Badge variant="secondary" className="py-1.5">
                      {config.selectedFields.length} fields selected
                    </Badge>
                  </div>

                  {/* Recently Used */}
                  {!debouncedSearch && (
                    <div className="pb-4 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Recently Used</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentFields.map((fieldKey) => {
                          const field = hrReportFields.find((f) => f.field === fieldKey);
                          if (!field) return null;
                          const isSelected = config.selectedFields.includes(fieldKey);
                          
                          return (
                            <motion.button
                              key={fieldKey}
                              onClick={() => toggleField(fieldKey)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-sm transition-all",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-muted/80"
                              )}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {field.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Categories */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {(debouncedSearch ? filteredCategories : hrCategories).map((category) => {
                      const fields = debouncedSearch
                        ? (category as any).fields || getFieldsByCategory(category.id)
                        : getFieldsByCategory(category.id);
                      const selectedCount = getSelectedCount(category.id);
                      const isExpanded = expandedCategories.includes(category.id);

                      return (
                        <div key={category.id} className="border rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {category.iconComponent ? (
                                <div className="w-5 h-5 text-muted-foreground">
                                  <category.iconComponent className="w-5 h-5" />
                                </div>
                              ) : (
                                <span className="text-lg">{category.icon}</span>
                              )}
                              <span className="font-medium">{category.name}</span>
                              {selectedCount > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {selectedCount}
                                </Badge>
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {fields.map((field: HRReportField) => {
                                    const isSelected = config.selectedFields.includes(field.field);
                                    const isRequired = REQUIRED_FIELDS.includes(field.field);

                                    return (
                                      <motion.label
                                        key={field.field}
                                        className={cn(
                                          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
                                          isSelected
                                            ? "bg-primary/10 border border-primary/30"
                                            : "bg-background hover:bg-muted border border-transparent"
                                        )}
                                        whileHover={{ scale: 1.01 }}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleField(field.field)}
                                          disabled={isRequired}
                                        />
                                        <span className={cn(
                                          "text-sm",
                                          isSelected ? "font-medium" : ""
                                        )}>
                                          {field.label}
                                        </span>
                                        {isRequired && (
                                          <Badge variant="outline" className="text-[10px] ml-auto">
                                            Required
                                          </Badge>
                                        )}
                                        {field.isPII && (
                                          <Badge variant="destructive" className="text-[10px] ml-auto">
                                            PII
                                          </Badge>
                                        )}
                                      </motion.label>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                {/* Report Name */}
                <div className="mb-6">
                  <Label htmlFor="report-name" className="text-base font-semibold mb-2 block">
                    Report Name
                  </Label>
                  <Input
                    id="report-name"
                    placeholder="e.g., Monthly Employee Summary"
                    value={config.name}
                    onChange={(e) => updateConfig({ name: e.target.value })}
                    className="text-lg h-12"
                    autoFocus
                  />
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Give your report a descriptive name so you can find it later
                  </p>
                </div>

                {/* Selected Fields Summary */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">Selected Fields</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep("fields")}
                      className="text-primary"
                    >
                      Edit Fields
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {config.selectedFields.map((fieldKey) => {
                        const field = hrReportFields.find((f) => f.field === fieldKey);
                        const isRequired = REQUIRED_FIELDS.includes(fieldKey);
                        
                        return (
                          <Badge
                            key={fieldKey}
                            variant={isRequired ? "secondary" : "outline"}
                            className="py-1 px-3"
                          >
                            {field?.label || fieldKey}
                            {!isRequired && (
                              <button
                                onClick={() => toggleField(fieldKey)}
                                className="ml-1.5 hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Tip: Add Filters After Preview
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Once you save this report, you can add filters, sort columns, and refine 
                        your data directly in the preview. This makes it easy to iterate on your 
                        report without going through the wizard again.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/30 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === "fields" ? "Cancel" : "Back"}
          </Button>

          <div className="flex items-center gap-3">
            {currentStep === "fields" && (
              <span className="text-sm text-muted-foreground">
                {config.selectedFields.length - REQUIRED_FIELDS.length} optional fields selected
              </span>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 px-6"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Create Report
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

