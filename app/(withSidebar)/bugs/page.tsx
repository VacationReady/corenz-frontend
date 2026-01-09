"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Bug, Plus } from "lucide-react";
import { FeatureGuardedPage } from "@/components/FeatureGuardedPage";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import BugReportTable from "@/components/bugs/BugReportTable";
import BugDetailModal from "@/components/bugs/BugDetailModal";
import BugSubmissionModal from "@/components/bugs/BugSubmissionModal";
import Button from "@/components/ui/Button";
import {
  BugReport,
  BugStatus,
  BugSeverity,
  ListBugsResponse,
} from "@/types/bugs";

function BugDashboardContent() {
  // Data state
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filter/sort state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<BugStatus | undefined>();
  const [severityFilter, setSeverityFilter] = useState<BugSeverity | undefined>();

  // Modal state
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Fetch bugs
  const fetchBugs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (statusFilter) params.set("status", statusFilter);
      if (severityFilter) params.set("severity", severityFilter);

      const response = await fetch(`/api/bugs?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch bugs");
      }

      const data: ListBugsResponse = await response.json();
      setBugs(data.bugs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching bugs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, statusFilter, severityFilter]);

  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

  // Handlers
  const handleSortChange = useCallback((newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((status: BugStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handleSeverityFilterChange = useCallback((severity: BugSeverity | undefined) => {
    setSeverityFilter(severity);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleBugClick = useCallback(async (bug: BugReport) => {
    // Fetch full bug details including attachments
    try {
      const response = await fetch(`/api/bugs/${bug.id}`);
      if (response.ok) {
        const { bug: fullBug } = await response.json();
        setSelectedBug(fullBug);
      } else {
        setSelectedBug(bug);
      }
    } catch {
      setSelectedBug(bug);
    }
    setIsDetailModalOpen(true);
  }, []);

  const handleDetailModalClose = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedBug(null);
  }, []);

  const handleSubmitModalClose = useCallback(() => {
    setIsSubmitModalOpen(false);
  }, []);

  const handleBugSubmitted = useCallback(() => {
    // Refresh the list after a new bug is submitted
    fetchBugs();
  }, [fetchBugs]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
            <Bug className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bug Reports</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage bug reports submitted by your organisation
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsSubmitModalOpen(true)}
          icon={<Plus className="h-4 w-4" />}
        >
          Report Bug
        </Button>
      </div>

      {/* Bug Table */}
      <BugReportTable
        bugs={bugs}
        total={total}
        page={page}
        limit={limit}
        totalPages={totalPages}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        statusFilter={statusFilter}
        severityFilter={severityFilter}
        onSortChange={handleSortChange}
        onStatusFilterChange={handleStatusFilterChange}
        onSeverityFilterChange={handleSeverityFilterChange}
        onPageChange={handlePageChange}
        onBugClick={handleBugClick}
      />

      {/* Detail Modal */}
      <BugDetailModal
        bug={selectedBug}
        isOpen={isDetailModalOpen}
        onClose={handleDetailModalClose}
      />

      {/* Submit Modal */}
      <BugSubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={handleSubmitModalClose}
        onSuccess={handleBugSubmitted}
      />
    </div>
  );
}

export default function BugReportsPage() {
  return (
    <FeatureGuardedPage
      featureKey={FEATURE_KEYS.BUG_REPORTING}
      disabledMessage="Bug reporting is not enabled for your organisation"
    >
      <BugDashboardContent />
    </FeatureGuardedPage>
  );
}
