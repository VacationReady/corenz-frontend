"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { toast } from "sonner";
import { formatLondon, formatLondonDate } from "@/lib/time";
import { ScheduleMeetingDialog } from "@/components/performance/ScheduleMeetingDialog";
import { CreateReviewCycleDialog } from "@/components/performance/CreateReviewCycleDialog";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { usePerformanceData, Objective, Meeting } from "@/hooks/usePerformanceData";
import { usePerformanceReferenceData } from "@/hooks/usePerformanceReferenceData";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
  jobRoleId: string | null;
  isActive: boolean;
}

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

export interface PerformancePageProps {
  employeeId?: string;
}

export default function PerformancePage({ employeeId }: PerformancePageProps = {}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeframe, setTimeframe] = useState<number>(30);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(["all"]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["all"]);
  const [objectiveStatus, setObjectiveStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [objectivePage, setObjectivePage] = useState(0);

  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [showCreateReviewCycle, setShowCreateReviewCycle] = useState(false);

  const canManageTemplates =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";

  const isEmployeeContext = Boolean(employeeId);

  const { departments, jobRoles, employees } = usePerformanceReferenceData({
    enabled: Boolean(session),
    includeEmployees: true,
  });

  const { objectives, meetings, stats, isLoading, error, refresh } = usePerformanceData({
    timeframeDays: timeframe,
    employeeId,
    participantId: employeeId,
  });

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load performance data");
    }
  }, [error]);

  useEffect(() => {
    setObjectivePage(0);
  }, [selectedDepartments, selectedRoles, objectiveStatus, searchQuery, timeframe]);

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

      const searchMatch = searchQuery
        ? objective.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          objective.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return matchesStatus && departmentMatch && roleMatch && searchMatch;
    });
  }, [objectiveStatus, objectives, searchQuery, selectedDepartments, selectedRoles]);

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
    const pageSize = 10;
    const pages: Objective[][] = [];
    for (let i = 0; i < filteredObjectives.length; i += pageSize) {
      pages.push(filteredObjectives.slice(i, i + pageSize));
    }
    return { pages, pageSize };
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
  };

  const pageTitle = isEmployeeContext ? "Employee Performance" : "Performance Management";
  const pageDescription = isEmployeeContext
    ? "Objectives, meetings, and reviews focused on this employee."
    : "Manage objectives, 1-2-1s, and performance reviews";

  const handleCreateObjective = () => {
    if (employeeId) {
      router.push(`/performance/objectives/new?employeeId=${employeeId}`);
      return;
    }
    router.push("/performance/objectives/new");
  };

  if (isLoading) {
    return (
      <PageShell
        title={pageTitle}
        description={pageDescription}
        icon={<Target className="h-6 w-6" />}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner size="lg" showText text="Loading performance data" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={pageTitle}
      description={pageDescription}
      icon={<Target className="h-6 w-6" />}
      action={
        canManageTemplates && !isEmployeeContext ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refreshData}>
              Refresh Data
            </Button>
            <Button onClick={() => router.push("/performance/templates/new") }>
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </div>
        ) : isEmployeeContext ? (
          <Button variant="outline" onClick={refreshData}>
            Refresh Data
          </Button>
        ) : undefined
      }
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
                  <div className="flex items center gap-2">
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
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
              <div class名字
