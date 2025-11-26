"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  Zap,
  BarChart3,
  Trophy,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Eye,
  ChevronRight,
  MessageSquare,
  Star,
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
import { FileText, Download, PenTool, CheckCircle } from "lucide-react";
import { useTenantFetch } from "@/hooks/useTenantFetch";

const statusColors: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  AT_RISK: "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  DEFERRED: "bg-gray-100 text-gray-600 border-gray-200",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIUM: "bg-sky-100 text-sky-700 border-sky-200",
  HIGH: "bg-amber-100 text-amber-700 border-amber-200",
  CRITICAL: "bg-rose-100 text-rose-700 border-rose-200",
};

const timeframeOptions = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

const objectiveStatusFilters = [
  { value: "ALL", label: "All Status" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_STARTED", label: "Not Started" },
];

const OBJECTIVES_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
};

const cardHoverVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 25 } }
};

export interface PerformancePageProps {
  employeeId?: string;
}

export default function PerformancePage({ employeeId }: PerformancePageProps = {}) {
  const tenantFetch = useTenantFetch();
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
  const [showFilters, setShowFilters] = useState(false);
  
  // Initialize from URL on mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);
  
  // Sync URL with state changes
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

  // Update URL when state changes
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

  // Re-fetch data when employeeId changes
  useEffect(() => {
    if (employeeId) {
      refresh();
      refreshDocuments();
    }
  }, [employeeId]);

  // Fetch acknowledgement and signature status when document is selected
  useEffect(() => {
    if (!selectedDocument?.id) return;

    setAcknowledged(false);
    setSigned(false);
    setAckDate(null);

    if (selectedDocument.requiresAck) {
      tenantFetch(`/api/documents/acknowledge/${selectedDocument.id}/me`)
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

    if (selectedDocument.requiresSignature) {
      tenantFetch(`/api/documents/signatures/${selectedDocument.id}/me`)
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
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "AT_RISK":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Target className="h-4 w-4 text-slate-400" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-gradient-to-r from-emerald-500 to-teal-500";
    if (progress >= 50) return "bg-gradient-to-r from-blue-500 to-cyan-500";
    if (progress >= 25) return "bg-gradient-to-r from-amber-500 to-orange-500";
    return "bg-gradient-to-r from-rose-500 to-pink-500";
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

  // Calculate completion rate
  const completionRate = stats.totalObjectives > 0
    ? Math.round((stats.completedObjectives / stats.totalObjectives) * 100)
    : 0;

  // Loading state
  if (isLoading) {
    return (
      <PageShell
        title={employeeSummaryLoading ? "Loading..." : pageTitle}
        description={employeeSummaryLoading ? "Please wait" : pageDescription}
        icon={employeeSummaryLoading ? <Skeleton className="h-6 w-6 rounded-full" /> : <Target className="h-6 w-6" />}
        breadcrumbs={breadcrumbs}
      >
        <div className="flex flex-col items-center justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mb-6"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground font-medium"
          >
            Loading performance data...
          </motion.p>
        </div>
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

  // Action buttons
  const headerAction = (
    <div className="flex items-center gap-2">
      {!isEmployeeContext && (
        <Badge variant="secondary" className="mr-2 bg-primary/10 text-primary border-primary/20">
          <BarChart3 className="w-3 h-3 mr-1" />
          Company View
        </Badge>
      )}
      {canManageTemplates && !isEmployeeContext ? (
        <>
          <Button variant="outline" onClick={refreshData} className="hidden sm:flex">
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={() => router.push("/performance/templates/new")}
            className="bg-gradient-to-r from-primary to-primary/80 shadow-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Template</span>
            <span className="sm:hidden">New</span>
          </Button>
        </>
      ) : isEmployeeContext ? (
        <Button variant="outline" onClick={refreshData}>
          <TrendingUp className="mr-2 h-4 w-4" />
          Refresh
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
        {/* Spotlight Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/60"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />
          <div className="flex flex-col gap-4 p-4 pl-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                  <Sparkles className="h-3 w-3" /> Performance Hub
                </div>
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                {isEmployeeContext 
                  ? `Track ${employeeSummary?.fullName?.split(' ')[0] || 'employee'}'s growth journey`
                  : "Drive performance across your organisation"}
              </h2>
              <p className="text-xs text-slate-600 max-w-lg">
                {isEmployeeContext 
                  ? "Monitor objectives, schedule check-ins, and review key documents—all in one place."
                  : "Set objectives, schedule 1-2-1s, and run performance reviews with curated templates and automation."}
              </p>
            </div>
            <div className="flex items-center gap-3 md:flex-col md:items-end lg:flex-row">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Completion Rate</p>
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-2xl font-bold text-slate-900">{completionRate}%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {stats.completedObjectives} of {stats.totalObjectives} objectives completed
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Button 
                  onClick={handleCreateObjective}
                  size="sm" 
                  className="bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-sm text-xs h-8"
                >
                  <Target className="h-3 w-3 mr-1.5" />
                  New Objective
                </Button>
                <Button 
                  onClick={() => setShowScheduleMeeting(true)}
                  size="sm" 
                  variant="ghost" 
                  className="text-slate-600 hover:bg-white/60 text-xs h-8"
                >
                  <Calendar className="h-3 w-3 mr-1.5" />
                  Schedule 1-2-1
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters Panel - Collapsible on mobile */}
        {!isEmployeeContext && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-premium border-white/20 shadow-lg overflow-hidden">
              <CardHeader 
                className="cursor-pointer md:cursor-default py-4"
                onClick={() => setShowFilters(!showFilters)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Performance Filters</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="md:hidden"
                    onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
                  >
                    <ChevronRight className={cn("h-4 w-4 transition-transform", showFilters && "rotate-90")} />
                  </Button>
                </div>
              </CardHeader>
              <AnimatePresence initial={false}>
                {(showFilters || typeof window !== 'undefined' && window.innerWidth >= 768) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden md:!h-auto md:!opacity-100"
                  >
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        {/* Search */}
                        <div className="space-y-1.5 lg:col-span-2">
                          <span className="text-xs font-medium uppercase text-muted-foreground">Search</span>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search objectives..."
                              value={searchQuery}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
                              className="pl-9 h-10 rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Timeframe */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium uppercase text-muted-foreground">Timeframe</span>
                          <div className="flex items-center gap-1">
                            {timeframeOptions.map((option) => (
                              <Button
                                key={option.value}
                                variant={timeframe === option.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTimeframe(option.value)}
                                className={cn(
                                  "flex-1 h-10 rounded-xl text-xs",
                                  timeframe === option.value && "bg-primary shadow-md"
                                )}
                              >
                                {option.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Departments */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium uppercase text-muted-foreground">Departments</span>
                          <MultiSelect
                            options={departmentOptions}
                            selected={selectedDepartments}
                            onChange={(values) => setSelectedDepartments(values.length ? values : ["all"])}
                            placeholder="All departments"
                          />
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
                          <Select value={objectiveStatus} onValueChange={setObjectiveStatus}>
                            <SelectTrigger className="h-10 rounded-xl">
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
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        >
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200/50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-indigo-900">Total Objectives</CardTitle>
                <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Target className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-900">{stats.totalObjectives}</div>
                <p className="text-xs text-indigo-700 mt-1">Across all levels</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200/50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-emerald-900">Completed</CardTitle>
                <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">{stats.completedObjectives}</div>
                <p className="text-xs text-emerald-700 mt-1">{completionRate}% completion</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200/50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-amber-900">At Risk</CardTitle>
                <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">{stats.atRiskObjectives}</div>
                <p className="text-xs text-amber-700 mt-1">Need attention</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200/50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-sky-900">Meetings</CardTitle>
                <div className="p-2 bg-sky-500 rounded-xl shadow-lg shadow-sky-500/20">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-900">{stats.upcomingMeetings}</div>
                <p className="text-xs text-sky-700 mt-1">Scheduled next 30d</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200/50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-violet-900">Action Items</CardTitle>
                <div className="p-2 bg-violet-500 rounded-xl shadow-lg shadow-violet-500/20">
                  <ListTodo className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-900">{stats.pendingActionItems}</div>
                <p className="text-xs text-violet-700 mt-1">Pending tasks</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200/50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-rose-900">Documents</CardTitle>
                <div className="p-2 bg-rose-500 rounded-xl shadow-lg shadow-rose-500/20">
                  <FileCheck className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-900">{docStats.pendingSignatures + docStats.pendingAcknowledgements}</div>
                <p className="text-xs text-rose-700 mt-1">
                  {docStats.pendingSignatures} sigs, {docStats.pendingAcknowledgements} acks
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Progress Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">This Quarter</CardTitle>
                  <CardDescription>Objectives completed</CardDescription>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
                  <Trophy className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-emerald-600">{stats.completedObjectives}</div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {completionRate}% completion rate this quarter
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-amber-50/50 to-orange-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">At Risk</CardTitle>
                  <CardDescription>Objectives needing attention</CardDescription>
                </div>
                <div className="p-3 rounded-2xl bg-amber-100 text-amber-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-amber-600">{stats.atRiskObjectives}</div>
                <div className="flex-1">
                  <p className="text-sm text-slate-600">
                    {stats.atRiskObjectives > 0 
                      ? "Review these objectives to identify blockers and get back on track."
                      : "All objectives are on track! Keep up the great work."}
                  </p>
                  {stats.atRiskObjectives > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100 p-0 h-auto"
                      onClick={() => {
                        setObjectiveStatus("AT_RISK");
                        setActiveTab("objectives");
                      }}
                    >
                      View at-risk objectives <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-4 bg-slate-100/80 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Zap className="h-4 w-4 mr-2 hidden sm:inline" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="objectives" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Target className="h-4 w-4 mr-2 hidden sm:inline" />
                    Objectives
                  </TabsTrigger>
                  <TabsTrigger value="meetings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <MessageSquare className="h-4 w-4 mr-2 hidden sm:inline" />
                    1-2-1s
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <FileText className="h-4 w-4 mr-2 hidden sm:inline" />
                    Documents
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="overview" className="p-6 space-y-6">
                {/* Quick Actions */}
                <div className="grid gap-4 md:grid-cols-3">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="group cursor-pointer"
                    onClick={handleCreateObjective}
                  >
                    <Card className="h-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
                      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-4 rounded-2xl bg-indigo-100 text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                          <Target className="h-8 w-8" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Create Objective</h3>
                        <p className="text-sm text-muted-foreground mt-1">Set goals and track progress</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="group cursor-pointer"
                    onClick={() => setShowScheduleMeeting(true)}
                  >
                    <Card className="h-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
                      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-4 rounded-2xl bg-sky-100 text-sky-600 mb-4 group-hover:scale-110 transition-transform">
                          <Calendar className="h-8 w-8" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Schedule Meeting</h3>
                        <p className="text-sm text-muted-foreground mt-1">Book a 1-2-1 conversation</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="group cursor-pointer"
                    onClick={() => canCreateReviewCycle && setShowCreateReviewCycle(true)}
                  >
                    <Card className={cn(
                      "h-full border-dashed border-2 transition-all",
                      canCreateReviewCycle 
                        ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer" 
                        : "opacity-60 cursor-not-allowed"
                    )}>
                      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-4 rounded-2xl bg-purple-100 text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                          <Layers className="h-8 w-8" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Create Review Cycle</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {canCreateReviewCycle ? "Launch performance reviews" : "Manager access required"}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Focus Objectives */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-amber-500" />
                          Focus Objectives
                        </CardTitle>
                        <CardDescription>High-priority goals to keep on track</CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setActiveTab("objectives")}
                      >
                        View all <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AnimatePresence mode="wait">
                      {visibleObjectives.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center py-12 text-center"
                        >
                          <div className="p-4 rounded-full bg-slate-100 mb-4">
                            <Target className="h-8 w-8 text-slate-400" />
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-2">No objectives yet</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create your first objective to start tracking progress
                          </p>
                          <Button onClick={handleCreateObjective}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Objective
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div 
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="space-y-3"
                        >
                          {visibleObjectives.slice(0, 3).map((objective, index) => (
                            <motion.div
                              key={objective.id}
                              variants={itemVariants}
                              className="group rounded-xl border p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                              onClick={() => {
                                const params = new URLSearchParams();
                                const currentSearch = searchParams?.toString();
                                const fromPath = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
                                params.set("from", fromPath);
                                if (employeeId) {
                                  params.set("employeeId", employeeId);
                                }
                                router.push(`/performance/objectives/${objective.id}?${params.toString()}`);
                              }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusIcon(objective.status)}
                                    <span className="font-semibold text-slate-900">{objective.title}</span>
                                    <Badge variant="outline" className={cn("text-[10px] uppercase", statusColors[objective.status])}>
                                      {objective.status.replace(/_/g, " ")}
                                    </Badge>
                                    <Badge className={cn("text-[10px]", priorityColors[objective.priority])}>
                                      {objective.priority}
                                    </Badge>
                                  </div>
                                  {objective.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">{objective.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    {objective.Owner && (
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {objective.Owner.firstName} {objective.Owner.lastName}
                                      </span>
                                    )}
                                    {objective.dueDate && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Due {formatLondonDate(objective.dueDate)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="text-lg font-bold text-slate-900">{objective.progress}%</span>
                                  <ArrowUpRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              <div className="mt-3">
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${objective.progress}%` }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className={cn("h-full rounded-full", getProgressColor(objective.progress))}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                {/* Pending Action Items */}
                <PendingActionItemsPanel 
                  actionItems={actionItems}
                  onRefresh={refreshData}
                  isEmployeeContext={isEmployeeContext}
                />
              </TabsContent>

              <TabsContent value="objectives" className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">All Objectives</h3>
                    <p className="text-sm text-muted-foreground">
                      {filteredObjectives.length} objective{filteredObjectives.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <Button onClick={handleCreateObjective} className="bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Objective
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {filteredObjectives.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="p-6 rounded-full bg-slate-100 mb-6">
                        <Target className="h-12 w-12 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">No objectives found</h3>
                      <p className="text-muted-foreground mb-6 max-w-md">
                        {searchQuery || objectiveStatus !== "ALL" 
                          ? "Try adjusting your filters to find what you're looking for"
                          : "Create your first objective to start tracking progress and achieving goals"}
                      </p>
                      <Button onClick={handleCreateObjective}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Objective
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-3"
                    >
                      {visibleObjectives.map((objective, index) => (
                        <motion.div
                          key={objective.id}
                          variants={itemVariants}
                          className="group"
                        >
                          <Card className="hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
                            <CardContent 
                              className="p-5"
                              onClick={() => {
                                const params = new URLSearchParams();
                                const currentSearch = searchParams?.toString();
                                const fromPath = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
                                params.set("from", fromPath);
                                if (employeeId) {
                                  params.set("employeeId", employeeId);
                                }
                                router.push(`/performance/objectives/${objective.id}?${params.toString()}`);
                              }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusIcon(objective.status)}
                                    <h4 className="font-semibold text-slate-900">{objective.title}</h4>
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                      {objective.type}
                                    </Badge>
                                    <Badge className={cn("text-[10px]", priorityColors[objective.priority])}>
                                      {objective.priority}
                                    </Badge>
                                  </div>
                                  {objective.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">{objective.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    {objective.Owner && (
                                      <span className="flex items-center gap-1.5">
                                        <Avatar
                                          name={`${objective.Owner.firstName} ${objective.Owner.lastName}`}
                                          size={20}
                                        />
                                        {objective.Owner.firstName} {objective.Owner.lastName}
                                      </span>
                                    )}
                                    {objective.dueDate && (
                                      <span>Due {formatLondonDate(objective.dueDate)}</span>
                                    )}
                                  </div>

                                  {/* Key Results Preview */}
                                  {objective.keyResults && objective.keyResults.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{objective.keyResults.length} key result{objective.keyResults.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  <div className="text-right">
                                    <span className="text-2xl font-bold text-slate-900">{objective.progress}%</span>
                                  </div>
                                  <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${objective.progress}%` }}
                                      transition={{ duration: 0.5, delay: index * 0.05 }}
                                      className={cn("h-full rounded-full", getProgressColor(objective.progress))}
                                    />
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    View <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pagination */}
                {paginatedObjectives.pages.length > 1 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between border-t pt-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      Showing {objectivePage * paginatedObjectives.pageSize + 1}-
                      {Math.min((objectivePage + 1) * paginatedObjectives.pageSize, filteredObjectives.length)} of{" "}
                      {filteredObjectives.length}
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
                      <span className="text-sm text-muted-foreground">
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
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="meetings" className="p-6 space-y-6">
                {/* Schedule Meeting CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200/60 p-6"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-sky-400 to-indigo-400 rounded-l-2xl" />
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-sky-600" />
                        <h3 className="font-semibold text-slate-900">1-2-1 Meetings</h3>
                      </div>
                      <p className="text-sm text-slate-600 max-w-md">
                        Schedule regular check-ins to discuss progress, provide feedback, and support growth.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowScheduleMeeting(true)}
                      className="bg-gradient-to-r from-sky-500 to-indigo-500 shadow-lg"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule Meeting
                    </Button>
                  </div>
                </motion.div>

                {/* Meetings Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-sky-600" />
                      Meeting Timeline
                    </CardTitle>
                    <CardDescription>Recent and upcoming conversations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnimatePresence mode="wait">
                      {filteredMeetings.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-col items-center justify-center py-12 text-center"
                        >
                          <div className="p-4 rounded-full bg-sky-100 mb-4">
                            <Calendar className="h-8 w-8 text-sky-500" />
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-2">No meetings yet</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Schedule your first 1-2-1 to start tracking conversations
                          </p>
                          <Button onClick={() => setShowScheduleMeeting(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Schedule Meeting
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="space-y-3"
                        >
                          {filteredMeetings.map((meeting) => (
                            <motion.div
                              key={meeting.id}
                              variants={itemVariants}
                              className="flex items-start justify-between rounded-xl border p-4 hover:shadow-md hover:border-sky-200 transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900">{meeting.title}</p>
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      meeting.status === "COMPLETED" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                                      meeting.status === "SCHEDULED" && "bg-sky-100 text-sky-700 border-sky-200",
                                      meeting.status === "CANCELLED" && "bg-rose-100 text-rose-700 border-rose-200"
                                    )}
                                  >
                                    {meeting.status.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {formatLondon(meeting.scheduledAt)} • {meeting.duration} min • {meeting.participantIds.length} participant{meeting.participantIds.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
                    <p className="text-sm text-muted-foreground">
                      {isEmployeeContext
                        ? "Documents assigned to this employee"
                        : "Company policies, contracts, and documents requiring action"}
                    </p>
                  </div>
                  {canManageTemplates && !isEmployeeContext && (
                    <Button onClick={() => router.push("/documents")}>
                      <FileText className="mr-2 h-4 w-4" />
                      Manage Documents
                    </Button>
                  )}
                </div>

                {/* Document Stats */}
                <div className="grid gap-4 grid-cols-3">
                  <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-600 font-medium">Total</p>
                          <p className="text-2xl font-bold text-slate-900">{docStats.totalDocuments}</p>
                        </div>
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-amber-700 font-medium">Pending Sigs</p>
                          <p className="text-2xl font-bold text-amber-900">{docStats.pendingSignatures}</p>
                        </div>
                        <PenTool className="h-8 w-8 text-amber-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-700 font-medium">Pending Acks</p>
                          <p className="text-2xl font-bold text-blue-900">{docStats.pendingAcknowledgements}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Documents List */}
                <AnimatePresence mode="wait">
                  {documentsLoading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary mb-4"
                      />
                      <p className="text-muted-foreground">Loading documents...</p>
                    </motion.div>
                  ) : documents.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="p-4 rounded-full bg-slate-100 mb-4">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">No documents yet</h3>
                      <p className="text-sm text-muted-foreground">
                        {isEmployeeContext
                          ? "No documents have been assigned to this employee"
                          : "No documents match your current filters"}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-3"
                    >
                      {documents.map((doc) => {
                        const requiresAction = 
                          (doc.requiresSignature && doc.signatureOutstandingCount && doc.signatureOutstandingCount > 0) ||
                          (doc.requiresAck && doc.ackOutstandingCount && doc.ackOutstandingCount > 0);
                        
                        return (
                          <motion.div
                            key={doc.id}
                            variants={itemVariants}
                            onClick={() => {
                              setSelectedDocument(doc);
                              setIsDocPreviewOpen(true);
                            }}
                            className={cn(
                              "flex items-start justify-between rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
                              requiresAction 
                                ? "border-amber-200 bg-amber-50/50 hover:border-amber-300" 
                                : "hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className={cn(
                                "rounded-xl p-2.5",
                                requiresAction ? "bg-amber-100" : "bg-slate-100"
                              )}>
                                <FileText className={cn(
                                  "h-5 w-5",
                                  requiresAction ? "text-amber-600" : "text-slate-600"
                                )} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">{doc.name}</span>
                                  {requiresAction && (
                                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
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
                                        ? "text-amber-700"
                                        : "text-emerald-700"
                                    )}>
                                      <PenTool className="h-3 w-3" />
                                      {doc.signatureCompletedCount ?? 0}/{doc.signatureTargetCount ?? 0} signed
                                    </span>
                                  )}
                                  {doc.requiresAck && (
                                    <span className={cn(
                                      "flex items-center gap-1",
                                      doc.ackOutstandingCount && doc.ackOutstandingCount > 0
                                        ? "text-amber-700"
                                        : "text-emerald-700"
                                    )}>
                                      <CheckCircle className="h-3 w-3" />
                                      {doc.ackCompletedCount ?? 0}/{doc.ackTargetCount ?? 0} acknowledged
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Dialogs */}
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
