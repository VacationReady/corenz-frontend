"use client";

import { useState, useMemo, useEffect } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Search,
  Filter,
  Sparkles,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
  Eye,
  Edit,
  Check,
  Star,
  Zap,
  Users,
  ChevronDown,
  ChevronUp,
  Workflow,
  PlayCircle,
  Download,
  Upload,
  Grid3x3,
  List,
  Settings,
  BarChart3,
  AlertCircle,
  Home,
  ChevronRight,
  Lightbulb,
  Target,
  TrendingDown,
  Gauge,
  Timer,
  Award,
  RefreshCw,
  X,
  MessageSquarePlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import workflowLibrary from "@/lib/workflows/workflowLibrary";
import { WorkflowTemplate } from "@/lib/workflows/workflowLibrary";
import { WorkflowCustomizationDialog } from "./components/WorkflowCustomizationDialog";
import { WorkflowPreviewDialog } from "./components/WorkflowPreviewDialog";
import { motion } from "framer-motion";

interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  executionsToday: number;
  timeSaved: string;
  successRate?: number;
  avgExecutionTimeMs?: number;
}

interface ActivationState {
  [templateId: string]: {
    total: number;
    active: number;
  };
}

interface TemplateUsage {
  templateId: string;
  usageCount: number;
}

interface TrendSummary {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  dailyExecutions?: { date: string; count: number }[];
}

const formatExecutionTime = (ms?: number) => {
  if (!ms || ms <= 0) return "—";
  const seconds = ms / 1000;
  if (seconds >= 60) {
    return `${(seconds / 60).toFixed(1)} min`;
  }
  return `${seconds.toFixed(1)} sec`;
};

export default function WorkflowLibraryPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [customizeWorkflow, setCustomizeWorkflow] = useState<WorkflowTemplate | null>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<WorkflowTemplate | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [installedWorkflows, setInstalledWorkflows] = useState<Set<string>>(new Set());
  const [activationState, setActivationState] = useState<ActivationState>({});
  const [topTemplates, setTopTemplates] = useState<TemplateUsage[]>([]);
  const [trendSummary, setTrendSummary] = useState<TrendSummary | null>(null);
  const [stats, setStats] = useState<WorkflowStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    executionsToday: 0,
    timeSaved: "0 hrs",
  });
  const [workflowLibraryData, setWorkflowLibraryData] = useState<WorkflowTemplate[]>(workflowLibrary.templates);
  const [apiLoadFailed, setApiLoadFailed] = useState(false);
  const [analyticsLoadFailed, setAnalyticsLoadFailed] = useState(false);

  const trendValues = useMemo(() => {
    if (trendSummary?.dailyExecutions?.length) {
      return trendSummary.dailyExecutions.map(entry => entry.count);
    }
    if (trendSummary) {
      const segments = 7;
      const averagePerSegment = trendSummary.totalExecutions / segments || 0;
      return Array.from({ length: segments }, (_, index) =>
        Math.max(0, Math.round(averagePerSegment * (0.8 + 0.4 * Math.sin(index))))
      );
    }
    return [];
  }, [trendSummary]);

  const sparklinePath = useMemo(() => {
    if (trendValues.length < 2) return "";
    const max = Math.max(...trendValues);
    const min = Math.min(...trendValues);
    const range = max - min || 1;
    const height = 40;
    const width = 100;
    const step = width / (trendValues.length - 1);
    return trendValues
      .map((value, index) => {
        const x = index * step;
        const normalizedY = ((value - min) / range) * height;
        const y = height - normalizedY;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [trendValues]);

  const resolvedTopTemplates = useMemo(() => {
    if (!topTemplates.length) return [];
    return topTemplates.map((template, index) => {
      const templateMeta = workflowLibraryData.find(w => w.id === template.templateId);
      return {
        ...template,
        displayName: templateMeta?.name || template.templateId,
        icon: templateMeta?.icon || "⚙️",
        subtitle: templateMeta?.estimatedTime
          ? `${templateMeta.estimatedTime} saved`
          : templateMeta?.description || "Workflow template",
        rank: index + 1,
      };
    });
  }, [topTemplates, workflowLibraryData]);

  // Calculate trend indicators from 30-day execution data
  const getTrendIndicator = (templateId: string) => {
    if (!trendSummary?.dailyExecutions?.length) return null;
    
    const last7Days = trendSummary.dailyExecutions.slice(-7);
    const prev7Days = trendSummary.dailyExecutions.slice(-14, -7);
    
    if (last7Days.length < 2 || prev7Days.length < 2) return null;
    
    const recentAvg = last7Days.reduce((sum, d) => sum + d.count, 0) / last7Days.length;
    const previousAvg = prev7Days.reduce((sum, d) => sum + d.count, 0) / prev7Days.length;
    
    if (recentAvg > previousAvg * 1.1) return "up";
    if (recentAvg < previousAvg * 0.9) return "down";
    return "stable";
  };

  const topInstalledCategory = useMemo(() => {
    if (!topTemplates.length) return null;
    const topTemplate = workflowLibraryData.find(w => w.id === topTemplates[0]?.templateId);
    return topTemplate?.category || null;
  }, [topTemplates, workflowLibraryData]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all";

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleCtaKeyDown = (event: KeyboardEvent<HTMLDivElement>, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  const zeroStateCtas = [
    {
      id: "popular",
      title: "Popular Start",
      description: "Onboarding & probation automations",
      icon: <Lightbulb className="w-6 h-6 text-amber-500" aria-hidden="true" />,
      ariaLabel: "Browse onboarding and probation workflows",
      onActivate: () => setSelectedCategory("onboarding-probation"),
    },
    {
      id: "compliance",
      title: "Stay Compliant",
      description: "Document tracking & compliance",
      icon: <Target className="w-6 h-6 text-blue-500" aria-hidden="true" />,
      ariaLabel: "Browse compliance and documentation workflows",
      onActivate: () => setSelectedCategory("compliance-documentation"),
    },
    {
      id: "custom",
      title: "Build Custom",
      description: "Create your own automation",
      icon: <Sparkles className="w-6 h-6 text-purple-500" aria-hidden="true" />,
      ariaLabel: "Build a custom automation workflow",
      onActivate: () => router.push("/settings/automation-rules?mode=create"),
    },
  ];

  // Load real analytics from API
  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsLoadFailed(false);
      const [analyticsRes, templatesRes] = await Promise.all([
        fetch("/api/automation-rules/analytics"),
        fetch("/api/automation-rules/templates"),
      ]);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setStats({
          totalWorkflows: analyticsData.totalWorkflows || 0,
          activeWorkflows: analyticsData.activeWorkflows || 0,
          executionsToday: analyticsData.executionsToday || 0,
          timeSaved: analyticsData.timeSaved || "0 hrs",
          successRate: analyticsData.successRate,
          avgExecutionTimeMs: analyticsData.avgExecutionTimeMs,
        });
        setActivationState(analyticsData.activationState || {});
        setTopTemplates(analyticsData.topTemplates || []);
        setTrendSummary(analyticsData.trendsLast30Days || null);
        setAnalyticsLoadFailed(false);
      } else {
        setAnalyticsLoadFailed(true);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        const installed = new Set<string>(
          templatesData.templates
            .filter((t: any) => t.isInstalled)
            .map((t: any) => t.id as string)
        );
        setInstalledWorkflows(installed);
        
        // Hydrate workflow library from server response
        if (templatesData.templates && Array.isArray(templatesData.templates)) {
          setWorkflowLibraryData(templatesData.templates);
          setApiLoadFailed(false);
        }
      } else {
        // API failed, use static bundle
        setApiLoadFailed(true);
        console.warn("Failed to load templates from API, using static bundle");
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setAnalyticsLoadFailed(true);
      // On error, fall back to static bundle
      setApiLoadFailed(true);
      setWorkflowLibraryData(workflowLibrary.templates);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Filter workflows based on search and category
  const filteredWorkflows = useMemo(() => {
    let workflows = [...workflowLibraryData];

    // Filter by category
    if (selectedCategory !== "all") {
      workflows = workflows.filter(w => w.category.id === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      workflows = workflows.filter(w =>
        w.name.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query) ||
        w.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return workflows;
  }, [selectedCategory, searchQuery, workflowLibraryData]);

  // Get popular workflows
  const popularWorkflows = useMemo(() => {
    return workflowLibraryData
      .filter(w => w.isPopular)
      .slice(0, 5);
  }, [workflowLibraryData]);

  const toggleCardExpansion = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleInstallWorkflow = async (workflow: WorkflowTemplate, customizations?: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/automation-rules/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: workflow.id,
          customizations,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInstalledWorkflows(prev => new Set(prev).add(workflow.id));
        toast.success(data.message || `${workflow.name} has been added to your workflows`);
        setCustomizeWorkflow(null);
        // Reload analytics to reflect new installation
        loadAnalytics();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to install workflow");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to install workflow");
    } finally {
      setLoading(false);
    }
  };

  const renderWorkflowCard = (workflow: WorkflowTemplate) => {
    const isExpanded = expandedCards.has(workflow.id);
    const isInstalled = installedWorkflows.has(workflow.id);
    const activation = activationState[workflow.id];

    return (
      <motion.div
        key={workflow.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className={cn(
            "group hover:shadow-lg transition-all duration-200",
            isInstalled && "border-green-500",
            workflow.isPremium && "border-purple-500",
            isExpanded && "row-span-2"
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{workflow.icon}</span>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                </div>
                <CardDescription className="line-clamp-2">
                  {workflow.description}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-1 ml-2">
                {isInstalled && activation && (
                  <Badge variant="secondary" className={cn(
                    "bg-green-100 text-green-800 border-green-200",
                    activation.active === 0 && "bg-gray-100 text-gray-600 border-gray-200"
                  )}>
                    {activation.active > 0 ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        {activation.active} Active
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Installed
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {workflow.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {workflow.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{workflow.tags.length - 3}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Quick Stats */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                {workflow.estimatedTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Saves {workflow.estimatedTime}</span>
                  </div>
                )}
                {workflow.isPopular && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>Popular</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Benefits */}
                <div>
                  <h4 className="font-medium mb-2">Benefits</h4>
                  <ul className="text-sm space-y-1">
                    {workflow.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirements */}
                {workflow.requirements && (
                  <div>
                    <h4 className="font-medium mb-2">Requirements</h4>
                    <ul className="text-sm space-y-1">
                      {workflow.requirements.map((req, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Workflow Preview */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Workflow Steps</span>
                    <Badge variant="outline" className="text-xs">
                      {workflow.nodes.length} nodes
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-blue-500" />
                      <span>Trigger</span>
                    </div>
                    <ArrowRight className="w-3 h-3" />
                    <div className="flex items-center gap-1">
                      <Filter className="w-3 h-3 text-amber-500" />
                      <span>Conditions</span>
                    </div>
                    <ArrowRight className="w-3 h-3" />
                    <div className="flex items-center gap-1">
                      <PlayCircle className="w-3 h-3 text-green-500" />
                      <span>Actions</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewWorkflow(workflow)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCardExpansion(workflow.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      More
                    </>
                  )}
                </Button>
              </div>

              {isInstalled ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Navigate to automation rules to edit
                    router.push(`/settings/automation-rules?edit=${workflow.id}`);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setCustomizeWorkflow(workflow)}
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <PageShell
      title="Workflow Library"
      description="Pre-built, customizable HR workflows to automate your processes"
      breadcrumbs={{
        items: [
          { href: "/", label: "Home" },
          { label: "Workflow Library" },
        ],
      }}
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/settings/automation-rules?mode=create")}
          >
            <Upload className="w-4 h-4 mr-2" />
            Build Custom
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
        </div>
      }
    >
      {/* Error Banner for Analytics/Template Fetch Failures */}
      {(analyticsLoadFailed || apiLoadFailed) && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">
                    {analyticsLoadFailed && apiLoadFailed
                      ? "Failed to load analytics and templates"
                      : analyticsLoadFailed
                      ? "Failed to load workflow analytics"
                      : "Failed to load template data"}
                  </p>
                  <p className="text-sm text-amber-700">
                    {apiLoadFailed
                      ? "Using static template library. Some features may be limited."
                      : "Some statistics may be unavailable."}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAnalytics}
                className="border-amber-300 hover:bg-amber-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redesigned Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Workflows */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalWorkflows}</p>
                )}
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate Gauge */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-bold">
                      {stats.successRate != null ? `${stats.successRate}%` : "—"}
                    </p>
                    {stats.successRate != null && stats.successRate >= 95 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        Excellent
                      </Badge>
                    )}
                  </div>
                )}
                {analyticsLoading ? (
                  <Skeleton className="h-4 w-24 mt-2" />
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.executionsToday} executions today
                  </p>
                )}
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Gauge className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Execution Time Chip */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Avg Execution Time</p>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <div className="mt-1">
                    <p className="text-2xl font-bold">
                      {formatExecutionTime(stats.avgExecutionTimeMs)}
                    </p>
                  </div>
                )}
                {analyticsLoading ? (
                  <Skeleton className="h-4 w-24 mt-2" />
                ) : stats.avgExecutionTimeMs && stats.avgExecutionTimeMs < 5000 ? (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs mt-2">
                    <Zap className="w-3 h-3 mr-1" />
                    Fast
                  </Badge>
                ) : null}
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Timer className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Saved */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.timeSaved}</p>
                )}
                {analyticsLoading ? (
                  <Skeleton className="h-4 w-24 mt-2" />
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.activeWorkflows} active workflows
                  </p>
                )}
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top-Performing Templates Badge Row */}
      {!analyticsLoading && resolvedTopTemplates.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">Top-Performing Templates</h3>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">Last 30 Days</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {resolvedTopTemplates.slice(0, 5).map((template) => {
                const trend = getTrendIndicator(template.templateId);
                return (
                  <Badge
                    key={template.templateId}
                    variant="outline"
                    className="px-3 py-2 bg-white border-amber-200 hover:border-amber-300 cursor-pointer transition-colors"
                    onClick={() => {
                      const workflow = workflowLibraryData.find(w => w.id === template.templateId);
                      if (workflow) setPreviewWorkflow(workflow);
                    }}
                  >
                    <span className="mr-2">{template.icon}</span>
                    <span className="font-medium">{template.displayName}</span>
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{template.usageCount} installs</span>
                    {trend === "up" && (
                      <TrendingUp className="w-3 h-3 ml-2 text-green-600" title="Trending up" />
                    )}
                    {trend === "down" && (
                      <TrendingDown className="w-3 h-3 ml-2 text-red-600" title="Trending down" />
                    )}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Deep Dive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Top Templates</p>
                <h3 className="text-lg font-semibold">Most installed automations</h3>
              </div>
              <Badge variant="secondary">Usage</Badge>
            </div>
            {analyticsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : resolvedTopTemplates.length ? (
              <ul className="space-y-3">
                {resolvedTopTemplates.map(template => (
                  <li
                    key={template.templateId}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-muted-foreground">#{template.rank}</span>
                      <div className="text-2xl" aria-hidden="true">{template.icon}</div>
                      <div>
                        <p className="text-sm font-medium">{template.displayName}</p>
                        <p className="text-xs text-muted-foreground">{template.subtitle}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {template.usageCount} installs
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No template usage data yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">30 Day Trend</p>
                <h3 className="text-lg font-semibold">Execution Volume</h3>
              </div>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            {analyticsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : trendSummary ? (
              <div>
                <div className="flex items-center justify-between text-sm mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-base font-semibold">{trendSummary.totalExecutions}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600">Completed</p>
                    <p className="font-medium">{trendSummary.successfulExecutions}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-destructive">Failed</p>
                    <p className="font-medium">{trendSummary.failedExecutions}</p>
                  </div>
                </div>
                {sparklinePath ? (
                  <svg
                    width="100%"
                    height="60"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="text-primary"
                  >
                    <path d={sparklinePath} stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                ) : (
                  <p className="text-sm text-muted-foreground">Insufficient data for sparkline.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No execution data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {workflowLibrary.categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Popular Workflows Banner */}
      {selectedCategory === "all" && !searchQuery && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Popular Workflows</h3>
              </div>
              <Badge variant="secondary">Most Used</Badge>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {popularWorkflows.map(workflow => (
                <button
                  key={workflow.id}
                  onClick={() => setPreviewWorkflow(workflow)}
                  className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{workflow.icon}</span>
                    <Star className="w-3 h-3 text-yellow-500" />
                  </div>
                  <p className="text-sm font-medium line-clamp-1">{workflow.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{workflow.estimatedTime} saved</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="grid grid-cols-9 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          {workflowLibrary.categories.slice(0, 8).map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              <span className="mr-1">{category.icon}</span>
              <span className="hidden lg:inline">{category.name.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Workflow Grid/List */}
      <div className={cn(
        viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-4"
      )}>
        {filteredWorkflows.length > 0 ? (
          filteredWorkflows.map(workflow => renderWorkflowCard(workflow))
        ) : (
          <div className="col-span-full">
            <Card className="border-2 border-dashed">
              <CardContent className="py-12">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    {hasActiveFilters ? (
                      <Search className="w-8 h-8 text-primary" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {hasActiveFilters
                      ? "No workflows found"
                      : "Start automating your HR processes"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {hasActiveFilters
                      ? "Try adjusting your search or filters to find relevant workflows"
                      : "Browse our library of 40+ pre-built workflows designed specifically for New Zealand HR teams"}
                  </p>
                  
                  {/* Contextual Empty State - Filtered Results */}
                  {hasActiveFilters && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => {
                          // Open a dialog or navigate to request form
                          toast.info("Template request feature coming soon!");
                        }}
                      >
                        <MessageSquarePlus className="w-4 h-4 mr-2" />
                        Request a Template
                      </Button>
                    </div>
                  )}
                  
                  {/* General Zero State - Analytics-Based Suggestions */}
                  {!hasActiveFilters && (
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      {topInstalledCategory ? (
                        <div
                          className="p-4 border rounded-lg text-left hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedCategory(topInstalledCategory.id)}
                        >
                          <div className="text-2xl mb-2">{topInstalledCategory.icon}</div>
                          <h4 className="font-medium mb-1">Popular Choice</h4>
                          <p className="text-xs text-muted-foreground">
                            {topInstalledCategory.name}
                          </p>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Trending
                          </Badge>
                        </div>
                      ) : (
                        <div
                          className="p-4 border rounded-lg text-left hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedCategory("onboarding-probation")}
                        >
                          <Lightbulb className="w-6 h-6 text-amber-500 mb-2" />
                          <h4 className="font-medium mb-1">Popular Start</h4>
                          <p className="text-xs text-muted-foreground">
                            Onboarding & probation automations
                          </p>
                        </div>
                      )}
                      <div
                        className="p-4 border rounded-lg text-left hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedCategory("compliance-documentation")}
                      >
                        <Target className="w-6 h-6 text-blue-500 mb-2" />
                        <h4 className="font-medium mb-1">Stay Compliant</h4>
                        <p className="text-xs text-muted-foreground">
                          Document tracking & compliance
                        </p>
                      </div>
                      <div
                        className="p-4 border rounded-lg text-left hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => router.push("/settings/automation-rules?mode=create")}
                      >
                        <Sparkles className="w-6 h-6 text-purple-500 mb-2" />
                        <h4 className="font-medium mb-1">Build Custom</h4>
                        <p className="text-xs text-muted-foreground">
                          Create your own automation
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Customization Dialog */}
      {customizeWorkflow && (
        <WorkflowCustomizationDialog
          workflow={customizeWorkflow}
          isOpen={!!customizeWorkflow}
          onClose={() => setCustomizeWorkflow(null)}
          onConfirm={(customizations) => handleInstallWorkflow(customizeWorkflow, customizations)}
        />
      )}

      {/* Preview Dialog */}
      {previewWorkflow && (
        <WorkflowPreviewDialog
          workflow={previewWorkflow}
          isOpen={!!previewWorkflow}
          onClose={() => setPreviewWorkflow(null)}
          onInstall={() => {
            setPreviewWorkflow(null);
            setCustomizeWorkflow(previewWorkflow);
          }}
        />
      )}
    </PageShell>
  );
}
