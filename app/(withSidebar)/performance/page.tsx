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

export default function PerformancePage() {
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

  const { departments, jobRoles, employees } = usePerformanceReferenceData({
    enabled: Boolean(session),
    includeEmployees: true,
  });

  const { objectives, meetings, stats, isLoading, error, refresh } = usePerformanceData({
    timeframeDays: timeframe,
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

  if (isLoading) {
    return (
      <PageShell
        title="Performance Management"
        description="Manage objectives, 1-2-1s, and performance reviews"
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
      title="Performance Management"
      description="Manage objectives, 1-2-1s, and performance reviews"
      icon={<Target className="h-6 w-6" />}
      action={
        canManageTemplates && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refreshData}>
              Refresh Data
            </Button>
            <Button onClick={() => router.push("/performance/templates/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-6">
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
              <CardTitle className="text-sm font-medium">Upcoming 1-2-1s</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingMeetings}</div>
              <p className="text-xs text-muted-foreground">Next {timeframe} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action Items</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingActionItems}</div>
              <p className="text-xs text-muted-foreground">Pending completion</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="objectives">Objectives</TabsTrigger>
            <TabsTrigger value="meetings">1-2-1s & Meetings</TabsTrigger>
            <TabsTrigger value="reviews">Review Cycles</TabsTrigger>
            <TabsTrigger value="360">360 Reviews</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common performance management tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4"
                  onClick={() => router.push("/performance/objectives/new")}
                >
                  <Target className="mb-2 h-5 w-5" />
                  <span className="font-semibold">Create Objective</span>
                  <span className="text-xs text-muted-foreground">
                    Set company, team, or personal goals
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4"
                  onClick={() => setShowScheduleMeeting(true)}
                >
                  <Calendar className="mb-2 h-5 w-5" />
                  <span className="font-semibold">Schedule 1-2-1</span>
                  <span className="text-xs text-muted-foreground">
                    Book performance conversations
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4"
                  onClick={() => setShowCreateReviewCycle(true)}
                >
                  <Users className="mb-2 h-5 w-5" />
                  <span className="font-semibold">Start Review Cycle</span>
                  <span className="text-xs text-muted-foreground">
                    Launch 360° performance reviews
                  </span>
                </Button>
              </CardContent>
            </Card>

            {stats.atRiskObjectives > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Objectives At Risk
                  </CardTitle>
                  <CardDescription>These objectives need immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {objectives
                      .filter((obj) => obj.status === "AT_RISK")
                      .slice(0, 5)
                      .map((obj) => (
                        <div
                          key={obj.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{obj.title}</span>
                              <Badge className={priorityColors[obj.priority as keyof typeof priorityColors]}>
                                {obj.priority}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                              {obj.Owner && (
                                <span>
                                  {obj.Owner.firstName} {obj.Owner.lastName}
                                </span>
                              )}
                              {obj.dueDate && <span>Due {formatLondonDate(obj.dueDate)}</span>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/performance/objectives/${obj.id}`)}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Upcoming 1-2-1s</CardTitle>
                <CardDescription>Your scheduled performance conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredMeetings.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No meetings scheduled</p>
                ) : (
                  <div className="space-y-3">
                    {filteredMeetings.slice(0, 5).map((meeting) => (
                      <div
                        key={meeting.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{meeting.title}</div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatLondon(meeting.scheduledAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {meeting.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.participantIds.length} participants
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/performance/meetings/${meeting.id}`)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="objectives" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">All Objectives</h3>
                <p className="text-sm text-muted-foreground">Cascading goals across the organization</p>
              </div>
              <Button onClick={() => router.push("/performance/objectives/new")}>
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
                  <Button onClick={() => router.push("/performance/objectives/new")}>
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

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Review Cycles</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Launch quarterly, semi-annual, or annual performance review cycles
                </p>
                <Button onClick={() => setShowCreateReviewCycle(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Review Cycle
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cycle Health Summary</CardTitle>
                <CardDescription>Monitor active and recently closed review cycles.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Review cycle analytics are being expanded with richer completion and calibration insights. Use the template
                  builder to configure structured workflows and consolidate reviewer assignments.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="360" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">360° Reviews</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Multi-rater feedback from peers, managers, and direct reports
                </p>
                <Button onClick={() => router.push("/performance/templates/new?type=360")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create 360 Review
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Performance Insights</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Analytics and trends are being expanded with predictive scoring and turnover risk. In the meantime use the
                  filters above to drill into department performance.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ScheduleMeetingDialog
        open={showScheduleMeeting}
        onOpenChange={setShowScheduleMeeting}
        onSuccess={refreshData}
      />

      <CreateReviewCycleDialog
        open={showCreateReviewCycle}
        onOpenChange={setShowCreateReviewCycle}
        onSuccess={refreshData}
      />
    </PageShell>
  );
}
