"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  X,
  BarChart3,
  Target,
  MessageSquare,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  ExternalLink,
  Download,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Star,
  GitBranch,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface JourneyTemplate {
  id: string;
  name: string;
  status: string;
  phases: any[];
  metricBindings: any[];
  experiments: any[];
}

interface InsightDockProps {
  journey: JourneyTemplate;
  onClose: () => void;
}

interface Metric {
  id: string;
  name: string;
  type: string;
  currentValue: number;
  targetValue: number;
  trend: number;
  status: "excellent" | "good" | "warning" | "critical";
  isKPI: boolean;
  sampleSize: number;
}

interface Experiment {
  name: string;
  status: string;
  variants: Array<{ name: string; allocation: number; conversions: number; isControl: boolean }>;
  confidence: number;
  startDate: string;
}

interface Feedback {
  id: string;
  content: string;
  sentiment: string | null;
  phase: string;
  block: string;
  timestamp: string;
  tags: string[];
}

interface AISuggestion {
  id: string;
  type: "optimization" | "automation" | "content" | "timing";
  title: string;
  description: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
}

interface AnalyticsData {
  summary: {
    totalParticipants: number;
    activeParticipants: number;
    completedParticipants: number;
    completionRate: number;
    avgProgress: number;
    avgSatisfaction: number;
    avgTimeToComplete: number;
  };
  metrics: Metric[];
  experiments: Experiment[];
  feedback: Feedback[];
  aiSuggestions: AISuggestion[];
}

export function InsightDock({ journey, onClose }: InsightDockProps) {
  const [activeTab, setActiveTab] = useState("metrics");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!journey?.id) return;
    
    try {
      setRefreshing(true);
      const response = await fetch(`/api/journeys/${journey.id}/analytics`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        console.error("Failed to fetch analytics");
        toast.error("Failed to load analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [journey?.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    fetchAnalytics();
  };

  // Use real data or fallback to empty arrays
  const metrics = analyticsData?.metrics || [];
  const experiments = analyticsData?.experiments || [];
  const feedback = analyticsData?.feedback || [];
  const aiSuggestions = analyticsData?.aiSuggestions || [];

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "text-green-600 bg-green-50";
      case "good":
        return "text-blue-600 bg-blue-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "critical":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case "POSITIVE":
      case "positive":
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case "NEGATIVE":
      case "negative":
        return <ThumbsDown className="w-4 h-4 text-red-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatMetricValue = (metric: Metric) => {
    switch (metric.type) {
      case "SATISFACTION_SCORE":
        return `${metric.currentValue.toFixed(1)}/10`;
      case "TIME_TO_COMPLETE":
        return `${metric.currentValue} days`;
      default:
        return `${metric.currentValue}%`;
    }
  };

  const formatTargetValue = (metric: Metric) => {
    switch (metric.type) {
      case "SATISFACTION_SCORE":
        return `${metric.targetValue.toFixed(1)}/10`;
      case "TIME_TO_COMPLETE":
        return `${metric.targetValue} days`;
      default:
        return `${metric.targetValue}%`;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-none p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Journey Insights</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-none p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Journey Insights</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {analyticsData?.summary && (
        <div className="flex-none p-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{analyticsData.summary.totalParticipants}</div>
              <div className="text-xs text-muted-foreground">Participants</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{analyticsData.summary.completionRate}%</div>
              <div className="text-xs text-muted-foreground">Completion</div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-none px-4 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="metrics" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Metrics
              </TabsTrigger>
              <TabsTrigger value="experiments" className="text-xs">
                <GitBranch className="w-3 h-3 mr-1" />
                Tests
              </TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                Feedback
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="metrics" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {metrics.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No metrics configured</p>
                      <p className="text-xs">Add metric bindings to track journey KPIs</p>
                    </div>
                  ) : (
                    metrics.map((metric) => (
                      <Card key={metric.id} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{metric.name}</CardTitle>
                            <Badge className={cn("text-xs", getMetricStatusColor(metric.status))}>
                              {metric.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">
                              {formatMetricValue(metric)}
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              {metric.trend >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              )}
                              <span className={metric.trend >= 0 ? "text-green-600" : "text-red-600"}>
                                {Math.abs(metric.trend)}%
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Target: {formatTargetValue(metric)}</span>
                              <span>{metric.sampleSize} participants</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={cn(
                                  "rounded-full h-2 transition-all",
                                  metric.status === "excellent" && "bg-green-500",
                                  metric.status === "good" && "bg-blue-500",
                                  metric.status === "warning" && "bg-yellow-500",
                                  metric.status === "critical" && "bg-red-500"
                                )}
                                style={{ width: `${Math.min((metric.currentValue / metric.targetValue) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="text-xs flex-1">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Details
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs flex-1">
                              <Download className="w-3 h-3 mr-1" />
                              Export
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="experiments" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {experiments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No experiments running</p>
                      <p className="text-xs mb-4">Create A/B tests to optimize your journey</p>
                      <Button variant="outline" size="sm">
                        <GitBranch className="w-4 h-4 mr-2" />
                        Create Experiment
                      </Button>
                    </div>
                  ) : (
                    experiments.map((experiment, expIndex) => (
                      <Card key={expIndex}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{experiment.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={experiment.status === "RUNNING" ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {experiment.status === "RUNNING" ? (
                                  <Play className="w-3 h-3 mr-1" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                )}
                                {experiment.status.toLowerCase()}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            {experiment.variants.map((variant, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-3 h-3 rounded-full",
                                    variant.isControl ? "bg-blue-500" : 
                                    index === 1 ? "bg-green-500" : "bg-purple-500"
                                  )} />
                                  <span>{variant.name}</span>
                                  {variant.isControl && (
                                    <Badge variant="outline" className="text-xs">Control</Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {variant.allocation}%
                                  </Badge>
                                </div>
                                <div className="font-medium">{variant.conversions}% conv.</div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Confidence: {experiment.confidence}%</span>
                            {experiment.startDate && (
                              <span>Started {formatDistanceToNow(new Date(experiment.startDate), { addSuffix: true })}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {experiment.status === "RUNNING" ? (
                              <Button variant="outline" size="sm" className="text-xs flex-1">
                                <Pause className="w-3 h-3 mr-1" />
                                Pause Test
                              </Button>
                            ) : experiment.status === "COMPLETED" ? (
                              <Button variant="outline" size="sm" className="text-xs flex-1">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Apply Winner
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="text-xs flex-1">
                                <Play className="w-3 h-3 mr-1" />
                                Start Test
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="text-xs flex-1">
                              <BarChart3 className="w-3 h-3 mr-1" />
                              Results
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}

                  {experiments.length > 0 && (
                    <Button variant="outline" className="w-full">
                      <GitBranch className="w-4 h-4 mr-2" />
                      Create New Experiment
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="feedback" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Select defaultValue="all">
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiment</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {feedback.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No feedback collected yet</p>
                      <p className="text-xs">Feedback will appear as participants complete blocks</p>
                    </div>
                  ) : (
                    feedback.map((item) => (
                      <Card 
                        key={item.id} 
                        className={cn(
                          "border-l-4",
                          item.sentiment === "POSITIVE" || item.sentiment === "positive" ? "border-l-green-400" :
                          item.sentiment === "NEGATIVE" || item.sentiment === "negative" ? "border-l-red-400" :
                          "border-l-gray-300"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              {getSentimentIcon(item.sentiment)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900">{item.content}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {item.phase}
                                </Badge>
                                {item.block && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.block}
                                  </Badge>
                                )}
                                {item.tags?.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="ai" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {aiSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No suggestions yet</p>
                      <p className="text-xs">AI suggestions will appear once we have enough data</p>
                    </div>
                  ) : (
                    aiSuggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Zap className={cn(
                                    "w-4 h-4",
                                    suggestion.type === "optimization" && "text-purple-600",
                                    suggestion.type === "automation" && "text-blue-600",
                                    suggestion.type === "content" && "text-green-600",
                                    suggestion.type === "timing" && "text-orange-600"
                                  )} />
                                  <h3 className="font-medium text-sm">{suggestion.title}</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <Star className="w-3 h-3 text-yellow-500" />
                                <span>{suggestion.confidence}%</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-xs", getImpactColor(suggestion.impact))}>
                                  {suggestion.impact} impact
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {suggestion.effort} effort
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ThumbsUp className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ThumbsDown className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <Button variant="outline" size="sm" className="w-full text-xs">
                              <Zap className="w-3 h-3 mr-1" />
                              Apply Suggestion
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
