"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FilterableDataTable from "@/components/reports/FilterableDataTable";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { hrReportFields } from "@/lib/hrReportFields";
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

function downloadCSV(data: any[], columns: ColumnDefinition[]) {
  if (!data || data.length === 0) return;

  const headers = columns.map((col: any) => col.header);
  const fields = columns.map((col: any) =>
    col.accessorKey ? col.accessorKey : col.header
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
  const { toast } = useToast();

  const [selectedFields, setSelectedFields] = useState<string[]>(() =>
    reportIdParam ? [] : fieldsParam ? fieldsParam.split(",") : []
  );
  const [reportConfig, setReportConfig] = useState<any>(null);

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
    [selectedFields, fieldMetadata]
  );

  const piiFieldLabels = useMemo(
    () => piiFields.map((field) => fieldMetadata[field]?.label ?? field),
    [piiFields, fieldMetadata]
  );

  const hasPIISelected = piiFields.length > 0;

  useEffect(() => {
    if (!hasPIISelected) {
      setPiiAcknowledged(false);
    }
  }, [hasPIISelected]);

  // Load report configuration if reportId is provided
  useEffect(() => {
    if (!reportIdParam) return;
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

        // pagination from report if present
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
    loadReport();
  }, [reportIdParam]);

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

  // Helper to fetch a specific page (used by both initial load and full export)
  const fetchReportPage = useCallback(
    async (pageToFetch: number, limitToFetch: number) => {
      const sortToSend =
        activeSort && activeSort.field
          ? { field: activeSort.field, direction: activeSort.direction || "asc" }
          : defaultSort || undefined;

      const res = await fetch("/api/reports/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedFields,
          filters: Array.isArray(activeFilters) ? activeFilters : [],
          pagination: { page: pageToFetch, limit: limitToFetch },
          sort: sortToSend,
        }),
      });
      const json = await res.json();
      const results = Array.isArray(json.data) ? json.data : [];
      const totalCount = typeof json.total === "number" ? json.total : results.length;
      return { results, totalCount };
    },
    [selectedFields, activeFilters, activeSort, defaultSort]
  );

  // Load report data when fields are available
  useEffect(() => {
    if (selectedFields.length === 0) return;
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
  }, [selectedFields, page, pageSize, reportIdParam, reportConfig, fetchReportPage]);

  const rewriteFieldsForLeaveContext = useCallback((fields: string[]) => {
    const hasLeave = fields.some((f) => f.startsWith("LeaveRequest."));
    if (!hasLeave) return fields;
    return fields.map((f) => {
      if (f === "User.firstName") return "LeaveRequest.Employee.User.firstName";
      if (f === "User.lastName") return "LeaveRequest.Employee.User.lastName";
      if (
        f === "User.Department_User_departmentIdToDepartment.name" ||
        f === "User.department.name"
      )
        return "LeaveRequest.Employee.Department.name";
      if (f === "EventCategory.name") return "LeaveRequest.EventCategory.name";
      if (f.startsWith("LeaveEntitlement."))
        return f.replace(
          "LeaveEntitlement.",
          "LeaveRequest.Employee.LeaveEntitlement."
        );
      return f;
    });
  }, []);

  const effectiveSelectedFields = useMemo(
    () => rewriteFieldsForLeaveContext(selectedFields),
    [selectedFields, rewriteFieldsForLeaveContext]
  );

  const translateLegacy = useCallback((f: string) => {
    const map: Record<string, string> = {
      "User.department.name": "User.Department_User_departmentIdToDepartment.name",
      "User.Department.name": "User.Department_User_departmentIdToDepartment.name",
      "User.jobRole.name": "User.JobRole.name",
    };
    return map[f] || f;
  }, []);

  const columns = useMemo<ColumnDefinition[]>(() => {
    return effectiveSelectedFields.map((field) => {
      const keys = field.split(".");
      let accessorKey: string;
      let headerFallback: string;
      if (keys.length >= 3) {
        accessorKey = `${keys.slice(1).join(".")}`; // support nested
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
    [hasPIISelected, piiFieldLabels, piiFields, toast]
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
      alert("Failed to export full report. Please try again.");
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
      alert("Report saved!");
      router.push("/reports");
    } catch (err) {
      console.error(err);
      alert("Error saving report.");
    }
  };

  if (loadingReport) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">Loading report configuration...</p>
      </main>
    );
  }

  if (!selectedFields.length && !loadingReport) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">
          No fields selected. Please go back and select fields for your report.
        </p>
        <Button className="mt-4" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">Loading report data...</p>
      </main>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">No data found for the selected fields.</p>
        <Button className="mt-4" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </main>
    );
  }

  return (
    <>
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Report Preview</h1>
        <p className="mb-4">
          Your custom report is displayed below. You can sort and filter as
          needed.
        </p>
        <div className="flex gap-2 mb-4">
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
      </main>
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
