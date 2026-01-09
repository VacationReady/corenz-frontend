"use client";

import { useState } from "react";
import { Filter, X, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BugStatus,
  BugSeverity,
  STATUS_INFO,
  SEVERITY_INFO,
} from "@/types/bugs";

interface Tenant {
  id: string;
  name: string;
}

interface AdminBugFilterBarProps {
  tenants: Tenant[];
  selectedTenantId?: string;
  statusFilter?: BugStatus;
  severityFilter?: BugSeverity;
  dateFrom?: string;
  dateTo?: string;
  onTenantChange: (tenantId: string | undefined) => void;
  onStatusChange: (status: BugStatus | undefined) => void;
  onSeverityChange: (severity: BugSeverity | undefined) => void;
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
  onClearFilters: () => void;
}

/**
 * AdminBugFilterBar Component
 * 
 * Filter bar with dropdowns for Tenant, Status, Severity, and Date Range.
 * Includes clear filters button.
 * 
 * Requirements: 7.4
 */
export function AdminBugFilterBar({
  tenants,
  selectedTenantId,
  statusFilter,
  severityFilter,
  dateFrom,
  dateTo,
  onTenantChange,
  onStatusChange,
  onSeverityChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
}: AdminBugFilterBarProps) {
  const [showFilters, setShowFilters] = useState(true);

  const hasActiveFilters =
    selectedTenantId || statusFilter || severityFilter || dateFrom || dateTo;

  const activeFilterCount =
    (selectedTenantId ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (severityFilter ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  return (
    <div className="space-y-4">
      {/* Filter Toggle and Active Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}

        {/* Active filter chips */}
        {selectedTenant && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            Tenant: {selectedTenant.name}
            <button
              onClick={() => onTenantChange(undefined)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {statusFilter && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            Status: {STATUS_INFO[statusFilter].label}
            <button
              onClick={() => onStatusChange(undefined)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {severityFilter && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            Severity: {SEVERITY_INFO[severityFilter].label}
            <button
              onClick={() => onSeverityChange(undefined)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {dateFrom && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            From: {dateFrom}
            <button
              onClick={() => onDateFromChange(undefined)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {dateTo && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            To: {dateTo}
            <button
              onClick={() => onDateToChange(undefined)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 glass rounded-xl border border-glass">
          {/* Tenant Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tenant
            </label>
            <Select
              value={selectedTenantId || "all"}
              onValueChange={(val) =>
                onTenantChange(val === "all" ? undefined : val)
              }
            >
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="All tenants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={statusFilter || "all"}
              onValueChange={(val) =>
                onStatusChange(val === "all" ? undefined : (val as BugStatus))
              }
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_INFO) as BugStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${STATUS_INFO[status].bgColor}`}
                      />
                      {STATUS_INFO[status].label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Severity
            </label>
            <Select
              value={severityFilter || "all"}
              onValueChange={(val) =>
                onSeverityChange(val === "all" ? undefined : (val as BugSeverity))
              }
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {(Object.keys(SEVERITY_INFO) as BugSeverity[]).map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${SEVERITY_INFO[severity].bgColor}`}
                      />
                      {SEVERITY_INFO[severity].label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Date From
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom || ""}
                onChange={(e) =>
                  onDateFromChange(e.target.value || undefined)
                }
                className="w-40 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Date To */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Date To
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateTo || ""}
                onChange={(e) =>
                  onDateToChange(e.target.value || undefined)
                }
                className="w-40 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBugFilterBar;
