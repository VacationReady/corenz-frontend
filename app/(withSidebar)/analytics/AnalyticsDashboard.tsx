"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  Brain,
  Building2,
  CalendarClock,
  Clock3,
  LineChart as LineChartIcon,
  MapPin,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  UserMinus,
  UserPlus,
  Wrench,
  ChevronRight,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  Target,
  Lightbulb,
  RefreshCw,
  Filter,
  Download,
  ArrowUpRight,
  Briefcase,
  X,
  Plus,
  Check,
} from "lucide-react";

import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { EmployeeListModal } from "@/components/analytics/EmployeeListModal";

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to load analytics");
  }
  return response.json();
};

const RANGE_OPTIONS = [
  { label: "6 months", value: 6 },
  { label: "12 months", value: 12 },
  { label: "18 months", value: 18 },
];

// Premium color palette
const CHART_COLORS = {
  primary: ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"],
  success: ["#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1"],
  warm: ["#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981"],
  gradient: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"],
};

const ALT_COLORS = ["#0ea5e9", "#f472b6", "#22d3ee", "#facc15", "#34d399", "#c084fc"];

type VisualizationType = "bar" | "pie" | "line";

interface TrendPoint {
  key: string;
  label: string;
  headcount: number;
  hires: number;
  departures: number;
}

interface ExplorerMetricOption {
  id: string;
  label: string;
  description: string;
  format: "number" | "percentage";
}

interface ExplorerDimensionOption {
  key: string;
  label: string;
  description: string;
  supportedVisualizations: VisualizationType[];
  defaultVisualization: VisualizationType;
}

interface ExplorerDatasetEntry {
  key: string;
  label: string;
  metrics: Record<string, number | null>;
}

interface AnalyticsTemplate {
  id: string;
  name: string;
  description: string;
  dimensionKey: string;
  metricId: string;
  visualization: VisualizationType;
  insight?: string;
}

interface AnalyticsInsight {
  id: string;
  title: string;
  summary: string;
  priority: "low" | "medium" | "high";
  source: "heuristic" | "ai";
  action?: string;
  impactedMetrics?: string[];
}

interface AnalyticsResponse {
  generatedAt: string;
  rangeInMonths: number;
  filters: {
    departments: { id: string; name: string }[];
    locations: { id: string; name: string }[];
  };
  metrics: {
    activeHeadcount: number;
    headcountChange: number | null;
    averageTenureMonths: number | null;
    activeRatio: number | null;
    newHiresLast30Days: number;
    departuresLast30Days: number;
    attritionRate90d: number | null;
    retentionRate90d: number | null;
    upcomingContractEndings60d: number;
  };
  trend: { monthly: TrendPoint[] };
  breakdowns: {
    byDepartment: { id: string | null; name: string; active: number; total: number }[];
    byLocation: { id: string | null; name: string; active: number; total: number }[];
    byEmploymentType: { label: string; value: number }[];
    byJobRole: { id: string | null; name: string; active: number; total: number }[];
    tenureBands: { label: string; value: number }[];
  };
  explorer: {
    dimensionOptions: ExplorerDimensionOption[];
    metricOptions: ExplorerMetricOption[];
    datasets: Record<string, ExplorerDatasetEntry[]>;
  };
  templates: AnalyticsTemplate[];
  insights: AnalyticsInsight[];
  supportsAIInsights: boolean;
}

interface CustomWidgetDefinition {
  id: string;
  title: string;
  dimensionKey: string;
  metricId: string;
  visualization: VisualizationType;
  topN: number;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 }
  }
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { type: "spring" as const, stiffness: 400, damping: 25 } }
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
  }
};

const PRIORITY_STYLES: Record<AnalyticsInsight["priority"], { bg: string; text: string; border: string; icon: string }> = {
  high: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", icon: "text-rose-500" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", icon: "text-amber-500" },
  low: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", icon: "text-emerald-500" },
};

// Beautiful Metric Card Component
function MetricCardEnhanced({
  title,
  value,
  change,
  trend,
  icon: Icon,
  iconColor = "text-primary",
  bgGradient = "from-primary/5 to-primary/10",
  onClick,
  delay = 0,
}: {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ElementType;
  iconColor?: string;
  bgGradient?: string;
  onClick?: () => void;
  delay?: number;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-slate-400";

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={onClick ? "hover" : undefined}
      custom={delay}
      transition={{ delay: delay * 0.1 }}
    >
      <motion.div
        variants={onClick ? cardHoverVariants : undefined}
        initial="rest"
        whileHover="hover"
        onClick={onClick}
        className={`
          relative overflow-hidden rounded-2xl p-5
          bg-gradient-to-br ${bgGradient}
          border border-white/50 dark:border-white/10
          backdrop-blur-xl shadow-lg shadow-black/5
          ${onClick ? "cursor-pointer" : ""}
          transition-all duration-300
        `}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-20">
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${bgGradient}`} />
        </div>

        <div className="relative flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
            {change && (
              <div className="flex items-center gap-1.5">
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                <span className={`text-sm font-semibold ${trendColor}`}>{change}</span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-white/60 dark:bg-white/10 shadow-inner`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>

        {onClick && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Section Header Component
function SectionHeader({ 
  icon: Icon, 
  title, 
  description,
  iconColor = "text-primary",
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  iconColor?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

// Interactive List Item Component
function BreakdownListItem({
  name,
  active,
  total,
  onClick,
  index = 0,
}: {
  name: string;
  active: number;
  total: number;
  onClick: () => void;
  index?: number;
}) {
  const percentage = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group relative flex items-center justify-between p-4 rounded-xl
        bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10
        border border-transparent hover:border-primary/20
        cursor-pointer transition-all duration-200
        hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Progress bar background */}
      <div 
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent"
        style={{ width: `${percentage}%` }}
      />
      
      <div className="relative flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <div>
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {name}
          </p>
          <p className="text-xs text-muted-foreground">
            {active.toLocaleString()} active · {total.toLocaleString()} total
          </p>
        </div>
      </div>
      
      <div className="relative flex items-center gap-3">
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">{active}</p>
          <p className="text-xs text-muted-foreground">{percentage}%</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 
          group-hover:translate-x-1 transition-all duration-200" />
      </div>
    </motion.div>
  );
}

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [rangeInMonths, setRangeInMonths] = useState<number>(12);
  const [customWidgets, setCustomWidgets] = useState<CustomWidgetDefinition[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<AnalyticsInsight[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Drill-down modal state
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    filterType: string;
    filterValue: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    filterType: "",
    filterValue: "",
  });

  const analyticsUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("rangeInMonths", String(rangeInMonths));
    if (selectedDepartment) params.set("departmentId", selectedDepartment);
    if (selectedLocation) params.set("locationId", selectedLocation);
    return `/api/analytics/people?${params.toString()}`;
  }, [rangeInMonths, selectedDepartment, selectedLocation]);

  const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(
    analyticsUrl,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const trendData = useMemo(() => data?.trend.monthly ?? [], [data]);
  const employmentData = useMemo(
    () =>
      (data?.breakdowns.byEmploymentType ?? []).map((item, index) => ({
        ...item,
        fill: CHART_COLORS.gradient[index % CHART_COLORS.gradient.length],
      })),
    [data?.breakdowns.byEmploymentType],
  );

  const locationData = useMemo(
    () => data?.breakdowns.byLocation ?? [],
    [data?.breakdowns.byLocation],
  );

  const tenureBands = useMemo(
    () => data?.breakdowns.tenureBands ?? [],
    [data?.breakdowns.tenureBands],
  );

  const metricLookup = useMemo(() => {
    const map = new Map<string, ExplorerMetricOption>();
    for (const option of data?.explorer.metricOptions ?? []) {
      map.set(option.id, option);
    }
    return map;
  }, [data?.explorer.metricOptions]);

  const combinedInsights = useMemo(() => {
    const base = data?.insights ?? [];
    if (aiInsights.length === 0) return base;
    return [...base, ...aiInsights];
  }, [data?.insights, aiInsights]);

  const latestHeadcount = data?.metrics.activeHeadcount ?? 0;
  const headcountChange = data?.metrics.headcountChange ?? null;
  const headcountTrend =
    headcountChange === null
      ? undefined
      : headcountChange > 0
        ? "up"
        : headcountChange < 0
          ? "down"
          : "neutral";
  const formattedHeadcountChange =
    headcountChange === null
      ? undefined
      : `${headcountChange > 0 ? "+" : headcountChange < 0 ? "-" : ""}${Math.abs(headcountChange).toLocaleString()}`;

  const isEmptyState = !isLoading && !error && trendData.length === 0;

  const formatMetricValue = (metricId: string, value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    const metric = metricLookup.get(metricId);
    if (metric?.format === "percentage") {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const handleAddWidget = (widget: CustomWidgetDefinition) => {
    setCustomWidgets((prev) => [...prev, widget]);
    setIsBuilderOpen(false);
  };

  const handleRemoveWidget = (id: string) => {
    setCustomWidgets((prev) => prev.filter((widget) => widget.id !== id));
  };

  const handleApplyTemplate = (template: AnalyticsTemplate) => {
    if (!data?.explorer.datasets[template.dimensionKey]) return;
    const widget: CustomWidgetDefinition = {
      id: `${template.id}-${Date.now()}`,
      title: template.name,
      dimensionKey: template.dimensionKey,
      metricId: template.metricId,
      visualization: template.visualization,
      topN: 6,
    };
    setCustomWidgets((prev) => [...prev, widget]);
  };

  const handleGenerateAI = async () => {
    if (!data?.supportsAIInsights) return;
    setIsGeneratingAI(true);
    setAiError(null);
    try {
      const response = await fetch("/api/analytics/people/insights", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rangeInMonths,
          departmentId: selectedDepartment,
          locationId: selectedLocation,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to generate AI insights");
      }

      const payload = await response.json();
      setAiInsights(payload.aiInsights ?? []);
      if (payload.aiError) {
        setAiError(payload.aiError);
      }
    } catch (insightError: any) {
      setAiError(insightError?.message ?? "Unable to generate AI insights");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDrillDown = (
    filterType: string,
    filterValue: string,
    title: string,
    description: string
  ) => {
    setDrillDownModal({
      isOpen: true,
      title,
      description,
      filterType,
      filterValue,
    });
  };

  const closeDrillDownModal = () => {
    setDrillDownModal({
      isOpen: false,
      title: "",
      description: "",
      filterType: "",
      filterValue: "",
    });
  };

  return (
    <PageShell
      title="People Analytics"
      description="Live workforce intelligence with AI-powered insights"
      icon={<LineChartIcon className="h-6 w-6" />}
      breadcrumbs={breadcrumbConfigs.analytics}
      action={
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => mutate()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </motion.div>
      }
    >
      <motion.div 
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section with Filters */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-violet-500/5 to-cyan-500/10 border border-white/50 dark:border-white/10 p-6 md:p-8">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/2 -right-1/2 w-full h-full opacity-30"
              >
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
              </motion.div>
              <motion.div
                animate={{ 
                  rotate: [360, 0],
                  scale: [1.2, 1, 1.2],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-1/2 -left-1/2 w-full h-full opacity-20"
              >
                <div className="w-full h-full bg-gradient-to-tr from-violet-500/20 to-transparent rounded-full blur-3xl" />
              </motion.div>
            </div>

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <motion.div variants={pulseVariants} animate="animate">
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                      Live Data
                    </Badge>
                  </motion.div>
                  <Badge variant="outline" className="bg-white/50 dark:bg-white/10">
                    {data ? new Date(data.generatedAt).toLocaleTimeString() : "—"}
                  </Badge>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Workforce Intelligence Dashboard
                </h2>
                <p className="text-muted-foreground max-w-xl">
                  Real-time analytics powered by your people data. Filter by department, location, or timeframe to uncover actionable workforce insights.
                </p>
                {typeof data?.metrics.activeRatio === "number" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">
                      Active Workforce: <span className="font-bold text-primary">{data.metrics.activeRatio}%</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={selectedDepartment ?? "all"}
                  onValueChange={(value) =>
                    setSelectedDepartment(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="w-48 bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20 rounded-xl">
                    <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {(data?.filters.departments ?? []).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedLocation ?? "all"}
                  onValueChange={(value) =>
                    setSelectedLocation(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="w-48 bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20 rounded-xl">
                    <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {(data?.filters.locations ?? []).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(rangeInMonths)}
                  onValueChange={(value) => setRangeInMonths(Number(value))}
                >
                  <SelectTrigger className="w-36 bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20 rounded-xl">
                    <CalendarClock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-rose-500/20">
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-rose-600 dark:text-rose-400">Unable to load analytics</p>
                    <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1">{error.message}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                      onClick={() => mutate()}
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Skeleton className="h-32 w-full rounded-2xl" />
                </motion.div>
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-2xl" />
            <div className="grid gap-6 lg:grid-cols-3">
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </div>
        )}

        {/* Empty State */}
        <AnimatePresence>
          {isEmptyState && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                </motion.div>
                <h3 className="text-2xl font-bold text-foreground mb-2">No people data yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Add employees to your organization to unlock powerful workforce analytics and insights.
                </p>
                <Button asChild className="bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90">
                  <Link href="/employees/new">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add your first employee
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        {!isLoading && !isEmptyState && data && (
          <motion.div 
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Metric Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCardEnhanced
                title="Active Headcount"
                value={latestHeadcount.toLocaleString()}
                change={formattedHeadcountChange}
                trend={headcountTrend}
                icon={Users}
                iconColor="text-primary"
                bgGradient="from-primary/10 to-primary/5"
                onClick={() => handleDrillDown("all", "all", "All Active Employees", "Complete list of all active employees")}
                delay={0}
              />
              <MetricCardEnhanced
                title="New Hires (30d)"
                value={data.metrics.newHiresLast30Days.toLocaleString()}
                icon={UserPlus}
                iconColor="text-emerald-500"
                bgGradient="from-emerald-500/10 to-emerald-500/5"
                onClick={() => handleDrillDown("newHires", "newHires", "New Hires (Last 30 Days)", "Employees who started recently")}
                delay={1}
              />
              <MetricCardEnhanced
                title="Departures (30d)"
                value={data.metrics.departuresLast30Days.toLocaleString()}
                icon={UserMinus}
                iconColor="text-rose-500"
                bgGradient="from-rose-500/10 to-rose-500/5"
                onClick={() => handleDrillDown("departures", "departures", "Recent Departures", "Employees who left recently")}
                delay={2}
              />
              <MetricCardEnhanced
                title="Avg Tenure"
                value={data.metrics.averageTenureMonths !== null ? `${data.metrics.averageTenureMonths}mo` : "—"}
                icon={Clock3}
                iconColor="text-sky-500"
                bgGradient="from-sky-500/10 to-sky-500/5"
                delay={3}
              />
              <MetricCardEnhanced
                title="Attrition Rate (90d)"
                value={data.metrics.attritionRate90d !== null ? `${data.metrics.attritionRate90d.toFixed(1)}%` : "—"}
                icon={TrendingDown}
                iconColor="text-rose-500"
                bgGradient="from-rose-500/10 to-rose-500/5"
                delay={4}
              />
              <MetricCardEnhanced
                title="Retention Rate (90d)"
                value={data.metrics.retentionRate90d !== null ? `${data.metrics.retentionRate90d.toFixed(1)}%` : "—"}
                icon={Target}
                iconColor="text-emerald-500"
                bgGradient="from-emerald-500/10 to-emerald-500/5"
                delay={5}
              />
              <MetricCardEnhanced
                title="Contracts Expiring (60d)"
                value={data.metrics.upcomingContractEndings60d.toLocaleString()}
                icon={CalendarClock}
                iconColor="text-amber-500"
                bgGradient="from-amber-500/10 to-amber-500/5"
                onClick={() => handleDrillDown("contractsExpiring", "contractsExpiring", "Contracts Expiring", "Contracts expiring in next 60 days")}
                delay={6}
              />
            </div>

            {/* Headcount Momentum Chart */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <SectionHeader
                    icon={BarChart3}
                    title="Headcount Momentum"
                    description={`Tracking workforce changes over ${rangeInMonths} months`}
                    action={
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        {rangeInMonths} month range
                      </Badge>
                    }
                  />
                </CardHeader>
                <CardContent className="h-[380px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                      <defs>
                        <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="hiresGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.4}/>
                        </linearGradient>
                        <linearGradient id="departuresGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis 
                        allowDecimals={false} 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <Tooltip
                        contentStyle={{ 
                          borderRadius: 16, 
                          border: "none",
                          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                          backgroundColor: "hsl(var(--card))",
                        }}
                        formatter={(value: number | string) => Number(value).toLocaleString()}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 20 }}
                        formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
                      />
                      <Bar dataKey="hires" name="Hires" fill="url(#hiresGradient)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="departures" name="Departures" fill="url(#departuresGradient)" radius={[6, 6, 0, 0]} />
                      <Area
                        type="monotone"
                        dataKey="headcount"
                        name="Headcount"
                        fill="url(#headcountGradient)"
                        stroke="#6366f1"
                        strokeWidth={3}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Breakdown Cards Grid */}
            <div className="grid gap-6 xl:grid-cols-3 items-start">
              {/* Department Breakdown */}
              <motion.div variants={itemVariants} className="h-[380px]">
                <Card className="h-full flex flex-col overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <SectionHeader
                      icon={Building2}
                      title="By Department"
                      description="Active headcount distribution"
                      iconColor="text-violet-500"
                    />
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 overflow-hidden p-4 flex flex-col">
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="space-y-2 pr-4">
                        {(data.breakdowns.byDepartment ?? []).map((dept, index) => (
                          <BreakdownListItem
                            key={dept.id ?? dept.name}
                            name={dept.name}
                            active={dept.active}
                            total={dept.total}
                            index={index}
                            onClick={() => handleDrillDown(
                              "department",
                              dept.id || "unassigned",
                              `${dept.name} Department`,
                              `All employees in ${dept.name}`
                            )}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Location & Employment Mix */}
              <motion.div variants={itemVariants} className="h-[380px]">
                <Card className="h-full flex flex-col overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <SectionHeader
                      icon={MapPin}
                      title="Location & Employment"
                      description="Geographic and contract distribution"
                      iconColor="text-cyan-500"
                    />
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 overflow-hidden p-4 flex flex-col">
                    {/* Pie Chart */}
                    <div className="h-48 flex-shrink-0">
                      {employmentData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                          Add employment types to see distribution
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <defs>
                              {employmentData.map((entry, index) => (
                                <linearGradient key={`grad-${index}`} id={`pieGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor={CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]} stopOpacity={1}/>
                                  <stop offset="100%" stopColor={CHART_COLORS.gradient[(index + 1) % CHART_COLORS.gradient.length]} stopOpacity={0.8}/>
                                </linearGradient>
                              ))}
                            </defs>
                            <Pie
                              data={employmentData}
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                              nameKey="label"
                            >
                              {employmentData.map((entry, index) => (
                                <Cell 
                                  key={entry.label} 
                                  fill={`url(#pieGrad-${index})`}
                                  stroke="transparent"
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, label: string) => [
                                `${Number(value).toLocaleString()} active`,
                                label,
                              ]}
                              contentStyle={{ 
                                borderRadius: 12, 
                                border: "none",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Employment type legend */}
                    <div className="py-3 border-t border-b border-muted/30 my-3">
                      <div className="flex flex-wrap gap-3">
                        {(data.breakdowns.byEmploymentType ?? []).map((item, index) => (
                          <button
                            key={item.label}
                            onClick={() => handleDrillDown(
                              "employmentType",
                              item.label.toLowerCase(),
                              `${item.label} Employees`,
                              `All ${item.label} employees`
                            )}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50 dark:bg-white/5 
                              hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS.gradient[index % CHART_COLORS.gradient.length] }}
                            />
                            <span className="text-xs font-medium text-foreground">{item.label}</span>
                            <span className="text-xs text-muted-foreground">({item.value})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Locations list */}
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="space-y-2 pr-4">
                        {locationData.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No location data available
                          </p>
                        ) : (
                          locationData.map((location, index) => (
                            <BreakdownListItem
                              key={location.id ?? location.name}
                              name={location.name}
                              active={location.active}
                              total={location.total}
                              index={index}
                              onClick={() => handleDrillDown(
                                "location",
                                location.id || "unassigned",
                                `${location.name} Location`,
                                `All employees at ${location.name}`
                              )}
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Job Roles */}
              <motion.div variants={itemVariants} className="h-[380px]">
                <Card className="h-full flex flex-col overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <SectionHeader
                      icon={Briefcase}
                      title="Job Roles"
                      description="Talent distribution by role"
                      iconColor="text-amber-500"
                    />
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 overflow-hidden p-4 flex flex-col">
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="space-y-2 pr-4">
                        {(data.breakdowns.byJobRole ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Assign job roles to see breakdown
                          </p>
                        ) : (
                          (data.breakdowns.byJobRole ?? []).map((role, index) => (
                            <BreakdownListItem
                              key={role.id ?? role.name}
                              name={role.name}
                              active={role.active}
                              total={role.total}
                              index={index}
                              onClick={() => handleDrillDown(
                                "jobRole",
                                role.id || "unassigned",
                                `${role.name} Role`,
                                `All employees with ${role.name} role`
                              )}
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Insights & Tenure Row */}
            <div className="grid gap-6 xl:grid-cols-2">
              {/* Strategic Insights */}
              <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader className="pb-2">
                    <SectionHeader
                      icon={Lightbulb}
                      title="Strategic Insights"
                      description="AI-powered recommendations for your workforce"
                      iconColor="text-amber-500"
                      action={
                        data.supportsAIInsights && (
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              size="sm"
                              onClick={handleGenerateAI}
                              disabled={isGeneratingAI}
                              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-500/25"
                            >
                              {isGeneratingAI ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                  </motion.div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Brain className="w-4 h-4 mr-2" />
                                  Generate AI Insights
                                </>
                              )}
                            </Button>
                          </motion.div>
                        )
                      }
                    />
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[400px] overflow-auto">
                    {aiError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400"
                      >
                        {aiError}
                      </motion.div>
                    )}

                    {aiInsights.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAiInsights([])}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear AI insights
                      </Button>
                    )}

                    <InsightsList insights={combinedInsights} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tenure Distribution */}
              <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader className="pb-2">
                    <SectionHeader
                      icon={Clock3}
                      title="Tenure Distribution"
                      description="Experience levels across your organization"
                      iconColor="text-indigo-500"
                    />
                  </CardHeader>
                  <CardContent className="h-80">
                    {tenureBands.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Tenure data appears once employees have start dates
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tenureBands}>
                          <defs>
                            <linearGradient id="tenureGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                          <XAxis 
                            dataKey="label" 
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                          />
                          <YAxis 
                            allowDecimals={false} 
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                          />
                          <Tooltip
                            formatter={(value: number) => [`${value.toLocaleString()} employees`, "Count"]}
                            contentStyle={{ 
                              borderRadius: 12, 
                              border: "none",
                              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Bar
                            dataKey="value"
                            radius={[8, 8, 0, 0]}
                            fill="url(#tenureGradient)"
                            cursor="pointer"
                            onClick={(_, index) => {
                              const chartData = tenureBands[index];
                              if (chartData && chartData.label) {
                                const tenureBandMap: Record<string, string> = {
                                  "Under 1 year": "under_1",
                                  "1 - 3 years": "1_to_3",
                                  "3 - 5 years": "3_to_5",
                                  "5+ years": "5_plus"
                                };
                                const bandKey = tenureBandMap[chartData.label] || chartData.label.toLowerCase().replace(/\s+/g, "_");
                                handleDrillDown(
                                  "tenureBand",
                                  bandKey,
                                  `${chartData.label} Tenure`,
                                  `Employees with ${chartData.label} tenure`
                                );
                              }
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Templates & Custom Builder */}
            <div className="grid gap-6 xl:grid-cols-2">
              <TemplateGallery templates={data.templates} onApply={handleApplyTemplate} />

              <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader className="pb-2">
                    <SectionHeader
                      icon={Wrench}
                      title="Custom Analytics Builder"
                      description="Create personalized charts and visualizations"
                      iconColor="text-emerald-500"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="sm"
                        variant={isBuilderOpen ? "secondary" : "outline"}
                        onClick={() => setIsBuilderOpen((open) => !open)}
                        className="gap-2"
                      >
                        {isBuilderOpen ? (
                          <>
                            <X className="w-4 h-4" />
                            Close builder
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add custom widget
                          </>
                        )}
                      </Button>
                    </motion.div>

                    <AnimatePresence>
                      {isBuilderOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CustomWidgetBuilder
                            dimensions={data.explorer.dimensionOptions}
                            metrics={data.explorer.metricOptions}
                            onCreate={handleAddWidget}
                            onCancel={() => setIsBuilderOpen(false)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {customWidgets.length === 0 && !isBuilderOpen && (
                      <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 px-6 py-8 text-center">
                        <PieChartIcon className="w-10 h-10 text-primary/40 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Build custom widgets or use templates to extend your dashboard
                        </p>
                      </div>
                    )}

                    {customWidgets.length > 0 && (
                      <div className="space-y-3">
                        {customWidgets.map((widget, index) => (
                          <motion.div
                            key={widget.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <CustomWidgetCard
                              widget={widget}
                              dataset={data.explorer.datasets[widget.dimensionKey] ?? []}
                              metric={metricLookup.get(widget.metricId)}
                              onRemove={() => handleRemoveWidget(widget.id)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Custom Visualizations */}
            <AnimatePresence>
              {customWidgets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  variants={itemVariants}
                >
                  <Card className="overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <CardHeader className="pb-2">
                      <SectionHeader
                        icon={BarChart3}
                        title="Custom Visualizations"
                        description="Your personalized analytics widgets"
                        iconColor="text-violet-500"
                      />
                    </CardHeader>
                    <CardContent className="grid gap-6 lg:grid-cols-2">
                      {customWidgets.map((widget, index) => (
                        <CustomWidgetVisualization
                          key={widget.id}
                          widget={widget}
                          dataset={data.explorer.datasets[widget.dimensionKey] ?? []}
                          metric={metricLookup.get(widget.metricId)}
                          colors={index % 2 === 0 ? CHART_COLORS.gradient : ALT_COLORS}
                          formatMetric={formatMetricValue}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      <EmployeeListModal
        isOpen={drillDownModal.isOpen}
        onClose={closeDrillDownModal}
        title={drillDownModal.title}
        description={drillDownModal.description}
        filterType={drillDownModal.filterType as any}
        filterValue={drillDownModal.filterValue}
        companyId={session?.user?.companyId || ""}
      />
    </PageShell>
  );
}

interface CustomWidgetBuilderProps {
  dimensions: ExplorerDimensionOption[];
  metrics: ExplorerMetricOption[];
  onCreate: (widget: CustomWidgetDefinition) => void;
  onCancel: () => void;
}

function CustomWidgetBuilder({ dimensions, metrics, onCreate, onCancel }: CustomWidgetBuilderProps) {
  const defaultDimension = dimensions[0];
  const defaultMetric = metrics[0];
  
  const [dimensionKey, setDimensionKey] = useState<string>(defaultDimension?.key ?? "");
  const [metricId, setMetricId] = useState<string>(defaultMetric?.id ?? "");
  const [visualization, setVisualization] = useState<VisualizationType>(
    defaultDimension?.defaultVisualization ?? "bar",
  );
  const [topN, setTopN] = useState<number>(6);
  const [title, setTitle] = useState(
    defaultDimension && defaultMetric
      ? `${defaultMetric.label} by ${defaultDimension.label}`
      : "Custom widget",
  );
  
  if (!defaultDimension || !defaultMetric) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted p-6 text-sm text-muted-foreground text-center">
        <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        Add more people data to unlock custom dimensions and metrics
      </div>
    );
  }

  const handleSubmit = () => {
    if (!dimensionKey || !metricId) return;
    onCreate({
      id: `custom-${Date.now()}`,
      title,
      dimensionKey,
      metricId,
      visualization,
      topN,
    });
  };

  const selectedDimension = dimensions.find((dimension) => dimension.key === dimensionKey);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Widget title
          </label>
          <Input 
            value={title} 
            onChange={(event) => setTitle(event.target.value)} 
            placeholder="e.g. Attrition by department"
            className="bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dimension
          </label>
          <Select
            value={dimensionKey}
            onValueChange={(value) => {
              setDimensionKey(value);
              const updatedDimension = dimensions.find((option) => option.key === value);
              if (updatedDimension) {
                setVisualization(updatedDimension.defaultVisualization);
              }
            }}
          >
            <SelectTrigger className="bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dimensions.map((dimension) => (
                <SelectItem key={dimension.key} value={dimension.key}>
                  {dimension.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Metric
          </label>
          <Select value={metricId} onValueChange={(value) => setMetricId(value)}>
            <SelectTrigger className="bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((metric) => (
                <SelectItem key={metric.id} value={metric.id}>
                  {metric.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visualization
          </label>
          <Select
            value={visualization}
            onValueChange={(value: VisualizationType) => setVisualization(value)}
          >
            <SelectTrigger className="bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(selectedDimension?.supportedVisualizations ?? ["bar"]).map((option) => (
                <SelectItem key={option} value={option}>
                  <span className="flex items-center gap-2">
                    {option === "bar" && <BarChart3 className="w-4 h-4" />}
                    {option === "pie" && <PieChartIcon className="w-4 h-4" />}
                    {option === "line" && <Activity className="w-4 h-4" />}
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Data points
          </label>
          <Input
            type="number"
            min={3}
            max={12}
            value={topN}
            onChange={(event) => setTopN(Number(event.target.value))}
            className="bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            size="sm" 
            onClick={handleSubmit}
            className="bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90"
          >
            <Check className="w-4 h-4 mr-2" />
            Save widget
          </Button>
        </motion.div>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface CustomWidgetCardProps {
  widget: CustomWidgetDefinition;
  dataset: ExplorerDatasetEntry[];
  metric?: ExplorerMetricOption;
  onRemove: () => void;
}

function CustomWidgetCard({ widget, dataset, metric, onRemove }: CustomWidgetCardProps) {
  return (
    <div className="rounded-xl border border-muted/50 bg-white/50 dark:bg-white/5 p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          {widget.visualization === "bar" && <BarChart3 className="w-4 h-4 text-primary" />}
          {widget.visualization === "pie" && <PieChartIcon className="w-4 h-4 text-primary" />}
          {widget.visualization === "line" && <Activity className="w-4 h-4 text-primary" />}
        </div>
        <div>
          <p className="font-semibold text-foreground">{widget.title}</p>
          <p className="text-xs text-muted-foreground">
            {metric?.label} · Top {widget.topN} · {dataset.length} segments
          </p>
        </div>
      </div>
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface CustomWidgetVisualizationProps {
  widget: CustomWidgetDefinition;
  dataset: ExplorerDatasetEntry[];
  metric?: ExplorerMetricOption;
  colors: string[];
  formatMetric: (metricId: string, value: number | null | undefined) => string;
}

function CustomWidgetVisualization({
  widget,
  dataset,
  metric,
  colors,
  formatMetric,
}: CustomWidgetVisualizationProps) {
  const metricKey = widget.metricId;
  const sortedDataset = [...dataset].sort(
    (a, b) => (b.metrics[metricKey] ?? 0) - (a.metrics[metricKey] ?? 0),
  );
  const dataPoints = sortedDataset.slice(0, widget.topN).map((entry) => ({
    ...entry,
    value: entry.metrics[metricKey] ?? 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-muted/50 bg-white/50 dark:bg-white/5 overflow-hidden"
    >
      <div className="p-4 border-b border-muted/30">
        <h4 className="font-semibold text-foreground">{widget.title}</h4>
        {metric && (
          <p className="text-xs text-muted-foreground mt-0.5">Metric: {metric.label}</p>
        )}
      </div>
      <div className="h-72 p-4">
        {dataPoints.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        ) : widget.visualization === "pie" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataPoints}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                nameKey="label"
              >
                {dataPoints.map((entry, index) => (
                  <Cell key={entry.key} fill={colors[index % colors.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | string, name: string, payload) => {
                  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                  return [formatMetric(metricKey, numericValue), payload?.payload?.label ?? name];
                }}
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number | string, name: string, payload) => {
                  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                  return [formatMetric(metricKey, numericValue), payload?.payload?.label ?? name];
                }}
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {dataPoints.map((entry, index) => (
                  <Cell key={entry.key} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

interface TemplateGalleryProps {
  templates: AnalyticsTemplate[];
  onApply: (template: AnalyticsTemplate) => void;
}

function TemplateGallery({ templates, onApply }: TemplateGalleryProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="overflow-hidden border-0 shadow-xl shadow-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <SectionHeader
            icon={Sparkles}
            title="Template Gallery"
            description="Pre-built analytics for HR leaders"
            iconColor="text-violet-500"
          />
        </CardHeader>
        <CardContent className="space-y-3 max-h-[400px] overflow-auto">
          {templates.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-muted p-6 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Templates will appear once configured
              </p>
            </div>
          ) : (
            templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group rounded-xl border border-muted/50 bg-white/50 dark:bg-white/5 p-4 hover:border-primary/30 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.visualization}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    {template.insight && (
                      <p className="text-xs text-primary/80 mt-2 flex items-start gap-1">
                        <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {template.insight}
                      </p>
                    )}
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onApply(template)}
                      className="opacity-70 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Use
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function InsightsList({ insights }: { insights: AnalyticsInsight[] }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-muted p-6 text-center">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Insights will populate as more data flows in
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => {
        const styles = PRIORITY_STYLES[insight.priority];
        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground">{insight.title}</h4>
                  <Badge className={`${styles.bg} ${styles.text} border ${styles.border} text-xs`}>
                    {insight.priority.toUpperCase()}
                  </Badge>
                  {insight.source === "ai" && (
                    <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 text-xs">
                      <Brain className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{insight.summary}</p>
                {insight.action && (
                  <p className="text-xs text-primary mt-3 flex items-start gap-1">
                    <Target className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span><strong>Recommended:</strong> {insight.action}</span>
                  </p>
                )}
                {insight.impactedMetrics && insight.impactedMetrics.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-muted-foreground">Impacts:</span>
                    {insight.impactedMetrics.map((metric) => (
                      <Badge key={metric} variant="outline" className="text-xs">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
