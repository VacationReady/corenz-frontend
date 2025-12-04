"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { 
  FileText, 
  Library, 
  History, 
  Plus, 
  BarChart3,
  Search,
  X,
  Trash2,
  Eye,
  Clock,
  User,
  FolderOpen,
  TrendingUp,
  Calendar,
  MoreVertical,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Download,
  Filter
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SendHistoryModal } from "@/components/reports/SendHistoryModal";
import { cn } from "@/lib/utils";

interface SavedReport {
  id: number;
  name: string;
  category: string;
  fields: string[] | string | null;
  createdAt: string;
  createdBy: {
    email: string;
  };
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedReportForHistory, setSelectedReportForHistory] = useState<{ id: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const router = useRouter();
  const breadcrumbs = useBreadcrumbs();

  const fetchReports = useCallback(
    async ({ initial = false }: { initial?: boolean } = {}) => {
      if (initial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const headers: HeadersInit = {};
        if (session?.user?.companyId) {
          headers["x-company-id"] = session.user.companyId;
        }
        const res = await fetch("/api/reports", { headers });

        if (!res.ok) {
          let message = "Failed to load reports.";
          try {
            const errorBody = await res.json();
            message = errorBody?.error ?? message;
          } catch (jsonError) {
            console.error("Failed to parse reports error response", jsonError);
            message = `${message} (${res.status})`;
          }
          throw new Error(message);
        }

        const data = await res.json();
        setReports(data);
        if (!initial) {
          toast({
            title: "Reports refreshed",
            description: "Your saved reports are now up to date.",
          });
        }
      } catch (err) {
        console.error("Failed to fetch reports", err);
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading reports.";
        setError(message);
        toast({
          title: "Unable to load reports",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (initial) {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [session?.user?.companyId]
  );

  useEffect(() => {
    void fetchReports({ initial: true });
  }, [fetchReports]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this report? This action cannot be undone.")) return;
    const previousReports = [...reports];
    const reportToDelete = reports.find((report) => report.id === id);

    setDeletingIds((prev) => [...prev, id]);
    setReports((prev) => prev.filter((r) => r.id !== id));
    setActiveMenu(null);

    try {
      const headers: HeadersInit = {};
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }
      const response = await fetch(`/api/reports/${id}`, { method: "DELETE", headers });

      if (!response.ok) {
        let message = "Failed to delete report.";
        try {
          const errorBody = await response.json();
          message = errorBody?.error ?? message;
        } catch (jsonError) {
          console.error("Failed to parse delete error response", jsonError);
          message = `${message} (${response.status})`;
        }
        throw new Error(message);
      }

      toast({
        title: "Report deleted",
        description: reportToDelete?.name
          ? `"${reportToDelete.name}" has been removed.`
          : "The report has been removed.",
      });
    } catch (err) {
      console.error("Failed to delete report", err);
      setReports(previousReports);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while deleting the report.";
      toast({
        title: "Failed to delete report",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeletingIds((prev) => prev.filter((reportId) => reportId !== id));
    }
  };

  const handleViewReport = (report: SavedReport) => {
    console.log("🧪 Raw report.fields:", report.fields);

    if (
      !report.fields ||
      (Array.isArray(report.fields) && report.fields.length === 0)
    ) {
      toast({
        title: "Unable to open report",
        description: "No fields were saved with this report configuration.",
        variant: "destructive",
      });
      return;
    }

    let fieldArray: string[] = [];
    if (Array.isArray(report.fields)) {
      fieldArray = report.fields.filter(
        (field): field is string =>
          typeof field === "string" && field.trim() !== ""
      );
    } else if (typeof report.fields === "string") {
      try {
        const parsed = JSON.parse(report.fields || "[]");
        if (Array.isArray(parsed)) {
          fieldArray = parsed.filter(
            (field): field is string =>
              typeof field === "string" && field.trim() !== ""
          );
        } else {
          fieldArray = report.fields
            .split(",")
            .map((field) => field.trim())
            .filter((field) => field.length > 0);
        }
      } catch (parseError) {
        console.error("Failed to parse report fields", parseError);
        fieldArray = report.fields
          .split(",")
          .map((field) => field.trim())
          .filter((field) => field.length > 0);
      }
    }

    if (!fieldArray.length) {
      toast({
        title: "Unable to open report",
        description: "This report does not contain any fields yet.",
        variant: "destructive",
      });
      return;
    }

    const params = new URLSearchParams();
    params.set("fields", JSON.stringify(fieldArray));
    params.set("reportId", String(report.id));
    params.set("returnTo", "/reports");
    router.push(`/reports/preview?${params.toString()}`);
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const unique = new Set<string>();
    reports.forEach((r) => {
      if (r.category) unique.add(r.category);
    });
    return Array.from(unique).sort();
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = !searchQuery || 
        report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.createdBy?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || report.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [reports, searchQuery, selectedCategory]);

  // Stats
  const stats = useMemo(() => ({
    total: reports.length,
    thisMonth: reports.filter(r => {
      const created = new Date(r.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
    categories: categories.length,
    recent: reports.slice(0, 5).length,
  }), [reports, categories]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 25 }
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Reports"
        description="View and manage your saved reports"
        icon={<BarChart3 className="w-6 h-6" />}
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Reports"
      description="Build, manage, and share powerful HR analytics"
      icon={<BarChart3 className="w-6 h-6" />}
      breadcrumbs={breadcrumbs}
      action={
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={() => router.push("/reports/library")}
              className="border-border/50 hover:bg-muted/50 transition-all duration-200 h-10 px-4 rounded-xl"
            >
              <Library className="h-4 w-4 mr-2" />
              Template Library
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => router.push("/reports/builder-new")}
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25 h-10 px-5 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </motion.div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-2xl p-4 border border-destructive/20 bg-destructive/5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-destructive">Unable to load reports</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void fetchReports({ initial: reports.length === 0 })}
                  className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {/* Total Reports */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 border border-blue-200/50 dark:border-blue-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Reports</p>
              </div>
            </div>
          </motion.div>

          {/* This Month */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 border border-blue-200/50 dark:border-blue-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.thisMonth}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Created This Month</p>
              </div>
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 border border-blue-200/50 dark:border-blue-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.categories}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Categories</p>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => router.push("/reports/builder-new")}
            className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 border border-blue-200/50 dark:border-blue-700/30 p-5 shadow-depth-2 group"
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-4">
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">Create Report</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Build new analytics</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Filter Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card rounded-2xl p-4 shadow-depth-2"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-11 h-11 glass-subtle border-white/20 focus:border-primary/50 rounded-xl"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/50 rounded-full transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              
              {categories.length > 0 && (
                <select
                  className="h-11 px-4 rounded-xl glass-subtle border border-white/20 text-sm font-medium focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium">
                {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchReports()}
                disabled={isRefreshing}
                className="h-9 px-3 rounded-lg glass-subtle border-white/20"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          <AnimatePresence>
            {(searchQuery || selectedCategory !== "all") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10"
              >
                <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
                
                {searchQuery && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/10 text-primary border-0"
                  >
                    <Search className="w-3 h-3" />
                    "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedCategory !== "all" && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0"
                  >
                    <FolderOpen className="w-3 h-3" />
                    {selectedCategory}
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  Clear all
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Reports Grid */}
        {filteredReports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-premium rounded-3xl text-center p-12 shadow-premium"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-blue-500/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">
              {reports.length === 0 ? "No reports yet" : "No matching reports"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {reports.length === 0 
                ? "Create your first report to unlock powerful HR analytics and insights."
                : "Try adjusting your search or filter criteria to find what you're looking for."
              }
            </p>
            {reports.length === 0 && (
              <div className="flex items-center justify-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => router.push("/reports/library")}
                  className="h-11 px-5 rounded-xl"
                >
                  <Library className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
                <Button 
                  onClick={() => router.push("/reports/builder-new")}
                  className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg h-11 px-5 rounded-xl"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Your First Report
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {filteredReports.map((report) => (
                <motion.div
                  key={report.id}
                  variants={cardVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="glass-premium rounded-2xl overflow-hidden shadow-premium hover:shadow-depth-4 transition-all duration-300 group h-full flex flex-col">
                    {/* Card Header */}
                    <div className="p-5 pb-4 flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <BarChart3 className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {report.name}
                            </h3>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary"
                          className="text-xs font-medium bg-primary/10 text-primary border-0 whitespace-nowrap"
                        >
                          {report.category}
                        </Badge>
                      </div>

                      {/* Meta Info */}
                      <div className="space-y-2.5 mt-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{report.createdBy?.email || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Created {format(new Date(report.createdAt), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            {Array.isArray(report.fields) 
                              ? `${report.fields.length} field${report.fields.length !== 1 ? 's' : ''}`
                              : "Custom fields"
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="border-t border-white/20 p-4 bg-white/30 dark:bg-black/10">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReport(report)}
                            className="h-9 px-4 rounded-lg glass-subtle border-white/20 hover:border-primary/30 hover:bg-primary/5"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedReportForHistory({ id: report.id, name: report.name })}
                            className="h-9 px-3 rounded-lg hover:bg-white/50"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* More Actions Dropdown */}
                        <div className="relative">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 rounded-lg hover:bg-white/50"
                            onClick={() => setActiveMenu(activeMenu === report.id ? null : report.id)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          
                          <AnimatePresence>
                            {activeMenu === report.id && (
                              <>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveMenu(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                  className="absolute right-0 bottom-full mb-2 w-44 glass-premium rounded-xl shadow-depth-3 py-2 z-50"
                                >
                                  <button
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-white/50 transition-colors"
                                    onClick={() => {
                                      handleViewReport(report);
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                    Open Report
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-white/50 transition-colors"
                                    onClick={() => {
                                      setSelectedReportForHistory({ id: report.id, name: report.name });
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <History className="h-4 w-4 text-muted-foreground" />
                                    Send History
                                  </button>
                                  <div className="border-t border-white/20 my-2" />
                                  <button
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                    disabled={deletingIds.includes(report.id)}
                                    onClick={() => handleDelete(report.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {deletingIds.includes(report.id) ? "Deleting..." : "Delete Report"}
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* History Modal */}
      {selectedReportForHistory && (
        <SendHistoryModal
          isOpen={!!selectedReportForHistory}
          onClose={() => setSelectedReportForHistory(null)}
          reportId={selectedReportForHistory.id}
          reportName={selectedReportForHistory.name}
        />
      )}
    </PageShell>
  );
}
