"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bug, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import { AdminBugStats } from "@/tenant-admin/components/AdminBugStats";
import { AdminBugTable } from "@/tenant-admin/components/AdminBugTable";
import { AdminBugFilterBar } from "@/tenant-admin/components/AdminBugFilterBar";
import { AdminBugDetailPanel } from "@/tenant-admin/components/AdminBugDetailPanel";
import {
  BugReportWithTenant,
  BugStatus,
  BugSeverity,
  BugStats,
  AdminListBugsResponse,
} from "@/types/bugs";

interface Tenant {
  id: string;
  name: string;
}

/**
 * Tenant Admin Bug Dashboard Page
 * 
 * Displays all bugs across all tenants with filtering, sorting, and management capabilities.
 * Only accessible to users with canManageTenants permission.
 * 
 * Requirements: 7.1, 7.2
 */
export default function TenantAdminBugDashboard() {
  const router = useRouter();

  // Auth state
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Data state
  const [bugs, setBugs] = useState<BugReportWithTenant[]>([]);
  const [stats, setStats] = useState<BugStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter/sort state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<BugStatus | undefined>();
  const [severityFilter, setSeverityFilter] = useState<BugSeverity | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  // Panel state
  const [selectedBug, setSelectedBug] = useState<BugReportWithTenant | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Check authentication
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/tenant-admin/verify");
      const data = await response.json();
      if (!data.authenticated) {
        router.push("/tenant-admin?next=/tenant-admin/bugs");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/tenant-admin");
      return false;
    } finally {
      setIsAuthChecking(false);
    }
  }, [router]);

  // Fetch tenants for filter dropdown
  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch("/api/tenant-admin/tenants");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/tenant-admin");
          return;
        }
        throw new Error("Failed to fetch tenants");
      }
      const data = await response.json();
      setTenants(
        (data.companies || []).map((t: any) => ({
          id: t.id,
          name: t.name,
        }))
      );
    } catch (error) {
      console.error("Fetch tenants error:", error);
    }
  }, [router]);

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

      if (selectedTenantId) params.set("companyId", selectedTenantId);
      if (statusFilter) params.set("status", statusFilter);
      if (severityFilter) params.set("severity", severityFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/tenant-admin/bugs?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/tenant-admin");
          return;
        }
        if (response.status === 403) {
          toast.error("You don't have permission to access this page");
          router.push("/tenant-admin/dashboard");
          return;
        }
        throw new Error("Failed to fetch bugs");
      }

      const data: AdminListBugsResponse = await response.json();
      setBugs(data.bugs);
      setStats(data.stats);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching bugs:", error);
      toast.error("Failed to load bug reports");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    page,
    limit,
    sortBy,
    sortOrder,
    selectedTenantId,
    statusFilter,
    severityFilter,
    dateFrom,
    dateTo,
    router,
  ]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const isAuth = await checkAuth();
      if (isAuth) {
        await fetchTenants();
      }
    };
    init();
  }, [checkAuth, fetchTenants]);

  // Fetch bugs when filters change
  useEffect(() => {
    if (!isAuthChecking) {
      fetchBugs();
    }
  }, [fetchBugs, isAuthChecking]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchBugs();
  }, [fetchBugs]);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleTenantChange = useCallback((tenantId: string | undefined) => {
    setSelectedTenantId(tenantId);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((status: BugStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handleSeverityChange = useCallback((severity: BugSeverity | undefined) => {
    setSeverityFilter(severity);
    setPage(1);
  }, []);

  const handleDateFromChange = useCallback((date: string | undefined) => {
    setDateFrom(date);
    setPage(1);
  }, []);

  const handleDateToChange = useCallback((date: string | undefined) => {
    setDateTo(date);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedTenantId(undefined);
    setStatusFilter(undefined);
    setSeverityFilter(undefined);
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  }, []);

  const handleBugClick = useCallback(async (bug: BugReportWithTenant) => {
    // Fetch full bug details including attachments
    try {
      const response = await fetch(`/api/tenant-admin/bugs/${bug.id}`);
      if (response.ok) {
        const { bug: fullBug } = await response.json();
        setSelectedBug(fullBug);
      } else {
        setSelectedBug(bug);
      }
    } catch {
      setSelectedBug(bug);
    }
    setIsPanelOpen(true);
  }, []);

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedBug(null);
  }, []);

  const handleBugUpdated = useCallback((updatedBug: BugReportWithTenant) => {
    // Update bug in list
    setBugs((prev) =>
      prev.map((b) => (b.id === updatedBug.id ? updatedBug : b))
    );
    setSelectedBug(updatedBug);
    // Refresh stats
    fetchBugs();
  }, [fetchBugs]);

  // Loading state
  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="secondary"
            onClick={() => router.push("/tenant-admin/dashboard")}
            icon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4"
          >
            Back to Dashboard
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-600">
                <Bug className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Bug Reports</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage bug reports across all tenants
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              loading={isRefreshing}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <AdminBugStats stats={stats} isLoading={isLoading && !stats} />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <AdminBugFilterBar
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            statusFilter={statusFilter}
            severityFilter={severityFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onTenantChange={handleTenantChange}
            onStatusChange={handleStatusChange}
            onSeverityChange={handleSeverityChange}
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Table */}
        <AdminBugTable
          bugs={bugs}
          total={total}
          page={page}
          limit={limit}
          totalPages={totalPages}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onPageChange={handlePageChange}
          onBugClick={handleBugClick}
        />

        {/* Detail Panel */}
        <AdminBugDetailPanel
          bug={selectedBug}
          isOpen={isPanelOpen}
          onClose={handlePanelClose}
          onBugUpdated={handleBugUpdated}
        />
      </div>
    </div>
  );
}
