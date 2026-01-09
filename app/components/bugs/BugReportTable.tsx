"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  X,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  BugReport,
  BugStatus,
  BugSeverity,
  STATUS_INFO,
  SEVERITY_INFO,
} from "@/types/bugs";

interface BugReportTableProps {
  bugs: BugReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  statusFilter?: BugStatus;
  severityFilter?: BugSeverity;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onStatusFilterChange: (status: BugStatus | undefined) => void;
  onSeverityFilterChange: (severity: BugSeverity | undefined) => void;
  onPageChange: (page: number) => void;
  onBugClick: (bug: BugReport) => void;
}

export default function BugReportTable({
  bugs,
  total,
  page,
  limit,
  totalPages,
  isLoading = false,
  sortBy,
  sortOrder,
  statusFilter,
  severityFilter,
  onSortChange,
  onStatusFilterChange,
  onSeverityFilterChange,
  onPageChange,
  onBugClick,
}: BugReportTableProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      onSortChange(column, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(column, "desc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const hasActiveFilters = statusFilter || severityFilter;

  const clearFilters = () => {
    onStatusFilterChange(undefined);
    onSeverityFilterChange(undefined);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch {
      return "-";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="glass-strong rounded-2xl overflow-hidden">
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {(statusFilter ? 1 : 0) + (severityFilter ? 1 : 0)}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}

        {/* Active filter chips */}
        {statusFilter && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            Status: {STATUS_INFO[statusFilter].label}
            <button
              onClick={() => onStatusFilterChange(undefined)}
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
              onClick={() => onSeverityFilterChange(undefined)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 glass-subtle rounded-xl border border-glass">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={statusFilter || "all"}
              onValueChange={(val) =>
                onStatusFilterChange(val === "all" ? undefined : (val as BugStatus))
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Severity
            </label>
            <Select
              value={severityFilter || "all"}
              onValueChange={(val) =>
                onSeverityFilterChange(val === "all" ? undefined : (val as BugSeverity))
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
        </div>
      )}

      {/* Table */}
      <Table variant="glass">
        <TableHeader>
          <TableRow hoverable={false}>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("title")}
            >
              <div className="flex items-center gap-1">
                Title
                {getSortIcon("title")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("status")}
            >
              <div className="flex items-center gap-1">
                Status
                {getSortIcon("status")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("severity")}
            >
              <div className="flex items-center gap-1">
                Severity
                {getSortIcon("severity")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("createdAt")}
            >
              <div className="flex items-center gap-1">
                Date Submitted
                {getSortIcon("createdAt")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("resolvedAt")}
            >
              <div className="flex items-center gap-1">
                Resolved Date
                {getSortIcon("resolvedAt")}
              </div>
            </TableHead>
            <TableHead className="text-center">Comments</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bugs.length === 0 ? (
            <TableRow hoverable={false}>
              <TableCell colSpan={6} className="text-center py-12">
                <div className="text-muted-foreground">
                  <p className="text-lg font-medium">No bug reports found</p>
                  <p className="text-sm mt-1">
                    {hasActiveFilters
                      ? "Try adjusting your filters"
                      : "Bug reports submitted by your organisation will appear here"}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            bugs.map((bug) => (
              <TableRow
                key={bug.id}
                onClick={() => onBugClick(bug)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium max-w-xs truncate">
                  {bug.title}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${STATUS_INFO[bug.status].bgColor} ${STATUS_INFO[bug.status].color} border-0`}
                  >
                    {STATUS_INFO[bug.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${SEVERITY_INFO[bug.severity].bgColor} ${SEVERITY_INFO[bug.severity].color} border-0`}
                  >
                    {SEVERITY_INFO[bug.severity].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(bug.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(bug.resolvedAt)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>{bug._count?.comments ?? 0}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
            {total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-9 h-9 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
