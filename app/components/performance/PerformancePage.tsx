"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Button from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import {
  Target,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  ArrowRight,
  ListTodo,
  Layers,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatLondon, formatLondonDate } from "@/lib/time";
import { ScheduleMeetingDialog } from "@/components/performance/ScheduleMeetingDialog";
import { CreateReviewCycleDialog } from "@/components/performance/CreateReviewCycleDialog";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { usePerformanceData, Objective, Meeting, ActionItemWithSource } from "@/hooks/usePerformanceData";
import { usePerformanceReferenceData, EmployeeSummary } from "@/hooks/usePerformanceReferenceData";
import { usePerformanceDocuments, PerformanceDocument } from "@/hooks/usePerformanceDocuments";
import { useEmployeeSummary } from "@/hooks/useEmployeeSummary";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { BreadcrumbItem } from "@/components/ui/Breadcrumb";
import { PendingActionItemsPanel } from "@/components/performance/PendingActionItemsPanel";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ModernDocumentPreview from "@/components/documents/ModernDocumentPreview";
import SignatureSuccessAnimation from "@/components/documents/SignatureSuccessAnimation";
import AcknowledgmentSuccessAnimation from "@/components/documents/AcknowledgmentSuccessAnimation";
import type { SignatureCaptureValue } from "@/components/documents/ModernSignatureCapture";
import { FileText, Download, Eye, CheckCircle, PenTool } from "lucide-react";

const statusColors = {
  NOT_STARTED: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  AT_RISK: "bg-orange-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
  DEFERRED: "bg-gray-400",
};

const priorityColors = {
  LOW: "bg-gray-200 text-gray-700",
  MEDIUM: "bg-blue-200 text-blue-700",
  HIGH: "bg-orange-200 text-orange-700",
  CRITICAL: "bg-red-200 text-red-700",
};

const timeframeOptions = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

const objectiveStatusFilters = [
  { value: "ALL", label: "All" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_STARTED", label: "Not Started" },
];

const OBJECTIVES_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export interface PerformancePageProps {
  employeeId?: string;
}

export default function PerformancePage({ employeeId }: PerformancePageProps = {}) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize state from URL params
  const getInitialTimeframe = () => {
    const param = searchParams?.get("timeframe");
    if (param) {
      const parsed = Number.parseInt(param, 10);
      if ([30, 60, 90].includes(parsed)) return parsed;
    }
    return 30;
  };

  const getInitialDepartments = () => {
    const param = searchParams?.get("departments");
    if (param) {
      try {
        const parsed = JSON.parse(decodeURIComponent(param)) as string[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : ["all"];
      } catch {
        return ["all"];
      }
    }
    return ["all"];
  };

  const getInitialRoles = () => {
    const param = searchParams?.get("roles");
    if (param) {
      try {
        const parsed = JSON.parse(decodeURIComponent(param)) as string[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : ["all"];
      } catch {
        return ["all"];
      }
    }
    return ["all"];
  };

  const getInitialStatus = () => {
    const param = searchParams?.get("status");
    if (param && ["ALL", "IN_PROGRESS", "AT_RISK", "COMPLETED", "NOT_STARTED"].includes(param)) {
      return param;
    }
    return "ALL";
  };

  const getInitialSearch = () => {
    return searchParams?.get("search") || "";
  };

  const getInitialTab = () => {
    const param = searchParams?.get("tab");
    if (param && ["overview", "objectives", "meetings", "documents"].includes(param)) {
      return param;
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [timeframe, setTimeframe] = useState<number>(getInitialTimeframe);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(getInitialDepartments);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(getInitialRoles);
  const [objectiveStatus, setObjectiveStatus] = useState<string>(getInitialStatus);
  const [searchQuery, setSearchQuery] = useState(getInitialSearch);
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  const [objectivePage, setObjectivePage] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize from URL on mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);
  
  // Sync URL with state changes (only after initialization)
  const updateURL = useCallback(
    (updates: {
      timeframe?: number;
      departments?: string[];
      roles?: string[];
      status?: string;
      search?: string;
      tab?: string;
    }) => {
      try {
        const params = new URLSearchParams(searchParams?.toString() || "");
        
        if (updates.timeframe !== undefined) {
          if (updates.timeframe === 30) {
            params.delete("timeframe");
          } else {
            params.set("timeframe", updates.timeframe.toString());
          }
        }
        
        if (updates.departments !== undefined) {
          if (updates.departments.length === 0 || (updates.departments.length === 1 && updates.departments[0] === "all")) {
            params.delete("departments");
          } else {
            params.set("departments", encodeURIComponent(JSON.stringify(updates.departments)));
          }
        }
        
        if (updates.roles !== undefined) {
          if (updates.roles.length === 0 || (updates.roles.length === 1 && updates.roles[0] === "all")) {
            params.delete("roles");
          } else {
            params.set("roles", encodeURIComponent(JSON.stringify(updates.roles)));
          }
        }
        
        if (updates.status !== undefined) {
          if (updates.status === "ALL") {
            params.delete("status");
          } else {
            params.set("status", updates.status);
          }
        }
        
        if (updates.search !== undefined) {
          if (!updates.search) {
            params.delete("search");
          } else {
            params.set("search", updates.search);
          }
        }
        
        if (updates.tab !== undefined) {
          if (updates.tab === "overview") {
            params.delete("tab");
          } else {
            params.set("tab", updates.tab);
          }
        }
        
        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
      } catch (error) {
        console.error("Failed to update URL:", error);
      }
    },
    [searchParams, pathname, router]
  );

  // Update URL when state changes (only after initialization to prevent loops)
  useEffect(() => {
    if (!isInitialized) return;
    updateURL({ timeframe });
  }, [timeframe, updateURL, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    updateURL({ departments: selectedDepartments });
  }, [selectedDepartments, updateURL, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    updateURL({ roles: selectedRoles });
  }, [selectedRoles, updateURL, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    updateURL({ status: objectiveStatus });
  }, [objectiveStatus, updateURL, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    updateURL({ search: debouncedSearchQuery });
  }, [debouncedSearchQuery, updateURL, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    updateURL({ tab: activeTab });
  }, [activeTab, updateURL, isInitialized]);

  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [showCreateReviewCycle, setShowCreateReviewCycle] = useState(false);
  
  // Documents tab state
  const [selectedDocument, setSelectedDocument] = useState<PerformanceDocument | null>(null);
  const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false);
  const [showAckSuccess, setShowAckSuccess] = useState(false);
  const [showSignSuccess, setShowSignSuccess] = useState(false);
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackDate, setAckDate] = useState<Date | null>(null);
  const [signed, setSigned] = useState(false);
  const [successDocumentName, setSuccessDocumentName] = useState<string | null>(null);
  const [successAcknowledgedAt, setSuccessAcknowledgedAt] = useState<Date | null>(null);
  const [successSignedAt, setSuccessSignedAt] = useState<Date | null>(null);
  const [successSignatureMethod, setSuccessSignatureMethod] = useState<"TYPED" | "DRAWN" | null>(null);

  const canManageTemplates =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";

  const canScheduleMeetings = Boolean(session?.user);
  const canCreateObjectives = Boolean(session?.user);
  const canCreateReviewCycle = canManageTemplates;

  const isEmployeeContext = Boolean(employeeId);

  // Fetch employee summary for personalized header
  const { employee: employeeSummary, isLoading: employeeSummaryLoading } = useEmployeeSummary(
    employeeId,
    { enabled: isEmployeeContext && Boolean(session) }
  );

  const { departments, jobRoles, employees } = usePerformanceReferenceData({
    enabled: Boolean(session),
    includeEmployees: !isEmployeeContext,
  });

  const { objectives, meetings, actionItems, stats, isLoading, error, refresh } = usePerformanceData({
    timeframeDays: timeframe,
    employeeId,
    participantId: employeeId,
  });

  const { documents, stats: docStats, isLoading: documentsLoading, error: documentsError, refresh: refreshDocuments } = usePerformanceDocuments({
    employeeId,
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load performance data");
    }
  }, [error]);

  useEffect(() => {
    setObjectivePage(0);
  }, [selectedDepartments, selectedRoles, objectiveStatus, debouncedSearchQuery, timeframe]);

  // Re-fetch data when employeeId changes (for navigation between employees)
  useEffect(() => {
    if (employeeId) {
      refresh();
      refreshDocuments();
    }
  }, [employeeId]);

  // Fetch acknowledgement and signature status when document is selected
  useEffect(() => {
    if (!selectedDocument?.id) return;

    // Reset states
    setAcknowledged(false);
    setSigned(false);
    setAckDate(null);

    // Fetch acknowledgement status
    if (selectedDocument.requiresAck) {
      fetch(`/api/documents/acknowledge/${selectedDocument.id}/me`)
        .then((res) => res.json())
        .then((data) => {
          setAcknowledged(data.acknowledged);
          setAckDate(data.acknowledged ? new Date(data.acknowledgedAt) : null);
        })
        .catch(() => {
          setAcknowledged(false);
          setAckDate(null);
        });
    }

    // Fetch signature status
    if (selectedDocument.requiresSignature) {
      fetch(`/api/documents/signatures/${selectedDocument.id}/me`)
        .then((res) => res.json())
        .then((data) => setSigned(!!data.signed))
        .catch(() => setSigned(false));
    }
  }, [selectedDocument?.id, selectedDocument?.requiresAck, selectedDocument?.requiresSignature]);

  const departmentOptions = useMemo(
    () =>
      departments.map((department) => ({
        label: department.name,
        value: department.id,
      })),
    [departments]
  );

  const roleOptions = useMemo(
    () =>
      jobRoles.map((role) => ({
        label: role.name,
        value: role.id,
      })),
    [jobRoles]
  );

  const employeeIndex = useMemo(() => {
    const index = new Map<string, EmployeeSummary>();
    employees.forEach((employee: EmployeeSummary) => {
      index.set(employee.id, employee);
    });
    return index;
  }, [employees]);

  const filteredObjectives = useMemo(() => {
    return objectives.filter((objective: Objective) => {
      const matchesStatus = objectiveStatus === "ALL" || objective.status === objectiveStatus;

      const owner = objective.Owner;
      const departmentMatch = selectedDepartments.includes("all")
        ? true
        : owner?.department?.id
        ? selectedDepartments.includes(owner.department.id)
        : false;

      const roleMatch = selectedRoles.includes("all")
        ? true
        : owner?.jobRole?.id
        ? selectedRoles.includes(owner.jobRole.id)
        : false;

      const searchMatch = debouncedSearchQuery
        ? objective.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          objective.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        : true;

      return matchesStatus && departmentMatch && roleMatch && searchMatch;
    });
  }, [objectiveStatus, objectives, debouncedSearchQuery, selectedDepartments, selectedRoles]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting: Meeting) => {
      if (selectedDepartments.includes("all") && selectedRoles.includes("all")) {
        return true;
      }

      const participantEmployees = meeting.participantIds
        .map((participantId) => employeeIndex.get(participantId))
        .filter(Boolean) as EmployeeSummary[];

      const departmentMatch = selectedDepartments.includes("all")
        ? true
        : participantEmployees.some((employee) =>
            employee.departmentId ? selectedDepartments.includes(employee.departmentId) : false
          );

      const roleMatch = selectedRoles.includes("all")
        ? true
        : participantEmployees.some((employee) =>
            employee.jobRoleId ? selectedRoles.includes(employee.jobRoleId) : false
          );

      return departmentMatch && roleMatch;
    });
  }, [meetings, selectedDepartments, selectedRoles, employeeIndex]);

  const paginatedObjectives = useMemo(() => {
    const pages: Objective[][] = [];
    for (let i = 0; i < filteredObjectives.length; i += OBJECTIVES_PAGE_SIZE) {
      pages.push(filteredObjectives.slice(i, i + OBJECTIVES_PAGE_SIZE));
    }
    return { pages, pageSize: OBJECTIVES_PAGE_SIZE };
  }, [filteredObjectives]);

  const visibleObjectives = paginatedObjectives.pages[objectivePage] ?? [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "AT_RISK":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const refreshData = () => {
    refresh();
    refreshDocuments();
  };

  const handleCloseDocumentPreview = () => {
    setIsDocPreviewOpen(false);
    setSelectedDocument(null);
    setAcknowledged(false);
    setSigned(false);
    setAckDate(null);
  };

  const handleAcknowledgeDocument = () => {
    if (!selectedDocument) return;

    void (async () => {
      try {
        const res = await fetch("/api/documents/acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: selectedDocument.id }),
        });

        if (res.ok) {
          const now = new Date();
          setAcknowledged(true);
          setAckDate(now);
          setSuccessDocumentName(selectedDocument.name);
          setSuccessAcknowledgedAt(now);
          setShowAckSuccess(true);
          refreshDocuments();
          toast.success("Document acknowledged successfully");
          handleCloseDocumentPreview();
        } else {
          toast.error("Failed to acknowledge document");
        }
      } catch (error) {
        toast.error("Error acknowledging document");
      }
    })();
  };

  const handleSignDocument = (signature: SignatureCaptureValue) => {
    if (!selectedDocument) return;

    void (async () => {
      setSignSubmitting(true);
      try {
        const res = await fetch("/api/documents/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: selectedDocument.id,
            method: signature.method,
            typedText: signature.typedText,
            drawnDataUrl: signature.dataUrl,
          }),
        });

        if (res.ok) {
          const now = new Date();
          setSigned(true);
          setAckDate(now);
          setSuccessDocumentName(selectedDocument.name);
          setSuccessSignedAt(now);
          setSuccessSignatureMethod(signature.method);
          setShowSignSuccess(true);
          refreshDocuments();
          toast.success("Document signed successfully");
          handleCloseDocumentPreview();
        } else {
          toast.error("Failed to sign document");
        }
      } catch (error) {
        toast.error("Error signing document");
      } finally {
        setSignSubmitting(false);
      }
    })();
  };

  // Dynamic page content based on context
  const pageTitle = useMemo(() => {
    if (isEmployeeContext && employeeSummary) {
      return `${employeeSummary.fullName}'s Performance`;
    }
    return isEmployeeContext ? "Employee Performance" : "Performance Management";
  }, [isEmployeeContext, employeeSummary]);

  const pageDescription = useMemo(() => {
    if (isEmployeeContext && employeeSummary) {
      const parts = [];
      if (employeeSummary.title) parts.push(employeeSummary.title);
      if (employeeSummary.department) parts.push(employeeSummary.department);
      return parts.length > 0
        ? `${parts.join(" • ")} • Track objectives, meetings, and performance reviews`
        : "Track objectives, meetings, and performance reviews for this employee";
    }
    return isEmployeeContext
      ? "Objectives, meetings, and reviews focused on this employee."
      : "Manage objectives, 1-2-1s, and performance reviews";
  }, [isEmployeeContext, employeeSummary]);

  // Breadcrumbs configuration
  const breadcrumbs = useMemo(() => {
    if (isEmployeeContext && employeeSummary) {
      const items: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Employees", href: "/employees" },
        { label: employeeSummary.fullName, href: `/employees/${employeeId}/overview` },
        { label: "Performance", isCurrentPage: true },
      ];
      return { items };
    } else if (!isEmployeeContext) {
      const items: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Performance", isCurrentPage: true },
      ];
      return { items };
    }
    return null;
  }, [isEmployeeContext, employeeSummary, employeeId]);

  const handleCreateObjective = () => {
    if (employeeId) {
      router.push(`/performance/objectives/new?employeeId=${employeeId}`);
      return;
    }
    router.push("/performance/objectives/new");
  };

  // Loading state for initial data
  if (isLoading) {
    return (
      <PageShell
        title={employeeSummaryLoading ? "Loading..." : pageTitle}
        description={employeeSummaryLoading ? "Please wait" : pageDescription}
        icon={employeeSummaryLoading ? <Skeleton className="h-6 w-6 rounded-full" /> : <Target className="h-6 w-6" />}
        breadcrumbs={breadcrumbs}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner size="lg" showText text="Loading performance data" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // Enhanced header with avatar for employee context
  const headerIcon = isEmployeeContext && employeeSummary ? (
    <div className="flex items-center gap-3">
      <Avatar
        src={employeeSummary.photoUrl}
        name={employeeSummary.fullName}
        size={48}
      />
      <Target className="h-6 w-6" />
    </div>
  ) : (
    <Target className="h-6 w-6" />
  );

  // Action with optional "Company View" badge
  const headerAction = (
    <div className="flex items-center gap-2">
      {!isEmployeeContext && (
        <Badge variant="secondary" className="mr-2">
          Company View
        </Badge>
      )}
      {canManageTemplates && !isEmployeeContext ? (
        <>
          <Button variant="outline" onClick={refreshData}>
            Refresh Data
          </Button>
          <Button onClick={() => router.push("/performance/templates/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        </>
      ) : isEmployeeContext ? (
        <Button variant="outline" onClick={refreshData}>
          Refresh Data
        </Button>
      ) : undefined}
    </div>
  );

  return (
    <PageShell
      title={pageTitle}
      description={pageDescription}
      icon={headerIcon}
      breadcrumbs={breadcrumbs}
      action={headerAction}
    >
      <div className="space-y-6">
        {!isEmployeeContext && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Filters</CardTitle>
              <CardDescription>
                Slice your performance data by timeframe, department, and role to focus on what matters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Timeframe</span>
                  <div className="flex items-center gap-2">
                    {timeframeOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={timeframe === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeframe(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Departments</span>
                  <MultiSelect
                    options={departmentOptions}
                    selected={selectedDepartments}
                    onChange={(values) => setSelectedDepartments(values.length ? values : ["all"])}
                    placeholder="Filter departments"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Roles</span>
                  <MultiSelect
                    options={roleOptions}
                    selected={selectedRoles}
                    onChange={(values) => setSelectedRoles(values.length ? values : ["all"])}
                    placeholder="Filter job roles"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Objective Status</span>
                  <Select value={objectiveStatus} onValueChange={setObjectiveStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {objectiveStatusFilters.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Search objectives</span>
                  <Input
                    placeholder="Search by title or description"
                    value={searchQuery}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Objectives</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalObjectives}</div>
              <p className="text-xs text-muted-foreground">Across all levels</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedObjectives}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalObjectives > 0
                  ? Math.round((stats.completedObjectives / stats.totalObjectives) * 100)
                  : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.atRiskObjectives}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingMeetings}</div>
              <p className="text-xs text-muted-foreground">Scheduled in the next 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Action Items</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingActionItems}</div>
              <p className="text-xs text-muted-foreground">Across recent meetings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Documents</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{docStats.pendingSignatures + docStats.pendingAcknowledgements}</div>
              <p className="text-xs text-muted-foreground">
                {docStats.pendingSignatures} sigs, {docStats.pendingAcknowledgements} acks
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Objective Progress</CardTitle>
            <CardDescription>Snapshot of how objectives are progressing across the organisation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This quarter</p>
                    <h3 className="text-lg font-semibold">{stats.completedObjectives} completed</h3>
                  </div>
                  <div className="rounded-full bg-green-100 p-3 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {stats.totalObjectives > 0
                    ? Math.round((stats.completedObjectives / stats.totalObjectives) * 100)
                    : 0}% completion rate compared to last quarter
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Objectives at risk</p>
                    <h3 className="text-lg font-semibold">{stats.atRiskObjectives}</h3>
                  </div>
                  <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Proactively review objectives marked as at risk to maintain momentum.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-4 bg-muted">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="objectives">Objectives</TabsTrigger>
                <TabsTrigger value="meetings">1-2-1 Meetings</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Accelerate performance management workflows</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button 
                              className="w-full justify-start" 
                              onClick={handleCreateObjective}
                              disabled={!canCreateObjectives}
                            >
                              <Target className="mr-2 h-4 w-4" /> Create Objective
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!canCreateObjectives && (
                          <TooltipContent>
                            <p>You must be logged in to create objectives</p>
                          </TooltipContent>
                        )}
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button 
                              className="w-full justify-start" 
                              onClick={() => setShowScheduleMeeting(true)}
                              disabled={!canScheduleMeetings}
                            >
                              <Calendar className="mr-2 h-4 w-4" /> Schedule Meeting
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!canScheduleMeetings && (
                          <TooltipContent>
                            <p>You must be logged in to schedule meetings</p>
                          </TooltipContent>
                        )}
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              className="w-full justify-start"
                              onClick={() => setShowCreateReviewCycle(true)}
                              disabled={!canCreateReviewCycle}
                            >
                              <Layers className="mr-2 h-4 w-4" /> Create Review Cycle
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!canCreateReviewCycle && (
                          <TooltipContent>
                            <p>Only managers and admins can create review cycles</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>Pipeline Summary</CardTitle>
                    <CardDescription>Track OKRs, 1-2-1s, and progress signals.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      Objectives funnel the most critical priorities. Use filters to scope by department or role to
                      surface the biggest risks.
                    </p>
                    <p>
                      Meetings keep momentum. Schedule regular 1-2-1s and review cycles to maintain alignment and
                      accountability.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>Need deeper insights?</CardTitle>
                    <CardDescription>
                      The insights tab will soon show predictive attrition risk and coaching opportunities.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Use objectives for strategic alignment, meetings for coaching, and reviews for accountability.</p>
                    <Button variant="outline" className="w-full justify-start" onClick={refreshData}>
                      <TrendingUp className="mr-2 h-4 w-4" /> Refresh Data
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Focus Objectives</CardTitle>
                  <CardDescription>Keep the highest-impact goals on track.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {visibleObjectives.slice(0, 3).map((objective) => (
                    <div key={objective.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(objective.status)}
                            <span className="text-sm font-semibold">{objective.title}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {objective.type}
                            </Badge>
                            <Badge className={priorityColors[objective.priority as keyof typeof priorityColors]}>
                              {objective.priority}
                            </Badge>
                          </div>
                          {objective.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{objective.description}</p>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {objective.Owner && (
                            <p>
                              {objective.Owner.firstName} {objective.Owner.lastName}
                            </p>
                          )}
                          {objective.dueDate && <p>Due {formatLondonDate(objective.dueDate)}</p>}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{objective.progress}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted">
                          <div
                            className={cn("h-2 rounded-full", getProgressColor(objective.progress))}
                            style={{ width: `${objective.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {visibleObjectives.length === 0 && (
                    <p className="text-sm text-muted-foreground">No objectives match these filters.</p>
                  )}
                </CardContent>
              </Card>

              <PendingActionItemsPanel 
                actionItems={actionItems}
                onRefresh={refreshData}
                isEmployeeContext={isEmployeeContext}
              />
            </TabsContent>

            <TabsContent value="objectives" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">All Objectives</h3>
                  <p className="text-sm text-muted-foreground">Cascading goals across the organisation</p>
                </div>
                <Button onClick={handleCreateObjective}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Objective
                </Button>
              </div>

              {filteredObjectives.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Target className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No objectives yet</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Start by creating your first objective to track progress
                    </p>
                    <Button onClick={handleCreateObjective}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Objective
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {visibleObjectives.map((objective) => (
                    <Card key={objective.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(objective.status)}
                              <CardTitle className="text-base">{objective.title}</CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {objective.type}
                              </Badge>
                              <Badge className={priorityColors[objective.priority as keyof typeof priorityColors]}>
                                {objective.priority}
                              </Badge>
                            </div>
                            {objective.description && (
                              <CardDescription className="mt-2">{objective.description}</CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{objective.progress}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className={`h-full ${getProgressColor(objective.progress)} transition-all`}
                              style={{ width: `${objective.progress}%` }}
                            />
                          </div>
                        </div>

                        {objective.keyResults && objective.keyResults.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Key Results</h4>
                            {objective.keyResults.map((kr) => (
                              <div
                                key={kr.id}
                                className="flex items-center justify-between rounded bg-muted/50 p-2 text-sm"
                              >
                                <span>{kr.title}</span>
                                <span className="font-medium">
                                  {kr.currentValue} / {kr.targetValue}
                                  {kr.unit && ` ${kr.unit}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            {objective.Owner && (
                              <span>
                                Owner: {objective.Owner.firstName} {objective.Owner.lastName}
                              </span>
                            )}
                            {objective.dueDate && <span>Due {formatLondonDate(objective.dueDate)}</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/performance/objectives/${objective.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {paginatedObjectives.pages.length > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <p className="text-xs text-muted-foreground">
                        Showing {objectivePage * paginatedObjectives.pageSize + 1}-
                        {Math.min((objectivePage + 1) * paginatedObjectives.pageSize, filteredObjectives.length)} of {" "}
                        {filteredObjectives.length} objectives
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={objectivePage === 0}
                          onClick={() => setObjectivePage((page) => Math.max(page - 1, 0))}
                        >
                          Previous
                        </Button>
                        <span className="text-xs">
                          Page {objectivePage + 1} of {paginatedObjectives.pages.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={objectivePage >= paginatedObjectives.pages.length - 1}
                          onClick={() =>
                            setObjectivePage((page) =>
                              Math.min(page + 1, paginatedObjectives.pages.length - 1)
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">1-2-1 Meetings</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Schedule and manage performance conversations
                  </p>
                  <Button onClick={() => setShowScheduleMeeting(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Meeting Timeline</CardTitle>
                  <CardDescription>Recently completed and upcoming conversations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredMeetings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No meetings in this timeframe</p>
                  ) : (
                    filteredMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="flex items-start justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatLondon(meeting.scheduledAt)} • {meeting.duration} minutes • {meeting.participantIds.length} participants
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            "uppercase",
                            meeting.status === "COMPLETED" && "bg-green-100 text-green-700",
                            meeting.status === "SCHEDULED" && "bg-blue-100 text-blue-700",
                            meeting.status === "CANCELLED" && "bg-red-100 text-red-700"
                          )}
                        >
                          {meeting.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    {isEmployeeContext
                      ? "Documents assigned to this employee"
                      : "Company policies, contracts, and documents requiring action"}
                  </p>
                </div>
                {canManageTemplates && !isEmployeeContext && (
                  <Button onClick={() => router.push("/documents")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Manage Documents
                  </Button>
                )}
              </div>

              {documentsLoading ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <LoadingSpinner size="lg" showText text="Loading documents" />
                  </CardContent>
                </Card>
              ) : documents.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No documents yet</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {isEmployeeContext
                        ? "No documents have been assigned to this employee"
                        : "No documents match your current filters"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Documents Summary Cards */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{docStats.totalDocuments}</div>
                        <p className="text-xs text-muted-foreground">Available in this context</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Signatures</CardTitle>
                        <PenTool className="h-4 w-4 text-orange-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{docStats.pendingSignatures}</div>
                        <p className="text-xs text-muted-foreground">Awaiting signature</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Acks</CardTitle>
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{docStats.pendingAcknowledgements}</div>
                        <p className="text-xs text-muted-foreground">Awaiting acknowledgement</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Documents List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Document List</CardTitle>
                      <CardDescription>
                        Click any document to preview, sign, or acknowledge
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {documents.map((doc) => {
                          const requiresAction = 
                            (doc.requiresSignature && doc.signatureOutstandingCount && doc.signatureOutstandingCount > 0) ||
                            (doc.requiresAck && doc.ackOutstandingCount && doc.ackOutstandingCount > 0);
                          
                          return (
                            <div
                              key={doc.id}
                              onClick={() => {
                                setSelectedDocument(doc);
                                setIsDocPreviewOpen(true);
                              }}
                              className={cn(
                                "flex items-start justify-between rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted",
                                requiresAction && "border-orange-200 bg-orange-50/50"
                              )}
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <div className="rounded-full bg-muted p-2">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{doc.name}</span>
                                    {requiresAction && (
                                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                        Action Required
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.category || "Uncategorized"} • {new Date(doc.createdAt).toLocaleDateString()}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs">
                                    {doc.requiresSignature && (
                                      <span className={cn(
                                        "flex items-center gap-1",
                                        doc.signatureOutstandingCount && doc.signatureOutstandingCount > 0
                                          ? "text-orange-700"
                                          : "text-green-700"
                                      )}>
                                        <PenTool className="h-3 w-3" />
                                        {doc.signatureCompletedCount ?? 0}/{doc.signatureTargetCount ?? 0} signed
                                      </span>
                                    )}
                                    {doc.requiresAck && (
                                      <span className={cn(
                                        "flex items-center gap-1",
                                        doc.ackOutstandingCount && doc.ackOutstandingCount > 0
                                          ? "text-orange-700"
                                          : "text-green-700"
                                      )}>
                                        <CheckCircle className="h-3 w-3" />
                                        {doc.ackCompletedCount ?? 0}/{doc.ackTargetCount ?? 0} acknowledged
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDocument(doc);
                                  setIsDocPreviewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        <ScheduleMeetingDialog
          open={showScheduleMeeting}
          onOpenChange={setShowScheduleMeeting}
          onSuccess={refreshData}
          employeeId={employeeId}
        />

        <CreateReviewCycleDialog
          open={showCreateReviewCycle}
          onOpenChange={setShowCreateReviewCycle}
          onSuccess={refreshData}
        />

        {/* Document Preview Modal */}
        {selectedDocument && (
          <ModernDocumentPreview
            isOpen={isDocPreviewOpen}
            onClose={handleCloseDocumentPreview}
            document={{
              id: selectedDocument.id,
              name: selectedDocument.name,
              category: selectedDocument.category,
              size: selectedDocument.size,
              url: selectedDocument.url,
              requiresAck: selectedDocument.requiresAck,
              requiresSignature: selectedDocument.requiresSignature,
            }}
            acknowledged={acknowledged}
            ackDate={ackDate}
            signed={signed}
            onAcknowledge={handleAcknowledgeDocument}
            onSign={handleSignDocument}
            signSubmitting={signSubmitting}
          />
        )}

        {/* Signature Capture Modal */}

        {/* Success Animations */}
        <AcknowledgmentSuccessAnimation
          isOpen={showAckSuccess}
          onClose={() => setShowAckSuccess(false)}
          documentName={successDocumentName ?? selectedDocument?.name ?? ""}
          acknowledgedAt={successAcknowledgedAt ?? ackDate ?? new Date()}
        />
        <SignatureSuccessAnimation
          isOpen={showSignSuccess}
          onClose={() => setShowSignSuccess(false)}
          documentName={successDocumentName ?? selectedDocument?.name ?? ""}
          signedAt={successSignedAt ?? ackDate ?? new Date()}
          signatureMethod={successSignatureMethod ?? "DRAWN"}
        />
      </div>
    </PageShell>
  );
}
