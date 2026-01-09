"use client";

import { useState, useEffect, useMemo } from "react";
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
  BarChart3,
  Send,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Settings,
  Repeat,
  Activity,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Palette,
  Compass,
} from "lucide-react";
import { SurveyTemplateDefinition } from "@/lib/survey-templates";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import {
  DEFAULT_SURVEY_TEMPLATES,
  ensureDefaultSurveyTemplates,
  findTemplateMetaBySlug,
} from "@/lib/survey-templates";
import { FeatureGuardedPage } from "@/components/FeatureGuardedPage";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

interface SurveyStats {
  totalSurveys: number;
  activeSurveys: number;
  completedSurveys: number;
  totalResponses: number;
  averageResponseRate: number;
  pendingActions: number;
  recentSurveys: any[];
  responseTrends: any[];
}

interface ActiveSurvey {
  id: string;
  name: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "EXPIRED";
  sentDate?: string;
  deadline?: string;
  totalRecipients: number;
  responses: number;
  responseRate: number;
  Form: {
    name: string;
  };
  CreatedBy: {
    name: string;
    email: string;
  };
}

// Helper to render Lucide icons based on template icon name
function TemplateIcon({ icon, className }: { icon: SurveyTemplateDefinition["icon"]; className?: string }) {
  const iconMap = {
    "trending-up": TrendingUp,
    "palette": Palette,
    "compass": Compass,
  };
  const IconComponent = iconMap[icon];
  return <IconComponent className={className} />;
}

export default function SurveysDashboard() {
  const [stats, setStats] = useState<SurveyStats>({
    totalSurveys: 0,
    activeSurveys: 0,
    completedSurveys: 0,
    totalResponses: 0,
    averageResponseRate: 0,
    pendingActions: 0,
    recentSurveys: [],
    responseTrends: [],
  });
  const [activeSurveys, setActiveSurveys] = useState<ActiveSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateLibrary, setTemplateLibrary] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsRes, surveysRes] = await Promise.all([
          fetch("/api/surveys/stats"),
          fetch("/api/surveys?status=ACTIVE&limit=5"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (surveysRes.ok) {
          const surveysData = await surveysRes.json();
          setActiveSurveys(surveysData.surveys || []);
        }
      } catch (error) {
        console.error("Failed to load survey data:", error);
        toast.error("Failed to load survey data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const forms = await ensureDefaultSurveyTemplates();
        setTemplateLibrary(Array.isArray(forms) ? forms : []);
      } catch (error) {
        console.error("Failed to load survey templates:", error);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const curatedTemplates = useMemo(() => {
    const bySlug = new Map((templateLibrary || []).map((template: any) => [template.slug, template]));
    return DEFAULT_SURVEY_TEMPLATES.map((definition) => ({
      definition,
      instance: bySlug.get(definition.slug),
    }));
  }, [templateLibrary]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      case "PAUSED":
        return <Badge variant="outline">Paused</Badge>;
      case "EXPIRED":
        return <Badge variant="destructive">Expired</Badge>;
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatResponseTrends = (trends: any[]) => {
    return trends.map(trend => ({
      month: new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      responses: Number(trend.responses),
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <FeatureGuardedPage featureKey={FEATURE_KEYS.SURVEYS}>
    <PageShell
      title="Surveys Dashboard"
      description="Manage surveys, track responses, and analyse feedback"
      icon={<BarChart3 className="w-6 h-6" />}
      breadcrumbs={breadcrumbConfigs.surveysSection("Dashboard")}
      action={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/settings/surveys/new" className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Link>
          </Button>
          <Button asChild variant="primary">
            <Link href="/surveys/send" className="flex items-center">
              <Send className="w-4 h-4 mr-2" />
              Send Survey
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Template Library Spotlight - Compact */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-100 via-blue-50 to-indigo-50 border border-sky-200/60">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-sky-400 to-indigo-400" />
          <div className="flex flex-col gap-4 p-4 pl-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700">
                  <Sparkles className="h-3 w-3" /> Template library spotlight
                </div>
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Kickstart surveys with curated experiences
              </h2>
              <p className="text-xs text-slate-600 max-w-lg">
                Choose from eNPS, pulse, and annual engagement templates—each crafted with premium employee experience in mind.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {curatedTemplates.map(({ definition, instance }) => (
                  <span
                    key={definition.slug}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-slate-200 px-2.5 py-1 text-xs text-slate-700 shadow-sm"
                  >
                    <TemplateIcon icon={definition.icon} className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-medium">{definition.name.split(" ")[0] === "Employee" ? "eNPS" : definition.name.split(" ")[0]}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 md:flex-col md:items-end lg:flex-row">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Templates ready</p>
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-2xl font-bold text-slate-900">{templateLibrary.length}</span>
                  <span className="text-xs text-slate-500">available</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {templatesLoading ? "Generating…" : "Edit any template before sending or scheduling."}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Button asChild size="sm" variant="secondary" className="bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-sm text-xs h-8">
                  <Link href="/surveys/send" className="flex items-center">
                    <Send className="h-3 w-3 mr-1.5" />
                    Send a survey
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="text-slate-600 hover:bg-white/60 text-xs h-8">
                  <Link href="/settings/surveys" className="flex items-center">
                    <Settings className="h-3 w-3 mr-1.5" />
                    Refine templates
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Active Surveys</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Activity className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats.activeSurveys}</div>
              <p className="text-xs text-blue-700 mt-1">
                Currently running
              </p>
              <div className="flex items-center mt-2 text-xs text-blue-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{stats.totalSurveys} total</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Total Responses</CardTitle>
              <div className="p-2 bg-green-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats.totalResponses}</div>
              <p className="text-xs text-green-700 mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">Response Rate</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <Target className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats.averageResponseRate.toFixed(1)}%</div>
              <p className="text-xs text-purple-700 mt-1">
                Average completion
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-900">Pending Actions</CardTitle>
              <div className="p-2 bg-amber-500 rounded-lg">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">{stats.pendingActions}</div>
              <p className="text-xs text-amber-700 mt-1">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - Only show when there's data */}
        {stats.responseTrends.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Response Trends
                </CardTitle>
                <CardDescription>
                  Survey responses over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatResponseTrends(stats.responseTrends)}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="responses" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Survey Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Survey Status
                </CardTitle>
                <CardDescription>
                  Distribution of surveys by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: stats.activeSurveys, color: '#10b981' },
                          { name: 'Completed', value: stats.completedSurveys, color: '#6366f1' },
                          { name: 'Draft', value: stats.totalSurveys - stats.activeSurveys - stats.completedSurveys, color: '#f59e0b' },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Active', value: stats.activeSurveys, color: '#10b981' },
                          { name: 'Completed', value: stats.completedSurveys, color: '#6366f1' },
                          { name: 'Draft', value: stats.totalSurveys - stats.activeSurveys - stats.completedSurveys, color: '#f59e0b' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-blue-700">
              Common survey management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="h-auto p-4 bg-white hover:bg-blue-50 text-blue-900 border-blue-200">
                <Link href="/surveys/active">
                  <div className="flex flex-col items-center gap-2">
                    <Eye className="h-6 w-6" />
                    <span>View Active Surveys</span>
                    <span className="text-xs text-muted-foreground">Track progress and responses</span>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-4 bg-white hover:bg-blue-50 text-blue-900 border-blue-200">
                <Link href="/surveys/automation">
                  <div className="flex flex-col items-center gap-2">
                    <Repeat className="h-6 w-6" />
                    <span>Set Up Automation</span>
                    <span className="text-xs text-muted-foreground">Create recurring surveys</span>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-4 bg-white hover:bg-blue-50 text-blue-900 border-blue-200">
                <Link href="/surveys/analytics">
                  <div className="flex flex-col items-center gap-2">
                    <TrendingUp className="h-6 w-6" />
                    <span>View Analytics</span>
                    <span className="text-xs text-muted-foreground">Analyse trends and insights</span>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Surveys */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Surveys</CardTitle>
            <CardDescription>
              Latest survey activity and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading surveys...
              </div>
            ) : activeSurveys.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No surveys yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by creating a survey template and sending your first survey.
                </p>
                <Button asChild variant="primary">
                  <Link href="/settings/surveys/new" className="flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Survey
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSurveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{survey.name}</h3>
                        {getStatusBadge(survey.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Template: {survey.Form.name}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {survey.sentDate && <span>Sent: {new Date(survey.sentDate).toLocaleDateString()}</span>}
                        {survey.deadline && <span>Deadline: {new Date(survey.deadline).toLocaleDateString()}</span>}
                        <span>{survey.responses}/{survey.totalRecipients} responses</span>
                        <span className="font-medium">{survey.responseRate.toFixed(1)}% completion</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/surveys/${survey.id}`} className="flex items-center">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/surveys/analytics/${survey.id}`} className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Analytics
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Items Integration Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium">
                Survey Completion via Action Items
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Surveys are automatically distributed through Action Items in the Dashboard. 
                Employees can complete surveys directly from their action items list.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
    </FeatureGuardedPage>
  );
}
