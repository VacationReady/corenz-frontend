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
  TrendingUp,
  MoreVertical,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface ActiveSurvey {
  id: string;
  name: string;
  templateName: string;
  sentDate: string;
  deadline: string;
  totalRecipients: number;
  responses: number;
  responseRate: number;
  status: "active" | "paused" | "completed" | "expired";
  daysRemaining: number;
}

export default function ActiveSurveysPage() {
  const [surveys, setSurveys] = useState<ActiveSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActiveSurveys = async () => {
      try {
        // TODO: Replace with actual API call
        // const res = await fetch("/api/surveys/active");
        
        // Mock data for now
        setSurveys([
          {
            id: "1",
            name: "Q1 Employee Satisfaction",
            templateName: "Employee Satisfaction Survey",
            sentDate: "2024-01-15",
            deadline: "2024-01-29",
            totalRecipients: 25,
            responses: 20,
            responseRate: 80,
            status: "active",
            daysRemaining: 3,
          },
          {
            id: "2",
            name: "Manager Feedback - Engineering",
            templateName: "Manager Feedback Survey",
            sentDate: "2024-01-20",
            deadline: "2024-02-03",
            totalRecipients: 15,
            responses: 12,
            responseRate: 80,
            status: "active",
            daysRemaining: 8,
          },
          {
            id: "3",
            name: "New Hire Onboarding",
            templateName: "Onboarding Experience Survey",
            sentDate: "2024-01-10",
            deadline: "2024-01-24",
            totalRecipients: 8,
            responses: 7,
            responseRate: 87.5,
            status: "completed",
            daysRemaining: -1,
          },
        ]);
      } catch (error) {
        toast.error("Failed to load active surveys");
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

  const handlePauseSurvey = async (surveyId: string) => {
    try {
      // TODO: Implement pause survey API call
      toast.success("Survey paused successfully");
    } catch (error) {
      toast.error("Failed to pause survey");
    }
  };

  const handleResumeSurvey = async (surveyId: string) => {
    try {
      // TODO: Implement resume survey API call
      toast.success("Survey resumed successfully");
    } catch (error) {
      toast.error("Failed to resume survey");
    }
  };

  const handleSendReminder = async (surveyId: string) => {
    try {
      // TODO: Implement send reminder API call
      toast.success("Reminder sent successfully");
    } catch (error) {
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
          <Link href="/surveys/send">
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
                {surveys.filter(s => s.daysRemaining <= 3 && s.daysRemaining >= 0).length}
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
                <Link href="/surveys/send">
                  <Send className="w-4 h-4 mr-2" />
                  Send Your First Survey
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {surveys.map((survey) => (
              <Card key={survey.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{survey.name}</CardTitle>
                        {getStatusBadge(survey.status)}
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
                            {new Date(survey.deadline).toLocaleDateString()}
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

                      {survey.daysRemaining >= 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {survey.daysRemaining === 0 
                              ? "Due today" 
                              : `${survey.daysRemaining} days remaining`}
                          </span>
                          {survey.daysRemaining <= 3 && survey.daysRemaining >= 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/surveys/${survey.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                      
                      <DropdownMenu
                        trigger={
                          <Button variant="outline" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem onClick={() => handleSendReminder(survey.id)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Send Reminder
                        </DropdownMenuItem>
                        {survey.status === "active" ? (
                          <DropdownMenuItem onClick={() => handlePauseSurvey(survey.id)}>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause Survey
                          </DropdownMenuItem>
                        ) : survey.status === "paused" ? (
                          <DropdownMenuItem onClick={() => handleResumeSurvey(survey.id)}>
                            <Play className="w-4 h-4 mr-2" />
                            Resume Survey
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem asChild>
                          <Link href={`/surveys/analytics/${survey.id}`}>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            View Analytics
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
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
