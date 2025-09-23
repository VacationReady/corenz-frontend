"use client";

import React from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { hrReportFields, HRReportField, getFieldByKey } from "@/lib/hrReportFields";

export type FilterOperator = 
  | "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with"
  | "greater_than" | "less_than" | "greater_than_equal" | "less_than_equal" | "between"
  | "is_null" | "is_not_null" | "in" | "not_in"
  | "date_equals" | "date_before" | "date_after" | "date_between" | "date_in_last" | "date_in_next";

export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  value2?: any; // For 'between' operations
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

interface FilterConfigurationProps {
  filters: ReportFilter[];
  sort?: SortConfig;
  selectedFields: string[];
  onUpdateFilters: (filters: ReportFilter[]) => void;
  onUpdateSort: (sort?: SortConfig) => void;
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
}: FilterConfigurationProps) {
  // Get available fields for filtering (only selected fields that are filterable)
  const availableFields = selectedFields
    .map(fieldKey => hrReportFields.find(f => f.field === fieldKey))
    .filter((field): field is HRReportField => field !== undefined && field.filterable);

  const addFilter = () => {
    if (availableFields.length === 0) return;
    
    const newFilter: ReportFilter = {
      id: `filter_${Date.now()}_${Math.random()}`,
      field: availableFields[0].field,
      operator: "equals",
      value: "",
    };
    
    onUpdateFilters([...filters, newFilter]);
  };

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    const updatedFilters = filters.map(filter => 
      filter.id === filterId ? { ...filter, ...updates } : filter
    );
    onUpdateFilters(updatedFilters);
  };

  const removeFilter = (filterId: string) => {
    onUpdateFilters(filters.filter(f => f.id !== filterId));
  };

  const clearAllFilters = () => {
    onUpdateFilters([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configure Filters & Sorting
        </h3>
        <p className="text-gray-600">
          Set up filters to narrow down your data and choose how to sort the results.
        </p>
      </div>

      {/* Sorting Configuration */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Sorting</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by field
            </label>
            <select
              value={sort?.field || ""}
              onChange={(e) => {
                if (e.target.value) {
                  onUpdateSort({
                    field: e.target.value,
                    direction: sort?.direction || "asc",
                  });
                } else {
                  onUpdateSort(undefined);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No sorting</option>
              {availableFields
                .filter(field => field.sortable)
                .map(field => (
                  <option key={field.field} value={field.field}>
                    {field.label}
                  </option>
                ))}
            </select>
          </div>
          
          {sort?.field && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort direction
              </label>
              <select
                value={sort.direction}
                onChange={(e) => onUpdateSort({
                  field: sort.field,
                  direction: e.target.value as "asc" | "desc",
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="asc">Ascending (A-Z, 1-9, oldest first)</option>
                <option value="desc">Descending (Z-A, 9-1, newest first)</option>
              </select>
            </div>
          )}
        </div>
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
              onClick={addFilter}
              disabled={availableFields.length === 0}
              className="flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Filter
            </Button>
          </div>
        </div>

        {availableFields.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              No filterable fields available. Please select some fields first.
            </p>
          </div>
        )}

        {filters.length === 0 && availableFields.length > 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              No filters applied. Your report will include all available data.
            </p>
            <Button variant="outline" onClick={addFilter}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Your First Filter
            </Button>
          </div>
        )}

        {/* Filter List */}
        {filters.length > 0 && (
          <div className="space-y-4">
            {filters.map((filter, index) => (
              <FilterRow
                key={filter.id}
                filter={filter}
                availableFields={availableFields}
                isFirst={index === 0}
                onUpdate={(updates) => updateFilter(filter.id, updates)}
                onRemove={() => removeFilter(filter.id)}
              />
            ))}
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
  onUpdate,
  onRemove,
}: {
  filter: ReportFilter;
  availableFields: HRReportField[];
  isFirst: boolean;
  onUpdate: (updates: Partial<ReportFilter>) => void;
  onRemove: () => void;
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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start space-x-4">
        {/* AND/WHERE indicator */}
        <div className="flex-shrink-0 mt-2">
          <span className={`
            px-2 py-1 text-xs font-medium rounded-md
            ${isFirst ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
          `}>
            {isFirst ? 'WHERE' : 'AND'}
          </span>
        </div>

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
                />
                {requiresTwoValues && (
                  <>
                    <span className="flex items-center text-gray-500 px-2">to</span>
                    <FilterValueInput
                      field={selectedField}
                      operator={filter.operator}
                      value={filter.value2}
                      onChange={(value2) => onUpdate({ value2 })}
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
}: {
  field: HRReportField | undefined;
  operator: FilterOperator;
  value: any;
  onChange: (value: any) => void;
}) {
  if (!field) return null;

  const fieldType = field.type;

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
