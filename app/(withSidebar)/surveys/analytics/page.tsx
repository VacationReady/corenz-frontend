"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  TrendingUp,
  BarChart3,
  Users,
  Calendar,
  Download,
  Filter,
  Eye,
  MessageSquare,
  Target,
  CheckCircle,
  Activity,
  Zap,
  Brain,
  PieChart,
  LineChart,
} from "lucide-react";
import { toast } from "sonner";
import { 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart as RechartsBarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface SurveyAnalytics {
  id: string;
  name: string;
  templateName: string;
  totalResponses: number;
  responseRate: number;
  completionDate: string;
  averageScore?: number;
  keyInsights: string[];
  sentimentScore: number;
  topThemes: string[];
}

interface TrendData {
  period: string;
  responseRate: number;
  satisfactionScore: number;
  totalResponses: number;
}

export default function SurveyAnalyticsPage() {
  const [analytics, setAnalytics] = useState<SurveyAnalytics[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [digestMessage, setDigestMessage] = useState("");
  const [scheduleWeekly, setScheduleWeekly] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [analyticsRes, trendsRes] = await Promise.all([
          fetch("/api/surveys/analytics"),
          fetch("/api/surveys/trends"),
        ]);
        
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData.analytics || []);
        } else {
          setAnalytics([]);
        }

        if (trendsRes.ok) {
          const trendsData = await trendsRes.json();
          setTrends(trendsData.trends || []);
        } else {
          setTrends([]);
        }
      } catch (error) {
        console.error("Failed to load analytics data:", error);
        setAnalytics([]);
        setTrends([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return "text-green-600";
    if (score >= 0.4) return "text-yellow-600";
    return "text-red-600";
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 0.7) return "Positive";
    if (score >= 0.4) return "Neutral";
    return "Negative";
  };

  const handleDownloadCSV = () => {
    const csvData = generateAnalyticsCSV(analytics);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("CSV downloaded successfully");
    setExportDialogOpen(false);
  };

  const handleSendDigest = async () => {
    if (!emailRecipients.trim()) {
      toast.error("Please enter at least one email address");
      return;
    }

    const emails = emailRecipients.split(',').map(email => email.trim()).filter(email => email);
    const invalidEmails = emails.filter(email => !email.includes('@'));
    
    if (invalidEmails.length > 0) {
      toast.error("Please enter valid email addresses");
      return;
    }

    setSendingDigest(true);
    try {
      // For now, we'll send a digest for the first survey as an example
      // In a real implementation, you might want to aggregate all surveys
      const firstSurvey = analytics[0];
      if (!firstSurvey) {
        toast.error("No survey data available to send");
        return;
      }

      const response = await fetch(`/api/surveys/${firstSurvey.id}/digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: emails,
          message: digestMessage.trim() || undefined,
          schedule: scheduleWeekly ? "WEEKLY" : null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || "Digest sent successfully");
        setExportDialogOpen(false);
        setEmailRecipients("");
        setDigestMessage("");
        setScheduleWeekly(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send digest");
      }
    } catch (error) {
      console.error("Error sending digest:", error);
      toast.error("Failed to send digest");
    } finally {
      setSendingDigest(false);
    }
  };

  const generateAnalyticsCSV = (data: SurveyAnalytics[]): string => {
    const headers = [
      'Survey Name',
      'Template',
      'Total Responses',
      'Response Rate (%)',
      'Average Score',
      'Sentiment Score (%)',
      'Completion Date',
      'Key Insights',
      'Top Themes'
    ];

    const rows = data.map(survey => [
      survey.name,
      survey.templateName,
      survey.totalResponses.toString(),
      survey.responseRate.toString(),
      survey.averageScore?.toString() || 'N/A',
      (survey.sentimentScore * 100).toFixed(0),
      new Date(survey.completionDate).toLocaleDateString(),
      survey.keyInsights.join('; '),
      survey.topThemes.join('; ')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  };

  return (
    <PageShell
      title="Survey Analytics"
      description="Analyze survey results and track trends over time"
      icon={<TrendingUp className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Surveys", href: "/surveys" },
          { label: "Analytics", isCurrentPage: true },
        ],
      }}
      action={
        <div className="flex gap-2">
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Export Survey Analytics</DialogTitle>
                <DialogDescription>
                  Choose how you'd like to export or share your survey analytics data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <Button 
                    onClick={handleDownloadCSV} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download as CSV
                  </Button>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Email Results to Management</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="recipients">Email Recipients</Label>
                        <Input
                          id="recipients"
                          placeholder="manager@company.com, executive@company.com"
                          value={emailRecipients}
                          onChange={(e) => setEmailRecipients(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Separate multiple emails with commas
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="message">Optional Message</Label>
                        <Textarea
                          id="message"
                          placeholder="Add a personal message to the digest..."
                          value={digestMessage}
                          onChange={(e) => setDigestMessage(e.target.value)}
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="schedule"
                          checked={scheduleWeekly}
                          onCheckedChange={setScheduleWeekly}
                        />
                        <Label htmlFor="schedule" className="text-sm">
                          Schedule weekly digest
                        </Label>
                      </div>
                      
                      <Button 
                        onClick={handleSendDigest} 
                        disabled={sendingDigest}
                        className="w-full"
                      >
                        {sendingDigest ? "Sending..." : "Send Digest"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.length}</div>
              <p className="text-xs text-muted-foreground">
                Completed this quarter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.length > 0 
                  ? Math.round(analytics.reduce((sum, a) => sum + a.responseRate, 0) / analytics.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all surveys
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.length > 0 
                  ? (analytics.reduce((sum, a) => sum + (a.averageScore || 0), 0) / analytics.length).toFixed(1)
                  : "0.0"}
              </div>
              <p className="text-xs text-muted-foreground">
                Out of 5.0
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.reduce((sum, a) => sum + a.totalResponses, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                This quarter
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Charts - Only show when there's data */}
        {trends.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Response Trends
                </CardTitle>
                <CardDescription>
                  Survey response rates and satisfaction scores over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="period" 
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
                        dataKey="responseRate" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        name="Response Rate (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="satisfactionScore" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        name="Satisfaction Score"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Response Distribution - Only show when there's analytics data */}
            {analytics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Response Distribution
                  </CardTitle>
                  <CardDescription>
                    Survey completion status breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Completed', value: analytics.reduce((sum, a) => sum + a.totalResponses, 0), color: '#10b981' },
                            { name: 'Pending', value: Math.max(0, analytics.reduce((sum, a) => sum + (a.totalResponses / a.responseRate * 100) - a.totalResponses, 0)), color: '#f59e0b' },
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
                            { name: 'Completed', value: analytics.reduce((sum, a) => sum + a.totalResponses, 0), color: '#10b981' },
                            { name: 'Pending', value: Math.max(0, analytics.reduce((sum, a) => sum + (a.totalResponses / a.responseRate * 100) - a.totalResponses, 0)), color: '#f59e0b' },
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
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Sentiment Analysis Chart - Only show when there's analytics data */}
        {analytics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Sentiment Analysis
              </CardTitle>
              <CardDescription>
                AI-powered sentiment analysis of survey responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={analytics.map(survey => ({
                    category: survey.name,
                    positive: Math.round(survey.sentimentScore * 100),
                    neutral: Math.round((1 - survey.sentimentScore) * 50),
                    negative: Math.round((1 - survey.sentimentScore) * 50),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="category" className="text-xs" tick={{ fontSize: 12 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }} 
                    />
                    <Bar dataKey="positive" stackId="a" fill="#10b981" name="Positive" />
                    <Bar dataKey="neutral" stackId="a" fill="#f59e0b" name="Neutral" />
                    <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Survey Analytics */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            </CardContent>
          </Card>
        ) : analytics.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No analytics available
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Complete some surveys to see analytics and insights. 
                Analytics will appear here once surveys have been completed.
              </p>
              <Button asChild variant="primary">
                <Link href="/surveys">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Go to Surveys
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {analytics.map((survey) => (
              <Card key={survey.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{survey.name}</CardTitle>
                        <Badge variant="secondary">
                          {survey.totalResponses} responses
                        </Badge>
                        <Badge variant="outline">
                          {survey.responseRate}% response rate
                        </Badge>
                      </div>
                      
                      <CardDescription className="mb-4">
                        Template: {survey.templateName} • Completed: {new Date(survey.completionDate).toLocaleDateString()}
                      </CardDescription>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <div className="text-sm font-medium mb-2">Key Insights</div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {survey.keyInsights.map((insight, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium mb-2">Top Themes</div>
                          <div className="flex flex-wrap gap-1">
                            {survey.topThemes.map((theme, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                          
                          {survey.averageScore && (
                            <div className="mt-3">
                              <div className="text-sm font-medium mb-1">Average Score</div>
                              <div className="text-2xl font-bold">{survey.averageScore}/5.0</div>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium mb-2">Sentiment Analysis</div>
                          <div className={`text-2xl font-bold ${getSentimentColor(survey.sentimentScore)}`}>
                            {getSentimentLabel(survey.sentimentScore)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Score: {(survey.sentimentScore * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/surveys/analytics/${survey.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* AI Insights */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">AI-Powered Insights</CardTitle>
            <CardDescription className="text-blue-700">
              Automated analysis and recommendations based on your survey data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Trend Analysis
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Response rates have been consistent at 80% over the past quarter. 
                  Satisfaction scores show a slight upward trend.
                </p>
                <Button variant="outline" size="sm" className="text-xs">
                  View Full Analysis
                </Button>
              </div>

              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Recommendations
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Consider sending shorter surveys to improve completion rates. 
                  Focus on communication improvements based on feedback themes.
                </p>
                <Button variant="outline" size="sm" className="text-xs">
                  View Recommendations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
