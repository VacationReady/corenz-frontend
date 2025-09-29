"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FilterableDataTable from "@/components/reports/FilterableDataTable";
import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FullScreenHeader } from "@/components/ui/FullScreenHeader";
import { useToast } from "@/hooks/use-toast";
import { hrReportFields } from "@/lib/hrReportFields";
import { reportLibrary, type ReportLibraryEntry } from "@/lib/reportLibrary";
import { useTenantRegion } from "@/hooks/useTenantRegion";
import { ArrowLeft, X } from "lucide-react";
import Papa from "papaparse";

type ColumnDefinition = { header: string; accessorKey: string };
type FieldMetadata = { label: string; isPII?: boolean };

function getNested(obj: any, path: string): any {
  return path.split(".").reduce((acc: any, key: string) => {
    if (acc === undefined || acc === null) return undefined;
    if (Array.isArray(acc)) acc = acc[0];
    return acc ? acc[key] : undefined;
  }, obj);
}

function parseFieldsParam(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((field) => (typeof field === "string" ? field.trim() : ""))
        .filter((field) => field.length > 0);
    }
  } catch {
    // Fall back to comma separated values.
  }

  return value
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field.length > 0);
}

function downloadCSV(data: any[], columns: ColumnDefinition[]) {
  if (!data || data.length === 0) return;

  const headers = columns.map((col: any) => col.header);
  const fields = columns.map((col: any) =>
    col.accessorKey ? col.accessorKey : col.header,
  );

  const csvData = data.map((row) => {
    const obj: Record<string, any> = {};
    fields.forEach((field, idx) => {
      obj[headers[idx]] = getNested(row, field) ?? "";
    });
    return obj;
  });

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `peoplecore-report-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ReportsPreviewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fieldsParam = searchParams?.get("fields");
  const reportIdParam = searchParams?.get("reportId");
  const templateIdParam = searchParams?.get("templateId") ?? undefined;
  const engineParam = searchParams?.get("engine") ?? "dynamic";
  const reportTypeParam = searchParams?.get("reportType") ?? undefined;
  const { toast } = useToast();
  const { template, regionName } = useTenantRegion();

  const initialFields = useMemo(() => parseFieldsParam(fieldsParam), [fieldsParam]);

  const [selectedFields, setSelectedFields] = useState<string[]>(() => {
    if (reportIdParam) return [];
    if (templateIdParam && engineParam === "dynamic") {
      const template = reportLibrary.find((entry) => entry.id === templateIdParam);
      if (template) {
        return template.defaultFields;
      }
    }
    return initialFields;
  });
  useEffect(() => {
    if (reportIdParam) return;

    if (templateIdParam && engineParam === "dynamic") {
      const template = reportLibrary.find((entry) => entry.id === templateIdParam);
      if (template) {
        setLibraryTemplate(template);
        setSelectedFields(template.defaultFields);
        setActiveFilters(
          template.suggestedFilters?.map((filter, index) => ({
            id: `filter_${index}`,
            field: filter.field,
            operator: filter.operator,
            value: filter.value,
            value2: filter.value2,
          })) || [],
        );
        if (template.defaultSort) {
          setActiveSort(template.defaultSort);
        }
        return;
      }
    }

    setSelectedFields((current) => {
      if (
        current.length === initialFields.length &&
        current.every((field, index) => field === initialFields[index])
      ) {
        return current;
      }
      return initialFields;
    });
  }, [initialFields, reportIdParam, templateIdParam, engineParam]);
  const [reportConfig, setReportConfig] = useState<any>(null);
  const [, setLibraryTemplate] = useState<ReportLibraryEntry | null>(null);

  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // PII-aware field metadata (label + isPII)
  const [fieldMetadata, setFieldMetadata] = useState<
    Record<string, FieldMetadata>
  >(() => {
    const initial: Record<string, FieldMetadata> = {};
    hrReportFields.forEach((field) => {
      if (field?.field && field?.label) {
        initial[field.field] = { label: field.label, isPII: field.isPII };
      }
    });
    return initial;
  });
  const [showPIIModal, setShowPIIModal] = useState(false);
  const [piiAcknowledged, setPiiAcknowledged] = useState(false);

  // Client-side filters/sort config from saved reports
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [activeSort, setActiveSort] = useState<{
    field: string;
    direction?: "asc" | "desc";
  } | null>(null);

  // Server pagination + totals + full export
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState<number>(0);
  const [exportingFull, setExportingFull] = useState(false);

  const returnToParam = searchParams?.get("returnTo") || "";
  const safeReturnTo = useMemo(() => {
    if (!returnToParam) return null;
    if (returnToParam.startsWith("/")) {
      return returnToParam;
    }
    return null;
  }, [returnToParam]);

  const exitLabel = useMemo(() => {
    if (!safeReturnTo) return "Close preview";
    if (safeReturnTo.includes("builder")) return "Back to builder";
    if (safeReturnTo.includes("create")) return "Back to report setup";
    if (safeReturnTo === "/reports") return "Back to reports";
    return "Back";
  }, [safeReturnTo]);

  const handleExit = useCallback(() => {
    if (typeof window !== "undefined") {
      const closeEvent = new CustomEvent("reports-preview:close", {
        cancelable: true,
      });
      if (!window.dispatchEvent(closeEvent)) {
        return;
      }
      if (safeReturnTo) {
        router.push(safeReturnTo);
        return;
      }
      if (window.history.length > 1) {
        router.back();
        return;
      }
      router.push("/reports");
      return;
    }

    if (safeReturnTo) {
      router.push(safeReturnTo);
      return;
    }

    router.push("/reports");
  }, [router, safeReturnTo]);

  const defaultSort = useMemo(() => {
    if (!selectedFields.length) return null;
    return { field: selectedFields[0], direction: "asc" as const };
  }, [selectedFields]);

  // Build field metadata map from server (includes dynamic Forms)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/reports/fields", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const list = await res.json();
        if (Array.isArray(list)) {
          setFieldMetadata((prev) => {
            const next: Record<string, FieldMetadata> = { ...prev };
            list.forEach((f: any) => {
              if (f?.field && f?.label) {
                const previous = next[f.field];
                const isPII = f?.isPII ?? previous?.isPII ?? false;
                next[f.field] = { label: f.label, isPII };
              }
            });
            return next;
          });
        }
      } catch {
        // Ignore label loading errors – fallback metadata already seeded from hrReportFields
      }
    };
    load();
  }, []);

  const fieldLabels = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(fieldMetadata).forEach(([field, meta]) => {
      map[field] = meta.label;
    });
    return map;
  }, [fieldMetadata]);

  const piiFields = useMemo(
    () => selectedFields.filter((field) => fieldMetadata[field]?.isPII),
    [selectedFields, fieldMetadata],
  );

  const piiFieldLabels = useMemo(
    () => piiFields.map((field) => fieldMetadata[field]?.label ?? field),
    [piiFields, fieldMetadata],
  );

  const hasPIISelected = piiFields.length > 0;

  useEffect(() => {
    if (!hasPIISelected) {
      setPiiAcknowledged(false);
    }
  }, [hasPIISelected]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !showPIIModal) {
        event.preventDefault();
        handleExit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleExit, showPIIModal]);

  // Load report configuration if reportId is provided
  useEffect(() => {
    if (reportIdParam) {
      const loadReport = async () => {
        setLoadingReport(true);
        try {
          const res = await fetch(`/api/reports/${reportIdParam}`);
          if (!res.ok) throw new Error(`Failed to load report: ${res.status}`);
          const report = await res.json();
          setReportConfig(report);

          const savedFilters = Array.isArray(report?.filters)
            ? report.filters
            : report?.filters
            ? [report.filters]
            : [];
          setActiveFilters(savedFilters);

          const savedPagination =
            report?.pagination && typeof report.pagination === "object"
              ? { ...{ page: 1, limit: 50 }, ...report.pagination }
              : { page: 1, limit: 50 };
          setPage(savedPagination.page ?? 1);
          setPageSize(savedPagination.limit ?? 50);

          const savedSort =
            report?.sort && typeof report.sort === "object" && report.sort.field
              ? {
                  field: report.sort.field,
                  direction: (report.sort.direction || "asc") as "asc" | "desc",
                }
              : null;
          setActiveSort(savedSort);

          setSelectedFields(report.fields || []);
        } catch (error) {
          console.error("❌ Error loading report:", error);
        } finally {
          setLoadingReport(false);
        }
      };
      void loadReport();
      return;
    }

    if (templateIdParam && engineParam === "custom" && reportTypeParam) {
      const template = reportLibrary.find((entry) => entry.id === templateIdParam);
      if (template) {
        setLibraryTemplate(template);
        setSelectedFields(template.defaultFields);
        setActiveFilters(
          template.suggestedFilters?.map((filter, index) => ({
            id: `filter_${index}`,
            field: filter.field,
            operator: filter.operator,
            value: filter.value,
            value2: filter.value2,
          })) || [],
        );
        if (template.defaultSort) {
          setActiveSort(template.defaultSort);
        }
        setLoadingReport(false);
      }
    }
  }, [reportIdParam, templateIdParam, engineParam, reportTypeParam]);

  // ensure sort remains valid when fields change
  useEffect(() => {
    if (!selectedFields.length) return;
    setActiveSort((prev) => {
      if (prev?.field && selectedFields.includes(prev.field)) {
        return prev;
      }
      return defaultSort;
    });
  }, [defaultSort, selectedFields]);

  // reset to page 1 when selected fields change
  useEffect(() => {
    setPage((prev) => (prev === 1 ? prev : 1));
  }, [selectedFields.join(",")]);

  // --- Field rewrite for Leave context (merged functionality) ---
  const rewriteFieldsForLeaveContext = useCallback((fields: string[]) => {
    const hasLeave = fields.some((f) => f.startsWith("LeaveRequest."));
    const result: string[] = [];
    for (const f of fields) {
      if (f === "User.JobRole.name" || f === "Employee.JobRole.name") {
        if (!result.includes("_computed.jobRoleName"))
          result.push("_computed.jobRoleName");
        continue;
      }
      if (hasLeave) {
        if (f.startsWith("User.")) {
          result.push(f.replace("User.", "LeaveRequest.Employee.User."));
          continue;
        }
        if (f.startsWith("Employee.")) {
          result.push(f.replace("Employee.", "LeaveRequest.Employee."));
          continue;
        }
        if (f.startsWith("Department.")) {
          result.push(
            f.replace("Department.", "LeaveRequest.Employee.Department."),
          );
          continue;
        }
        if (f.startsWith("JobRole.")) {
          result.push(f.replace("JobRole.", "LeaveRequest.Employee.JobRole."));
          continue;
        }
        if (
          f === "User.department.name" ||
          f === "User.Department_User_departmentIdToDepartment.name"
        ) {
          result.push("LeaveRequest.Employee.Department.name");
          continue;
        }
        if (f.startsWith("EventCategory.")) {
          result.push(
            f.replace("EventCategory.", "LeaveRequest.EventCategory."),
          );
          continue;
        }
        if (f === "LeaveEntitlement.usedDays") {
          result.push("_computed.durationDays");
          continue;
        }
        if (f.startsWith("LeaveEntitlement.")) {
          result.push(
            f.replace(
              "LeaveEntitlement.",
              "LeaveRequest.Employee.LeaveEntitlement.",
            ),
          );
          continue;
        }
      }
      result.push(f);
    }
    return result;
  }, []);

  const effectiveSelectedFields = useMemo(
    () => rewriteFieldsForLeaveContext(selectedFields),
    [selectedFields, rewriteFieldsForLeaveContext],
  );

  // Helper to fetch a specific page (used by both initial load and full export)
  const fetchReportPage = useCallback(
    async (pageToFetch: number, limitToFetch: number) => {
      if (engineParam === "custom" && reportTypeParam) {
        const res = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportType: reportTypeParam,
            filters: Object.fromEntries(
              (Array.isArray(activeFilters) ? activeFilters : []).map((filter: any) => [
                filter.field,
                filter.operator === "between" || filter.operator === "date_between"
                  ? { value: filter.value, value2: filter.value2 }
                  : filter.value,
              ]),
            ),
            pagination: { page: pageToFetch, limit: limitToFetch, sortBy: activeSort?.field, sortOrder: activeSort?.direction },
          }),
        });
        const json = await res.json();
        const results = Array.isArray(json.data) ? json.data : [];
        return { results, totalCount: results.length };
      }

      const sortToSend =
        activeSort && activeSort.field
          ? { field: activeSort.field, direction: activeSort.direction || "asc" }
          : defaultSort || undefined;

      const res = await fetch("/api/reports/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedFields: effectiveSelectedFields,
          filters: Array.isArray(activeFilters) ? activeFilters : [],
          pagination: { page: pageToFetch, limit: limitToFetch },
          sort: sortToSend,
        }),
      });
      const json = await res.json();
      const results = Array.isArray(json.data) ? json.data : [];
      const totalCount =
        typeof json.total === "number" ? json.total : results.length;
      return { results, totalCount };
    },
    [
      effectiveSelectedFields,
      activeFilters,
      activeSort,
      defaultSort,
      engineParam,
      reportTypeParam,
    ],
  );

  // Load report data when fields are available
  useEffect(() => {
    if (effectiveSelectedFields.length === 0) return;
    if (reportIdParam && !reportConfig) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { results, totalCount } = await fetchReportPage(page, pageSize);
        if (cancelled) return;
        setData([...results]);
        setFilteredData([...results]);
        setTotal(totalCount);
      } catch (error) {
        console.error("❌ Error fetching report data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    effectiveSelectedFields,
    page,
    pageSize,
    reportIdParam,
    reportConfig,
    fetchReportPage,
  ]);

  const translateLegacy = useCallback((f: string) => {
    const map: Record<string, string> = {
      "User.department.name":
        "User.Department_User_departmentIdToDepartment.name",
      "User.Department.name":
        "User.Department_User_departmentIdToDepartment.name",
      "User.jobRole.name": "User.JobRole.name",
    };
    return map[f] || f;
  }, []);

  const columns = useMemo<ColumnDefinition[]>(() => {
    return effectiveSelectedFields.map((field) => {
      const keys = field.split(".");
      let accessorKey: string;
      let headerFallback: string;

      if (field === "_computed.jobRoleName") {
        return { header: "Job Role", accessorKey: "_computed.jobRoleName" };
      }

      if (keys.length >= 3) {
        accessorKey = `${keys.slice(1).join(".")}`;
        headerFallback = keys[keys.length - 1];
      } else if (keys.length === 2) {
        accessorKey = keys[1];
        headerFallback = keys[1];
      } else {
        accessorKey = keys[keys.length - 1];
        headerFallback = keys[keys.length - 1];
      }

      const translated = translateLegacy(field);
      const label =
        fieldLabels[field] ||
        fieldLabels[translated] ||
        headerFallback.charAt(0).toUpperCase() + headerFallback.slice(1);

      return { header: label, accessorKey };
    });
  }, [effectiveSelectedFields, fieldLabels, translateLegacy]);

  const logAndToastPII = useCallback(
    (rowCount: number) => {
      if (!hasPIISelected) return;
      const acknowledgedFields = piiFieldLabels.join(", ") || "PII data";
      toast({
        title: "PII export acknowledged",
        description: `Exporting sensitive fields: ${acknowledgedFields}. Please handle securely.`,
      });
      console.info("[PII_EXPORT_ACK]", {
        at: new Date().toISOString(),
        fields: piiFields,
        rows: rowCount,
      });
    },
    [hasPIISelected, piiFieldLabels, piiFields, toast],
  );

  const performDownload = useCallback(() => {
    if (!columns.length) return;
    downloadCSV(filteredData, columns);
    logAndToastPII(filteredData.length);
  }, [columns, filteredData, logAndToastPII]);

  const handleDownloadClick = () => {
    if (hasPIISelected && !piiAcknowledged) {
      setShowPIIModal(true);
      return;
    }
    performDownload();
  };

  const handleConfirmPIIExport = () => {
    setShowPIIModal(false);
    setPiiAcknowledged(true);
    performDownload();
  };

  const handleCancelPIIExport = () => {
    setShowPIIModal(false);
  };

  const handleFullExport = async () => {
    if (hasPIISelected && !piiAcknowledged) {
      setShowPIIModal(true);
      return;
    }
    if (exportingFull) return;
    setExportingFull(true);
    try {
      const combined: any[] = [];
      const pagesToFetch = Math.max(1, Math.ceil(total / pageSize));
      for (let currentPage = 1; currentPage <= pagesToFetch; currentPage++) {
        const { results } = await fetchReportPage(currentPage, pageSize);
        combined.push(...results);
      }
      downloadCSV(combined, columns);
      logAndToastPII(combined.length);
    } catch (error) {
      console.error("❌ Error exporting full report:", error);
      toast({
        title: "Export failed",
        description: "We couldn't export the full report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportingFull(false);
    }
  };

  const handleSaveReport = async () => {
    const reportName = prompt("Enter a name for this report:");
    if (!reportName) return;
    try {
      const res = await fetch("/api/reports/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportName,
          fields: selectedFields,
          category: "General",
        }),
      });
      if (!res.ok) throw new Error("Failed to save report");
      toast({
        title: "Report saved",
        description: "Your report has been saved successfully.",
      });
      router.push("/reports");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error saving report",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong while saving your report.",
        variant: "destructive",
      });
    }
  };

  const header = (
    <FullScreenHeader
      backSlot={
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
          aria-label={exitLabel}
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          <span>{exitLabel}</span>
        </button>
      }
      title={
        <h1 className="text-base font-semibold text-foreground sm:text-lg">
          Report preview
        </h1>
      }
      helpSlot={
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-2"
          aria-label="Close preview"
        >
          <X aria-hidden className="h-4 w-4" />
          <span className="hidden text-sm font-medium sm:inline">Close</span>
        </button>
      }
    >
      <p className="text-sm text-muted-foreground">
        Review your selected fields, apply filters, and export data without
        leaving the builder.
      </p>
    </FullScreenHeader>
  );

  const renderShell = (body: ReactNode) => (
    <div className="min-h-screen bg-muted/10">
      {header}
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">{body}</main>
    </div>
  );

  if (loadingReport) {
    return renderShell(
      <EmptyState
        tone="brand"
        title="Loading report configuration"
        description="We’re fetching your saved filters and columns."
        className="max-w-xl mx-auto mt-20"
      />,
    );
  }

  if (!selectedFields.length && !loadingReport) {
    const templateLabel =
      template === "NZ"
        ? "NZ Payroll Summary"
        : template === "AU"
        ? "AU Award Compliance"
        : template === "UK"
        ? "UK Payroll Starter"
        : "People Analytics Starter";

    return renderShell(
      <EmptyState
        tone="brand"
        title="Choose at least one column"
        description="No fields are selected yet, so there’s nothing to preview."
        className="max-w-xl mx-auto mt-20"
        guidance={[
          `Load the ${templateLabel} template in the builder for a quick start.`,
          "Include first and last name so your export stays easy to read.",
        ]}
        action={{
          label: "Go back",
          variant: "outline",
          onClick: handleExit,
        }}
      />,
    );
  }

  if (loading) {
    return renderShell(
      <EmptyState
        tone="brand"
        title="Building your preview"
        description="We’re running the report with your selected filters."
        className="max-w-xl mx-auto mt-20"
      />,
    );
  }

  if (!loading && data.length === 0) {
    return renderShell(
      <EmptyState
        tone="warning"
        title="No matching rows"
        description="We didn’t find any records that meet your criteria."
        className="max-w-xl mx-auto mt-20"
        guidance={[
          template === "NZ"
            ? "Check the pay period dates against the NZ payroll template you used."
            : template === "AU"
            ? "Verify the award and allowance filters match your AU template."
            : template === "UK"
            ? "Confirm the pay run selection matches your UK payroll starter template."
            : "Review your filters or try widening the date range.",
          regionName
            ? `If you’re filtering by location, make sure it includes all ${regionName} sites.`
            : "If you’re filtering by location, make sure it includes every site you need.",
        ]}
        action={{
          label: "Adjust filters",
          variant: "outline",
          onClick: handleExit,
        }}
      />,
    );
  }

  const body = (
    <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
      <div className="mb-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          Your custom report is displayed below. Sort, filter, and export as
          needed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadClick}>
            Download CSV ({filteredData.length} rows)
          </Button>
          {total > data.length ? (
            <Button disabled={exportingFull} onClick={handleFullExport}>
              {exportingFull
                ? "Exporting full report..."
                : `Download Full CSV (${total} rows)`}
            </Button>
          ) : null}
          <Button onClick={handleSaveReport}>Save Report</Button>
        </div>
      </div>
      <div className="min-h-[200px]">
        <FilterableDataTable
          columns={columns}
          data={data}
          total={total}
          page={page}
          pageSize={pageSize}
          onFilteredDataChange={setFilteredData}
          onPageChange={setPage}
          onPageSizeChange={(size: number) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      {renderShell(body)}
      <Dialog open={showPIIModal} onOpenChange={setShowPIIModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm export of personal data</DialogTitle>
            <DialogDescription>
              You&apos;re about to download a report that contains personal or
              sensitive information. Please confirm you are authorized to export
              this data and will handle it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {piiFieldLabels.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">
                  This export includes the following fields flagged as
                  personally identifiable information:
                </p>
                <ul className="list-disc list-inside text-sm text-foreground mt-2 space-y-1">
                  {piiFieldLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              By continuing you acknowledge the privacy obligations associated
              with this export and agree to follow company policy for
              safeguarding sensitive data.
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancelPIIExport}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmPIIExport}>
              Confirm &amp; Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
