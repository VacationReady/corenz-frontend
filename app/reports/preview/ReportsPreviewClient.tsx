"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
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
import { ArrowLeft, X, Mail, History } from "lucide-react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import Papa from "papaparse";
import { exportTableToPdf } from "@/lib/pdfExport";
import { SendReportModal } from "@/components/reports/SendReportModal";
import { SendHistoryModal } from "@/components/reports/SendHistoryModal";

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
    // Don't add required fields for custom engine reports - they already have correct structure
    if (engineParam === "custom") {
      return parsed;
    }
    // Only enforce User required fields if we're not in a Timesheet context
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
        // Custom engine reports already have the correct field structure in their templates
        // Don't add REQUIRED_FIELDS_USER as it will create duplicates
        if (template.engine === "custom") {
          return [...template.defaultFields];
        }
        // For dynamic reports, don't force User fields for timesheet or other non-User primary model reports
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
        
        // Custom engine reports already have the correct field structure
        if (template.engine === "custom") {
          setSelectedFields([...template.defaultFields]);
        } else {
          // For dynamic reports, add required fields if not timesheet
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
      // For custom engine reports, don't add required fields
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
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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
  const [tableLoading, setTableLoading] = useState(false);

  // Generate a stable, meaningful reportId for localStorage persistence
  const effectiveReportId = useMemo(() => {
    if (reportIdParam) return reportIdParam;
    if (templateIdParam) return `template_${templateIdParam}`;
    // Hash selected fields for a deterministic key when no reportId/templateId
    if (selectedFields.length > 0) {
      const sorted = [...selectedFields].sort().join(",");
      // Simple hash function for consistent key generation
      let hash = 0;
      for (let i = 0; i < sorted.length; i++) {
        const char = sorted.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
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
        // Ignore label loading errors – fallback metadata already seeded from hrReportFields
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

  // Load report configuration if reportId is provided
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

          // Handle both new sorts array and legacy single sort
          // Prefer sorts array if available, otherwise fall back to single sort
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

          // Force include required fields for saved reports as well
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportIdParam, session?.user?.companyId]);


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
        // Always include a single computed column for display
        if (!result.includes("_computed.jobRoleName")) {
          result.push("_computed.jobRoleName");
        }
        // Ensure underlying relation is selected so computed can resolve
        const dep = hasLeave
          ? "LeaveRequest.Employee.JobRole.name"
          : "Employee.JobRole.name";
        if (!result.includes(dep)) {
          result.push(dep);
        }
        continue;
      }
      // Normalise Working Pattern to live under Employee so we don't split models
      if (!hasLeave && f === "WorkingPattern.name") {
        // Include computed fallback so the name renders even if the relation is missing
        result.push("Employee.WorkingPattern.name");
        if (!result.includes("_computed.workingPatternName")) {
          result.push("_computed.workingPatternName");
        }
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

  // Helper to fetch a specific page (used by both initial load and full export)
  const fetchReportPage = useCallback(
    async (pageToFetch: number, limitToFetch: number) => {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }

      if (engineParam === "custom" && reportTypeParam) {
        // Transform filters for custom reports: extract the last part of nested field names
        // e.g., "Employee.isActive" -> "isActive", "Employee.departmentId" -> "departmentId"
        const transformedFilters = Object.fromEntries(
          (Array.isArray(activeFilters) ? activeFilters : []).map((filter: any) => {
            // Extract the simple key from nested paths (e.g., Employee.isActive -> isActive)
            const filterKey = filter.field.includes('.') 
              ? filter.field.split('.').pop() 
              : filter.field;
            
            const filterValue = filter.operator === "between" || filter.operator === "date_between"
              ? { value: filter.value, value2: filter.value2 }
              : filter.value;
            
            return [filterKey, filterValue];
          }),
        );

        const res = await fetch("/api/reports/generate", {
          method: "POST",
          headers,
          body: JSON.stringify({
            reportType: reportTypeParam,
            filters: transformedFilters,
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
        headers,
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
      // Map Employee-anchored selections to canonical label keys so headers are correct
      "Employee.Department.name":
        "User.Department_User_departmentIdToDepartment.name",
      "Employee.WorkingPattern.name": "WorkingPattern.name",
      "Employee.JobRole.name": "User.JobRole.name",
      // Map Employee.User.* fields to User.* for label lookup
      "Employee.User.firstName": "User.firstName",
      "Employee.User.lastName": "User.lastName",
      "Employee.User.email": "User.email",
      "Employee.User.phone": "User.phone",
    };
    return map[f] || f;
  }, []);

  const visibleFields = useMemo(() => {
    let fields = [...effectiveSelectedFields];
    // If using computed Working Pattern, hide base relation columns to avoid duplicates
    if (fields.includes("_computed.workingPatternName")) {
      const hide = new Set([
        "WorkingPattern.name",
        "Employee.WorkingPattern.name",
        "LeaveRequest.Employee.WorkingPattern.name",
      ]);
      fields = fields.filter((f) => !hide.has(f));
    }
    // If using computed Job Role, hide base relation columns to avoid duplicates
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

      // Normalise Job Role into a single computed accessor across contexts
      if (field === "_computed.jobRoleName") {
        return { header: "Job Role", accessorKey: "_computed.jobRoleName" };
      }
      // Working Pattern via computed fallback
      if (field === "_computed.workingPatternName") {
        return { header: "Working Pattern", accessorKey: "_computed.workingPatternName" };
      }
      // Start Date computed fallback (only used if real value is missing)
      if (field === "_computed.effectiveStartDate") {
        return { header: "Start Date", accessorKey: "_computed.effectiveStartDate" };
      }

      headerFallback = keys[keys.length - 1];

      // Build candidate accessor paths to be resilient across engines
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

      // Handle Employee.Department.*, Employee.JobRole.*, etc.
      if (field.startsWith("Employee.") && !field.startsWith("Employee.User.")) {
        const withoutEmployee = field.slice("Employee.".length);
        appendUnique(candidates, withoutEmployee);
      }

      // Handle LeaveEntitlement.* fields
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
        }
      });

      (COLUMN_FALLBACKS[field] || []).forEach((candidate) => appendUnique(candidates, candidate));

      // Choose the first candidate that resolves for any fetched row
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
    // Flatten rows keyed by accessorKey so the PDF renderer can read them
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
          <Button onClick={handleDownloadClick} disabled={tableLoading}>
            Download CSV ({filteredData.length} rows)
          </Button>
          <Button onClick={handlePdfClick} disabled={tableLoading}>Export to PDF</Button>
          {total > data.length ? (
            <Button disabled={exportingFull || tableLoading} onClick={handleFullExport}>
              {exportingFull
                ? "Exporting full report..."
                : tableLoading
                ? `Preparing export... (${total} rows)`
                : `Download Full CSV (${total} rows)`}
            </Button>
          ) : null}
          {reportIdParam && (
            <>
              <Button 
                onClick={() => setShowSendModal(true)}
                className="flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Report
              </Button>
              <Button 
                onClick={() => setShowHistoryModal(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                View Send History
              </Button>
            </>
          )}
          <Button onClick={handleSaveReport}>Save Report</Button>
        </div>
      </div>
      <div className="min-h-[200px]">
        {tableLoading && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            <span>Applying filters...</span>
          </div>
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
              sensitive information. Please confirm you are authorised to export
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
    </>
  );
}
