"use client";

import React, { useState, useMemo } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import {
  hrCategories,
  hrReportFields,
  HRReportField,
  getFieldsByCategory,
  getFieldByKey,
  filterCategoriesByFeatures,
  filterFieldsByFeatures,
} from "@/lib/hrReportFields";

interface FieldSelectionProps {
  selectedFields: string[];
  onUpdateFields: (fields: string[]) => void;
  showSearch?: boolean;
  showSelectedSummary?: boolean;
  initialExpandedCategories?: string[];
  /** Feature toggles state - categories with disabled features will be hidden */
  enabledFeatures?: Record<string, boolean>;
}

export default function FieldSelection({
  selectedFields,
  onUpdateFields,
  showSearch = true,
  showSelectedSummary = true,
  initialExpandedCategories,
  enabledFeatures = {},
}: FieldSelectionProps) {
  const REQUIRED_FIELDS = ["User.firstName", "User.lastName"];
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter categories based on feature toggles
  const visibleCategories = useMemo(() => {
    return filterCategoriesByFeatures(enabledFeatures);
  }, [enabledFeatures]);
  
  // Filter fields based on feature toggles
  const visibleFields = useMemo(() => {
    return filterFieldsByFeatures(enabledFeatures);
  }, [enabledFeatures]);
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(initialExpandedCategories && initialExpandedCategories.length > 0 ? initialExpandedCategories : [visibleCategories[0]?.id].filter(Boolean))
  );

  // Filter fields based on search term (from already feature-filtered fields)
  const filteredFields = useMemo(() => {
    if (!searchTerm.trim()) {
      return visibleFields;
    }
    
    const term = searchTerm.toLowerCase();
    return visibleFields.filter(
      field =>
        field.label.toLowerCase().includes(term) ||
        field.description?.toLowerCase().includes(term) ||
        field.model.toLowerCase().includes(term)
    );
  }, [searchTerm, visibleFields]);

  // Group filtered fields by category (only visible categories)
  const fieldsByCategory = useMemo(() => {
    const grouped: Record<string, HRReportField[]> = {};
    
    visibleCategories.forEach(category => {
      grouped[category.id] = filteredFields.filter(field => field.category === category.id);
    });
    
    return grouped;
  }, [filteredFields, visibleCategories]);

  const toggleField = (fieldKey: string) => {
    if (REQUIRED_FIELDS.includes(fieldKey)) {
      // Do not allow toggling required fields off
      if (!selectedFields.includes(fieldKey)) {
        onUpdateFields(Array.from(new Set([fieldKey, ...selectedFields])));
      }
      return;
    }
    if (selectedFields.includes(fieldKey)) {
      onUpdateFields(selectedFields.filter(f => f !== fieldKey));
    } else {
      onUpdateFields([...selectedFields, fieldKey]);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const categoryFields = getFieldsByCategory(categoryId);
    const categoryFieldKeys = categoryFields.map(f => f.field);
    const allSelected = categoryFieldKeys.every(key => selectedFields.includes(key));
    
    if (allSelected) {
      // Deselect all fields in this category
      onUpdateFields(
        selectedFields.filter(
          key => !categoryFieldKeys.includes(key) || REQUIRED_FIELDS.includes(key)
        )
      );
    } else {
      // Select all fields in this category
      const newFields = [...selectedFields];
      categoryFieldKeys.forEach(key => {
        if (!newFields.includes(key)) {
          newFields.push(key);
        }
      });
      // Ensure required fields remain included
      REQUIRED_FIELDS.forEach((req) => {
        if (!newFields.includes(req)) newFields.unshift(req);
      });
      onUpdateFields(Array.from(new Set(newFields)));
    }
  };

  const removeField = (fieldKey: string) => {
    if (REQUIRED_FIELDS.includes(fieldKey)) return;
    onUpdateFields(selectedFields.filter(f => f !== fieldKey));
  };

  const clearAllFields = () => {
    // Keep required fields when clearing
    onUpdateFields([...REQUIRED_FIELDS]);
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select Report Fields
        </h3>
        <p className="text-gray-600">
          Choose the data fields you want to include in your report. Fields are organized by HR business areas.
        </p>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Selected Fields Summary */}
      {showSelectedSummary && selectedFields.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-900">
              Selected Fields ({selectedFields.length})
            </h4>
            <button
              onClick={clearAllFields}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFields.map((fieldKey) => {
              const field = getFieldByKey(fieldKey);
              if (!field) return null;

              return (
                <div
                  key={fieldKey}
                  className="inline-flex items-center border rounded-md px-3 py-1 text-sm transition-colors bg-white border-blue-200 text-gray-900"
                >
                  <span>{field.label}</span>
                  <button
                    onClick={() => removeField(fieldKey)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Field Categories */}
      <div className="space-y-4">
        {visibleCategories.map((category) => {
          const categoryFields = fieldsByCategory[category.id] || [];
          const selectedInCategory = categoryFields.filter(f => selectedFields.includes(f.field));
          const allSelected = categoryFields.length > 0 && selectedInCategory.length === categoryFields.length;
          const someSelected = selectedInCategory.length > 0 && selectedInCategory.length < categoryFields.length;
          const isExpanded = expandedCategories.has(category.id);

          if (searchTerm && categoryFields.length === 0) {
            return null; // Hide empty categories when searching
          }

          return (
            <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <div
                className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${category.color}`}
                onClick={() => toggleCategoryExpansion(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {category.iconComponent ? (
                      <category.iconComponent className="h-5 w-5" />
                    ) : (
                      <span className="text-xl">{category.icon}</span>
                    )}
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm opacity-75">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium">
                      {selectedInCategory.length} of {categoryFields.length} selected
                    </div>
                    {categoryFields.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(category.id);
                        }}
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                          ${allSelected 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : someSelected
                            ? 'bg-blue-100 border-blue-600'
                            : 'border-gray-300 hover:border-blue-500'
                          }
                        `}
                      >
                        {allSelected && <CheckIcon className="w-3 h-3" />}
                        {someSelected && !allSelected && (
                          <div className="w-2 h-2 bg-blue-600 rounded-sm" />
                        )}
                      </button>
                    )}
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category Fields */}
              {isExpanded && (
                <div className="bg-white border-t border-gray-200">
                  {categoryFields.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      No fields match your search criteria
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {categoryFields.map((field) => {
                        const isSelected = selectedFields.includes(field.field);
                        const isRequired = REQUIRED_FIELDS.includes(field.field);

                        return (
                          <div
                            key={field.field}
                            className={`
                              flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all
                              ${isSelected
                                ? 'bg-blue-50 border-blue-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }
                            `}
                            onClick={() => toggleField(field.field)}
                          >
                            <div
                              className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors
                                ${isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-gray-300'
                                }
                              `}
                            >
                              {isSelected && <CheckIcon className="w-3 h-3" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h5 className="font-medium text-gray-900">{field.label}{isRequired ? ' (Required)' : ''}</h5>
                                <span className={`
                                  px-2 py-0.5 text-xs rounded-full
                                  ${field.type === 'string' ? 'bg-gray-100 text-gray-700' :
                                    field.type === 'number' ? 'bg-blue-100 text-blue-700' :
                                    field.type === 'date' ? 'bg-green-100 text-green-700' :
                                    field.type === 'boolean' ? 'bg-purple-100 text-purple-700' :
                                    'bg-orange-100 text-orange-700'
                                  }
                                `}>
                                  {field.type}
                                </span>
                                {field.isPII && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                                    PII
                                  </span>
                                )}
                              </div>
                              {field.description && (
                                <p className="text-sm text-gray-600 mt-1">{field.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {searchTerm && filteredFields.length === 0 && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No fields found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms or browse by category.
          </p>
        </div>
      )}
    </div>
  );
}
