"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  X,
  BarChart3,
  Target,
  MessageSquare,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  MoreHorizontal,
  ExternalLink,
  Download,
  Share,
  Filter,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Star,
  GitBranch,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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

export function InsightDock({ journey, onClose }: InsightDockProps) {
  const [activeTab, setActiveTab] = useState("metrics");
  const [refreshing, setRefreshing] = useState(false);

  // Mock data
  const [metrics] = useState([
    {
      id: "1",
      name: "Completion Rate",
      current: 87.3,
      target: 85,
      trend: 2.1,
      status: "good",
      sampleSize: 234,
    },
    {
      id: "2", 
      name: "Satisfaction Score",
      current: 8.4,
      target: 8.0,
      trend: 0.3,
      status: "excellent",
      sampleSize: 189,
    },
    {
      id: "3",
      name: "Time to Complete",
      current: 12.5,
      target: 14,
      trend: -1.2,
      status: "excellent",
      sampleSize: 156,
    },
  ]);

  const [experiments] = useState([
    {
      id: "1",
      name: "Mentorship Touchpoint A/B",
      status: "running",
      variants: [
        { name: "Control", allocation: 50, conversions: 78 },
        { name: "Enhanced", allocation: 50, conversions: 84 },
      ],
      confidence: 85,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      name: "Welcome Email Timing",
      status: "completed",
      variants: [
        { name: "Day 1", allocation: 33, conversions: 72 },
        { name: "Day 3", allocation: 33, conversions: 81 },
        { name: "Day 7", allocation: 34, conversions: 69 },
      ],
      confidence: 95,
      startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    },
  ]);

  const [feedback] = useState([
    {
      id: "1",
      content: "The onboarding process feels overwhelming with too many tasks in the first week.",
      sentiment: "negative",
      phase: "Ramp Up",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      tags: ["pacing", "workload"],
    },
    {
      id: "2",
      content: "Love the mentor pairing! Really helped me settle in quickly.",
      sentiment: "positive", 
      phase: "Growth",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      tags: ["mentorship", "support"],
    },
    {
      id: "3",
      content: "Could use more clarity on role expectations during the first month.",
      sentiment: "neutral",
      phase: "Ramp Up",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      tags: ["clarity", "expectations"],
    },
  ]);

  const [aiSuggestions] = useState([
    {
      id: "1",
      type: "optimization",
      title: "Add pulse survey after Week 4",
      description: "Based on feedback patterns, participants show engagement dips around week 4. A quick pulse survey could help identify issues early.",
      confidence: 92,
      impact: "high",
      effort: "low",
    },
    {
      id: "2",
      type: "automation",
      title: "Automate manager check-ins",
      description: "Create automated reminders for managers to check in with new hires at key milestones.",
      confidence: 87,
      impact: "medium",
      effort: "medium",
    },
    {
      id: "3",
      type: "content",
      title: "Split Week 1 tasks",
      description: "Feedback indicates Week 1 is overwhelming. Consider spreading initial tasks across the first two weeks.",
      confidence: 94,
      impact: "high",
      effort: "high",
    },
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

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

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
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
                  {metrics.map((metric) => (
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
                            {metric.name.includes("Score") ? metric.current.toFixed(1) : `${metric.current}%`}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            {metric.trend > 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className={metric.trend > 0 ? "text-green-600" : "text-red-600"}>
                              {Math.abs(metric.trend)}%
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Target: {metric.name.includes("Score") ? metric.target.toFixed(1) : `${metric.target}%`}</span>
                            <span>{metric.sampleSize} participants</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{ width: `${Math.min((metric.current / metric.target) * 100, 100)}%` }}
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
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="experiments" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {experiments.map((experiment) => (
                    <Card key={experiment.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{experiment.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={experiment.status === "running" ? "default" : "secondary"} className="text-xs">
                              {experiment.status === "running" ? <Play className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {experiment.status}
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
                                  index === 0 ? "bg-blue-500" : index === 1 ? "bg-green-500" : "bg-purple-500"
                                )} />
                                <span>{variant.name}</span>
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
                          <span>Started {formatDistanceToNow(experiment.startDate, { addSuffix: true })}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {experiment.status === "running" ? (
                            <Button variant="outline" size="sm" className="text-xs flex-1">
                              <Pause className="w-3 h-3 mr-1" />
                              Pause Test
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="text-xs flex-1">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Apply Winner
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="text-xs flex-1">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            Results
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="outline" className="w-full">
                    <GitBranch className="w-4 h-4 mr-2" />
                    Create New Experiment
                  </Button>
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
                    <Select defaultValue="all">
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Phases</SelectItem>
                        <SelectItem value="ramp-up">Ramp Up</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="mastery">Mastery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {feedback.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-gray-300">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            {getSentimentIcon(item.sentiment)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">{item.content}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.phase}
                              </Badge>
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="ai" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {aiSuggestions.map((suggestion) => (
                    <Card key={suggestion.id} className="border-l-4 border-l-purple-500">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-4 h-4 text-purple-600" />
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
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
