"use client";

import { useState, useRef, useEffect, useMemo, type ChangeEvent } from "react";

import { useSession } from "next-auth/react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, FileText, CheckCircle, AlertTriangle, Clock, Eye, X, RefreshCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SendWelcomeEmailModal from "@/components/employees/SendWelcomeEmailModal";
import { CSV_IMPORT_DOMAIN_CONFIGS, getDomainConfig, type CSVImportDomainId } from "@/lib/csv-import/domains";
import type { CSVImportDomainConfig } from "@/lib/csv-import/types";
import { TemplateGuidance } from "./components/TemplateGuidance";
import { ImportTypeSelector } from "./components/ImportTypeSelector";
import { ActivationStatusCard } from "./components/ActivationStatusCard";
import { ImportInstructionsCard } from "./components/ImportInstructionsCard";
import { FileUploadCard } from "./components/FileUploadCard";
import { ImportProgressCard } from "./components/ImportProgressCard";
import { EmployeeActivationOptions } from "./components/EmployeeActivationOptions";
import { EmployeeWelcomeRollout } from "./components/EmployeeWelcomeRollout";
import { SubTemplateSelector } from "./components/SubTemplateSelector";
import { ImportActivationSummary } from "./components/ImportActivationSummary";
import { ImportResultsCard } from "./components/ImportResultsCard";
import type {
  ActivationOptions,
  ActivationStats,
  EmployeeActivationStatus,
  ImportProgress,
  ImportResult,
  ImportType,
  SelectableOption,
  WelcomeEmailSummary,
  WelcomeFilters,
} from "./types";

const DEFAULT_IMPORT_SEQUENCE: ImportType[] = [
  "departments",
  "job-roles",
  "working-patterns",
  "employees",
  "payroll",
  "training",
];

const importSequence: Array<{ label: string; value: ImportType }> = DEFAULT_IMPORT_SEQUENCE.map(value => {
  const config = getDomainConfig(value);
  return {
    value,
    label: config.label,
  };
});

const allDomainIds = Object.keys(CSV_IMPORT_DOMAIN_CONFIGS) as CSVImportDomainId[];
const allImportTypes: ImportType[] = Array.from(new Set([...DEFAULT_IMPORT_SEQUENCE, ...allDomainIds]));

const importTypeOptions = allImportTypes.map(value => {
  const config = getDomainConfig(value);
  return {
    value,
    label: config.label,
    icon: config.icon,
  };
});

const getImportLabel = (type: ImportType) => getDomainConfig(type).label;

const getDefaultTemplate = (config: CSVImportDomainConfig) => {
  if (config.templates.length === 0) {
    return undefined;
  }

  return (
    config.templates.find(template => template.id === config.defaultTemplateId) ??
    config.templates[0]
  );
};

const getDefaultSubTemplateSelection = (config?: CSVImportDomainConfig) => {
  if (!config?.subTemplates || config.subTemplates.length === 0) {
    return [] as string[];
  }

  const defaults = config.subTemplates
    .filter(subTemplate => subTemplate.defaultSelected)
    .map(subTemplate => subTemplate.id);

  if (defaults.length > 0) {
    return defaults;
  }

  return config.subTemplates.map(subTemplate => subTemplate.id);
};

const ALLOW_UPDATES_STORAGE_KEY = "csv-import-allow-employee-updates";

const ImportSummaryStats = ({ result }: { result: ImportResult }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{result.created.length}</div>
          <div className="text-sm text-muted-foreground">Created</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{result.updated.length}</div>
          <div className="text-sm text-muted-foreground">Updated</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{result.failed}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{result.total}</div>
          <div className="text-sm text-muted-foreground">Total processed</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center md:text-left">
        Successful rows: {result.successful}
      </p>
    </div>
  );
};

export default function CSVImportPage() {
  const { data: session } = useSession();
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImportType, setSelectedImportType] = useState<ImportType>("departments");
  const [showResults, setShowResults] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showActivationOptions, setShowActivationOptions] = useState(false);
  const [activationOptions, setActivationOptions] = useState<ActivationOptions>({
    sendEmails: true,
    checkPermissions: true,
    promoteManagers: true,
  });
  const [lastImportedType, setLastImportedType] = useState<ImportType | null>(null);
  const [allowUpdates, setAllowUpdates] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingSystem, setResettingSystem] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const isAdmin =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.canManageTenants === true;
  const [showWelcomeEmailOptions, setShowWelcomeEmailOptions] = useState(false);
  const [welcomeFilters, setWelcomeFilters] = useState<WelcomeFilters>({
    departmentIds: [],
    locationIds: [],
    nameQuery: "",
  });
  const [welcomeSummary, setWelcomeSummary] = useState<WelcomeEmailSummary | null>(null);
  const [welcomeMetadataLoaded, setWelcomeMetadataLoaded] = useState(false);
  const [welcomeMetadataLoading, setWelcomeMetadataLoading] = useState(false);
  const [welcomeMetadataError, setWelcomeMetadataError] = useState<string | null>(null);
  const [availableDepartments, setAvailableDepartments] = useState<SelectableOption[]>([]);
  const [availableLocations, setAvailableLocations] = useState<SelectableOption[]>([]);
  const [isSendingWelcomeEmails, setIsSendingWelcomeEmails] = useState(false);
  const [activationStats, setActivationStats] = useState<ActivationStats | null>(null);
  const [activationEmployees, setActivationEmployees] = useState<EmployeeActivationStatus[]>([]);
  const [loadingActivationStatus, setLoadingActivationStatus] = useState(false);
  const [showActivationDashboard, setShowActivationDashboard] = useState(false);
  const [showSendWelcomeModal, setShowSendWelcomeModal] = useState(false);
  const [selectedSubTemplates, setSelectedSubTemplates] = useState<string[]>(() =>
    getDefaultSubTemplateSelection(getDomainConfig("departments")),
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedDomainConfig = getDomainConfig(selectedImportType);
  const selectedTemplate = getDefaultTemplate(selectedDomainConfig);
  const defaultSubTemplateSelection = useMemo(() => {
    if (selectedImportType === "employees") {
      return [];
    }
    return getDefaultSubTemplateSelection(selectedDomainConfig);
  }, [selectedDomainConfig, selectedImportType]);
  const hasSubTemplates = useMemo(() => {
    if (selectedImportType === "employees") {
      return false;
    }
    return Boolean(selectedDomainConfig.subTemplates && selectedDomainConfig.subTemplates.length > 0);
  }, [selectedDomainConfig, selectedImportType]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPreference = window.localStorage.getItem(ALLOW_UPDATES_STORAGE_KEY);
    if (storedPreference === null) return;
    const shouldAllowUpdates = storedPreference === "true";
    setAllowUpdates(current => (current === shouldAllowUpdates ? current : shouldAllowUpdates));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ALLOW_UPDATES_STORAGE_KEY, allowUpdates ? "true" : "false");
  }, [allowUpdates]);

  // Load activation status on mount
  useEffect(() => {
    loadActivationStatus();
  }, []);

  const loadActivationStatus = async () => {
    try {
      setLoadingActivationStatus(true);
      const response = await fetch("/api/csv-import/employees/activation-status");
      
      if (!response.ok) {
        throw new Error("Failed to load activation status");
      }

      const data = await response.json();
      setActivationStats(data.stats);
      setActivationEmployees(data.employees);
    } catch (error) {
      console.error("Failed to load activation status:", error);
    } finally {
      setLoadingActivationStatus(false);
    }
  };

  useEffect(() => {
    if (selectedImportType !== "employees") {
      setShowWelcomeEmailOptions(false);
      setWelcomeSummary(null);
      setWelcomeFilters({
        departmentIds: [],
        locationIds: [],
        nameQuery: "",
      });
      setWelcomeMetadataLoaded(false);
    }
  }, [selectedImportType]);

  useEffect(() => {
    if (
      !showWelcomeEmailOptions ||
      selectedImportType !== "employees" ||
      welcomeMetadataLoaded ||
      welcomeMetadataLoading
    ) {
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const loadMetadata = async () => {
      try {
        setWelcomeMetadataLoading(true);
        setWelcomeMetadataError(null);

        const [departmentResponse, locationResponse] = await Promise.all([
          fetch("/api/departments", { signal: controller.signal }),
          fetch("/api/locations", { signal: controller.signal }),
        ]);

        if (!departmentResponse.ok) {
          const error = await departmentResponse.json().catch(() => ({}));
          throw new Error(error.error || "Failed to load departments");
        }

        if (!locationResponse.ok) {
          const error = await locationResponse.json().catch(() => ({}));
          throw new Error(error.error || "Failed to load locations");
        }

        const [departmentData, locationData] = await Promise.all([
          departmentResponse.json(),
          locationResponse.json(),
        ]);

        if (isCancelled) return;

        setAvailableDepartments(
          Array.isArray(departmentData)
            ? departmentData.map((dept: any) => ({
                id: String(dept.id),
                name: String(dept.name ?? "Unnamed department"),
              }))
            : [],
        );
        setAvailableLocations(
          Array.isArray(locationData)
            ? locationData.map((loc: any) => ({
                id: String(loc.id),
                name: String(loc.name ?? "Unnamed location"),
              }))
            : [],
        );
        setWelcomeMetadataLoaded(true);
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to load welcome email metadata", error);
        setWelcomeMetadataError(
          error instanceof Error ? error.message : "Unable to load welcome email filters",
        );
      } finally {
        if (!isCancelled) {
          setWelcomeMetadataLoading(false);
        }
      }
    };

    loadMetadata();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [
    showWelcomeEmailOptions,
    selectedImportType,
    welcomeMetadataLoaded,
    welcomeMetadataLoading,
  ]);

  useEffect(() => {
    if (selectedImportType === "employees") {
      setSelectedSubTemplates([]);
      return;
    }
    setSelectedSubTemplates(defaultSubTemplateSelection);
  }, [selectedImportType, defaultSubTemplateSelection]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setValidationErrors(["Please select a CSV file"]);
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setValidationErrors(["File size must be less than 10MB"]);
      return;
    }

    setSelectedFile(file);
    setValidationErrors([]);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    if (hasSubTemplates && selectedSubTemplates.length === 0) {
      toast.error("Select at least one template scope before importing.");
      return;
    }

    const currentType = selectedImportType;
    const currentTypeLabel = getImportLabel(currentType);

    setImportProgress({
      status: "uploading",
      progress: 0,
      message: `Uploading ${currentTypeLabel.toLowerCase()} file...`,
    });
    setLastImportedType(currentType);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("allowUpdates", allowUpdates ? "true" : "false");
      if (hasSubTemplates && selectedSubTemplates.length > 0) {
        formData.append("subTemplates", selectedSubTemplates.join(","));
      }

      setImportProgress({
        status: "processing",
        progress: 50,
        message: `Processing ${currentTypeLabel.toLowerCase()} data...`,
      });

      const response = await fetch(`/api/csv-import/${currentType}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      const hasFailures = (data.results?.failed ?? 0) > 0;
      const rawResults = data.results ?? {};
      const normalisedResults: ImportResult = {
        total: rawResults.total ?? 0,
        successful: rawResults.successful ?? 0,
        failed: rawResults.failed ?? 0,
        errors: rawResults.errors ?? [],
        created: rawResults.created ?? [],
        updated: rawResults.updated ?? [],
        activation: rawResults.activation,
      };

      setImportProgress({
        status: "completed",
        progress: 100,
        message: `${currentTypeLabel} import completed successfully!`,
        result: normalisedResults,
      });

      setShowResults(true);
      const summarySegments = [] as string[];
      if ((normalisedResults.created?.length ?? 0) > 0) {
        summarySegments.push(`${normalisedResults.created.length} created`);
      }
      if ((normalisedResults.updated?.length ?? 0) > 0) {
        summarySegments.push(`${normalisedResults.updated.length} updated`);
      }
      const summaryMessage =
        summarySegments.length > 0
          ? summarySegments.join(" · ")
          : `${normalisedResults.successful} ${currentTypeLabel} processed`;
      toast.success(`Import completed: ${summaryMessage}`);

      setSelectedFile(null);
      setValidationErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (!hasFailures) {
        const currentStepIndex = importSequence.findIndex(step => step.value === currentType);
        const nextStep = currentStepIndex === -1 ? null : importSequence[currentStepIndex + 1];
        if (nextStep) {
          setSelectedImportType(nextStep.value);
        }
      }
    } catch (error) {
      setImportProgress({
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "Import failed",
      });
      toast.error("Import failed");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      if (hasSubTemplates && selectedSubTemplates.length === 0) {
        toast.error("Select at least one template scope before downloading.");
        return;
      }

      const searchParams = new URLSearchParams();
      if (hasSubTemplates && selectedSubTemplates.length > 0) {
        searchParams.set("subTemplates", selectedSubTemplates.join(","));
      }

      const endpoint = searchParams.toString()
        ? `/api/csv-import/${selectedImportType}?${searchParams.toString()}`
        : `/api/csv-import/${selectedImportType}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to download template");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const scopeSuffix = hasSubTemplates && selectedSubTemplates.length > 0
        ? `_${selectedSubTemplates.join("-")}`
        : "";
      a.download = `${selectedImportType}${scopeSuffix}_import_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Template downloaded successfully");
    } catch (error) {
      toast.error("Failed to download template");
    }
  };

  const handleDownloadAll = async () => {
    try {
      const response = await fetch("/api/csv-import/download-all");
      if (!response.ok) throw new Error("Failed to download templates");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "csv_import_templates.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("All templates downloaded successfully");
    } catch (error) {
      toast.error("Failed to download templates");
    }
  };

  const resetImport = () => {
    setImportProgress({
      status: "idle",
      progress: 0,
      message: "",
    });
    setSelectedFile(null);
    setShowResults(false);
    setShowActivationOptions(false);
    setValidationErrors([]);
    setLastImportedType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleResetDialogChange = (open: boolean) => {
    setResetDialogOpen(open);
    if (!open) {
      setResetError(null);
    }
  };

  const handleSystemReset = async () => {
    setResettingSystem(true);
    setResetError(null);

    try {
      const response = await fetch("/api/system/reset", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === "string" && payload.error) ||
          "We couldn't reset the data. Please try again.";
        setResetError(message);
        return;
      }

      resetImport();
      toast.success(
        "All company data linked to this import has been cleared. You're ready to start fresh.",
      );
      setResetDialogOpen(false);
    } catch (error) {
      console.error("System reset failed", error);
      setResetError("Unexpected error while resetting data. Please try again.");
    } finally {
      setResettingSystem(false);
    }
  };

  const handleActivateEmployees = async () => {
    if (!importProgress.result?.created) {
      toast.error("No employees to activate");
      return;
    }

    const employeeIds = importProgress.result.created.map((emp: any) => emp.id);

    const message = activationOptions.sendEmails 
      ? "Activating employees and sending welcome emails..."
      : "Activating employees and setting up permissions...";
    
    setImportProgress({
      status: "processing",
      progress: 50,
      message,
    });

    try {
      const response = await fetch("/api/csv-import/employees/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeIds,
          ...activationOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Activation failed");
      }

      setImportProgress({
        status: "completed",
        progress: 100,
        message: "Employee activation completed successfully!",
        result: {
          ...importProgress.result!,
          activation: data.results,
        },
      });

      toast.success(
        `Activation completed: ${data.results.activated} employees activated, ${data.results.emailsSent} emails sent`
      );

    } catch (error) {
      setImportProgress({
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "Activation failed",
      });
      toast.error("Employee activation failed");
    }
  };

  const handleSendWelcomeEmails = async (rolloutType: "all" | "gradual") => {
    if (rolloutType === "gradual") {
      const hasDepartmentFilter = welcomeFilters.departmentIds.length > 0;
      const hasLocationFilter = welcomeFilters.locationIds.length > 0;
      const hasNameFilter = welcomeFilters.nameQuery.trim().length > 0;

      if (!hasDepartmentFilter && !hasLocationFilter && !hasNameFilter) {
        toast.error("Choose at least one filter before sending a gradual rollout.");
        return;
      }
    }

    try {
      setIsSendingWelcomeEmails(true);
      setWelcomeSummary(null);

      const response = await fetch("/api/csv-import/employees/welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rolloutType,
          filters:
            rolloutType === "gradual"
              ? {
                  departmentIds: welcomeFilters.departmentIds,
                  locationIds: welcomeFilters.locationIds,
                  nameQuery: welcomeFilters.nameQuery.trim(),
                }
              : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send welcome emails");
      }

      if (data.summary) {
        setWelcomeSummary({
          targeted: Number(data.summary.targeted ?? 0),
          sent: Number(data.summary.sent ?? 0),
          skipped: Number(data.summary.skipped ?? 0),
          errors: Array.isArray(data.summary.errors)
            ? data.summary.errors.map((error: any) => ({
                employeeId: String(error.employeeId ?? "unknown"),
                email: String(error.email ?? "unknown"),
                reason: String(error.reason ?? "Unknown error"),
              }))
            : [],
        });
      }

      const targeted = data.summary?.targeted ?? 0;
      const sent = data.summary?.sent ?? 0;

      if (targeted === 0) {
        toast.info("No eligible employees found for the selected filters.");
      } else if (sent === 0) {
        toast.warning("Eligible employees were found but no emails were sent.");
      } else {
        toast.success(`Sent welcome emails to ${sent} employee${sent === 1 ? "" : "s"}.`);
      }

      // Refresh activation status after sending emails
      await loadActivationStatus();
    } catch (error) {
      console.error("Failed to send welcome emails", error);
      toast.error(error instanceof Error ? error.message : "Failed to send welcome emails");
    } finally {
      setIsSendingWelcomeEmails(false);
    }
  };

  const handleSendEmailsToSelected = async (employeeIds: string[]) => {
    try {
      const response = await fetch("/api/csv-import/employees/send-selected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send welcome emails");
      }

      // Refresh activation status after sending emails
      await loadActivationStatus();

      return data;
    } catch (error) {
      console.error("Failed to send welcome emails to selected employees", error);
      throw error;
    }
  };

  const handleActivationOptionChange = (option: keyof ActivationOptions, value: boolean) => {
    setActivationOptions(previous => ({
      ...previous,
      [option]: value,
    }));
  };

  const handleToggleWelcomeEmailOptions = () => {
    setShowWelcomeEmailOptions(previous => {
      if (previous) {
        setWelcomeSummary(null);
        setWelcomeMetadataLoaded(false);
      }
      return !previous;
    });
  };

  const handleAllowUpdatesChange = (checked: boolean) => {
    setAllowUpdates(checked);
  };

  const getStatusIcon = () => {
    switch (importProgress.status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "processing":
      case "uploading":
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (importProgress.status) {
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "processing":
      case "uploading":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <PageShell
      title="CSV Import"
      description="Import employee data, departments, and other master data via CSV files"
      breadcrumbs={breadcrumbConfigs.settingsSection("CSV Import")}
      showHomeIcon={false}
      action={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            disabled={hasSubTemplates && selectedSubTemplates.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" onClick={handleDownloadAll}>
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
          {importProgress.status !== "idle" && (
            <Button variant="outline" onClick={resetImport}>
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
          {isAdmin && (
            <Dialog
              open={resetDialogOpen}
              onOpenChange={handleResetDialogChange}
            >
              <DialogTrigger asChild>
                <Button variant="danger" disabled={resettingSystem}>
                  {resettingSystem ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-4 h-4 mr-2" />
                  )}
                  Reset system
                </Button>
              </DialogTrigger>
              <DialogContent className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Reset company data</DialogTitle>
                  <DialogDescription>
                    Remove all employees, departments, job roles, working patterns,
                    and leave settings created via CSV import. Your own admin user is
                    preserved so you can start again.
                  </DialogDescription>
                </DialogHeader>
                <Alert variant="destructive">
                  <AlertTitle>This cannot be undone</AlertTitle>
                  <AlertDescription>
                    Confirming will permanently erase imported data. Make sure you
                    have backups of any reports you need to keep.
                  </AlertDescription>
                </Alert>
                {resetError && (
                  <p className="text-sm text-destructive">{resetError}</p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleResetDialogChange(false)}
                    disabled={resettingSystem}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleSystemReset}
                    disabled={resettingSystem}
                  >
                    {resettingSystem ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCcw className="w-4 h-4 mr-2" />
                    )}
                    Confirm reset
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Employee Activation Status Card */}
        {activationStats && activationStats.total > 0 && (
          <ActivationStatusCard
            stats={activationStats}
            employees={activationEmployees}
            showDashboard={showActivationDashboard}
            onToggleDashboard={() => setShowActivationDashboard(previous => !previous)}
            onOpenSendWelcomeModal={() => setShowSendWelcomeModal(true)}
          />
        )}

        <ImportTypeSelector
          options={importTypeOptions}
          value={selectedImportType}
          onChange={setSelectedImportType}
          selectedConfig={selectedDomainConfig}
          selectedTemplate={selectedTemplate}
        />

        {hasSubTemplates && selectedDomainConfig.subTemplates && (
          <SubTemplateSelector
            subTemplates={selectedDomainConfig.subTemplates}
            selectedSubTemplates={selectedSubTemplates}
            defaultSelectedSubTemplates={defaultSubTemplateSelection}
            onSelectionChange={setSelectedSubTemplates}
          />
        )}

        <ImportInstructionsCard
          domain={selectedDomainConfig}
          template={selectedTemplate}
          importSequence={importSequence}
          activeImportType={selectedImportType}
        />

        <TemplateGuidance
          config={selectedDomainConfig}
          importOrder={importSequence}
          activeImportType={selectedImportType}
        />

        <FileUploadCard
          domain={selectedDomainConfig}
          selectedImportType={selectedImportType}
          selectedFile={selectedFile}
          validationErrors={validationErrors}
          allowUpdates={allowUpdates}
          fileInputRef={fileInputRef}
          onAllowUpdatesChange={handleAllowUpdatesChange}
          onFileSelect={handleFileSelect}
          onImport={handleImport}
          onResetUpload={resetImport}
          disableActions={importProgress.status === "processing" || importProgress.status === "uploading"}
        />

        {/* Import Progress */}
        {importProgress.status !== "idle" && (
          <ImportProgressCard
            statusIcon={getStatusIcon()}
            statusColor={getStatusColor()}
            message={importProgress.message}
            progress={importProgress.progress}
            summaryLabel={
              lastImportedType ? `Import summary for ${getImportLabel(lastImportedType)}` : undefined
            }
          >
            {importProgress.status === "completed" && importProgress.result && (
              <div className="space-y-4">
                <ImportSummaryStats result={importProgress.result} />

                {selectedImportType === "employees" && (
                  <div className="border-t pt-4 space-y-4">
                    <EmployeeActivationOptions
                      createdCount={importProgress.result.created.length}
                      showActivationOptions={showActivationOptions}
                      activationOptions={activationOptions}
                      onToggleOptions={() => setShowActivationOptions(previous => !previous)}
                      onChangeOption={handleActivationOptionChange}
                      onActivateEmployees={handleActivateEmployees}
                    />

                    <EmployeeWelcomeRollout
                      showWelcomeEmailOptions={showWelcomeEmailOptions}
                      onToggleWelcomeEmailOptions={handleToggleWelcomeEmailOptions}
                      welcomeMetadataError={welcomeMetadataError}
                      welcomeMetadataLoading={welcomeMetadataLoading}
                      availableDepartments={availableDepartments}
                      availableLocations={availableLocations}
                      welcomeFilters={welcomeFilters}
                      onFiltersChange={setWelcomeFilters}
                      isSendingWelcomeEmails={isSendingWelcomeEmails}
                      onSendEmails={handleSendWelcomeEmails}
                      welcomeSummary={welcomeSummary}
                    />
                  </div>
                )}

                {importProgress.result.activation && (
                  <ImportActivationSummary activationResult={importProgress.result.activation} />
                )}
              </div>
            )}
          </ImportProgressCard>
        )}

        {/* Import Results */}
        {showResults && importProgress.result && (
          <ImportResultsCard result={importProgress.result} />
        )}

        {/* Template field guidance moved into TemplateGuidance component */}
      </div>

      {/* Send Welcome Email Modal */}
      <SendWelcomeEmailModal
        isOpen={showSendWelcomeModal}
        onClose={() => setShowSendWelcomeModal(false)}
        onSendEmails={handleSendEmailsToSelected}
      />
    </PageShell>
  );
}
