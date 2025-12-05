"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import FilterableDataTable from "@/components/reports/FilterableDataTable";
import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
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
import { deserializeFilterGroup, flattenFilterRules } from "@/lib/reportFilters";
import { ReportErrorBoundary } from "@/components/reports/ReportErrorBoundary";
import { resilientPost, ResilientFetchError, createAbortController } from "@/lib/resilientFetch";
import { 
  ArrowLeft, 
  X, 
  Mail, 
  History, 
  Download, 
  FileText, 
  Save, 
  RefreshCw, 
  Table, 
  BarChart3,
  FileDown,
  Shield,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  FileSpreadsheet,
  Send,
  Clock,
  Wifi
} from "lucide-react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import Papa from "papaparse";
import { exportTableToPdf } from "@/lib/pdfExport";
import { SendReportModal } from "@/components/reports/SendReportModal";
import { SendHistoryModal } from "@/components/reports/SendHistoryModal";
import { ReportPreviewSkeleton, ReportTableSkeleton, ProgressOverlay } from "@/components/reports/ReportSkeleton";
import { cn } from "@/lib/utils";

type ColumnDefinition = { header: string; accessorKey: string };
type FieldMetadata = { label: string; isPII?: boolean };

function getNested(obj: any, path: string): any {
  return path.split(".").reduce((acc: any, key: string) => {
    if (acc === undefined || acc === null) return undefined;
    if (Array.isArray(acc)) acc = acc[0];
    return acc ? acc[key] : undefined;
  }, obj);
}

function appendUnique(list: string[], value: string | undefined) {
  if (!value) return;
  if (!list.includes(value)) list.push(value);
}

const COLUMN_FALLBACKS: Record<string, string[]> = {
  "Employee.User.firstName": ["Employee.User.firstName", "firstName", "User.firstName"],
  "Employee.User.lastName": ["Employee.User.lastName", "lastName", "User.lastName"],
  "Employee.User.email": ["Employee.User.email", "email", "User.email"],
  "Employee.User.phone": ["Employee.User.phone", "phone", "User.phone"],
  "Employee.Department.name": [
    "Employee.Department.name",
    "Department.name",
    "User.Department_User_departmentIdToDepartment.name",
    "User.Employee.Department.name",
    "department",
  ],
  "User.Department_User_departmentIdToDepartment.name": [
    "User.Employee.Department.name",
    "Employee.Department.name",
    "department",
  ],
  "Employee.JobRole.name": ["Employee.JobRole.name", "JobRole.name", "_computed.jobRoleName", "jobRole", "User.JobRole.name"],
  "Employee.startDate": ["Employee.startDate", "User.Employee.startDate", "_computed.effectiveStartDate"],
  "User.Employee.startDate": ["Employee.startDate", "_computed.effectiveStartDate"],
  "Employee.WorkingPattern.name": [
    "Employee.WorkingPattern.name",
    "WorkingPattern.name",
    "LeaveRequest.Employee.WorkingPattern.name",
    "_computed.workingPatternName",
  ],
  "WorkingPattern.name": ["Employee.WorkingPattern.name", "_computed.workingPatternName"],
  "_computed.remainingEntitlement": ["_computed.remainingEntitlement", "remainingEntitlement"],
  "LeaveEntitlement.EventCategory.name": ["EventCategory.name", "LeaveEntitlement.EventCategory.name"],
  "LeaveEntitlement.totalDays": ["LeaveEntitlement.totalDays", "totalDays"],
  "LeaveEntitlement.usedDays": ["LeaveEntitlement.usedDays", "usedDays"],
  "LeaveEntitlement.carryoverDays": ["LeaveEntitlement.carryoverDays", "carryoverDays"],
  // TrainingRecord field mappings
  "TrainingRecord.Course.name": ["TrainingRecord.Course.name", "Course.name", "courseName"],
  "Course.name": ["TrainingRecord.Course.name", "Course.name", "courseName"],
  "TrainingRecord.TrainingProvider.name": ["TrainingRecord.TrainingProvider.name", "TrainingProvider.name", "providerName"],
  "TrainingProvider.name": ["TrainingRecord.TrainingProvider.name", "TrainingProvider.name", "providerName"],
  "TrainingRecord.Employee.User.firstName": ["TrainingRecord.Employee.User.firstName", "Employee.User.firstName", "firstName", "User.firstName"],
  "TrainingRecord.Employee.User.lastName": ["TrainingRecord.Employee.User.lastName", "Employee.User.lastName", "lastName", "User.lastName"],
};

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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleDateString();
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

function ReportsPreviewClientInner() {
  const { data: session } = useSession();
  const REQUIRED_FIELDS_USER = ["User.firstName", "User.lastName"];
  const searchParams = useSearchParams();
  const router = useRouter();
  const fieldsParam = searchParams?.get("fields");
  const reportIdParam = searchParams?.get("reportId");
  const templateIdParam = searchParams?.get("templateId") ?? undefined;
  const engineParam = searchParams?.get("engine") ?? "dynamic";
  const reportTypeParam = searchParams?.get("reportType") ?? undefined;
  const { toast } = useToast();
  const { template, regionName } = useTenantRegion();

  const initialFields = useMemo(() => {
    const parsed = parseFieldsParam(fieldsParam);
    if (engineParam === "custom") {
      return parsed;
    }
    const hasTimesheetFields = parsed.some((field: string) => field.startsWith("Timesheet."));
    const requiredFields = hasTimesheetFields ? [] : REQUIRED_FIELDS_USER;
    const withRequired = Array.from(new Set([...requiredFields, ...parsed]));
    return withRequired;
  }, [fieldsParam, engineParam]);

  const [selectedFields, setSelectedFields] = useState<string[]>(() => {
    if (reportIdParam) return [];
    if (templateIdParam) {
      const template = reportLibrary.find((entry) => entry.id === templateIdParam);
      if (template) {
        if (template.engine === "custom") {
          return [...template.defaultFields];
        }
        const hasTimesheetFields = template.defaultFields.some((field: string) => field.startsWith("Timesheet."));
        const requiredFields = hasTimesheetFields ? [] : REQUIRED_FIELDS_USER;
        return Array.from(new Set([...requiredFields, ...template.defaultFields]));
      }
    }
    return initialFields;
  });
  
  useEffect(() => {
    if (reportIdParam) return;

    if (templateIdParam) {
      const template = reportLibrary.find((entry) => entry.id === templateIdParam);
      if (template) {
        setLibraryTemplate(template);
        
        if (template.engine === "custom") {
          setSelectedFields([...template.defaultFields]);
        } else {
          const hasTimesheetFields = template.defaultFields.some((field: string) => field.startsWith("Timesheet."));
          const requiredFields = hasTimesheetFields ? [] : REQUIRED_FIELDS_USER;
          setSelectedFields(Array.from(new Set([...requiredFields, ...template.defaultFields])));
        }
        
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
      if (engineParam === "custom") {
        return initialFields.length > 0 ? initialFields : current;
      }
      
      const hasTimesheetFields = current.some((field: string) => field.startsWith("Timesheet."));
      const requiredFields = hasTimesheetFields ? [] : REQUIRED_FIELDS_USER;
      const ensured = Array.from(new Set([...requiredFields, ...current]));
      const next = Array.from(new Set([...requiredFields, ...initialFields]));
      if (
        ensured.length === next.length &&
        ensured.every((field, index) => field === next[index])
      ) {
        return ensured;
      }
      return next;
    });
  }, [initialFields, reportIdParam, templateIdParam, engineParam]);
  
  const [reportConfig, setReportConfig] = useState<any>(null);
  const [, setLibraryTemplate] = useState<ReportLibraryEntry | null>(null);

  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

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
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);

  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [activeSort, setActiveSort] = useState<{
    field: string;
    direction?: "asc" | "desc";
  } | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState<number>(0);
  const [exportingFull, setExportingFull] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);

  const effectiveReportId = useMemo(() => {
    if (reportIdParam) return reportIdParam;
    if (templateIdParam) return `template_${templateIdParam}`;
    if (selectedFields.length > 0) {
      const sorted = [...selectedFields].sort().join(",");
      let hash = 0;
      for (let i = 0; i < sorted.length; i++) {
        const char = sorted.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `fields_${Math.abs(hash).toString(36)}`;
    }
    return "preview";
  }, [reportIdParam, templateIdParam, selectedFields]);

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

  // Track if this is an unsaved report (no reportId means user came from builder without saving)
  const isUnsavedReport = !reportIdParam;

  const performExit = useCallback(() => {
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

  const handleExit = useCallback(() => {
    // If this is an unsaved report with data, warn user before exiting
    if (isUnsavedReport && data.length > 0) {
      setPendingExit(() => performExit);
      setShowUnsavedWarning(true);
      return;
    }
    performExit();
  }, [isUnsavedReport, data.length, performExit]);

  const handleConfirmExit = useCallback(() => {
    setShowUnsavedWarning(false);
    if (pendingExit) {
      pendingExit();
      setPendingExit(null);
    }
  }, [pendingExit]);

  const handleCancelExit = useCallback(() => {
    setShowUnsavedWarning(false);
    setPendingExit(null);
  }, []);

  const defaultSort = useMemo(() => {
    if (!selectedFields.length) return null;
    return { field: selectedFields[0], direction: "asc" as const };
  }, [selectedFields]);

  useEffect(() => {
    const load = async () => {
      try {
        const headers: HeadersInit = {};
        if (session?.user?.companyId) {
          headers["x-company-id"] = session.user.companyId;
        }
        const res = await fetch("/api/reports/fields", { cache: "no-store", headers });
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
        // Ignore label loading errors
      }
    };
    load();
  }, [session?.user?.companyId]);

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

  useEffect(() => {
    if (reportIdParam) {
      const loadReport = async () => {
        setLoadingReport(true);
        try {
          const headers: HeadersInit = {};
          if (session?.user?.companyId) {
            headers["x-company-id"] = session.user.companyId;
          }
          const res = await fetch(`/api/reports/${reportIdParam}`, { headers });
          if (!res.ok) throw new Error(`Failed to load report: ${res.status}`);
          const report = await res.json();
          setReportConfig(report);

          // Handle both legacy flat filter arrays and new FilterGroup structure
          let savedFilters: any[] = [];
          if (report?.filters) {
            // Check if it's a FilterGroup structure (has type: "group")
            if (report.filters.type === "group") {
              // Deserialize and flatten the FilterGroup to get filter rules
              const filterGroup = deserializeFilterGroup(report.filters);
              savedFilters = flattenFilterRules(filterGroup);
            } else if (Array.isArray(report.filters)) {
              // Legacy flat array of filters
              savedFilters = report.filters;
            } else {
              // Single filter object - wrap in array
              savedFilters = [report.filters];
            }
          }
          setActiveFilters(savedFilters);

          const savedPagination =
            report?.pagination && typeof report.pagination === "object"
              ? { ...{ page: 1, limit: 50 }, ...report.pagination }
              : { page: 1, limit: 50 };
          setPage(savedPagination.page ?? 1);
          setPageSize(savedPagination.limit ?? 50);

          const savedSort = 
            (Array.isArray(report?.sorts) && report.sorts.length > 0 && report.sorts[0]?.field)
              ? {
                  field: report.sorts[0].field,
                  direction: (report.sorts[0].direction || "asc") as "asc" | "desc",
                }
              : (report?.sort && typeof report.sort === "object" && report.sort.field)
              ? {
                  field: report.sort.field,
                  direction: (report.sort.direction || "asc") as "asc" | "desc",
                }
              : null;
          setActiveSort(savedSort);

          const saved = Array.isArray(report.fields) ? report.fields : [];
          const hasTimesheetFields = saved.some((field: string) => field.startsWith("Timesheet."));
          const requiredFields = hasTimesheetFields ? [] : REQUIRED_FIELDS_USER;
          setSelectedFields(Array.from(new Set([...requiredFields, ...saved])));
        } catch (error) {
          console.error("❌ Error loading report:", error);
        } finally {
          setLoadingReport(false);
        }
      };
      void loadReport();
      return;
    }
  }, [reportIdParam, session?.user?.companyId]);

  useEffect(() => {
    if (!selectedFields.length) return;
    setActiveSort((prev) => {
      if (prev?.field && selectedFields.includes(prev.field)) {
        return prev;
      }
      return defaultSort;
    });
  }, [defaultSort, selectedFields]);

  useEffect(() => {
    setPage((prev) => (prev === 1 ? prev : 1));
  }, [selectedFields.join(",")]);

  const rewriteFieldsForLeaveContext = useCallback((fields: string[]) => {
    const hasLeave = fields.some((f) => f.startsWith("LeaveRequest."));
    const hasTrainingRecord = fields.some((f) => f.startsWith("TrainingRecord."));
    const result: string[] = [];
    for (const f of fields) {
      if (f === "User.JobRole.name" || f === "Employee.JobRole.name") {
        if (!result.includes("_computed.jobRoleName")) {
          result.push("_computed.jobRoleName");
        }
        const dep = hasLeave
          ? "LeaveRequest.Employee.JobRole.name"
          : hasTrainingRecord
          ? "TrainingRecord.Employee.JobRole.name"
          : "Employee.JobRole.name";
        if (!result.includes(dep)) {
          result.push(dep);
        }
        continue;
      }
      if (!hasLeave && !hasTrainingRecord && f === "WorkingPattern.name") {
        result.push("Employee.WorkingPattern.name");
        if (!result.includes("_computed.workingPatternName")) {
          result.push("_computed.workingPatternName");
        }
        continue;
      }
      // Handle TrainingRecord context - anchor related fields
      if (hasTrainingRecord) {
        if (f.startsWith("User.") && !f.startsWith("TrainingRecord.")) {
          result.push(f.replace("User.", "TrainingRecord.Employee.User."));
          continue;
        }
        if (f.startsWith("Employee.") && !f.startsWith("TrainingRecord.Employee.")) {
          result.push(f.replace("Employee.", "TrainingRecord.Employee."));
          continue;
        }
        if (f.startsWith("Course.") && !f.startsWith("TrainingRecord.Course.")) {
          result.push(f.replace("Course.", "TrainingRecord.Course."));
          continue;
        }
        if (f.startsWith("TrainingProvider.") && !f.startsWith("TrainingRecord.TrainingProvider.")) {
          result.push(f.replace("TrainingProvider.", "TrainingRecord.TrainingProvider."));
          continue;
        }
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
        if (f.startsWith("WorkingPattern.")) {
          result.push(
            f.replace("WorkingPattern.", "LeaveRequest.Employee.WorkingPattern."),
          );
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

  const fetchReportPage = useCallback(
    async (pageToFetch: number, limitToFetch: number, signal?: AbortSignal) => {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }

      if (engineParam === "custom" && reportTypeParam) {
        const transformedFilters = Object.fromEntries(
          (Array.isArray(activeFilters) ? activeFilters : []).map((filter: any) => {
            const filterKey = filter.field.includes('.') 
              ? filter.field.split('.').pop() 
              : filter.field;
            
            const filterValue = filter.operator === "between" || filter.operator === "date_between"
              ? { value: filter.value, value2: filter.value2 }
              : filter.value;
            
            return [filterKey, filterValue];
          }),
        );

        const result = await resilientPost<{ data: unknown[]; error?: string }>(
          "/api/reports/generate",
          {
            reportType: reportTypeParam,
            filters: transformedFilters,
            pagination: { page: pageToFetch, limit: limitToFetch, sortBy: activeSort?.field, sortOrder: activeSort?.direction },
          },
          {
            signal,
            timeout: 30000,
            retries: 3,
            headers,
            // Use unique cache key to prevent deduplication (each request should be independent)
            cacheKey: `report-generate-${Date.now()}-${Math.random()}`,
            onRetry: (attempt) => {
              setRetryCount(attempt);
              console.log(`[Report] Retry attempt ${attempt} for custom report`);
            },
          }
        );
        
        // Check for API errors
        if (result.error) {
          console.error("Report API error:", result.error.message);
          throw result.error;
        }
        
        if (result.data?.error) {
          throw new ResilientFetchError({
            message: result.data.error,
            status: result.status,
          });
        }
        
        const results = Array.isArray(result.data?.data) ? result.data.data : [];
        return { results, totalCount: results.length };
      }

      const sortToSend =
        activeSort && activeSort.field
          ? { field: activeSort.field, direction: activeSort.direction || "asc" }
          : defaultSort || undefined;

      const result = await resilientPost<{ data: unknown[]; total: number; error?: string }>(
        "/api/reports/query",
        {
          selectedFields: effectiveSelectedFields,
          filters: Array.isArray(activeFilters) ? activeFilters : [],
          pagination: { page: pageToFetch, limit: limitToFetch },
          sort: sortToSend,
        },
        {
          signal,
          timeout: 30000,
          retries: 3,
          headers,
          // Use unique cache key to prevent deduplication (each request should be independent)
          cacheKey: `report-query-${Date.now()}-${Math.random()}`,
          onRetry: (attempt) => {
            setRetryCount(attempt);
            console.log(`[Report] Retry attempt ${attempt} for dynamic report`);
          },
        }
      );
      
      if (result.error) {
        console.error("📛 resilientPost returned error:", result.error);
        throw result.error;
      }
      
      console.log("📦 resilientPost result:", result);
      const json = result.data;
      console.log("📦 json data:", json);
      const results = Array.isArray(json?.data) ? json.data : [];
      console.log("📦 extracted results:", results.length, "items");
      const totalCount =
        typeof json?.total === "number" ? json.total : results.length;
      console.log("📦 totalCount:", totalCount);
      return { results, totalCount };
    },
    [
      session?.user?.companyId,
      effectiveSelectedFields,
      activeFilters,
      activeSort,
      defaultSort,
      engineParam,
      reportTypeParam,
    ],
  );

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔄 useEffect triggered, effectiveSelectedFields:", effectiveSelectedFields);
    if (effectiveSelectedFields.length === 0) {
      console.log("⏭️ Skipping: no selected fields");
      return;
    }
    if (reportIdParam && !reportConfig) {
      console.log("⏭️ Skipping: waiting for reportConfig");
      return;
    }

    // Don't abort previous requests - let them complete
    // The fetchId check will ignore stale results
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    abortControllerRef.current = controller;
    const fetchId = ++fetchIdRef.current;
    
    console.log("🆕 New fetch starting, fetchId:", fetchId);

    const load = async () => {
      setLoading(true);
      setFetchError(null);
      setRetryCount(0);
      
      try {
        console.log("🚀 Starting fetch, fetchId:", fetchId);
        const { results, totalCount } = await fetchReportPage(page, pageSize, controller.signal);
        
        console.log("✅ Fetch completed, fetchId:", fetchId, "current fetchIdRef:", fetchIdRef.current);
        
        // Check if this request is still current
        if (fetchId !== fetchIdRef.current) {
          console.log("⚠️ Stale request, ignoring results");
          return;
        }
        
        console.log("💾 Setting data:", results.length, "results, total:", totalCount);
        setData([...results]);
        setFilteredData([...results]);
        setTotal(totalCount);
        setLastFetched(new Date());
        setRetryCount(0);
      } catch (error) {
        console.log("🔴 Caught error, fetchId:", fetchId, "current:", fetchIdRef.current);
        console.log("🔴 Error details:", error);
        
        // Check if this request is still current
        if (fetchId !== fetchIdRef.current) {
          console.log("⚠️ Error from stale request, ignoring");
          return;
        }
        
        // Don't show error for cancelled requests (handle both DOMException and ResilientFetchError)
        if (error instanceof DOMException && error.name === "AbortError") {
          console.log("⚠️ AbortError (DOMException), ignoring");
          return;
        }
        if (error instanceof ResilientFetchError && error.isAborted) {
          console.log("⚠️ ResilientFetchError.isAborted, ignoring");
          return;
        }
        
        console.error("❌ Error fetching report data:", error);
        
        const errorMessage = error instanceof ResilientFetchError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to fetch report data";
        
        setFetchError(errorMessage);
        
        // Provide more helpful error messages based on error type
        let toastTitle = "Report Error";
        let toastDescription = errorMessage;
        
        if (error instanceof ResilientFetchError) {
          if (error.isTimeout) {
            toastTitle = "Request Timed Out";
            toastDescription = "The report is taking too long. Try reducing filters or date range.";
          } else if (error.isNetworkError) {
            toastTitle = "Connection Problem";
            toastDescription = "Please check your internet connection and try again.";
          } else if (error.status === 401) {
            toastTitle = "Session Expired";
            toastDescription = "Please sign in again to continue.";
          } else if (error.status && error.status >= 500) {
            toastTitle = "Server Error";
            toastDescription = "Something went wrong on our end. Please try again.";
          }
        }
        
        toast({
          title: toastTitle,
          description: toastDescription,
          variant: "destructive",
        });
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    };
    
    load();
    
    return () => {
      clearTimeout(timeoutId);
      // Don't abort here - let the request complete if it's in progress
      // The fetchId check will prevent stale data from being used
    };
  }, [
    effectiveSelectedFields,
    page,
    pageSize,
    reportIdParam,
    reportConfig,
    fetchReportPage,
    toast,
  ]);

  const translateLegacy = useCallback((f: string) => {
    const map: Record<string, string> = {
      "User.department.name":
        "User.Department_User_departmentIdToDepartment.name",
      "User.Department.name":
        "User.Department_User_departmentIdToDepartment.name",
      "User.jobRole.name": "User.JobRole.name",
      "Employee.Department.name":
        "User.Department_User_departmentIdToDepartment.name",
      "Employee.WorkingPattern.name": "WorkingPattern.name",
      "Employee.JobRole.name": "User.JobRole.name",
      "Employee.User.firstName": "User.firstName",
      "Employee.User.lastName": "User.lastName",
      "Employee.User.email": "User.email",
      "Employee.User.phone": "User.phone",
    };
    return map[f] || f;
  }, []);

  const visibleFields = useMemo(() => {
    let fields = [...effectiveSelectedFields];
    if (fields.includes("_computed.workingPatternName")) {
      const hide = new Set([
        "WorkingPattern.name",
        "Employee.WorkingPattern.name",
        "LeaveRequest.Employee.WorkingPattern.name",
      ]);
      fields = fields.filter((f) => !hide.has(f));
    }
    if (fields.includes("_computed.jobRoleName")) {
      const hideJR = new Set([
        "User.JobRole.name",
        "Employee.JobRole.name",
        "LeaveRequest.Employee.JobRole.name",
        "LeaveRequest.Employee.User.JobRole.name",
      ]);
      fields = fields.filter((f) => !hideJR.has(f));
    }
    return fields;
  }, [effectiveSelectedFields]);

  const columns = useMemo<ColumnDefinition[]>(() => {
    return visibleFields.map((field) => {
      const keys = field.split(".");
      let headerFallback: string;

      if (field === "_computed.jobRoleName") {
        return { header: "Job Role", accessorKey: "_computed.jobRoleName" };
      }
      if (field === "_computed.workingPatternName") {
        return { header: "Working Pattern", accessorKey: "_computed.workingPatternName" };
      }
      if (field === "_computed.effectiveStartDate") {
        return { header: "Start Date", accessorKey: "_computed.effectiveStartDate" };
      }

      headerFallback = keys[keys.length - 1];

      const candidates: string[] = [];
      appendUnique(candidates, field);
      if (keys.length > 1) {
        appendUnique(candidates, keys.slice(1).join("."));
      }

      if (field.startsWith("User.")) {
        const withoutUser = field.slice("User.".length);
        appendUnique(candidates, withoutUser);
        if (withoutUser.startsWith("Employee.")) {
          const withoutEmployee = withoutUser.slice("Employee.".length);
          appendUnique(candidates, withoutUser);
          appendUnique(candidates, withoutEmployee);
        }
      }

      if (field.startsWith("Employee.User.")) {
        const asUser = field.slice("Employee.".length);
        appendUnique(candidates, asUser);
        appendUnique(candidates, asUser.slice("User.".length));
      }

      if (field.startsWith("Employee.") && !field.startsWith("Employee.User.")) {
        const withoutEmployee = field.slice("Employee.".length);
        appendUnique(candidates, withoutEmployee);
      }

      if (field.startsWith("LeaveEntitlement.")) {
        const withoutPrefix = field.slice("LeaveEntitlement.".length);
        appendUnique(candidates, withoutPrefix);
      }

      const contextPrefixes = [
        "LeaveRequest",
        "DriverLicence",
        "EmploymentCheck",
        "TrainingRecord",
        "EmployeeOffboarding",
      ];
      contextPrefixes.forEach((prefix) => {
        const prefixToken = `${prefix}.`;
        if (field.startsWith(prefixToken)) {
          const withoutContext = field.slice(prefixToken.length);
          appendUnique(candidates, withoutContext);
          if (withoutContext.startsWith("Employee.")) {
            const withoutEmployee = withoutContext.slice("Employee.".length);
            appendUnique(candidates, withoutEmployee);
            if (withoutEmployee.startsWith("User.")) {
              appendUnique(candidates, withoutEmployee.slice("User.".length));
            }
          }
          // Handle Course and TrainingProvider nested under TrainingRecord
          if (withoutContext.startsWith("Course.")) {
            appendUnique(candidates, withoutContext);
          }
          if (withoutContext.startsWith("TrainingProvider.")) {
            appendUnique(candidates, withoutContext);
          }
        }
      });

      (COLUMN_FALLBACKS[field] || []).forEach((candidate) => appendUnique(candidates, candidate));

      let accessorKey = candidates[0] || field;
      if (data.length > 0) {
        const found = candidates.find((candidate) =>
          data.some((row) => getNested(row, candidate) !== undefined),
        );
        if (found) accessorKey = found;
      }

      const translated = translateLegacy(field);
      const label =
        fieldLabels[field] ||
        fieldLabels[translated] ||
        headerFallback.charAt(0).toUpperCase() + headerFallback.slice(1);

      return { header: label, accessorKey };
    });
  }, [visibleFields, fieldLabels, translateLegacy, data]);

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

  const buildPrintableRows = useCallback(() => {
    return filteredData.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        const value = getNested(row, col.accessorKey) ?? "";
        obj[col.accessorKey] =
          typeof value === "object" ? JSON.stringify(value) : String(value);
      });
      return obj;
    });
  }, [filteredData, columns]);

  const performPdfDownload = useCallback(async () => {
    if (!columns.length) return;
    const rows = buildPrintableRows();
    const blob = await exportTableToPdf("PeopleCore Report", rows, columns);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peoplecore-report-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logAndToastPII(rows.length);
  }, [columns, buildPrintableRows, logAndToastPII]);

  const handlePdfClick = () => {
    if (hasPIISelected && !piiAcknowledged) {
      setShowPIIModal(true);
      return;
    }
    void performPdfDownload();
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
    if (exportingFull || tableLoading) return;
    
    // Create abort controller for export
    const { controller, cleanup } = createAbortController(120000); // 2 minute timeout for full export
    
    setExportingFull(true);
    setExportProgress(0);
    
    try {
      const combined: any[] = [];
      const pagesToFetch = Math.max(1, Math.ceil(total / pageSize));
      
      for (let currentPage = 1; currentPage <= pagesToFetch; currentPage++) {
        // Check if aborted
        if (controller.signal.aborted) {
          throw new DOMException("Export cancelled", "AbortError");
        }
        
        const { results } = await fetchReportPage(currentPage, pageSize, controller.signal);
        combined.push(...results);
        
        // Update progress
        const progress = Math.round((currentPage / pagesToFetch) * 100);
        setExportProgress(progress);
      }
      
      downloadCSV(combined, columns);
      logAndToastPII(combined.length);
      
      toast({
        title: "Export complete",
        description: `Successfully exported ${combined.length.toLocaleString()} records.`,
      });
    } catch (error) {
      // Don't show error for cancelled exports
      if (error instanceof DOMException && error.name === "AbortError") {
        toast({
          title: "Export cancelled",
          description: "The export was cancelled.",
        });
        return;
      }
      
      console.error("❌ Error exporting full report:", error);
      
      let errorMessage = "We couldn't export the full report. Please try again.";
      if (error instanceof ResilientFetchError) {
        if (error.isTimeout) {
          errorMessage = "Export timed out. Try exporting in smaller batches or reducing the date range.";
        } else if (error.isNetworkError) {
          errorMessage = "Connection lost during export. Please check your internet and try again.";
        }
      }
      
      toast({
        title: "Export failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setExportingFull(false);
      setExportProgress(0);
      cleanup();
    }
  };

  const handleSaveReport = async () => {
    const reportName = prompt("Enter a name for this report:");
    if (!reportName) return;
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }
      const res = await fetch("/api/reports/save", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: reportName,
          selectedFields,
          category: "General",
          filters: activeFilters.length > 0 ? activeFilters : undefined,
          sort: activeSort || undefined,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to save report" }));
        throw new Error(errorData.error || "Failed to save report");
      }
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

  // Modern styled header
  const header = (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50"
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left - Back button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExit}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{exitLabel}</span>
          </motion.button>

          {/* Center - Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {reportConfig?.name || "Report Preview"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {total > 0 ? `${total.toLocaleString()} records` : "Loading..."}
              </p>
            </div>
          </div>

          {/* Right - Close button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExit}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  const renderShell = (body: ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {header}
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">{body}</main>
    </div>
  );

  if (loadingReport) {
    return <ReportPreviewSkeleton />;
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-premium rounded-3xl p-12 text-center shadow-premium max-w-xl mx-auto mt-20"
      >
        <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">No Columns Selected</h3>
        <p className="text-muted-foreground mb-6">
          No fields are selected yet, so there's nothing to preview.
        </p>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground mb-6">
          <p>💡 Load the {templateLabel} template in the builder for a quick start.</p>
          <p>💡 Include first and last name so your export stays easy to read.</p>
        </div>
        <Button
          onClick={handleExit}
          variant="outline"
          className="rounded-xl h-11 px-6"
        >
          Go Back
        </Button>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {header}
        <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 space-y-6">
          {/* Stats skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 shadow-depth-2"
          >
            <div className="flex flex-wrap items-center gap-4 mb-5 pb-5 border-b border-border/50">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/50 animate-pulse">
                <div className="w-4 h-4 rounded bg-muted-foreground/20" />
                <div className="w-16 h-4 rounded bg-muted-foreground/20" />
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/50 animate-pulse">
                <div className="w-4 h-4 rounded bg-muted-foreground/20" />
                <div className="w-20 h-4 rounded bg-muted-foreground/20" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-32 h-10 rounded-xl bg-muted/50 animate-pulse" />
              <div className="w-28 h-10 rounded-xl bg-muted/50 animate-pulse" />
              <div className="ml-auto w-28 h-10 rounded-xl bg-muted/50 animate-pulse" />
            </div>
          </motion.div>
          
          {/* Table skeleton */}
          <ReportTableSkeleton columns={columns.length || 6} rows={10} />
        </main>
      </div>
    );
  }

  if (!loading && data.length === 0) {
    return renderShell(
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-premium rounded-3xl p-12 text-center shadow-premium max-w-xl mx-auto mt-20"
      >
        <div className={cn(
          "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6",
          fetchError ? "bg-destructive/10" : "bg-muted/50"
        )}>
          {fetchError ? (
            <AlertTriangle className="w-10 h-10 text-destructive" />
          ) : (
            <Table className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-xl font-bold mb-2">
          {fetchError ? "Report Error" : "No Matching Records"}
        </h3>
        <p className="text-muted-foreground mb-6">
          {fetchError 
            ? fetchError 
            : "We didn't find any records that meet your criteria."}
        </p>
        {!fetchError && (
          <div className="flex flex-col gap-3 text-sm text-muted-foreground mb-6">
            <p>💡 {template === "NZ"
              ? "Check the pay period dates against the NZ payroll template you used."
              : template === "AU"
              ? "Verify the award and allowance filters match your AU template."
              : template === "UK"
              ? "Confirm the pay run selection matches your UK payroll starter template."
              : "Review your filters or try widening the date range."}</p>
            <p>💡 {regionName
              ? `If you're filtering by location, make sure it includes all ${regionName} sites.`
              : "If you're filtering by location, make sure it includes every site you need."}</p>
          </div>
        )}
        <Button
          onClick={handleExit}
          variant="outline"
          className="rounded-xl h-11 px-6"
        >
          {fetchError ? "Go Back" : "Adjust Filters"}
        </Button>
      </motion.div>
    );
  }

  const body = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Action Bar */}
      <div className="glass-card rounded-2xl p-5 shadow-depth-2">
        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-4 mb-5 pb-5 border-b border-border/50">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/10">
            <Table className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{filteredData.length} rows</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/50">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{columns.length} columns</span>
          </div>
          {total > data.length && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {total.toLocaleString()} total records
              </span>
            </div>
          )}
          {hasPIISelected && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30">
              <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
                Contains PII data
              </span>
            </div>
          )}
          {lastFetched && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/50 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">
                Updated {formatTimeAgo(lastFetched)}
              </span>
            </div>
          )}
          {retryCount > 0 && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Wifi className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Retry {retryCount}/3
              </span>
            </div>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={handleDownloadClick} 
              disabled={tableLoading}
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/20 rounded-xl h-10 px-5"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={handlePdfClick} 
              disabled={tableLoading}
              variant="outline"
              className="glass-subtle border-white/30 rounded-xl h-10 px-5"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </motion.div>
          
          {total > data.length && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                disabled={exportingFull || tableLoading} 
                onClick={handleFullExport}
                variant="outline"
                className="glass-subtle border-white/30 rounded-xl h-10 px-5 relative overflow-hidden"
              >
                {exportingFull && exportProgress > 0 && (
                  <div 
                    className="absolute inset-0 bg-primary/20 transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                )}
                <span className="relative flex items-center">
                  <FileDown className={cn("w-4 h-4 mr-2", exportingFull && "animate-pulse")} />
                  {exportingFull
                    ? `Exporting... ${exportProgress}%`
                    : `Full Export (${total.toLocaleString()})`}
                </span>
              </Button>
            </motion.div>
          )}
          
          {reportIdParam && (
            <>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => setShowSendModal(true)}
                  variant="outline"
                  className="glass-subtle border-white/30 rounded-xl h-10 px-5"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Email Report
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => setShowHistoryModal(true)}
                  variant="ghost"
                  className="rounded-xl h-10 px-4"
                >
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
              </motion.div>
            </>
          )}
          
          {/* Only show Save Report button if report is NOT already saved */}
          {!reportIdParam && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ml-auto">
              <Button 
                onClick={handleSaveReport}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20 rounded-xl h-10 px-5"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Report
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-premium rounded-2xl shadow-premium overflow-hidden">
        <div className="p-5">
          {tableLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10"
            >
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm font-medium text-primary">Applying filters...</span>
            </motion.div>
          )}
          <FilterableDataTable
            columns={columns}
            data={data}
            total={total}
            page={page}
            pageSize={pageSize}
            reportId={effectiveReportId}
            onFilteredDataChange={setFilteredData}
            onPageChange={setPage}
            onPageSizeChange={(size: number) => {
              setPageSize(size);
              setPage(1);
            }}
            onTableLoadingChange={setTableLoading}
          />
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {renderShell(body)}
      
      {/* PII Modal */}
      <Dialog open={showPIIModal} onOpenChange={setShowPIIModal}>
        <DialogContent className="glass-premium border-0 rounded-2xl shadow-depth-4 max-w-md">
          <DialogHeader>
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl">Personal Data Export</DialogTitle>
            <DialogDescription>
              You're about to download a report that contains personal or
              sensitive information. Please confirm you are authorised to export
              this data and will handle it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {piiFieldLabels.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  Sensitive fields included:
                </p>
                <div className="flex flex-wrap gap-2">
                  {piiFieldLabels.map((label) => (
                    <Badge key={label} variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              By continuing you acknowledge the privacy obligations associated
              with this export and agree to follow company policy for
              safeguarding sensitive data.
            </p>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={handleCancelPIIExport}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPIIExport}
              className="bg-gradient-to-r from-primary to-blue-600 rounded-xl"
            >
              Confirm & Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send & History Modals */}
      {reportIdParam && reportConfig && (
        <>
          <SendReportModal
            isOpen={showSendModal}
            onClose={() => setShowSendModal(false)}
            reportId={parseInt(reportIdParam, 10)}
            reportName={reportConfig.name || "Report"}
            fields={effectiveSelectedFields}
            filters={activeFilters}
            sort={activeSort}
            onSuccess={() => {
              toast({
                title: "Report sent",
                description: "The report has been emailed successfully",
              });
            }}
          />
          <SendHistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            reportId={parseInt(reportIdParam, 10)}
            reportName={reportConfig.name || "Report"}
          />
        </>
      )}
      
      {/* Export Progress Overlay */}
      <ProgressOverlay
        isVisible={exportingFull && exportProgress > 0}
        progress={exportProgress}
        message="Exporting full report..."
      />

      {/* Unsaved Changes Warning Modal */}
      <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <DialogContent className="glass-premium border-0 rounded-2xl shadow-depth-4 max-w-md">
          <DialogHeader>
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl">Unsaved Report</DialogTitle>
            <DialogDescription>
              This report preview hasn't been saved yet. If you leave now, you'll lose this report configuration and will need to recreate it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Would you like to save this report before leaving?
            </p>
          </div>
          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              variant="ghost"
              onClick={handleConfirmExit}
              className="rounded-xl"
            >
              Leave Without Saving
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelExit}
              className="rounded-xl"
            >
              Stay Here
            </Button>
            <Button 
              onClick={() => {
                setShowUnsavedWarning(false);
                handleSaveReport();
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * ReportsPreviewClient wrapped with error boundary for enterprise-grade reliability
 */
export default function ReportsPreviewClient() {
  const router = useRouter();
  
  return (
    <ReportErrorBoundary
      onExit={() => router.push("/reports")}
      onRetry={() => {
        // Trigger a page refresh on retry
        window.location.reload();
      }}
    >
      <ReportsPreviewClientInner />
    </ReportErrorBoundary>
  );
}
