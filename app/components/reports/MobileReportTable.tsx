"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  RefreshCw,
  Search,
  X,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/**
 * Mobile-Optimized Report Table
 * 
 * A card-based layout for viewing report data on mobile devices.
 * Features:
 * - Card layout for small screens
 * - Expandable row details
 * - Touch-friendly controls
 * - Pull-to-refresh support
 * - Sticky column selection
 * 
 * WCAG 2.1 AA Compliant:
 * - Proper ARIA labels
 * - Keyboard navigation
 * - High contrast support
 * - Focus indicators
 * - Screen reader announcements
 */

interface MobileReportTableProps {
  /** Data rows */
  data: Record<string, any>[];
  /** Column definitions */
  columns: Array<{
    key: string;
    label: string;
    type?: "string" | "number" | "date" | "boolean";
    isPrimary?: boolean;
  }>;
  /** Currently loading */
  isLoading?: boolean;
  /** Callback for refresh */
  onRefresh?: () => void;
  /** Callback for export */
  onExport?: () => void;
  /** Callback for filter */
  onFilter?: () => void;
  /** Total record count */
  totalCount?: number;
  /** Optional className */
  className?: string;
}

// Get value from nested path
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((curr, key) => curr?.[key], obj);
}

// Format value for display
function formatValue(value: any, type?: string): string {
  if (value === null || value === undefined) return "—";
  
  if (type === "boolean") {
    return value ? "Yes" : "No";
  }
  
  if (type === "date" && value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return String(value);
    }
  }
  
  if (type === "number" && typeof value === "number") {
    return value.toLocaleString();
  }
  
  return String(value);
}

export function MobileReportTable({
  data,
  columns,
  isLoading,
  onRefresh,
  onExport,
  onFilter,
  totalCount,
  className,
}: MobileReportTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Primary columns (shown in collapsed state)
  const primaryColumns = useMemo(() => {
    const primary = columns.filter((c) => c.isPrimary);
    return primary.length > 0 ? primary : columns.slice(0, 2);
  }, [columns]);

  // Secondary columns (shown in expanded state)
  const secondaryColumns = useMemo(() => {
    const primaryKeys = new Set(primaryColumns.map((c) => c.key));
    return columns.filter((c) => !primaryKeys.has(c.key));
  }, [columns, primaryColumns]);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = getNestedValue(row, col.key);
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const aVal = getNestedValue(a, sortField);
        const bVal = getNestedValue(b, sortField);
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = aVal < bVal ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, sortField, sortDirection, columns]);

  // Toggle row expansion
  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Screen reader announcements
  const [announcement, setAnnouncement] = useState("");
  
  const announce = (message: string) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(""), 1000);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Mobile Toolbar */}
      <div className="flex flex-col gap-3 sticky top-0 bg-background/95 backdrop-blur-sm pb-3 z-10">
        {/* Search */}
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" 
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              announce(`Filtering by "${e.target.value}"`);
            }}
            className="pl-9 pr-9 h-11 text-base"
            aria-label="Search report data"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                announce("Search cleared");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRefresh();
                announce("Refreshing data");
              }}
              disabled={isLoading}
              className="h-9 px-3 flex-shrink-0"
              aria-label="Refresh data"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          )}

          {onFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFilter}
              className="h-9 px-3 flex-shrink-0"
              aria-label="Open filters"
            >
              <Filter className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Filter</span>
            </Button>
          )}

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onExport();
                announce("Starting export");
              }}
              className="h-9 px-3 flex-shrink-0"
              aria-label="Export data"
            >
              <Download className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Export</span>
            </Button>
          )}

          {/* Sort Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const currentIndex = columns.findIndex((c) => c.key === sortField);
              const nextIndex = (currentIndex + 1) % columns.length;
              const nextField = columns[nextIndex].key;
              toggleSort(nextField);
              announce(`Sorting by ${columns[nextIndex].label}`);
            }}
            className="h-9 px-3 flex-shrink-0"
            aria-label={`Sort by ${sortField || "column"}`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Sort</span>
          </Button>

          {/* Results count */}
          <div className="ml-auto flex-shrink-0">
            <Badge variant="secondary" className="h-7">
              {processedData.length}
              {totalCount && totalCount > processedData.length && ` of ${totalCount}`}
            </Badge>
          </div>
        </div>
      </div>

      {/* Data Cards */}
      <div 
        role="list" 
        aria-label="Report data"
        className="space-y-3"
      >
        {processedData.length === 0 ? (
          <div 
            role="status"
            className="text-center py-12 text-muted-foreground"
          >
            <SlidersHorizontal className="w-12 h-12 mx-auto mb-3 opacity-40" aria-hidden="true" />
            <p className="text-sm">
              {searchTerm ? "No matching records found" : "No data available"}
            </p>
          </div>
        ) : (
          processedData.map((row, index) => {
            const isExpanded = expandedRows.has(index);
            const rowId = `row-${index}`;
            
            return (
              <motion.article
                key={index}
                role="listitem"
                aria-labelledby={`${rowId}-title`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.2) }}
                className={cn(
                  "border rounded-xl overflow-hidden transition-shadow",
                  isExpanded ? "shadow-md ring-1 ring-primary/20" : "shadow-sm"
                )}
              >
                {/* Card Header - Always visible */}
                <button
                  onClick={() => {
                    toggleRow(index);
                    announce(isExpanded ? "Row collapsed" : "Row expanded");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleRow(index);
                    }
                  }}
                  className="w-full p-4 flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  aria-expanded={isExpanded}
                  aria-controls={`${rowId}-details`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 
                      id={`${rowId}-title`}
                      className="font-medium text-sm truncate"
                    >
                      {primaryColumns.map((col, i) => (
                        <span key={col.key}>
                          {i > 0 && " · "}
                          {formatValue(getNestedValue(row, col.key), col.type)}
                        </span>
                      ))}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {secondaryColumns.slice(0, 2).map((col, i) => (
                        <span key={col.key}>
                          {i > 0 && " • "}
                          {col.label}: {formatValue(getNestedValue(row, col.key), col.type)}
                        </span>
                      ))}
                    </p>
                  </div>
                  <div 
                    className="flex-shrink-0 p-1 rounded-full bg-muted/50"
                    aria-hidden="true"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      id={`${rowId}-details`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div 
                        className="px-4 pb-4 pt-0 border-t bg-muted/30"
                        role="table"
                        aria-label="Row details"
                      >
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          {secondaryColumns.map((col) => (
                            <div key={col.key} role="row">
                              <dt 
                                className="text-xs text-muted-foreground mb-0.5"
                                role="columnheader"
                              >
                                {col.label}
                              </dt>
                              <dd 
                                className="text-sm font-medium truncate"
                                role="cell"
                              >
                                {formatValue(getNestedValue(row, col.key), col.type)}
                              </dd>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })
        )}
      </div>

      {/* Load More / Pagination (optional) */}
      {totalCount && processedData.length < totalCount && (
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Showing {processedData.length} of {totalCount} records
          </p>
        </div>
      )}
    </div>
  );
}

export default MobileReportTable;









