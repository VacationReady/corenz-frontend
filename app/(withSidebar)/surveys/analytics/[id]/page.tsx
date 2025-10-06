"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
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
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
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
  ArrowLeft,
  User,
  Building,
  Mail,
  Clock,
  RefreshCw,
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

interface IndividualSurveyAnalytics {
  id: string;
  name: string;
  templateName: string;
  totalResponses: number;
  totalRecipients: number;
  responseRate: number;
  completionDate: string;
  averageScore?: number;
  keyInsights: string[];
  sentimentScore: number;
  topThemes: string[];
  questionAnalytics: Array<{
    question: string;
    totalResponses: number;
    average: number;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  }>;
  departmentAnalytics: Array<{
    department: string;
    responses: number;
    average: number;
  }>;
  responses: Array<{
    id: string;
    employee: {
      id: string;
      name: string;
      email: string;
      department: string;
      position: string;
    } | null;
    submittedAt: string;
    responseData: any;
  }>;
  recipients: Array<{
    id: string;
    employee: {
      id: string;
      name: string;
      email: string;
      department: string;
      position: string;
    } | null;
    status: string;
    sentAt: string;
  }>;
}

export default function IndividualSurveyAnalyticsPage() {
  const params = useParams();
  const surveyId = params?.id as string;
  
  const [analytics, setAnalytics] = useState<IndividualSurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [digestMessage, setDigestMessage] = useState("");
  const [scheduleWeekly, setScheduleWeekly] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Early return if no surveyId
  if (!surveyId) {
    return (
      <PageShell
        title="Survey Analytics"
        description="Survey not found"
        icon={<TrendingUp className="w-6 h-6" />}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Survey ID not found
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              The survey ID could not be determined from the URL.
            </p>
            <Button asChild variant="primary">
              <Link href="/surveys/analytics">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!surveyId) return;
      
      try {
        const response = await fetch(`/api/surveys/${surveyId}/analytics`);
        
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data.analytics);
        } else {
          toast.error("Failed to load survey analytics");
        }
      } catch (error) {
        console.error("Failed to load analytics data:", error);
        toast.error("Failed to load survey analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [surveyId]);

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
    if (!analytics) return;
    
    const csvData = generateIndividualAnalyticsCSV(analytics);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analytics.name.replace(/[^a-zA-Z0-9]/g, '_')}_analytics_${new Date().toISOString().split('T')[0]}.csv`;
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
      const response = await fetch(`/api/surveys/${surveyId}/digest`, {
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

  const handleAnalyzeWithAI = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("AI analysis completed! Refreshing data...");
        
        // Reload analytics data
        const analyticsResponse = await fetch(`/api/surveys/${surveyId}/analytics`);
        if (analyticsResponse.ok) {
          const data = await analyticsResponse.json();
          setAnalytics(data.analytics);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to analyze survey");
      }
    } catch (error) {
      console.error("Error analyzing survey:", error);
      toast.error("Failed to analyze survey");
    } finally {
      setAnalyzing(false);
    }
  };

  const generateIndividualAnalyticsCSV = (data: IndividualSurveyAnalytics): string => {
    const headers = [
      'Survey Name',
      'Template',
      'Total Responses',
      'Total Recipients',
      'Response Rate (%)',
      'Average Score',
      'Sentiment Score (%)',
      'Completion Date',
      'Key Insights',
      'Top Themes'
    ];

    const rows = [
      [
        data.name,
        data.templateName,
        data.totalResponses.toString(),
        data.totalRecipients.toString(),
        data.responseRate.toString(),
        data.averageScore?.toString() || 'N/A',
        (data.sentimentScore * 100).toFixed(0),
        new Date(data.completionDate).toLocaleDateString(),
        data.keyInsights.join('; '),
        data.topThemes.join('; ')
      ]
    ];

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  };

  if (loading) {
    return (
      <PageShell
        title="Survey Analytics"
        description="Loading survey analytics..."
        icon={<TrendingUp className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Surveys", href: "/surveys" },
            { label: "Analytics", href: "/surveys/analytics" },
            { label: "Individual Survey", isCurrentPage: true },
          ],
        }}
      >
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading survey analytics...</p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!analytics) {
    return (
      <PageShell
        title="Survey Analytics"
        description="Survey analytics not found"
        icon={<TrendingUp className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Surveys", href: "/surveys" },
            { label: "Analytics", href: "/surveys/analytics" },
            { label: "Individual Survey", isCurrentPage: true },
          ],
        }}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Survey analytics not found
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              The survey you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button asChild variant="primary">
              <Link href="/surveys/analytics">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`${analytics.name} - Analytics`}
      description="Detailed analytics and insights for this survey"
      icon={<TrendingUp className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Surveys", href: "/surveys" },
          { label: "Analytics", href: "/surveys/analytics" },
          { label: analytics.name, isCurrentPage: true },
        ],
      }}
      action={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/surveys/analytics">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analytics
            </Link>
          </Button>
          <Button 
            onClick={handleAnalyzeWithAI} 
            disabled={analyzing || !analytics}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Analyze with AI'}
          </Button>
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
                  Choose how you'd like to export or share this survey's analytics data.
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
                          onCheckedChange={(checked) => setScheduleWeekly(checked === true)}
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
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalResponses}</div>
              <p className="text-xs text-muted-foreground">
                of {analytics.totalRecipients} recipients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.responseRate}%</div>
              <p className="text-xs text-muted-foreground">
                Completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.averageScore ? analytics.averageScore.toFixed(1) : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Out of 5.0
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getSentimentColor(analytics.sentimentScore)}`}>
                {getSentimentLabel(analytics.sentimentScore)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(analytics.sentimentScore * 100).toFixed(0)}% positive
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Question Analytics */}
        {analytics.questionAnalytics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Question Analysis
              </CardTitle>
              <CardDescription>
                Detailed breakdown of responses by question
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analytics.questionAnalytics.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">{question.question}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{question.totalResponses} responses</Badge>
                        <Badge variant="secondary">Avg: {question.average}/5.0</Badge>
                      </div>
                    </div>
                    
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={[
                          { rating: "1", count: question.distribution[1] },
                          { rating: "2", count: question.distribution[2] },
                          { rating: "3", count: question.distribution[3] },
                          { rating: "4", count: question.distribution[4] },
                          { rating: "5", count: question.distribution[5] },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="rating" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }} 
                          />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Department Analytics */}
        {analytics.departmentAnalytics.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Department Breakdown
                </CardTitle>
                <CardDescription>
                  Response rates and scores by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.departmentAnalytics.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{dept.department}</div>
                        <div className="text-sm text-muted-foreground">{dept.responses} responses</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{dept.average.toFixed(1)}/5.0</div>
                        <div className="text-xs text-muted-foreground">Average</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Department Distribution
                </CardTitle>
                <CardDescription>
                  Response distribution by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analytics.departmentAnalytics.map((dept, index) => ({
                          name: dept.department,
                          value: dept.responses,
                          fill: `hsl(${index * 60}, 70%, 50%)`,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.departmentAnalytics.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
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
          </div>
        )}

        {/* Individual Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Individual Responses
            </CardTitle>
            <CardDescription>
              Detailed view of each survey response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {response.employee?.name || "Anonymous"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {response.employee?.department} • {response.employee?.position}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(response.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(response.responseData || {}).map(([key, value]) => (
                      <div key={key} className="bg-muted/50 rounded p-3">
                        <div className="text-sm font-medium text-muted-foreground mb-1">{key}</div>
                        <div className="text-sm">
                          {typeof value === 'number' ? (
                            <div className="flex items-center gap-2">
                              <span>{value}/5</span>
                              <div className="flex-1 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full" 
                                  style={{ width: `${(value / 5) * 100}%` }}
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
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Insights */}
        {analytics.keyInsights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Key Insights
              </CardTitle>
              <CardDescription>
                AI-generated insights from survey responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analytics.keyInsights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span className="text-sm">{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Top Themes */}
        {analytics.topThemes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Themes
              </CardTitle>
              <CardDescription>
                Most frequently mentioned themes in responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analytics.topThemes.map((theme, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {theme}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
