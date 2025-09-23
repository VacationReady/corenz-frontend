"use client";

import { FilterState, FilterOption } from "@/types/filter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SearchX, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const EXCLUDED_VALUES = new Set(["all"]);

function getOptionLabel(value: string, options: FilterOption[] = []): string {
  return options.find((option) => option.value === value)?.label || value;
}

function formatValueList(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildFilterSummaries(
  filters: FilterState,
  options: {
    departmentOptions?: FilterOption[];
    jobRoleOptions?: FilterOption[];
    statusOptions?: FilterOption[];
  },
) {
  const segments: string[] = [];
  const badges: string[] = [];

  if (filters.search.trim()) {
    const searchLabel = `Search \"${filters.search.trim()}\"`;
    segments.push(searchLabel.toLowerCase());
    badges.push(searchLabel);
  }

  const statusValues = filters.status.filter((value) => !EXCLUDED_VALUES.has(value));
  if (statusValues.length > 0) {
    const labels = statusValues.map((value) =>
      getOptionLabel(value, options.statusOptions),
    );
    const joined = formatValueList(labels);
    segments.push(`status ${joined.toLowerCase()}`);
    badges.push(`Status: ${joined}`);
  }

  const departmentValues = filters.departments.filter(
    (value) => !EXCLUDED_VALUES.has(value),
  );
  if (departmentValues.length > 0) {
    const labels = departmentValues.map((value) =>
      getOptionLabel(value, options.departmentOptions),
    );
    const joined = formatValueList(labels);
    segments.push(`department ${joined.toLowerCase()}`);
    badges.push(`Department: ${joined}`);
  }

  const jobRoleValues = filters.jobRoles.filter(
    (value) => !EXCLUDED_VALUES.has(value),
  );
  if (jobRoleValues.length > 0) {
    const labels = jobRoleValues.map((value) =>
      getOptionLabel(value, options.jobRoleOptions),
    );
    const joined = formatValueList(labels);
    segments.push(`role ${joined.toLowerCase()}`);
    badges.push(`Role: ${joined}`);
  }

  return { segments, badges };
}

interface FilteredListLoadingProps {
  resourceName: string;
  filters: FilterState;
  departmentOptions?: FilterOption[];
  jobRoleOptions?: FilterOption[];
  statusOptions?: FilterOption[];
  className?: string;
}

export function FilteredListLoading({
  resourceName,
  filters,
  departmentOptions,
  jobRoleOptions,
  statusOptions,
  className,
}: FilteredListLoadingProps) {
  const { segments } = buildFilterSummaries(filters, {
    departmentOptions,
    jobRoleOptions,
    statusOptions,
  });

  const summary = segments.length
    ? ` for ${segments.join(", ")}`
    : "";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center space-y-4",
        className,
      )}
    >
      <LoadingSpinner size="lg" showText text={`Loading ${resourceName}${summary}...`} />
      {segments.length > 0 && (
        <p className="text-sm text-muted-foreground max-w-xl">
          Hang tight — we&apos;re fetching {resourceName.toLowerCase()} that match your
          selected filters.
        </p>
      )}
    </div>
  );
}

interface FilteredListEmptyProps {
  resourceName: string;
  filters: FilterState;
  isFiltered: boolean;
  onClearFilters?: () => void;
  departmentOptions?: FilterOption[];
  jobRoleOptions?: FilterOption[];
  statusOptions?: FilterOption[];
  className?: string;
}

export function FilteredListEmpty({
  resourceName,
  filters,
  isFiltered,
  onClearFilters,
  departmentOptions,
  jobRoleOptions,
  statusOptions,
  className,
}: FilteredListEmptyProps) {
  const { badges, segments } = buildFilterSummaries(filters, {
    departmentOptions,
    jobRoleOptions,
    statusOptions,
  });

  const Icon = isFiltered ? SearchX : Inbox;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center space-y-4 py-16",
        className,
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {isFiltered
            ? `No ${resourceName.toLowerCase()} match your filters`
            : `No ${resourceName.toLowerCase()} yet`}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xl">
          {isFiltered
            ? "Try adjusting or clearing your filters to see more results."
            : `Add new ${resourceName.toLowerCase()} to get started.`}
        </p>
      </div>

      {isFiltered && badges.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
          {badges.map((badge) => (
            <Badge key={badge} variant="outline" className="px-3 py-1 text-sm">
              {badge}
            </Badge>
          ))}
        </div>
      )}

      {isFiltered && onClearFilters && (
        <Button variant="outline" onClick={onClearFilters} className="mt-2">
          Clear filters
        </Button>
      )}

      {!isFiltered && segments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: apply filters to focus on specific {resourceName.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
