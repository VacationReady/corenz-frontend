"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, 
  FileText, 
  Plus, 
  SortAsc, 
  SortDesc, 
  Sparkles,
  Clock,
  User,
  ArrowRight,
  ChevronRight,
  Search,
  X,
  Zap,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  Star,
  BookOpen,
  Filter,
  Layers
} from "lucide-react";
import ReportWizard, { ReportConfig } from "@/components/reports/ReportWizard";
import QuickReportBuilder, { QuickReportConfig } from "@/components/reports/QuickReportBuilder";
import TemplateGallery from "../../components/reports/TemplateGallery";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/hooks/use-toast";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { formatLondon } from "@/lib/time";
import { useSearchParams } from "next/navigation";
import { reportLibrary, type ReportLibraryEntry } from "@/lib/reportLibrary";
import type { BreadcrumbConfig } from "@/types/breadcrumb";
import { cn } from "@/lib/utils";

interface RecentReport {
  id: number;
  name: string;
  category: string;
  createdAt: string;
  createdBy: { email: string };
  fields?: string[];
}

// Category configs with icons and colors
const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  "People": { 
    icon: <Users className="w-4 h-4" />, 
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  "Compliance": { 
    icon: <FileText className="w-4 h-4" />, 
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  "Leave": { 
    icon: <Calendar className="w-4 h-4" />, 
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30"
  },
  "Time & Attendance": { 
    icon: <Clock className="w-4 h-4" />, 
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30"
  },
  "Payroll": { 
    icon: <TrendingUp className="w-4 h-4" />, 
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/30"
  },
  "Organisation": { 
    icon: <Building2 className="w-4 h-4" />, 
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30"
  },
  "custom": { 
    icon: <Sparkles className="w-4 h-4" />, 
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30"
  },
};

type WizardType = "quick" | "full" | null;

export default function NewReportBuilderPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeWizard, setActiveWizard] = useState<WizardType>(null);
  const [wizardInitialConfig, setWizardInitialConfig] = useState<Partial<ReportConfig> | undefined>(undefined);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  
  // For backwards compatibility
  const showWizard = activeWizard !== null;
  const setShowWizard = (show: boolean) => setActiveWizard(show ? "quick" : null);

  const breadcrumbs = useBreadcrumbs(
    undefined,
    {
      items: [
        { label: "Reports", href: "/reports" },
        { label: "Report Builder", isCurrentPage: true },
      ],
    } satisfies BreadcrumbConfig,
  );

  const fetchRecentReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const headers: HeadersInit = {};
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }
      const res = await fetch("/api/reports", { cache: "no-store", headers });
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setRecentReports(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch (error) {
      console.error("Failed to fetch recent reports", error);
      toast({
        title: "Unable to load reports",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while loading recent reports.",
        variant: "destructive",
      });
    } finally {
      setLoadingReports(false);
    }
  }, [toast, session?.user?.companyId]);

  useEffect(() => {
    void fetchRecentReports();
  }, [fetchRecentReports]);

  useEffect(() => {
    if (categoryFilter === "all") return;
    const categories = new Set(
      recentReports
        .map((report) => report.category)
        .filter((category): category is string => Boolean(category)),
    );

    if (!categories.has(categoryFilter)) {
      setCategoryFilter("all");
    }
  }, [categoryFilter, recentReports]);

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    recentReports.forEach((report) => {
      if (report.category) {
        unique.add(report.category);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [recentReports]);

  const filteredReports = useMemo(() => {
    let results = [...recentReports];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (report) =>
          report.name.toLowerCase().includes(query) ||
          report.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      results = results.filter((report) => report.category === categoryFilter);
    }

    // Sort
    results.sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? second - first : first - second;
    });

    return results;
  }, [categoryFilter, recentReports, sortOrder, searchQuery]);

  const handleCreateReport = async (config: ReportConfig) => {
    try {
      const requestBody = {
        name: config.name,
        category: config.template?.category || "custom",
        selectedFields: config.selectedFields,
        filterGroup: config.filterGroup,
        sort: config.sorts?.[0],
        sorts: config.sorts,
        templateId: config.template?.id,
      };

      const response = await fetch("/api/reports/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Report saved",
          description: "Your new report has been saved successfully.",
        });

        const reportId = result.id || result.data?.id;
        const params = new URLSearchParams();
        params.set("returnTo", "/reports/builder-new");

        if (reportId) {
          params.set("reportId", String(reportId));
          router.push(`/reports/preview?${params.toString()}`);
        } else {
          params.set("fields", config.selectedFields.join(","));
          router.push(`/reports/preview?${params.toString()}`);
        }

        void fetchRecentReports();
      } else {
        toast({
          title: "Failed to save report",
          description: result.error || result.details || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Error saving report:", error);
      toast({
        title: "Error saving report",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while saving the report.",
        variant: "destructive",
      });
    }
    setShowWizard(false);
  };

  const handleCancelWizard = () => {
    setActiveWizard(null);
    setWizardInitialConfig(undefined);
  };

  const handleQuickReportComplete = async (config: QuickReportConfig) => {
    try {
      const requestBody = {
        name: config.name,
        category: "custom",
        selectedFields: config.selectedFields,
        filterGroup: config.filterGroup,
        sort: config.sorts?.[0],
        sorts: config.sorts,
      };

      const response = await fetch("/api/reports/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Report saved",
          description: "Your new report has been saved successfully.",
        });

        const reportId = result.id || result.data?.id;
        const params = new URLSearchParams();
        params.set("returnTo", "/reports/builder-new");

        if (reportId) {
          params.set("reportId", String(reportId));
          router.push(`/reports/preview?${params.toString()}`);
        } else {
          params.set("fields", config.selectedFields.join(","));
          router.push(`/reports/preview?${params.toString()}`);
        }

        void fetchRecentReports();
      } else {
        toast({
          title: "Failed to save report",
          description: result.error || result.details || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Error saving report:", error);
      toast({
        title: "Error saving report",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while saving the report.",
        variant: "destructive",
      });
    }
    setActiveWizard(null);
  };

  const handleTemplateExecute = useCallback((template: ReportLibraryEntry) => {
    const params = new URLSearchParams();
    
    if (template.engine === "custom" && template.reportType) {
      params.set("reportType", template.reportType);
      params.set("engine", "custom");
      params.set("fields", JSON.stringify(template.defaultFields));
    } else {
      params.set("fields", JSON.stringify(template.defaultFields));
      params.set("engine", "dynamic");
    }
    
    params.set("templateId", template.id);
    params.set("returnTo", "/reports/builder-new");
    router.push(`/reports/preview?${params.toString()}`);
  }, [router]);

  const handleCustomReportStart = useCallback(() => {
    setWizardInitialConfig(undefined);
    setActiveWizard("full");
  }, []);

  const handleQuickReportStart = useCallback(() => {
    setActiveWizard("quick");
  }, []);

  useEffect(() => {
    const templateId = searchParams?.get?.("templateId");
    if (!templateId) return;
    const templateExists = reportLibrary.some((entry) => entry.id === templateId);
    if (templateExists) {
      setShowWizard(true);
    }
  }, [searchParams]);

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

  if (activeWizard === "quick") {
    return (
      <QuickReportBuilder
        onComplete={handleQuickReportComplete}
        onCancel={handleCancelWizard}
      />
    );
  }

  if (activeWizard === "full") {
    return (
      <ReportWizard 
        onComplete={handleCreateReport} 
        onCancel={handleCancelWizard}
        initialConfig={wizardInitialConfig}
      />
    );
  }

  return (
    <PageShell
      title="Report Builder"
      description="Create powerful HR analytics with our intuitive report builder"
      icon={<BarChart3 className="h-6 w-6" />}
      breadcrumbs={breadcrumbs}
      action={
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              variant="outline"
              onClick={() => setActiveWizard("full")} 
              className="h-10 px-4 rounded-xl flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Advanced
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => setActiveWizard("quick")} 
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25 h-10 px-5 rounded-xl flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Quick Report
            </Button>
          </motion.div>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Hero Section - Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Quick Report Builder Card - Primary/Default Option */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveWizard("quick")}
            className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-6 shadow-depth-3 group"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute top-3 right-3">
              <Badge className="bg-white/20 text-white text-[10px] border-0">
                <Zap className="w-3 h-3 mr-1" />
                Quick
              </Badge>
            </div>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Quick Report Builder</h3>
              <p className="text-white/80 text-sm mb-4">2-step wizard with templates. Best for everyday HR reports.</p>
              <div className="flex items-center text-white/90 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Start building
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </motion.div>

          {/* Browse Templates Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/reports/library")}
            className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-6 shadow-depth-3 group"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Template Library</h3>
              <p className="text-white/80 text-sm mb-4">Browse pre-built templates designed for NZ HR compliance and analytics.</p>
              <div className="flex items-center text-white/90 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Explore templates
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </motion.div>

          {/* View Reports Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/reports")}
            className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-6 shadow-depth-3 group"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Saved Reports</h3>
              <p className="text-white/80 text-sm mb-4">Access and manage your previously created reports.</p>
              <div className="flex items-center text-white/90 text-sm font-medium group-hover:translate-x-1 transition-transform">
                View all reports
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Template Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="glass-premium rounded-2xl shadow-premium overflow-visible border-0">
            <CardContent className="p-6 overflow-visible">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Popular Templates</h3>
                  <p className="text-sm text-muted-foreground">Quick-start with pre-configured report templates</p>
                </div>
              </div>
              <TemplateGallery
                onSelectTemplate={handleTemplateExecute}
                onStartCustom={handleCustomReportStart}
                showCustomOptions
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Reports Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="glass-premium rounded-2xl shadow-premium border-0">
            <CardContent className="p-6">
              {/* Section Header */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Recent Reports</h3>
                    <p className="text-sm text-muted-foreground">Your recently created and viewed reports</p>
                  </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-9 w-full rounded-lg glass-subtle border-white/20 text-sm"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted/50 rounded-full"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  
                  {/* Sort Buttons */}
                  <div className="flex items-center rounded-lg glass-subtle border border-white/20 p-0.5">
                    <button
                      onClick={() => setSortOrder("desc")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        sortOrder === "desc" 
                          ? "bg-white dark:bg-card shadow-sm text-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <SortDesc className="h-3.5 w-3.5" />
                      Newest
                    </button>
                    <button
                      onClick={() => setSortOrder("asc")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        sortOrder === "asc" 
                          ? "bg-white dark:bg-card shadow-sm text-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <SortAsc className="h-3.5 w-3.5" />
                      Oldest
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Filters */}
              {categoryOptions.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      categoryFilter === "all"
                        ? "bg-primary text-white shadow-sm"
                        : "glass-subtle hover:bg-white/50 text-muted-foreground"
                    )}
                  >
                    All
                  </button>
                  {categoryOptions.map((category) => {
                    const config = categoryConfig[category] || categoryConfig.custom;
                    return (
                      <button
                        key={category}
                        onClick={() => setCategoryFilter(category)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          categoryFilter === category
                            ? `${config.bgColor} ${config.color} shadow-sm`
                            : "glass-subtle hover:bg-white/50 text-muted-foreground"
                        )}
                      >
                        {config.icon}
                        {category}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Reports Grid */}
              {loadingReports ? (
                <RecentReportsSkeleton />
              ) : recentReports.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No reports yet"
                  description="Create your first report to see it listed here."
                  action={{
                    label: "Create report",
                    onClick: () => setShowWizard(true),
                  }}
                />
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No matching reports</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredReports.map((report) => {
                      const createdBy = report.createdBy?.email || "Unknown";
                      const formattedDate = formatLondon(
                        report.createdAt,
                        "dd MMM yyyy",
                      );
                      const config = categoryConfig[report.category] || categoryConfig.custom;

                      return (
                        <motion.div
                          key={report.id}
                          variants={cardVariants}
                          layout
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => {
                            const params = new URLSearchParams();
                            params.set("reportId", String(report.id));
                            params.set("returnTo", "/reports/builder-new");
                            router.push(`/reports/preview?${params.toString()}`);
                          }}
                          className="group cursor-pointer"
                        >
                          <div className="glass-card rounded-xl p-4 h-full border border-white/30 hover:border-primary/30 hover:shadow-depth-3 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                              <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                config.bgColor
                              )}>
                                <BarChart3 className={cn("w-4 h-4", config.color)} />
                              </div>
                              <Badge 
                                variant="secondary"
                                className={cn(
                                  "text-[10px] font-medium border-0",
                                  config.bgColor,
                                  config.color
                                )}
                              >
                                {report.category}
                              </Badge>
                            </div>
                            
                            <h4 className="font-semibold text-foreground text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {report.name}
                            </h4>
                            
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span className="truncate">{createdBy}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{formattedDate}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-end mt-3 pt-3 border-t border-white/20">
                              <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                Open
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageShell>
  );
}

function RecentReportsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="glass-card rounded-xl p-4 border border-white/20"
        >
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
