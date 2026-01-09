"use client";

import { format } from "date-fns";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
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
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BugReportWithTenant,
  BugStatus,
  BugSeverity,
  STATUS_INFO,
  SEVERITY_INFO,
} from "@/types/bugs";

interface AdminBugTableProps {
  bugs: BugReportWithTenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onPageChange: (page: number) => void;
  onBugClick: (bug: BugReportWithTenant) => void;
}

/**
 * AdminBugTable Component
 * 
 * Modern table with glass styling and hover effects for tenant admin bug dashboard.
 * Displays bugs across all tenants with status and severity badges.
 * 
 * Requirements: 7.3, 7.4, 7.5
 */
export function AdminBugTable({
  bugs,
  total,
  page,
  limit,
  totalPages,
  isLoading = false,
  sortBy,
  sortOrder,
  onSortChange,
  onPageChange,
  onBugClick,
}: AdminBugTableProps) {
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

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch {
      return "-";
    }
  };

  const truncateId = (id: string) => {
    return id.length > 8 ? `${id.substring(0, 8)}...` : id;
  };

  if (isLoading) {
    return (
      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow hoverable={false} className="bg-muted/30">
              <TableHead className="w-24">Bug ID</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-1">
                  Title
                  {getSortIcon("title")}
                </div>
              </TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Submitted By</TableHead>
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
                  Date Resolved
                  {getSortIcon("resolvedAt")}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bugs.length === 0 ? (
              <TableRow hoverable={false}>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="text-muted-foreground">
                    <p className="text-lg font-medium">No bug reports found</p>
                    <p className="text-sm mt-1">
                      Try adjusting your filters or check back later
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bugs.map((bug) => (
                <TableRow
                  key={bug.id}
                  onClick={() => onBugClick(bug)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {truncateId(bug.id)}
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate">
                    {bug.title}
                  </TableCell>
                  <TableCell className="text-sm">
                    {bug.company?.name || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {bug.submitter?.name || bug.submitter?.email || "-"}
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
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(bug.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(bug.resolvedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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

export default AdminBugTable;
