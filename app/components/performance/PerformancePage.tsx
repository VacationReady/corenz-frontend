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
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="objectives">Objectives</TabsTrigger>
                <TabsTrigger value="meetings">1-2-1 Meetings</TabsTrigger>
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
                    <Button className="w-full justify-start" onClick={handleCreateObjective}>
                      <Target className="mr-2 h-4 w-4" /> Create Objective
                    </Button>
                    <Button className="w-full justify-start" onClick={() => setShowScheduleMeeting(true)}>
                      <Calendar className="mr-2 h-4 w-4" /> Schedule Meeting
                    </Button>
                    <Button
                      className="w-full justify-start"
                      onClick={() => setShowCreateReviewCycle(true)}
                      disabled={!canManageTemplates}
                    >
                      <Layers className="mr-2 h-4 w-4" /> Create Review Cycle
                    </Button>
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
      </div>
    </PageShell>
  );
}
