"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatLondon, formatLondonDate } from "@/lib/time";
import { ScheduleMeetingDialog } from "@/components/performance/ScheduleMeetingDialog";
import { CreateReviewCycleDialog } from "@/components/performance/CreateReviewCycleDialog";

interface Objective {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress: number;
  priority: string;
  dueDate?: string;
  type: string;
  Owner?: { firstName: string; lastName: string };
  keyResults?: Array<{
    id: string;
    title: string;
    currentValue: number;
    targetValue: number;
    unit?: string;
  }>;
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
  duration: number;
  participantIds: string[];
  Organizer: { firstName: string; lastName: string };
  actionItems?: Array<{
    id: string;
    title: string;
    status: string;
    dueDate?: string;
  }>;
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

export default function PerformancePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState({
    totalObjectives: 0,
    completedObjectives: 0,
    atRiskObjectives: 0,
    upcomingMeetings: 0,
    pendingActionItems: 0,
  });
  
  // Dialog states
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [showCreateReviewCycle, setShowCreateReviewCycle] = useState(false);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load objectives
      const objRes = await fetch("/api/objectives?includeKeyResults=true");
      if (objRes.ok) {
        const { objectives: objData } = await objRes.json();
        setObjectives(objData);

        // Calculate stats
        const total = objData.length;
        const completed = objData.filter((o: Objective) => o.status === "COMPLETED").length;
        const atRisk = objData.filter((o: Objective) => o.status === "AT_RISK").length;
        setStats((prev) => ({
          ...prev,
          totalObjectives: total,
          completedObjectives: completed,
          atRiskObjectives: atRisk,
        }));
      }

      // Load upcoming meetings
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const meetingsRes = await fetch(
        `/api/performance/meetings?from=${now.toISOString()}&to=${nextMonth.toISOString()}`
      );
      if (meetingsRes.ok) {
        const { meetings: meetingData } = await meetingsRes.json();
        setMeetings(meetingData);

        const upcomingCount = meetingData.filter(
          (m: Meeting) => m.status === "SCHEDULED"
        ).length;
        const actionItemsCount = meetingData.reduce(
          (sum: number, m: Meeting) =>
            sum + (m.actionItems?.filter((ai) => ai.status !== "COMPLETED").length || 0),
          0
        );

        setStats((prev) => ({
          ...prev,
          upcomingMeetings: upcomingCount,
          pendingActionItems: actionItemsCount,
        }));
      }
    } catch (error) {
      console.error("Failed to load performance data:", error);
      toast.error("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
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
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Objectives</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalObjectives}</div>
              <p className="text-xs text-muted-foreground">
                Across all levels
              </p>
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
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming 1-2-1s</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingMeetings}</div>
              <p className="text-xs text-muted-foreground">
                Next 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action Items</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingActionItems}</div>
              <p className="text-xs text-muted-foreground">
                Pending completion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="objectives">Objectives</TabsTrigger>
            <TabsTrigger value="meetings">1-2-1s & Meetings</TabsTrigger>
            <TabsTrigger value="reviews">Review Cycles</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common performance management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4"
                  onClick={() => setActiveTab("objectives")}
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

            {/* At Risk Objectives */}
            {stats.atRiskObjectives > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Objectives At Risk
                  </CardTitle>
                  <CardDescription>
                    These objectives need immediate attention
                  </CardDescription>
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
                              {obj.dueDate && (
                                <span>Due {formatLondonDate(obj.dueDate)}</span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Meetings */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming 1-2-1s</CardTitle>
                <CardDescription>Your scheduled performance conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {meetings.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No meetings scheduled
                  </p>
                ) : (
                  <div className="space-y-3">
                    {meetings.slice(0, 5).map((meeting) => (
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
                        <Button variant="ghost" size="sm">
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
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">All Objectives</h3>
                <p className="text-sm text-muted-foreground">
                  Cascading goals across the organization
                </p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Objective
              </Button>
            </div>

            {objectives.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No objectives yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by creating your first objective to track progress
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Objective
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {objectives.map((objective) => (
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
                            <CardDescription className="mt-2">
                              {objective.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{objective.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(objective.progress)} transition-all`}
                            style={{ width: `${objective.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Key Results */}
                      {objective.keyResults && objective.keyResults.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Key Results</h4>
                          {objective.keyResults.map((kr) => (
                            <div
                              key={kr.id}
                              className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
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

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          {objective.Owner && (
                            <span>
                              Owner: {objective.Owner.firstName} {objective.Owner.lastName}
                            </span>
                          )}
                          {objective.dueDate && (
                            <span>Due {formatLondonDate(objective.dueDate)}</span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meetings" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">1-2-1 Meetings</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Schedule and manage performance conversations
                </p>
                <Button onClick={() => setShowScheduleMeeting(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Meeting
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">360° Review Cycles</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure and launch comprehensive performance reviews
                </p>
                <Button onClick={() => setShowCreateReviewCycle(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Review Cycle
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Performance Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Analytics and trends coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <ScheduleMeetingDialog
        open={showScheduleMeeting}
        onOpenChange={setShowScheduleMeeting}
        onSuccess={loadData}
      />
      
      <CreateReviewCycleDialog
        open={showCreateReviewCycle}
        onOpenChange={setShowCreateReviewCycle}
        onSuccess={loadData}
      />
    </PageShell>
  );
}
