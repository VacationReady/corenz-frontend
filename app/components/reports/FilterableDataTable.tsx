"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDownIcon, ChevronUpIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";

interface Column {
  header: string;
  accessorKey: string;
}

interface FilterableDataTableProps {
  columns: Column[];
  data: any[];
  onFilteredDataChange?: (filteredData: any[]) => void;
}

interface ColumnFilter {
  [columnKey: string]: string[];
}

// Helper function to get nested values (e.g., department.name)
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

export default function FilterableDataTable({ columns, data, onFilteredDataChange }: FilterableDataTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({});
  const [openFilters, setOpenFilters] = useState<Set<string>>(new Set());
  const [hasError, setHasError] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Error boundary effect
  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Reset error state when data changes
  useEffect(() => {
    setHasError(false);
  }, [data, columns]);

  // Simple fallback if there's an error
  if (hasError || !columns || !data) {
    return (
      <div className="border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500 mb-4">
          {hasError ? "Something went wrong with the table filters." : "Loading table..."}
        </p>
        {hasError && (
          <button 
            onClick={() => setHasError(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setOpenFilters(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get unique values for each column
  const columnValues = useMemo(() => {
    if (!columns || !data || data.length === 0) {
      return {};
    }

    const values: Record<string, string[]> = {};
    
    columns.forEach(column => {
      const uniqueValues = new Set<string>();
      
      data.forEach(row => {
        try {
          const value = getNestedValue(row, column.accessorKey);
          if (value !== null && value !== undefined && value !== '') {
            uniqueValues.add(String(value));
          }
        } catch (error) {
          console.warn(`Error accessing ${column.accessorKey}:`, error);
        }
      });
      
      values[column.accessorKey] = Array.from(uniqueValues).sort();
    });
    
    return values;
  }, [columns, data]);

  // Filter the data based on active column filters
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    let result;
    if (Object.keys(columnFilters).length === 0) {
      result = data;
    } else {
      result = data.filter(row => {
        return Object.entries(columnFilters).every(([columnKey, selectedValues]) => {
          if (selectedValues.length === 0) return true;
          
          try {
            const rowValue = getNestedValue(row, columnKey);
            return selectedValues.includes(String(rowValue));
          } catch (error) {
            console.warn(`Error filtering ${columnKey}:`, error);
            return false;
          }
        });
      });
    }
    
    return result;
  }, [data, columnFilters]);

  // Notify parent component of filtered data changes
  useEffect(() => {
    if (onFilteredDataChange && filteredData) {
      onFilteredDataChange(filteredData);
    }
  }, [filteredData, onFilteredDataChange]);

  const toggleFilter = (columnKey: string) => {
    setOpenFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const updateColumnFilter = (columnKey: string, value: string, isChecked: boolean) => {
    setColumnFilters(prev => {
      const currentFilters = prev[columnKey] || [];
      
      if (isChecked) {
        return {
          ...prev,
          [columnKey]: [...currentFilters, value]
        };
      } else {
        return {
          ...prev,
          [columnKey]: currentFilters.filter(v => v !== value)
        };
      }
    });
  };

  const clearColumnFilter = (columnKey: string) => {
    setColumnFilters(prev => {
      const { [columnKey]: removed, ...rest } = prev;
      return rest;
    });
  };

  const clearAllFilters = () => {
    setColumnFilters({});
  };

  const getActiveFilterCount = () => {
    return Object.values(columnFilters).reduce((count, filters) => count + filters.length, 0);
  };

  return (
    <div className="space-y-4">
      {/* Filter Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active • 
              Showing {filteredData.length} of {data.length} rows
            </span>
          </div>
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Table */}
      <div ref={tableRef} className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Header */}
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => {
                  const isFilterOpen = openFilters.has(column.accessorKey);
                  const activeFilters = columnFilters[column.accessorKey] || [];
                  const availableValues = columnValues[column.accessorKey] || [];
                  
                  return (
                    <th key={column.accessorKey} className="relative">
                      <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-between">
                          <span>{column.header}</span>
                          <div className="flex items-center space-x-1">
                            {activeFilters.length > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {activeFilters.length}
                              </span>
                            )}
                            <button
                              onClick={() => toggleFilter(column.accessorKey)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isFilterOpen ? (
                                <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Filter Dropdown */}
                      {isFilterOpen && (
                        <div className="absolute top-full left-0 z-10 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-900">
                                Filter {column.header}
                              </h4>
                              {activeFilters.length > 0 && (
                                <button
                                  onClick={() => clearColumnFilter(column.accessorKey)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            
                            {availableValues.length === 0 ? (
                              <p className="text-sm text-gray-500">No values available</p>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {availableValues.map((value) => {
                                  const isChecked = activeFilters.includes(value);
                                  
                                  return (
                                    <label
                                      key={value}
                                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                    >
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => updateColumnFilter(
                                            column.accessorKey,
                                            value,
                                            e.target.checked
                                          )}
                                          className="sr-only"
                                        />
                                        <div
                                          className={`
                                            w-4 h-4 border-2 rounded flex items-center justify-center transition-colors
                                            ${isChecked
                                              ? 'bg-blue-600 border-blue-600 text-white'
                                              : 'border-gray-300 hover:border-blue-500'
                                            }
                                          `}
                                        >
                                          {isChecked && <CheckIcon className="w-3 h-3" />}
                                        </div>
                                      </div>
                                      <span className="text-sm text-gray-700 flex-1">
                                        {value}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-xs text-gray-500">
                                {activeFilters.length > 0 
                                  ? `${activeFilters.length} selected`
                                  : `${availableValues.length} available`
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {getActiveFilterCount() > 0 
                      ? "No rows match the current filters"
                      : "No data available"
                    }
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td
                        key={column.accessorKey}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {getNestedValue(row, column.accessorKey) || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          Showing {filteredData.length} of {data.length} rows
        </span>
        {getActiveFilterCount() > 0 && (
          <span>
            {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} applied
          </span>
        )}
      </div>
    </div>
  );
}
