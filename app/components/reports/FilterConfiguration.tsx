"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Search, 
  Eye, 
  EyeOff, 
  GripVertical,
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
  X,
  Check,
  Layers,
  Sparkles
} from "lucide-react";
import Button from "@/components/ui/Button";
import { hrReportFields, HRReportField, getFieldByKey, hrCategories, getCategoryById } from "@/lib/hrReportFields";
import type {
  SortConfig,
  FilterOperator,
  FilterGroup,
  FilterRule,
} from "@/lib/reportFilters";
import {
  createFilterRule,
  createFilterGroup,
  createRootFilterGroup,
  flattenFilterRules,
  getFilterValidationError,
  collectVisibleFields,
  hasFilterRules,
  isFilterRule,
  addRuleToGroup,
  addGroupToGroup,
  removeNodeFromGroup,
  updateNodeInGroup,
} from "@/lib/reportFilters";
import { DatePresetSelector } from "./DatePresetSelector";
import type { DatePresetSelection } from "@/lib/reportingDatePresets";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";
import { Badge } from "@/components/ui/Badge";
import Checkbox from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FilterConfigurationProps {
  filterGroup: FilterGroup;
  sorts: SortConfig[];
  selectedFields: string[];
  onUpdateFilterGroup: (group: FilterGroup) => void;
  onUpdateSorts: (sorts: SortConfig[]) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  onSyncSelectedFields?: (fields: string[]) => void;
  timeZone?: string;
  locale?: string;
}

// Operator definitions by field type
const operatorsByType: Record<string, Array<{ value: FilterOperator; label: string }>> = {
  string: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
    { value: "is_null", label: "Is empty" },
    { value: "is_not_null", label: "Is not empty" },
    { value: "in", label: "Is one of" },
    { value: "not_in", label: "Is not one of" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "greater_than", label: "Greater than" },
    { value: "less_than", label: "Less than" },
    { value: "greater_than_equal", label: "Greater than or equal" },
    { value: "less_than_equal", label: "Less than or equal" },
    { value: "between", label: "Between" },
    { value: "is_null", label: "Is empty" },
    { value: "is_not_null", label: "Is not empty" },
  ],
  date: [
    { value: "date_equals", label: "On date" },
    { value: "date_before", label: "Before date" },
    { value: "date_after", label: "After date" },
    { value: "date_between", label: "Between dates" },
    { value: "date_in_last", label: "In the last" },
    { value: "date_in_next", label: "In the next" },
    { value: "date_preset", label: "Date preset" },
    { value: "is_null", label: "Is empty" },
    { value: "is_not_null", label: "Is not empty" },
  ],
  boolean: [
    { value: "equals", label: "Is" },
    { value: "is_null", label: "Is empty" },
    { value: "is_not_null", label: "Is not empty" },
  ],
  enum: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "in", label: "Is one of" },
    { value: "not_in", label: "Is not one of" },
    { value: "is_null", label: "Is empty" },
    { value: "is_not_null", label: "Is not empty" },
  ],
};

// Check if operator requires no value input
const operatorsWithoutValue: FilterOperator[] = ["is_null", "is_not_null"];

// Check if operator requires two values
const operatorsWithTwoValues: FilterOperator[] = ["between", "date_between"];

export default function FilterConfiguration({
  filterGroup,
  sorts: initialSorts,
  selectedFields,
  onUpdateFilterGroup,
  onUpdateSorts,
  onValidationChange,
  onSyncSelectedFields,
  timeZone,
  locale,
}: FilterConfigurationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [addToGroupId, setAddToGroupId] = useState<string | null>(null);
  const [sorts, setSorts] = useState<SortConfig[]>(initialSorts);
  const [showSortPicker, setShowSortPicker] = useState(false);
  
  // Get only the selected fields that are filterable - this is the KEY FIX
  const availableFilterFields = useMemo(() => {
    return selectedFields
      .map(fieldKey => hrReportFields.find(f => f.field === fieldKey))
      .filter((f): f is HRReportField => f !== undefined && f.filterable);
  }, [selectedFields]);
  
  // Get only the selected fields that are sortable - this is the KEY FIX
  const availableSortFields = useMemo(() => {
    return selectedFields
      .map(fieldKey => hrReportFields.find(f => f.field === fieldKey))
      .filter((f): f is HRReportField => f !== undefined && f.sortable);
  }, [selectedFields]);
  
  // Get fields that are in the output
  const outputFields = useMemo(() => 
    new Set(selectedFields),
    [selectedFields]
  );
  
  // Flatten rules for validation
  const allRules = useMemo(() => flattenFilterRules(filterGroup), [filterGroup]);
  
  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    allRules.forEach((rule, index) => {
      const error = getFilterValidationError(rule);
      if (error) {
        errors.push(`Filter ${index + 1}: ${error}`);
      }
    });
    return errors;
  }, [allRules]);
  
  const isValid = validationErrors.length === 0;
  
  // Notify parent of validation changes
  React.useEffect(() => {
    onValidationChange?.(isValid, validationErrors);
  }, [isValid, validationErrors, onValidationChange]);

  // Auto-sync visible fields from filters to selectedFields
  useEffect(() => {
    if (onSyncSelectedFields) {
      const visibleFields = collectVisibleFields(filterGroup);
      // Combine with existing selected fields
      const combined = Array.from(new Set([...selectedFields, ...visibleFields]));
      if (combined.length !== selectedFields.length) {
        onSyncSelectedFields(combined);
      }
    }
  }, [filterGroup, selectedFields, onSyncSelectedFields]);

  const addFilter = (fieldKey?: string, groupId?: string) => {
    if (availableFilterFields.length === 0) return;
    
    const field = fieldKey 
      ? availableFilterFields.find(f => f.field === fieldKey)
      : availableFilterFields[0];
    
    if (!field) return;
    
    const newRule = createFilterRule({
      field: field.field,
      hideFieldInResults: false,
    });
    
    const targetGroupId = groupId || addToGroupId || filterGroup.id;
    const updatedGroup = addRuleToGroup(filterGroup, targetGroupId, newRule);
    onUpdateFilterGroup(updatedGroup);
    setShowFieldPicker(false);
    setSearchQuery("");
    setAddToGroupId(null);
  };

  const updateNode = (nodeId: string, updates: Partial<FilterRule> | Partial<FilterGroup>) => {
    const updatedGroup = updateNodeInGroup(filterGroup, nodeId, updates);
    onUpdateFilterGroup(updatedGroup);
  };

  const removeNode = (nodeId: string) => {
    const updatedGroup = removeNodeFromGroup(filterGroup, nodeId);
    onUpdateFilterGroup(updatedGroup);
  };

  const addNestedGroup = (parentGroupId: string, logicOperator: "AND" | "OR" = "AND") => {
    const newGroup = createFilterGroup({ logicOperator });
    const updatedGroup = addGroupToGroup(filterGroup, parentGroupId, newGroup);
    onUpdateFilterGroup(updatedGroup);
  };

  const clearAllFilters = () => {
    onUpdateFilterGroup(createRootFilterGroup());
  };
  
  // Multi-sort handlers
  const addSort = (fieldKey?: string) => {
    if (availableSortFields.length === 0) return;
    const field = fieldKey 
      ? availableSortFields.find(f => f.field === fieldKey)
      : availableSortFields[0];
    if (!field) return;
    const newSort: SortConfig = {
      field: field.field,
      direction: "asc",
    };
    const newSorts = [...sorts, newSort];
    setSorts(newSorts);
    onUpdateSorts(newSorts);
    setShowSortPicker(false);
    setSearchQuery("");
  };
  
  const updateSort = (index: number, updates: Partial<SortConfig>) => {
    const newSorts = sorts.map((s, i) => i === index ? { ...s, ...updates } : s);
    setSorts(newSorts);
    onUpdateSorts(newSorts);
  };
  
  const removeSort = (index: number) => {
    const newSorts = sorts.filter((_, i) => i !== index);
    setSorts(newSorts);
    onUpdateSorts(newSorts);
  };
  
  const moveSortUp = (index: number) => {
    if (index === 0) return;
    const newSorts = [...sorts];
    [newSorts[index - 1], newSorts[index]] = [newSorts[index], newSorts[index - 1]];
    setSorts(newSorts);
    onUpdateSorts(newSorts);
  };
  
  const moveSortDown = (index: number) => {
    if (index === sorts.length - 1) return;
    const newSorts = [...sorts];
    [newSorts[index], newSorts[index + 1]] = [newSorts[index + 1], newSorts[index]];
    setSorts(newSorts);
    onUpdateSorts(newSorts);
  };

  // Filter the available fields based on search
  const filteredFilterFields = useMemo(() => {
    if (!searchQuery) return availableFilterFields;
    const query = searchQuery.toLowerCase();
    return availableFilterFields.filter(field =>
      field.label.toLowerCase().includes(query) ||
      field.field.toLowerCase().includes(query)
    );
  }, [availableFilterFields, searchQuery]);

  const filteredSortFields = useMemo(() => {
    if (!searchQuery) return availableSortFields;
    const query = searchQuery.toLowerCase();
    return availableSortFields.filter(field =>
      field.label.toLowerCase().includes(query) ||
      field.field.toLowerCase().includes(query)
    );
  }, [availableSortFields, searchQuery]);

  // Group fields by category for better organization
  const groupedFilterFields = useMemo(() => {
    const groups: Record<string, HRReportField[]> = {};
    filteredFilterFields.forEach(field => {
      const category = field.category || "other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(field);
    });
    return groups;
  }, [filteredFilterFields]);

  const groupedSortFields = useMemo(() => {
    const groups: Record<string, HRReportField[]> = {};
    filteredSortFields.forEach(field => {
      const category = field.category || "other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(field);
    });
    return groups;
  }, [filteredSortFields]);

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Configure Filters & Sorting
        </h3>
        <p className="text-sm text-muted-foreground">
          Narrow down your data with filters and choose how to sort the results.
        </p>
      </motion.div>
      
      {/* Validation Errors */}
      <AnimatePresence>
        {validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-xl p-4 border border-destructive/30 bg-destructive/5"
          >
            <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
              <X className="w-4 h-4" />
              Please fix the following:
            </h4>
            <ul className="space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-destructive/80 ml-6">• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sorting Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5 shadow-depth-2"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
              <ArrowUpDown className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Sorting</h4>
              <p className="text-xs text-muted-foreground">Define how results are ordered</p>
            </div>
          </div>
          {selectedFields.length === 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="rounded-lg glass-subtle border-white/30 h-9 px-3 opacity-50 cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Sort Level
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Select fields in the previous step first</p>
              </TooltipContent>
            </Tooltip>
          ) : sorts.length < 3 && availableSortFields.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortPicker(true)}
              className="rounded-lg glass-subtle border-white/30 hover:border-primary/30 h-9 px-3"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Sort Level
            </Button>
          )}
        </div>

        {/* Sort Field Picker */}
        <AnimatePresence>
          {showSortPicker && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 glass-premium rounded-xl p-4 border border-primary/20 shadow-depth-2"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search your selected fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg glass-subtle border border-white/20 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                    autoFocus
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSortPicker(false);
                    setSearchQuery("");
                  }}
                  className="rounded-lg h-10 px-3"
                >
                  Cancel
                </Button>
              </div>
              
              {filteredSortFields.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    {selectedFields.length === 0 
                      ? "No fields selected. Go back and select fields first."
                      : "No sortable fields found matching your search."}
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {Object.entries(groupedSortFields).map(([categoryId, fields]) => {
                    const category = getCategoryById(categoryId);
                    return (
                      <div key={categoryId}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                          {category?.name || categoryId}
                        </p>
                        <div className="space-y-1">
                          {fields.map(field => {
                            const alreadySorted = sorts.some(s => s.field === field.field);
                            return (
                              <button
                                key={field.field}
                                onClick={() => !alreadySorted && addSort(field.field)}
                                disabled={alreadySorted}
                                className={cn(
                                  "w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all",
                                  alreadySorted 
                                    ? "opacity-50 cursor-not-allowed bg-muted/30"
                                    : "hover:bg-primary/10 hover:border-primary/30 cursor-pointer"
                                )}
                              >
                                <div>
                                  <p className="font-medium text-sm text-foreground">{field.label}</p>
                                  <p className="text-xs text-muted-foreground">{field.field}</p>
                                </div>
                                {alreadySorted && (
                                  <Badge variant="secondary" className="text-xs bg-muted">
                                    <Check className="w-3 h-3 mr-1" />
                                    Added
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {sorts.length === 0 ? (
          <div className="text-center py-8 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
            <ArrowUpDown className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No sorting applied</p>
            <p className="text-xs text-muted-foreground/70">Results will appear in default order</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {sorts.map((sortItem, index) => {
                const fieldInfo = getFieldByKey(sortItem.field);
                return (
                  <motion.div
                    key={`${sortItem.field}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    layout
                    className="glass-subtle rounded-xl p-3 border border-white/20 flex items-center gap-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveSortUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-white/50 dark:hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => moveSortDown(index)}
                        disabled={index === sorts.length - 1}
                        className="p-1 hover:bg-white/50 dark:hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-lg",
                        index === 0 
                          ? "bg-primary/15 text-primary border-primary/20" 
                          : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {index === 0 ? "Primary" : index === 1 ? "Then by" : "Then by"}
                    </Badge>
                    
                    <select
                      value={sortItem.field}
                      onChange={(e) => updateSort(index, { field: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg glass-subtle border border-white/20 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
                    >
                      {availableSortFields.map(field => (
                        <option key={field.field} value={field.field}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                    
                    <div className="flex items-center rounded-lg glass-subtle border border-white/20 p-0.5">
                      <button
                        onClick={() => updateSort(index, { direction: "asc" })}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          sortItem.direction === "asc" 
                            ? "bg-white dark:bg-white/20 shadow-sm text-foreground" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        Asc
                      </button>
                      <button
                        onClick={() => updateSort(index, { direction: "desc" })}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          sortItem.direction === "desc" 
                            ? "bg-white dark:bg-white/20 shadow-sm text-foreground" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Desc
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeSort(index)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-5 shadow-depth-2"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Filters</h4>
              <p className="text-xs text-muted-foreground">Narrow down your data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasFilterRules(filterGroup) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg h-9 px-3"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Clear All
              </Button>
            )}
            {selectedFields.length === 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="rounded-lg glass-subtle border-white/30 h-9 px-3 opacity-50 cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Filter
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Select fields in the previous step first</p>
                </TooltipContent>
              </Tooltip>
            ) : availableFilterFields.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddToGroupId(filterGroup.id);
                  setShowFieldPicker(!showFieldPicker);
                  setShowSortPicker(false);
                }}
                className="rounded-lg glass-subtle border-white/30 hover:border-primary/30 h-9 px-3"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Filter
              </Button>
            )}
          </div>
        </div>
        
        {/* Filter Field Picker */}
        <AnimatePresence>
          {showFieldPicker && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 glass-premium rounded-xl p-4 border border-primary/20 shadow-depth-2"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search your selected fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg glass-subtle border border-white/20 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                    autoFocus
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowFieldPicker(false);
                    setSearchQuery("");
                  }}
                  className="rounded-lg h-10 px-3"
                >
                  Cancel
                </Button>
              </div>
              
              {filteredFilterFields.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    {selectedFields.length === 0 
                      ? "No fields selected. Go back and select fields first."
                      : "No filterable fields found matching your search."}
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {Object.entries(groupedFilterFields).map(([categoryId, fields]) => {
                    const category = getCategoryById(categoryId);
                    return (
                      <div key={categoryId}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                          {category?.name || categoryId}
                        </p>
                        <div className="space-y-1">
                          {fields.map(field => {
                            const alreadyFiltered = allRules.some(f => f.field === field.field);
                            return (
                              <button
                                key={field.field}
                                onClick={() => !alreadyFiltered && addFilter(field.field)}
                                disabled={alreadyFiltered}
                                className={cn(
                                  "w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all",
                                  alreadyFiltered 
                                    ? "opacity-50 cursor-not-allowed bg-muted/30"
                                    : "hover:bg-primary/10 hover:border-primary/30 cursor-pointer"
                                )}
                              >
                                <div>
                                  <p className="font-medium text-sm text-foreground">{field.label}</p>
                                  <p className="text-xs text-muted-foreground">{field.field}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {field.isPII && (
                                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                                      PII
                                    </Badge>
                                  )}
                                  {alreadyFiltered && (
                                    <Badge variant="secondary" className="text-xs bg-muted">
                                      <Check className="w-3 h-3 mr-1" />
                                      Added
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!hasFilterRules(filterGroup) ? (
          <div className="text-center py-8 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
            <Filter className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No filters applied</p>
            <p className="text-xs text-muted-foreground/70 mb-4">Your report will include all available data</p>
            {availableFilterFields.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setAddToGroupId(filterGroup.id);
                  setShowFieldPicker(true);
                }}
                className="rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Filter
              </Button>
            )}
          </div>
        ) : (
          <FilterGroupRenderer
            group={filterGroup}
            isRoot={true}
            availableFields={availableFilterFields}
            outputFields={outputFields}
            onUpdateNode={updateNode}
            onRemoveNode={removeNode}
            onAddFilter={(groupId) => {
              setAddToGroupId(groupId);
              setShowFieldPicker(true);
            }}
            onAddGroup={addNestedGroup}
            timeZone={timeZone}
            locale={locale}
          />
        )}
      </motion.div>
    </div>
    </TooltipProvider>
  );
}

// =============================================================================
// FILTER TREE RENDERER COMPONENTS
// =============================================================================

// Recursive Filter Group Renderer
function FilterGroupRenderer({
  group,
  isRoot,
  availableFields,
  outputFields,
  onUpdateNode,
  onRemoveNode,
  onAddFilter,
  onAddGroup,
  timeZone,
  locale,
}: {
  group: FilterGroup;
  isRoot: boolean;
  availableFields: HRReportField[];
  outputFields: Set<string>;
  onUpdateNode: (nodeId: string, updates: Partial<FilterRule> | Partial<FilterGroup>) => void;
  onRemoveNode: (nodeId: string) => void;
  onAddFilter: (groupId: string) => void;
  onAddGroup: (parentGroupId: string, logicOperator: "AND" | "OR") => void;
  timeZone?: string;
  locale?: string;
}) {
  return (
    <div className={cn(!isRoot && "border-l-2 border-primary/30 pl-4 ml-3 mt-3")}>
      {!isRoot && (
        <div className="flex items-center justify-between mb-3 -ml-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newLogic = group.logicOperator === "AND" ? "OR" : "AND";
                onUpdateNode(group.id, { logicOperator: newLogic });
              }}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                group.logicOperator === "AND" 
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400" 
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
              )}
            >
              {group.logicOperator}
            </button>
            <span className="text-xs text-muted-foreground">Group</span>
          </div>
          <button
            onClick={() => onRemoveNode(group.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {group.children.map((child, index) => {
            const isFirst = index === 0;

            return (
              <motion.div 
                key={child.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                {isFilterRule(child) ? (
                  <FilterRuleRenderer
                    rule={child}
                    isFirst={isRoot && isFirst}
                    logicOperator={isRoot ? undefined : group.logicOperator}
                    availableFields={availableFields}
                    isInOutput={outputFields.has(child.field)}
                    validationError={getFilterValidationError(child)}
                    onUpdate={(updates) => onUpdateNode(child.id, updates)}
                    onRemove={() => onRemoveNode(child.id)}
                    timeZone={timeZone}
                    locale={locale}
                  />
                ) : (
                  <FilterGroupRenderer
                    group={child}
                    isRoot={false}
                    availableFields={availableFields}
                    outputFields={outputFields}
                    onUpdateNode={onUpdateNode}
                    onRemoveNode={onRemoveNode}
                    onAddFilter={onAddFilter}
                    onAddGroup={onAddGroup}
                    timeZone={timeZone}
                    locale={locale}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddFilter(group.id)}
          className="text-xs rounded-lg h-8 px-3 hover:bg-primary/10"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Filter
        </Button>
        {!isRoot && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddGroup(group.id, "AND")}
            className="text-xs rounded-lg h-8 px-3 hover:bg-primary/10"
          >
            <Layers className="w-3 h-3 mr-1" />
            Add Group
          </Button>
        )}
      </div>
    </div>
  );
}

// Individual Filter Rule Renderer
function FilterRuleRenderer({
  rule,
  isFirst,
  logicOperator,
  availableFields,
  isInOutput,
  validationError,
  onUpdate,
  onRemove,
  timeZone,
  locale,
}: {
  rule: FilterRule;
  isFirst: boolean;
  logicOperator?: "AND" | "OR";
  availableFields: HRReportField[];
  isInOutput: boolean;
  validationError: string | null;
  onUpdate: (updates: Partial<FilterRule>) => void;
  onRemove: () => void;
  timeZone?: string;
  locale?: string;
}) {
  const selectedField = getFieldByKey(rule.field);
  const fieldType = selectedField?.type || "string";
  const availableOperators = operatorsByType[fieldType] || operatorsByType.string;

  const requiresNoValue = operatorsWithoutValue.includes(rule.operator);
  const requiresTwoValues = operatorsWithTwoValues.includes(rule.operator);

  const handleFieldChange = (newField: string) => {
    onUpdate({ field: newField, value: "", value2: undefined });
  };

  const handleOperatorChange = (newOperator: FilterOperator) => {
    onUpdate({ operator: newOperator, value: "", value2: undefined });
  };

  return (
    <div className={cn(
      "glass-subtle rounded-xl p-4 border transition-all",
      validationError 
        ? "border-destructive/30 bg-destructive/5" 
        : "border-white/20 hover:border-white/30"
    )}>
      {/* Header with badges */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary"
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-lg",
              isFirst 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                : logicOperator === "OR"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {isFirst ? "WHERE" : logicOperator || "AND"}
          </Badge>
          
          {!isInOutput && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <EyeOff className="w-3 h-3" />
              Filter-only
            </span>
          )}
          
          {validationError && (
            <span className="text-xs text-destructive font-medium">
              {validationError}
            </span>
          )}
        </div>
        
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Field selection */}
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Field</label>
          <select
            value={rule.field}
            onChange={(e) => handleFieldChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
          >
            {availableFields.map(field => (
              <option key={field.field} value={field.field}>
                {field.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operator selection */}
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Condition</label>
          <select
            value={rule.operator}
            onChange={(e) => handleOperatorChange(e.target.value as FilterOperator)}
            className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
          >
            {availableOperators.map(op => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Value input(s) */}
        {!requiresNoValue && (
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Value</label>
            <div className={requiresTwoValues ? "flex items-center gap-2" : ""}>
              <FilterValueInput
                field={selectedField}
                operator={rule.operator}
                value={rule.value}
                onChange={(value) => onUpdate({ value })}
                timeZone={timeZone}
                locale={locale}
              />
              {requiresTwoValues && (
                <>
                  <span className="text-xs text-muted-foreground px-1">to</span>
                  <FilterValueInput
                    field={selectedField}
                    operator={rule.operator}
                    value={rule.value2}
                    onChange={(value2) => onUpdate({ value2 })}
                    timeZone={timeZone}
                    locale={locale}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Hide from results toggle */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <Checkbox
            checked={rule.hideFieldInResults || false}
            onCheckedChange={(checked) => onUpdate({ hideFieldInResults: !!checked })}
          />
          <span>Hide this field from results (filter-only)</span>
        </label>
        {rule.hideFieldInResults && (
          <p className="mt-1.5 text-xs text-muted-foreground/70 ml-6">
            This field will be used for filtering but won't appear in the output columns.
          </p>
        )}
      </div>
    </div>
  );
}

// Value Input Component
function FilterValueInput({
  field,
  operator,
  value,
  onChange,
  timeZone,
  locale,
}: {
  field: HRReportField | undefined;
  operator: FilterOperator;
  value: any;
  onChange: (value: any) => void;
  timeZone?: string;
  locale?: string;
}) {
  if (!field) return null;

  const fieldType = field.type;
  const effectiveTimeZone = timeZone || DEFAULT_TIMEZONE;

  const inputClassName = "w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all";

  // Boolean field
  if (fieldType === "boolean") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value === "true")}
        className={inputClassName}
      >
        <option value="">Select...</option>
        <option value="true">Yes/True</option>
        <option value="false">No/False</option>
      </select>
    );
  }

  // Date field
  if (fieldType === "date") {
    if (operator === "date_preset") {
      let selection: DatePresetSelection | undefined;
      if (typeof value === "string") {
        try {
          selection = JSON.parse(value) as DatePresetSelection;
        } catch (error) {
          selection = undefined;
        }
      } else {
        selection = value as DatePresetSelection | undefined;
      }

      return (
        <DatePresetSelector
          value={selection}
          onChange={(next) => onChange(next)}
          timeZone={effectiveTimeZone}
          locale={locale}
        />
      );
    }
    if (operator.startsWith("date_in_")) {
      return (
        <div className="flex gap-2">
          <input
            type="number"
            value={value?.amount || ""}
            onChange={(e) => onChange({ 
              amount: parseInt(e.target.value) || 0, 
              unit: value?.unit || "days" 
            })}
            placeholder="Number"
            className={cn(inputClassName, "w-20")}
          />
          <select
            value={value?.unit || "days"}
            onChange={(e) => onChange({ 
              amount: value?.amount || 1, 
              unit: e.target.value 
            })}
            className={inputClassName}
          >
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      );
    }
    
    return (
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    );
  }

  // Number field
  if (fieldType === "number") {
    return (
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : "")}
        placeholder="Enter number"
        className={inputClassName}
      />
    );
  }

  // Multi-value operators (in, not_in)
  if (operator === "in" || operator === "not_in") {
    return (
      <textarea
        value={Array.isArray(value) ? value.join("\n") : value || ""}
        onChange={(e) => {
          const values = e.target.value.split("\n").filter(v => v.trim());
          onChange(values);
        }}
        placeholder="Enter values (one per line)"
        rows={3}
        className={cn(inputClassName, "resize-none")}
      />
    );
  }

  // Default text input
  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value"
      className={inputClassName}
    />
  );
}
