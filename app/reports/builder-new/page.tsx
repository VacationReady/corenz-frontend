"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, FileText, Plus, SortAsc, SortDesc } from "lucide-react";
import ReportWizard, { ReportConfig } from "@/components/reports/ReportWizard";
import TemplateGallery from "../../components/reports/TemplateGallery";
import Button from "@/components/ui/button";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { formatLondon } from "@/lib/time";
import { useSearchParams } from "next/navigation";
import { reportLibrary, type ReportLibraryEntry } from "@/lib/reportLibrary";
import type { BreadcrumbConfig } from "@/types/breadcrumb";

interface RecentReport {
  id: number;
  name: string;
  category: string;
  createdAt: string;
  createdBy: { email: string };
  fields?: string[];
}

export default function NewReportBuilderPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardInitialConfig, setWizardInitialConfig] = useState<Partial<ReportConfig> | undefined>(undefined);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const breadcrumbs = useBreadcrumbs(
    undefined,
    {
      items: [
        { label: "Reports", href: "/reports" },
        { label: "New Builder", isCurrentPage: true },
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
      setRecentReports(Array.isArray(data) ? data.slice(0, 5) : []);
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

    if (categoryFilter !== "all") {
      results = results.filter((report) => report.category === categoryFilter);
    }

    results.sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? second - first : first - second;
    });

    return results;
  }, [categoryFilter, recentReports, sortOrder]);

  const handleCreateReport = async (config: ReportConfig) => {
    try {
      const requestBody = {
        name: config.name,
        category: config.template?.category || "custom",
        selectedFields: config.selectedFields,
        filterGroup: config.filterGroup,
        sort: config.sorts?.[0], // Legacy single sort (first sort in array)
        sorts: config.sorts, // New multi-sort array
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
    setShowWizard(false);
    setWizardInitialConfig(undefined);
  };

  /**
   * Execute a template report immediately - navigates directly to preview without saving
   */
  const handleTemplateExecute = useCallback((template: ReportLibraryEntry) => {
    const params = new URLSearchParams();
    
    if (template.engine === "custom" && template.reportType) {
      params.set("reportType", template.reportType);
      params.set("engine", "custom");
      // Custom reports still need fields for column display
      params.set("fields", JSON.stringify(template.defaultFields));
    } else {
      params.set("fields", JSON.stringify(template.defaultFields));
      params.set("engine", "dynamic");
    }
    
    params.set("templateId", template.id);
    params.set("returnTo", "/reports/builder-new");
    router.push(`/reports/preview?${params.toString()}`);
  }, [router]);

  /**
   * Open wizard for custom report building
   */
  const handleCustomReportStart = useCallback(() => {
    setWizardInitialConfig(undefined);
    setShowWizard(true);
  }, []);

  useEffect(() => {
    const templateId = searchParams?.get?.("templateId");
    if (!templateId) return;
    const templateExists = reportLibrary.some((entry) => entry.id === templateId);
    if (templateExists) {
      setShowWizard(true);
    }
  }, [searchParams]);

  if (showWizard) {
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
      title="HR Report Builder"
      description="Create insightful reports from your HR data"
      icon={<BarChart3 className="h-6 w-6" />}
      breadcrumbs={breadcrumbs}
      action={
        <Button onClick={() => setShowWizard(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create report
        </Button>
      }
    >
      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <TemplateGallery
              onSelectTemplate={handleTemplateExecute}
              onStartCustom={handleCustomReportStart}
              showCustomOptions
            />
          </CardContent>
        </Card>

        <Card
          title="Recent reports"
          action={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={sortOrder === "desc" ? "secondary" : "ghost"}
                className="flex items-center gap-1"
                onClick={() => setSortOrder("desc")}
              >
                <SortDesc className="h-4 w-4" />
                Newest
              </Button>
              <Button
                size="sm"
                variant={sortOrder === "asc" ? "secondary" : "ghost"}
                className="flex items-center gap-1"
                onClick={() => setSortOrder("asc")}
              >
                <SortAsc className="h-4 w-4" />
                Oldest
              </Button>
            </div>
          }
        >
          <CardContent className="space-y-6">
            {categoryOptions.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={categoryFilter === "all" ? "secondary" : "ghost"}
                  onClick={() => setCategoryFilter("all")}
                >
                  All categories
                </Button>
                {categoryOptions.map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={categoryFilter === category ? "secondary" : "ghost"}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}

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
              <EmptyState
                icon={FileText}
                title="No reports match the filters"
                description="Try adjusting the category filter or sorting to see more saved reports."
              />
            ) : (
              <ul className="space-y-3">
                {filteredReports.map((report) => {
                  const createdBy = report.createdBy?.email || "Unknown";
                  const formattedDate = formatLondon(
                    report.createdAt,
                    "dd MMM yyyy, HH:mm",
                  );

                  return (
                    <li
                      key={report.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-glass p-4 transition hover:border-primary/40 hover:shadow-glass"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {report.name}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">
                            {report.category}
                          </span>
                          <span>Created by {createdBy}</span>
                          <span>on {formattedDate}</span>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set("reportId", String(report.id));
                          params.set("returnTo", "/reports/builder-new");
                          router.push(`/reports/preview?${params.toString()}`);
                        }}
                      >
                        Open
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function RecentReportsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-glass/70 p-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-9 w-24 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
