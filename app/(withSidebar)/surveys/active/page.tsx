"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/Badge";
import {
  Send,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  TrendingUp,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Lock,
  Building,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

interface ActiveSurvey {
  id: string;
  name: string;
  templateName: string;
  sentDate: string;
  deadline: string | null;
  totalRecipients: number;
  responses: number;
  responseRate: number;
  status: "active" | "paused" | "completed" | "expired";
  daysRemaining: number | null;
  anonymizationLevel?: "public" | "department" | "location" | "full";
}

export default function ActiveSurveysPage() {
  const [surveys, setSurveys] = useState<ActiveSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActiveSurveys = async () => {
      try {
        const res = await fetch("/api/surveys?status=ACTIVE");
        if (res.ok) {
          const data = await res.json();
          const now = new Date();
          const MS_PER_DAY = 1000 * 60 * 60 * 24;

          // Normalize status to lowercase for UI consistency
          const normalizedSurveys = (data.surveys || []).reduce(
            (acc: ActiveSurvey[], survey: any) => {
              const deadlineValue = survey.deadline ?? null;
              const deadlineDate = deadlineValue ? new Date(deadlineValue) : null;

              if (deadlineDate && deadlineDate.getTime() < now.getTime()) {
                return acc;
              }

              const daysRemaining = deadlineDate
                ? Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / MS_PER_DAY))
                : null;

              // Extract anonymization level from metadata
              const anonymizationLevel = survey.metadata?.anonymizationLevel || "public";
              
              acc.push({
                ...survey,
                status: (survey.status || "").toLowerCase(),
                deadline: deadlineValue,
                daysRemaining,
                anonymizationLevel,
              });

              return acc;
            },
            []
          );
          setSurveys(normalizedSurveys);
        } else {
          setSurveys([]);
        }
      } catch (error) {
        console.error("Failed to load active surveys:", error);
        setSurveys([]);
      } finally {
        setLoading(false);
      }
    };

    loadActiveSurveys();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAnonymizationBadge = (level?: string) => {
    switch (level) {
      case "full":
        return (
          <Badge className="bg-slate-700 text-white flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Anonymous
          </Badge>
        );
      case "department":
        return (
          <Badge className="bg-blue-600 text-white flex items-center gap-1">
            <Building className="h-3 w-3" />
            Dept. Anonymous
          </Badge>
        );
      case "location":
        return (
          <Badge className="bg-violet-600 text-white flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Location Anonymous
          </Badge>
        );
      default:
        return null; // Don't show badge for public surveys
    }
  };

  const handlePauseSurvey = async (surveyId: string) => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "PAUSED" }),
      });

      if (response.ok) {
        // Update local state
        setSurveys(prev => prev.map(survey => 
          survey.id === surveyId 
            ? { ...survey, status: "paused" }
            : survey
        ));
        toast.success("Survey paused successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to pause survey");
      }
    } catch (error) {
      console.error("Error pausing survey:", error);
      toast.error("Failed to pause survey");
    }
  };

  const handleResumeSurvey = async (surveyId: string) => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      if (response.ok) {
        // Update local state
        setSurveys(prev => prev.map(survey => 
          survey.id === surveyId 
            ? { ...survey, status: "active" }
            : survey
        ));
        toast.success("Survey resumed successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to resume survey");
      }
    } catch (error) {
      console.error("Error resuming survey:", error);
      toast.error("Failed to resume survey");
    }
  };

  const handleSendReminder = async (surveyId: string) => {
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
    }
  };

  return (
    <PageShell
      title="Active Surveys"
      description="Monitor and manage currently running surveys"
      icon={<Send className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Surveys", href: "/surveys" },
          { label: "Active Surveys", isCurrentPage: true },
        ],
      }}
      action={
        <Button asChild variant="primary">
          <Link href="/surveys/send" className="flex items-center">
            <Send className="w-4 h-4 mr-2" />
            Send New Survey
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {surveys.filter(s => s.status === "active").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {surveys.reduce((sum, s) => sum + s.responses, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {surveys.length > 0 
                  ? Math.round(surveys.reduce((sum, s) => sum + s.responseRate, 0) / surveys.length)
                  : 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {surveys.filter(s => typeof s.daysRemaining === "number" && s.daysRemaining <= 3).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Surveys List */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading active surveys...</p>
              </div>
            </CardContent>
          </Card>
        ) : surveys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Send className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No active surveys
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                You don't have any surveys currently running. Create a template and send your first survey to get started.
              </p>
              <Button asChild variant="primary">
                <Link href="/surveys/send" className="flex items-center">
                  <Send className="w-4 h-4 mr-2" />
                  Send Your First Survey
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {surveys.map((survey) => (
              <Card
                key={survey.id}
                className="hover:shadow-md transition-shadow relative group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{survey.name}</CardTitle>
                        {getStatusBadge(survey.status)}
                        {getAnonymizationBadge(survey.anonymizationLevel)}
                      </div>
                      <CardDescription className="mb-3">
                        Template: {survey.templateName}
                      </CardDescription>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Sent Date</div>
                          <div className="font-medium">
                            {new Date(survey.sentDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Deadline</div>
                          <div className="font-medium">
                            {survey.deadline
                              ? new Date(survey.deadline).toLocaleDateString()
                              : "No deadline"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Recipients</div>
                          <div className="font-medium">
                            {survey.totalRecipients} people
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Response Rate</div>
                          <div className="font-medium">
                            {survey.responseRate}% ({survey.responses}/{survey.totalRecipients})
                          </div>
                        </div>
                      </div>

                      {typeof survey.daysRemaining === "number" && (
                        <div className="mt-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {survey.daysRemaining === 0 
                              ? "Due today" 
                              : `${survey.daysRemaining} days remaining`}
                          </span>
                          {survey.daysRemaining <= 3 && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/surveys/${survey.id}`} className="flex items-center">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <div className="absolute bottom-4 right-4 flex translate-x-10 flex-col items-stretch gap-2 rounded-2xl bg-background/80 px-3 py-3 text-xs shadow-depth-2 backdrop-blur-xl opacity-0 transition-all duration-300 pointer-events-none group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start pointer-events-auto"
                    onClick={() => handleSendReminder(survey.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                  {survey.status === "active" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="justify-start pointer-events-auto"
                      onClick={() => handlePauseSurvey(survey.id)}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Survey
                    </Button>
                  ) : survey.status === "paused" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="justify-start pointer-events-auto"
                      onClick={() => handleResumeSurvey(survey.id)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume Survey
                    </Button>
                  ) : null}
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="justify-start pointer-events-auto"
                  >
                    <Link href={`/surveys/analytics/${survey.id}`}>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Analytics
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Action Items Integration Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium">
                Survey Distribution via Action Items
              </p>
              <p className="text-xs text-blue-700 mt-1">
                All surveys are automatically distributed through the Action Items system. 
                Employees receive survey notifications in their dashboard and can complete them directly from there.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
