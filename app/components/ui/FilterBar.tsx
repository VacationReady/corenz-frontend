"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, X, SortAsc, SortDesc } from "lucide-react";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useFilters } from "@/components/ui/FilterProvider";
import { FilterConfig, FilterOption } from "@/types/filter";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface FilterBarProps {
  config: FilterConfig;
  departmentOptions?: FilterOption[];
  jobRoleOptions?: FilterOption[];
  statusOptions?: FilterOption[];
  locationOptions?: FilterOption[];
  documentTypeOptions?: FilterOption[];
  authorOptions?: FilterOption[];
  categoryOptions?: FilterOption[];
  sortOptions?: FilterOption[];
  className?: string;
  onExport?: () => void;
  showChips?: boolean;
  savedViewsEnabled?: boolean;
  savedViews?: Array<{ id: string; name: string; filters: Partial<ReturnType<typeof useFilters>["filters"]> }>;
  onSaveView?: (name: string, filters: ReturnType<typeof useFilters>["filters"]) => void;
  onSelectView?: (viewId: string) => void;
  onDeleteView?: (viewId: string) => void;
}

export function FilterBar({
  config,
  departmentOptions = [],
  jobRoleOptions = [],
  statusOptions = [],
  locationOptions = [],
  documentTypeOptions = [],
  authorOptions = [],
  categoryOptions = [],
  sortOptions = [],
  className,
  onExport,
  showChips = true,
  savedViewsEnabled = false,
  savedViews = [],
  onSaveView,
  onSelectView,
  onDeleteView,
}: FilterBarProps) {
  const { filters, updateFilter, clearFilters, isFiltered } = useFilters();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 300);

  React.useEffect(() => {
    if (debouncedSearch !== filters.search) {
      updateFilter("search", debouncedSearch);
    }
  }, [debouncedSearch]);

  const handleSearchChange = (value: string) => {
    updateFilter("search", value);
  };

  const toggleSortOrder = () => {
    updateFilter("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc");
  };

  const hasAdvancedFilters = useMemo(() => {
    return (
      config.showDepartmentFilter ||
      config.showJobRoleFilter ||
      config.showStatusFilter ||
      config.showLocationFilter ||
      config.showDateRangeFilter ||
      config.showDocumentTypeFilter ||
      config.showAuthorFilter ||
      config.showCategoryFilter ||
      (config.customFilters && config.customFilters.length > 0)
    );
  }, [config]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Primary Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={config.searchPlaceholder || "Search..."}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort Controls */}
        {sortOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilter("sortBy", value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.sortBy && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortOrder}
                className="px-2"
              >
                {filters.sortOrder === "asc" ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {savedViewsEnabled && (
            <>
              {savedViews.length > 0 && (
                <Select
                  value={""}
                  onValueChange={(value) => {
                    if (value.startsWith("delete:")) {
                      const id = value.replace("delete:", "");
                      onDeleteView?.(id);
                    } else {
                      onSelectView?.(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Saved views" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedViews.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = typeof window !== "undefined" ? window.prompt("Save current view as:") : "";
                  if (name) {
                    onSaveView?.(name, filters);
                  }
                }}
              >
                Save view
              </Button>
            </>
          )}

          {hasAdvancedFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {isFiltered && (
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          )}

          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              Export
            </Button>
          )}

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      {showChips && (
        <div className="flex flex-wrap gap-2">
          {/* Search Chip */}
          {filters.search && (
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full px-3"
              onClick={() => updateFilter("search", "")}
            >
              Search: &ldquo;{filters.search}&rdquo; <span className="ml-2">×</span>
            </Button>
          )}

          {/* Array filter chips per item */}
          {filters.departments.map((val) => {
            const label = departmentOptions.find((o) => o.value === val)?.label || val;
            return (
              <Button
                key={`dept-${val}`}
                variant="secondary"
                size="sm"
                className="rounded-full px-3"
                onClick={() => updateFilter("departments", filters.departments.filter((v) => v !== val))}
              >
                Department: {label} <span className="ml-2">×</span>
              </Button>
            );
          })}

          {filters.jobRoles.map((val) => {
            const label = jobRoleOptions.find((o) => o.value === val)?.label || val;
            return (
              <Button
                key={`job-${val}`}
                variant="secondary"
                size="sm"
                className="rounded-full px-3"
                onClick={() => updateFilter("jobRoles", filters.jobRoles.filter((v) => v !== val))}
              >
                Job: {label} <span className="ml-2">×</span>
              </Button>
            );
          })}

          {filters.status.map((val) => {
            const label = statusOptions.find((o) => o.value === val)?.label || val;
            return (
              <Button
                key={`status-${val}`}
                variant="secondary"
                size="sm"
                className="rounded-full px-3"
                onClick={() => updateFilter("status", filters.status.filter((v) => v !== val))}
              >
                Status: {label} <span className="ml-2">×</span>
              </Button>
            );
          })}

          {filters.locations.map((val) => {
            const label = locationOptions.find((o) => o.value === val)?.label || val;
            return (
              <Button
                key={`location-${val}`}
                variant="secondary"
                size="sm"
                className="rounded-full px-3"
                onClick={() =>
                  updateFilter(
                    "locations",
                    filters.locations.filter((v) => v !== val),
                  )
                }
              >
                Location: {label} <span className="ml-2">×</span>
              </Button>
            );
          })}

          {filters.documentTypes.map((val) => {
            const label = documentTypeOptions.find((o) => o.value === val)?.label || val;
            return (
              <Button
                key={`doctype-${val}`}
                variant="secondary"
                size="sm"
                className="rounded-full px-3"
                onClick={() => updateFilter("documentTypes", filters.documentTypes.filter((v) => v !== val))}
              >
                Doc: {label} <span className="ml-2">×</span>
              </Button>
            );
          })}

          {filters.authors.map((val) => {
            const label = authorOptions.find((o) => o.value === val)?.label || val;
            return (
              <Button
                key={`author-${val}`}
                variant="secondary"
                size="sm"
                className="rounded-full px-3"
                onClick={() => updateFilter("authors", filters.authors.filter((v) => v !== val))}
              >
                Author: {label} <span className="ml-2">×</span>
              </Button>
            );
          })}

          {filters.categories.map((val) => {
            const label = categoryOptions.find((o) => o.value === val)?.label || val;
            return (
              <Button
                key={`cat-${val}`}
                variant="secondary"
                size="sm"
                className="rounded-full px-3"
                onClick={() => updateFilter("categories", filters.categories.filter((v) => v !== val))}
              >
                Category: {label} <span className="ml-2">×</span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && hasAdvancedFilters && (
        <div className="bg-section-background rounded-lg p-4 border border-enhanced">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Department Filter */}
            {config.showDepartmentFilter && departmentOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Department
                </label>
                <MultiSelect
                  options={departmentOptions}
                  selected={filters.departments}
                  onChange={(values) => updateFilter("departments", values)}
                  placeholder="Select departments..."
                />
              </div>
            )}

            {/* Job Role Filter */}
            {config.showJobRoleFilter && jobRoleOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Job Role
                </label>
                <MultiSelect
                  options={jobRoleOptions}
                  selected={filters.jobRoles}
                  onChange={(values) => updateFilter("jobRoles", values)}
                  placeholder="Select job roles..."
                />
              </div>
            )}

            {/* Status Filter */}
            {config.showStatusFilter && statusOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <MultiSelect
                  options={statusOptions}
                  selected={filters.status}
                  onChange={(values) => updateFilter("status", values)}
                  placeholder="Select status..."
                />
              </div>
            )}

            {/* Location Filter */}
            {config.showLocationFilter && locationOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Location
                </label>
                <MultiSelect
                  options={locationOptions}
                  selected={filters.locations}
                  onChange={(values) => updateFilter("locations", values)}
                  placeholder="Select locations..."
                />
              </div>
            )}

            {/* Document Type Filter */}
            {config.showDocumentTypeFilter &&
              documentTypeOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Document Type
                  </label>
                  <MultiSelect
                    options={documentTypeOptions}
                    selected={filters.documentTypes}
                    onChange={(values) => updateFilter("documentTypes", values)}
                    placeholder="Select document types..."
                  />
                </div>
              )}

            {/* Author Filter */}
            {config.showAuthorFilter && authorOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Author
                </label>
                <MultiSelect
                  options={authorOptions}
                  selected={filters.authors}
                  onChange={(values) => updateFilter("authors", values)}
                  placeholder="Select authors..."
                />
              </div>
            )}

            {/* Category Filter */}
            {config.showCategoryFilter && categoryOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category
                </label>
                <MultiSelect
                  options={categoryOptions}
                  selected={filters.categories}
                  onChange={(values) => updateFilter("categories", values)}
                  placeholder="Select categories..."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
