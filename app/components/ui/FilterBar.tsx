"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, X, Calendar, SortAsc, SortDesc } from "lucide-react";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
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
  documentTypeOptions?: FilterOption[];
  authorOptions?: FilterOption[];
  categoryOptions?: FilterOption[];
  sortOptions?: FilterOption[];
  className?: string;
  onExport?: () => void;
}

export function FilterBar({
  config,
  departmentOptions = [],
  jobRoleOptions = [],
  statusOptions = [],
  documentTypeOptions = [],
  authorOptions = [],
  categoryOptions = [],
  sortOptions = [],
  className,
  onExport,
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
            <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
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
              <Button variant="outline" size="sm" onClick={toggleSortOrder} className="px-2">
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

      {/* Advanced Filters */}
      {showAdvanced && hasAdvancedFilters && (
        <div className="bg-section-background rounded-lg p-4 border border-enhanced">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Department Filter */}
            {config.showDepartmentFilter && departmentOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Department</label>
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
                <label className="block text-sm font-medium text-foreground mb-2">Job Role</label>
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
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <MultiSelect
                  options={statusOptions}
                  selected={filters.status}
                  onChange={(values) => updateFilter("status", values)}
                  placeholder="Select status..."
                />
              </div>
            )}

            {/* Document Type Filter */}
            {config.showDocumentTypeFilter && documentTypeOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Document Type</label>
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
                <label className="block text-sm font-medium text-foreground mb-2">Author</label>
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
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
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
