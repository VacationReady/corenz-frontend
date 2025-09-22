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
  total?: number;
  page?: number;
  pageSize?: number;
  onFilteredDataChange?: (filteredData: any[]) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

interface ColumnFilter {
  [columnKey: string]: string[];
}

type AdvancedFilter =
  | { mode: "search"; query: string }
  | { mode: "numberRange"; min?: number; max?: number }
  | { mode: "dateRange"; from?: string; to?: string }
  | { mode: "boolean"; value: "true" | "false" | "" };

// Helper function to get nested values (e.g., department.name)
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

function detectColumnType(sampleValues: string[], data: any[], accessorKey: string): "number" | "date" | "boolean" | "string" {
  // Try boolean
  const boolSet = new Set(
    data
      .map((row) => getNestedValue(row, accessorKey))
      .filter((v) => v !== null && v !== undefined)
      .map((v) => (typeof v === "boolean" ? v : v === "true" || v === "false" ? v === "true" : undefined))
      .filter((v) => v !== undefined)
  );
  if (boolSet.size > 0 && boolSet.size <= 2) return "boolean";

  // Try number
  const numeric = sampleValues.every((v) => v === "" || !isNaN(Number(v)));
  if (numeric) return "number";

  // Try date (ISO or yyyy-mm-dd)
  const dateLike = sampleValues.every((v) => v === "" || !isNaN(Date.parse(v)) || /\d{4}-\d{2}-\d{2}/.test(v));
  if (dateLike) return "date";

  return "string";
}

export default function FilterableDataTable({
  columns,
  data,
  total,
  page,
  pageSize,
  onFilteredDataChange,
  onPageChange,
  onPageSizeChange,
}: FilterableDataTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({});
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, AdvancedFilter>>({});
  const [openFilters, setOpenFilters] = useState<Set<string>>(new Set());
  const [hasError, setHasError] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [internalPage, setInternalPage] = useState(page ?? 1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize ?? 50);

  useEffect(() => {
    if (typeof page === "number") {
      setInternalPage(page);
    }
  }, [page]);

  useEffect(() => {
    if (typeof pageSize === "number") {
      setInternalPageSize(pageSize);
    }
  }, [pageSize]);

  const currentPage = page ?? internalPage;
  const currentPageSize = pageSize ?? internalPageSize;
  const hasTotal = typeof total === "number" && !Number.isNaN(total);
  const totalCount = hasTotal ? total! : data.length;
  const safePageSize = currentPageSize > 0 ? currentPageSize : 1;
  const pageCount = Math.max(1, Math.ceil((totalCount || 0) / safePageSize));

  const pageSizeOptions = useMemo(() => {
    const presets = [10, 25, 50, 100];
    if (!presets.includes(safePageSize)) {
      presets.push(safePageSize);
      presets.sort((a, b) => a - b);
    }
    return presets;
  }, [safePageSize]);

  const changePage = (nextPage: number) => {
    if (nextPage < 1) return;
    if (onPageChange) {
      onPageChange(nextPage);
    }
    if (page === undefined) {
      setInternalPage(nextPage);
    }
  };

  const changePageSize = (nextPageSize: number) => {
    if (nextPageSize <= 0) return;
    if (onPageSizeChange) {
      onPageSizeChange(nextPageSize);
    }
    if (pageSize === undefined) {
      setInternalPageSize(nextPageSize);
      setInternalPage(1);
    }
  };

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
      return {} as Record<string, string[]>;
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

  // Detect column types
  const columnTypes = useMemo(() => {
    const map: Record<string, "number" | "date" | "boolean" | "string"> = {};
    for (const col of columns) {
      map[col.accessorKey] = detectColumnType(columnValues[col.accessorKey] || [], data, col.accessorKey);
    }
    return map;
  }, [columns, data, columnValues]);

  // Filter the data based on active filters
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    let result = data;

    // Apply advanced filters
    result = result.filter((row) => {
      return Object.entries(advancedFilters).every(([key, filter]) => {
        const raw = getNestedValue(row, key);
        const type = columnTypes[key];
        if (!filter) return true;

        switch (filter.mode) {
          case "search": {
            const q = (filter.query || "").toLowerCase();
            if (!q) return true;
            return String(raw ?? "").toLowerCase().includes(q);
          }
          case "numberRange": {
            const n = raw === null || raw === undefined ? undefined : Number(raw);
            if (n === undefined || isNaN(n)) return false;
            if (filter.min !== undefined && n < filter.min) return false;
            if (filter.max !== undefined && n > filter.max) return false;
            return true;
          }
          case "dateRange": {
            if (!raw) return false;
            const d = new Date(raw);
            if (filter.from && d < new Date(filter.from)) return false;
            if (filter.to && d > new Date(filter.to)) return false;
            return true;
          }
          case "boolean": {
            if (!filter.value) return true; // All
            const boolVal = typeof raw === "boolean" ? raw : String(raw).toLowerCase() === "true";
            return String(boolVal) === filter.value;
          }
          default:
            return true;
        }
      });
    });

    // Apply exact-value multi-select filters
    if (Object.keys(columnFilters).length > 0) {
      result = result.filter(row => {
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
  }, [data, columnFilters, advancedFilters, columnTypes]);

  const disablePrev = currentPage <= 1;
  const disableNext = hasTotal ? currentPage >= pageCount : filteredData.length < safePageSize;
  const currentPageDisplay = Math.min(currentPage, pageCount);

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
    setAdvancedFilters(prev => {
      const { [columnKey]: removed, ...rest } = prev;
      return rest;
    });
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setAdvancedFilters({});
  };

  const getActiveFilterCount = () => {
    const exact = Object.values(columnFilters).reduce((count, filters) => count + filters.length, 0);
    const advanced = Object.values(advancedFilters).reduce((count, f) => {
      if (!f) return count;
      if (f.mode === "search" && f.query) return count + 1;
      if (f.mode === "numberRange" && (f.min !== undefined || f.max !== undefined)) return count + 1;
      if (f.mode === "dateRange" && (f.from || f.to)) return count + 1;
      if (f.mode === "boolean" && f.value) return count + 1;
      return count;
    }, 0);
    return exact + advanced;
  };

  return (
    <div className="space-y-4">
      {/* Filter Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3" role="status" aria-live="polite">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span className="text-sm text-blue-800">
              {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active • 
              Showing {filteredData.length} of {data.length} rows
            </span>
          </div>
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            aria-label="Clear all filters"
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
                  const detectedType = columnTypes[column.accessorKey];
                  const adv = advancedFilters[column.accessorKey];
                  
                  return (
                    <th key={column.accessorKey} className="relative">
                      <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-between">
                          <span>{column.header}</span>
                          <div className="flex items-center space-x-1">
                            {(activeFilters.length > 0 || adv) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {activeFilters.length + (adv ? 1 : 0)}
                              </span>
                            )}
                            <button
                              onClick={() => toggleFilter(column.accessorKey)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              aria-label={`Filter ${column.header}`}
                              aria-expanded={isFilterOpen}
                              aria-controls={`filter-${column.accessorKey}`}
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
                        <div id={`filter-${column.accessorKey}`} className="absolute top-full left-0 z-10 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
                          <div className="p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                Filter {column.header}
                              </h4>
                              {(activeFilters.length > 0 || adv) && (
                                <button
                                  onClick={() => clearColumnFilter(column.accessorKey)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Clear
                                </button>
                              )}
                            </div>

                            {/* Type-aware controls */}
                            {detectedType === "string" && (
                              <div>
                                <label htmlFor={`search-${column.accessorKey}`} className="block text-xs font-medium text-gray-700 mb-1">
                                  Search
                                </label>
                                <input
                                  id={`search-${column.accessorKey}`}
                                  type="text"
                                  value={adv && adv.mode === "search" ? adv.query : ""}
                                  onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, [column.accessorKey]: { mode: "search", query: e.target.value } }))}
                                  placeholder={`Search ${column.header}`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            )}

                            {detectedType === "number" && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label htmlFor={`min-${column.accessorKey}`} className="block text-xs font-medium text-gray-700 mb-1">Min</label>
                                  <input
                                    id={`min-${column.accessorKey}`}
                                    type="number"
                                    value={adv && adv.mode === "numberRange" && adv.min !== undefined ? adv.min : ""}
                                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, [column.accessorKey]: { mode: "numberRange", min: e.target.value === "" ? undefined : Number(e.target.value), max: (adv && adv.mode === "numberRange" ? adv.max : undefined) } }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`max-${column.accessorKey}`} className="block text-xs font-medium text-gray-700 mb-1">Max</label>
                                  <input
                                    id={`max-${column.accessorKey}`}
                                    type="number"
                                    value={adv && adv.mode === "numberRange" && adv.max !== undefined ? adv.max : ""}
                                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, [column.accessorKey]: { mode: "numberRange", max: e.target.value === "" ? undefined : Number(e.target.value), min: (adv && adv.mode === "numberRange" ? adv.min : undefined) } }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                            )}

                            {detectedType === "date" && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label htmlFor={`from-${column.accessorKey}`} className="block text-xs font-medium text-gray-700 mb-1">From</label>
                                  <input
                                    id={`from-${column.accessorKey}`}
                                    type="date"
                                    value={adv && adv.mode === "dateRange" && adv.from ? adv.from : ""}
                                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, [column.accessorKey]: { mode: "dateRange", from: e.target.value || undefined, to: (adv && adv.mode === "dateRange" ? adv.to : undefined) } }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`to-${column.accessorKey}`} className="block text-xs font-medium text-gray-700 mb-1">To</label>
                                  <input
                                    id={`to-${column.accessorKey}`}
                                    type="date"
                                    value={adv && adv.mode === "dateRange" && adv.to ? adv.to : ""}
                                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, [column.accessorKey]: { mode: "dateRange", to: e.target.value || undefined, from: (adv && adv.mode === "dateRange" ? adv.from : undefined) } }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                            )}

                            {detectedType === "boolean" && (
                              <div>
                                <label htmlFor={`bool-${column.accessorKey}`} className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                                <select
                                  id={`bool-${column.accessorKey}`}
                                  value={adv && adv.mode === "boolean" ? adv.value : ""}
                                  onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, [column.accessorKey]: { mode: "boolean", value: e.target.value as "true" | "false" | "" } }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">All</option>
                                  <option value="true">True</option>
                                  <option value="false">False</option>
                                </select>
                              </div>
                            )}

                            {/* Exact values multi-select fallback */}
                            <div className="pt-2 border-t border-gray-200">
                              <div className="text-xs font-medium text-gray-700 mb-2">Choose exact values</div>
                              {availableValues.length === 0 ? (
                                <p className="text-sm text-gray-500">No values available</p>
                              ) : (
                                <div className="max-h-40 overflow-y-auto space-y-2" role="group" aria-label={`Exact values for ${column.header}`}>
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
                                            aria-checked={isChecked}
                                          />
                                          <div
                                            className={`
                                              w-4 h-4 border-2 rounded flex items-center justify-center transition-colors
                                              ${isChecked
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-300 hover:border-blue-500'
                                              }
                                            `}
                                            aria-hidden="true"
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
                        {getNestedValue(row, column.accessorKey) ?? '-'}
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
          Showing {filteredData.length} of {totalCount} rows
        </span>
        {getActiveFilterCount() > 0 && (
          <span>
            {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} applied
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
        <label className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={safePageSize}
            onChange={(event) => changePageSize(Number(event.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={disablePrev}
            className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            Previous
          </button>
          <span>
            Page {currentPageDisplay} of {pageCount}
          </span>
          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={disableNext}
            className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
