"use client";

import React, { useState, useMemo } from "react";
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import Button from "@/components/ui/Button";
import { hrReportFields, HRReportField, getFieldByKey } from "@/lib/hrReportFields";
import type { ReportFilter, SortConfig, FilterOperator } from "@/lib/reportFilters";
import { isFilterComplete, getFilterValidationError } from "@/lib/reportFilters";
import { DatePresetSelector } from "./DatePresetSelector";
import type { DatePresetSelection } from "@/lib/reportingDatePresets";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";
import { Badge } from "@/components/ui/Badge";

interface FilterConfigurationProps {
  filters: ReportFilter[];
  sort?: SortConfig;
  selectedFields: string[];
  onUpdateFilters: (filters: ReportFilter[]) => void;
  onUpdateSort: (sort?: SortConfig) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
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
  filters,
  sort,
  selectedFields,
  onUpdateFilters,
  onUpdateSort,
  onValidationChange,
  timeZone,
  locale,
}: FilterConfigurationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [sorts, setSorts] = useState<SortConfig[]>(sort ? [sort] : []);
  
  // Get ALL filterable fields, not just selected ones
  const allFilterableFields = useMemo(() => 
    hrReportFields.filter(f => f.filterable),
    []
  );
  
  // Get fields that are in the output
  const outputFields = useMemo(() => 
    new Set(selectedFields),
    [selectedFields]
  );
  
  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    filters.forEach((filter, index) => {
      const error = getFilterValidationError(filter);
      if (error) {
        errors.push(`Filter ${index + 1}: ${error}`);
      }
    });
    return errors;
  }, [filters]);
  
  const isValid = validationErrors.length === 0;
  
  // Notify parent of validation changes
  React.useEffect(() => {
    onValidationChange?.(isValid, validationErrors);
  }, [isValid, validationErrors, onValidationChange]);
  
  // Ensure required fields are in selectedFields if filters reference them
  const requiredFieldsFromFilters = useMemo(() => {
    return filters
      .filter(f => !f.hideFieldInResults)
      .map(f => f.field)
      .filter(field => !outputFields.has(field));
  }, [filters, outputFields]);

  const addFilter = (fieldKey?: string) => {
    if (allFilterableFields.length === 0) return;
    
    const field = fieldKey 
      ? allFilterableFields.find(f => f.field === fieldKey)
      : allFilterableFields[0];
    
    if (!field) return;
    
    const newFilter: ReportFilter = {
      id: `filter_${Date.now()}_${Math.random()}`,
      field: field.field,
      operator: "equals",
      value: "",
      hideFieldInResults: !outputFields.has(field.field),
    };
    
    onUpdateFilters([...filters, newFilter]);
    setShowFieldPicker(false);
    setSearchQuery("");
  };

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    const updatedFilters = filters.map((filter) => {
      if (filter.id === filterId) {
        return { ...filter, ...updates };
      }
      return filter;
    });
    onUpdateFilters(updatedFilters);
  };

  const removeFilter = (filterId: string) => {
    const remaining = filters.filter((filter) => filter.id !== filterId);
    onUpdateFilters(remaining);
  };

  const clearAllFilters = () => {
    onUpdateFilters([]);
  };
  
  // Multi-sort handlers
  const addSort = () => {
    if (allFilterableFields.length === 0) return;
    const sortableFields = allFilterableFields.filter(f => f.sortable);
    if (sortableFields.length === 0) return;
    const newSort: SortConfig = {
      field: sortableFields[0].field,
      direction: "asc",
    };
    const newSorts = [...sorts, newSort];
    setSorts(newSorts);
    onUpdateSort(newSorts[0]);
  };
  
  const updateSort = (index: number, updates: Partial<SortConfig>) => {
    const newSorts = sorts.map((s, i) => i === index ? { ...s, ...updates } : s);
    setSorts(newSorts);
    onUpdateSort(newSorts[0]);
  };
  
  const removeSort = (index: number) => {
    const newSorts = sorts.filter((_, i) => i !== index);
    setSorts(newSorts);
    onUpdateSort(newSorts[0]);
  };
  
  const moveSortUp = (index: number) => {
    if (index === 0) return;
    const newSorts = [...sorts];
    [newSorts[index - 1], newSorts[index]] = [newSorts[index], newSorts[index - 1]];
    setSorts(newSorts);
    onUpdateSort(newSorts[0]);
  };
  
  const moveSortDown = (index: number) => {
    if (index === sorts.length - 1) return;
    const newSorts = [...sorts];
    [newSorts[index], newSorts[index + 1]] = [newSorts[index + 1], newSorts[index]];
    setSorts(newSorts);
    onUpdateSort(newSorts[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configure Filters & Sorting
        </h3>
        <p className="text-gray-600">
          Set up filters to narrow down your data and choose how to sort the results. You can filter on any field, even if it's not in your output columns.
        </p>
        {requiredFieldsFromFilters.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Some filters reference fields not in your output. These fields will be auto-included if needed.
            </p>
          </div>
        )}
      </div>
      
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-semibold text-red-900 mb-2">Please fix the following errors:</h4>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sorting Configuration */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Sorting</h4>
          {sorts.length < 3 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addSort}
              className="flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Sort Level
            </Button>
          )}
        </div>
        
        {sorts.length === 0 ? (
          <p className="text-sm text-gray-600">No sorting applied. Results will be in default order.</p>
        ) : (
          <div className="space-y-3">
            {sorts.map((sortItem, index) => (
              <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveSortUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUpIcon className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => moveSortDown(index)}
                    disabled={index === sorts.length - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                
                <Badge variant="outline" className="flex-shrink-0">
                  {index === 0 ? "Primary" : index === 1 ? "Secondary" : "Tertiary"}
                </Badge>
                
                <select
                  value={sortItem.field}
                  onChange={(e) => updateSort(index, { field: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {allFilterableFields
                    .filter(field => field.sortable)
                    .map(field => (
                      <option key={field.field} value={field.field}>
                        {field.label}
                      </option>
                    ))}
                </select>
                
                <select
                  value={sortItem.direction}
                  onChange={(e) => updateSort(index, { direction: e.target.value as "asc" | "desc" })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="asc">↑ Asc</option>
                  <option value="desc">↓ Desc</option>
                </select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeSort(index)}
                  className="text-red-600 border-red-200 hover:bg-red-50 p-2"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Filters</h4>
          <div className="space-x-2">
            {filters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFieldPicker(!showFieldPicker)}
              className="flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Filter
            </Button>
          </div>
        </div>
        
        {/* Field Picker */}
        {showFieldPicker && (
          <div className="mb-4 p-4 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFieldPicker(false);
                  setSearchQuery("");
                }}
              >
                Cancel
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {allFilterableFields
                .filter(field => 
                  field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  field.field.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(field => {
                  const isInOutput = outputFields.has(field.field);
                  const alreadyFiltered = filters.some(f => f.field === field.field);
                  
                  return (
                    <button
                      key={field.field}
                      onClick={() => addFilter(field.field)}
                      disabled={alreadyFiltered}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{field.label}</div>
                        <div className="text-xs text-gray-500">{field.field}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isInOutput && (
                          <Badge variant="outline" className="text-xs">
                            Filter-only
                          </Badge>
                        )}
                        {alreadyFiltered && (
                          <Badge className="text-xs bg-gray-200 text-gray-700">
                            Already added
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {filters.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              No filters applied. Your report will include all available data.
            </p>
            <Button variant="outline" onClick={() => setShowFieldPicker(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Your First Filter
            </Button>
          </div>
        )}

        {/* Filter List */}
        {filters.length > 0 && (
          <div className="space-y-4">
            {filters.map((filter, index) => {
              const isInOutput = outputFields.has(filter.field);
              const validationError = getFilterValidationError(filter);
              
              return (
                <FilterRow
                  key={filter.id}
                  filter={filter}
                  availableFields={allFilterableFields}
                  isFirst={index === 0}
                  isInOutput={isInOutput}
                  validationError={validationError}
                  onUpdate={(updates) => updateFilter(filter.id, updates)}
                  onRemove={() => removeFilter(filter.id)}
                  timeZone={timeZone}
                  locale={locale}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Filter Row Component
function FilterRow({
  filter,
  availableFields,
  isFirst,
  isInOutput,
  validationError,
  onUpdate,
  onRemove,
  timeZone,
  locale,
}: {
  filter: ReportFilter;
  availableFields: HRReportField[];
  isFirst: boolean;
  isInOutput: boolean;
  validationError: string | null;
  onUpdate: (updates: Partial<ReportFilter>) => void;
  onRemove: () => void;
  timeZone?: string;
  locale?: string;
}) {
  const selectedField = getFieldByKey(filter.field);
  const fieldType = selectedField?.type || "string";
  const availableOperators = operatorsByType[fieldType] || operatorsByType.string;

  const requiresNoValue = operatorsWithoutValue.includes(filter.operator);
  const requiresTwoValues = operatorsWithTwoValues.includes(filter.operator);

  // Reset value when field or operator changes
  const handleFieldChange = (newField: string) => {
    onUpdate({ field: newField, value: "", value2: undefined });
  };

  const handleOperatorChange = (newOperator: FilterOperator) => {
    onUpdate({ operator: newOperator, value: "", value2: undefined });
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${
      validationError ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`}>
      {/* Header with badges and remove button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`
            px-2 py-1 text-xs font-medium rounded-md
            ${isFirst ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
          `}>
            {isFirst ? 'WHERE' : 'AND'}
          </span>
          
          {!isInOutput && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <EyeSlashIcon className="w-3 h-3" />
              Filter-only field
            </Badge>
          )}
          
          {validationError && (
            <Badge variant="destructive" className="text-xs">
              {validationError}
            </Badge>
          )}
        </div>
        
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 transition-colors p-1"
          title="Remove filter"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex items-start space-x-4">

        {/* Filter configuration */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Field selection */}
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field
            </label>
            <select
              value={filter.field}
              onChange={(e) => handleFieldChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={filter.operator}
              onChange={(e) => handleOperatorChange(e.target.value as FilterOperator)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className={requiresTwoValues ? "md:col-span-4" : "md:col-span-4"}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <div className={requiresTwoValues ? "flex space-x-2" : ""}>
                <FilterValueInput
                  field={selectedField}
                  operator={filter.operator}
                  value={filter.value}
                  onChange={(value) => onUpdate({ value })}
                  timeZone={timeZone}
                  locale={locale}
                />
                {requiresTwoValues && (
                  <>
                    <span className="flex items-center text-gray-500 px-2">to</span>
                    <FilterValueInput
                      field={selectedField}
                      operator={filter.operator}
                      value={filter.value2}
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

        {/* Remove button */}
        <div className="flex-shrink-0 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="text-red-600 border-red-200 hover:bg-red-50 p-2"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
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

  // Boolean field
  if (fieldType === "boolean") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value === "true")}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="flex space-x-2">
          <input
            type="number"
            value={value?.amount || ""}
            onChange={(e) => onChange({ 
              amount: parseInt(e.target.value) || 0, 
              unit: value?.unit || "days" 
            })}
            placeholder="Number"
            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={value?.unit || "days"}
            onChange={(e) => onChange({ 
              amount: value?.amount || 1, 
              unit: e.target.value 
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}
