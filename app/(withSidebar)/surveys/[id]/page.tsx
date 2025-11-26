"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardList,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  TrendingUp,
  ArrowLeft,
  User,
  Building2,
  Briefcase,
  Mail,
  Calendar,
  Send,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
  MessageSquare,
  Target,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SurveyRecipient {
  id: string;
  status: string;
  sentAt: string;
  respondedAt: string | null;
  Employee: {
    id: string;
    User: {
      firstName: string;
      lastName: string;
      email: string;
    };
    Department: {
      name: string;
    } | null;
    JobRole: {
      name: string;
    } | null;
  } | null;
}

interface SurveyResponse {
  id: string;
  submittedAt: string;
  responseData: Record<string, any>;
  Employee: {
    id: string;
    User: {
      firstName: string;
      lastName: string;
    };
    Department: {
      name: string;
    } | null;
  } | null;
}

interface SurveyDetail {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "EXPIRED";
  sentDate: string | null;
  deadline: string | null;
  totalRecipients: number;
  responses: number;
  responseRate: number;
  averageScore: number | null;
  sentimentScore: number | null;
  keyInsights: string[];
  topThemes: string[];
  Form: {
    id: string;
    name: string;
    description: string | null;
    formSchema: any;
  };
  CreatedBy: {
    id: string;
    name: string;
    email: string;
  };
  SurveyRecipients: SurveyRecipient[];
  SurveyResponses: SurveyResponse[];
}

export default function SurveyDetailPage() {
  const params = useParams();
  const surveyId = params?.id as string;

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set());
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    const loadSurvey = async () => {
      if (!surveyId) return;

      try {
        const response = await fetch(`/api/surveys/${surveyId}?includeFullDetails=true`);

        if (response.ok) {
          const data = await response.json();
          setSurvey(data);
        } else {
          toast.error("Failed to load survey details");
        }
      } catch (error) {
        console.error("Failed to load survey:", error);
        toast.error("Failed to load survey details");
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [surveyId]);

  // Split recipients into completed and pending
  const { completedRecipients, pendingRecipients, filteredRecipients } = useMemo(() => {
    if (!survey) return { completedRecipients: [], pendingRecipients: [], filteredRecipients: [] };

    const completed = survey.SurveyRecipients.filter(
      (r) => r.status === "RESPONDED" || r.status === "COMPLETED"
    );
    const pending = survey.SurveyRecipients.filter(
      (r) => r.status === "PENDING" || r.status === "SENT"
    );

    const searchLower = searchQuery.toLowerCase();
    const filtered = survey.SurveyRecipients.filter((r) => {
      if (!searchQuery) return true;
      const name = r.Employee?.User
        ? `${r.Employee.User.firstName} ${r.Employee.User.lastName}`.toLowerCase()
        : "";
      const email = r.Employee?.User?.email?.toLowerCase() || "";
      const dept = r.Employee?.Department?.name?.toLowerCase() || "";
      return name.includes(searchLower) || email.includes(searchLower) || dept.includes(searchLower);
    });

    return { completedRecipients: completed, pendingRecipients: pending, filteredRecipients: filtered };
  }, [survey, searchQuery]);

  // Map responses to employees for easy lookup
  const responsesByEmployee = useMemo(() => {
    if (!survey) return new Map();
    const map = new Map<string, SurveyResponse>();
    survey.SurveyResponses.forEach((response) => {
      if (response.Employee?.id) {
        map.set(response.Employee.id, response);
      }
    });
    return map;
  }, [survey]);

  const toggleResponseExpanded = (responseId: string) => {
    setExpandedResponses((prev) => {
      const next = new Set(prev);
      if (next.has(responseId)) {
        next.delete(responseId);
      } else {
        next.add(responseId);
      }
      return next;
    });
  };

  const handleSendReminder = async () => {
    if (!surveyId) return;

    setSendingReminder(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || "Reminder sent successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send reminder");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "active":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Paused
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
            <FileText className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecipientStatusBadge = (status: string) => {
    switch (status) {
      case "RESPONDED":
      case "COMPLETED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "PENDING":
      case "SENT":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (!surveyId) {
    return (
      <PageShell
        title="Survey Details"
        description="Survey not found"
        icon={<ClipboardList className="w-6 h-6" />}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Survey ID not found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              The survey ID could not be determined from the URL.
            </p>
            <Button asChild variant="primary">
              <Link href="/surveys">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Surveys
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell
        title="Survey Details"
        description="Loading survey details..."
        icon={<ClipboardList className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Surveys", href: "/surveys" },
            { label: "Loading...", isCurrentPage: true },
          ],
        }}
      >
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading survey details...</p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!survey) {
    return (
      <PageShell
        title="Survey Details"
        description="Survey not found"
        icon={<ClipboardList className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Surveys", href: "/surveys" },
            { label: "Not Found", isCurrentPage: true },
          ],
        }}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Survey not found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              The survey you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button asChild variant="primary">
              <Link href="/surveys">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Surveys
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={survey.name}
      description={survey.description || `Template: ${survey.Form.name}`}
      icon={<ClipboardList className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Surveys", href: "/surveys" },
          { label: survey.name, isCurrentPage: true },
        ],
      }}
      action={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/surveys">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          {survey.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={handleSendReminder}
              disabled={sendingReminder}
            >
              {sendingReminder ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Send Reminder
            </Button>
          )}
          <Button asChild variant="primary">
            <Link href={`/surveys/analytics/${survey.id}`}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Survey Overview Header */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2" />
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">{survey.name}</CardTitle>
                  {getStatusBadge(survey.status)}
                </div>
                <CardDescription className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Template: {survey.Form.name}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {survey.sentDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Send className="w-4 h-4" />
                    <span>Sent: {new Date(survey.sentDate).toLocaleDateString()}</span>
                  </div>
                )}
                {survey.deadline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Deadline: {new Date(survey.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Recipients</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{survey.totalRecipients}</div>
              <p className="text-xs text-muted-foreground mt-1">People invited</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {completedRecipients.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Responses received</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {pendingRecipients.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Yet to respond</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Response Rate</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {survey.responseRate.toFixed(1)}%
              </div>
              <Progress
                value={survey.responseRate}
                className="h-1.5 mt-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Recipients & Responses Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recipients & Responses
                </CardTitle>
                <CardDescription>
                  Track who has completed the survey and view their responses
                </CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="gap-2">
                  <Users className="h-4 w-4" />
                  All
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredRecipients.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                  <Badge variant="secondary" className="ml-1 text-xs bg-emerald-100 text-emerald-700">
                    {completedRecipients.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                  <Badge variant="secondary" className="ml-1 text-xs bg-amber-100 text-amber-700">
                    {pendingRecipients.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <RecipientsList
                  recipients={filteredRecipients}
                  responsesByEmployee={responsesByEmployee}
                  expandedResponses={expandedResponses}
                  toggleResponseExpanded={toggleResponseExpanded}
                  getRecipientStatusBadge={getRecipientStatusBadge}
                  formSchema={survey.Form.formSchema}
                />
              </TabsContent>

              <TabsContent value="completed">
                <RecipientsList
                  recipients={completedRecipients.filter((r) =>
                    !searchQuery ||
                    `${r.Employee?.User?.firstName} ${r.Employee?.User?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.Employee?.User?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.Employee?.Department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                  )}
                  responsesByEmployee={responsesByEmployee}
                  expandedResponses={expandedResponses}
                  toggleResponseExpanded={toggleResponseExpanded}
                  getRecipientStatusBadge={getRecipientStatusBadge}
                  formSchema={survey.Form.formSchema}
                  showResponses
                />
              </TabsContent>

              <TabsContent value="pending">
                <RecipientsList
                  recipients={pendingRecipients.filter((r) =>
                    !searchQuery ||
                    `${r.Employee?.User?.firstName} ${r.Employee?.User?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.Employee?.User?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.Employee?.Department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                  )}
                  responsesByEmployee={responsesByEmployee}
                  expandedResponses={expandedResponses}
                  toggleResponseExpanded={toggleResponseExpanded}
                  getRecipientStatusBadge={getRecipientStatusBadge}
                  formSchema={survey.Form.formSchema}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* AI Insights Section - Only show if insights exist */}
        {(survey.keyInsights?.length > 0 || survey.topThemes?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {survey.keyInsights?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Key Insights
                  </CardTitle>
                  <CardDescription>AI-generated insights from survey responses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {survey.keyInsights.map((insight, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {index + 1}
                        </div>
                        <span className="text-sm">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {survey.topThemes?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Top Themes
                  </CardTitle>
                  <CardDescription>Most frequently mentioned themes in responses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {survey.topThemes.map((theme, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="px-3 py-1.5 text-sm bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                      >
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Want deeper insights?</p>
                <p className="text-sm text-muted-foreground">
                  View detailed analytics with charts, sentiment analysis, and more.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href={`/surveys/analytics/${survey.id}`}>
                <TrendingUp className="w-4 h-4 mr-2" />
                View Full Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

// RecipientsList component for reuse
interface RecipientsListProps {
  recipients: SurveyRecipient[];
  responsesByEmployee: Map<string, SurveyResponse>;
  expandedResponses: Set<string>;
  toggleResponseExpanded: (id: string) => void;
  getRecipientStatusBadge: (status: string) => React.ReactNode;
  formSchema?: any;
  showResponses?: boolean;
}

function RecipientsList({
  recipients,
  responsesByEmployee,
  expandedResponses,
  toggleResponseExpanded,
  getRecipientStatusBadge,
  formSchema,
  showResponses = false,
}: RecipientsListProps) {
  if (recipients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No recipients found</h3>
        <p className="text-sm text-muted-foreground">
          No recipients match your current filters.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-3">
        {recipients.map((recipient) => {
          const employeeResponse = recipient.Employee?.id
            ? responsesByEmployee.get(recipient.Employee.id)
            : null;
          const isExpanded = employeeResponse
            ? expandedResponses.has(employeeResponse.id)
            : false;
          const hasCompleted = recipient.status === "RESPONDED" || recipient.status === "COMPLETED";

          return (
            <div
              key={recipient.id}
              className={cn(
                "border rounded-xl transition-all duration-200",
                hasCompleted
                  ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                  : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold",
                        hasCompleted
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {recipient.Employee?.User?.firstName?.[0]?.toUpperCase() || "?"}
                      {recipient.Employee?.User?.lastName?.[0]?.toUpperCase() || ""}
                    </div>

                    {/* Employee Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">
                          {recipient.Employee?.User
                            ? `${recipient.Employee.User.firstName} ${recipient.Employee.User.lastName}`
                            : "Unknown"}
                        </h4>
                        {getRecipientStatusBadge(recipient.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {recipient.Employee?.User?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {recipient.Employee.User.email}
                          </span>
                        )}
                        {recipient.Employee?.Department?.name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {recipient.Employee.Department.name}
                          </span>
                        )}
                        {recipient.Employee?.JobRole?.name && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            {recipient.Employee.JobRole.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          Sent: {new Date(recipient.sentAt).toLocaleDateString()}
                        </span>
                        {recipient.respondedAt && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            Completed: {new Date(recipient.respondedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* View Response Button */}
                  {hasCompleted && employeeResponse && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleResponseExpanded(employeeResponse.id)}
                      className="flex-shrink-0"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {isExpanded ? "Hide" : "View"} Response
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Response Data */}
              {isExpanded && employeeResponse && (
                <div className="border-t border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 rounded-b-xl">
                  <div className="p-4">
                    <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Survey Response
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(employeeResponse.responseData || {}).map(([key, value]) => (
                        <div
                          key={key}
                          className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                        >
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {key}
                          </div>
                          <div className="text-sm">
                            {typeof value === "number" ? (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{value}/5</span>
                                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${(Number(value) / 5) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span>{String(value)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}





