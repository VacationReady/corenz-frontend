"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
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
  Users,
  UserMinus,
  UserPlus,
  Wrench,
} from "lucide-react";

import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MetricCard,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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

const COLORS = ["#2563eb", "#10b981", "#f97316", "#9333ea", "#14b8a6", "#facc15"];
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

const PRIORITY_BADGES: Record<AnalyticsInsight["priority"], string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
};

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
        fill: COLORS[index % COLORS.length],
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
      title="People analytics"
      description="Live, multi-tenant workforce intelligence connected to your people data platform."
      icon={<LineChartIcon className="h-6 w-6" />}
      breadcrumbs={breadcrumbConfigs.analytics}
      action={
        <Button variant="secondary" size="sm" onClick={() => mutate()}>
          Refresh data
        </Button>
      }
    >
      <div className="space-y-6">
        <Card variant="gradient" className="overflow-hidden">
          <CardContent className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                Updated {data ? new Date(data.generatedAt).toLocaleString() : "just now"}
              </Badge>
              <h2 className="text-2xl font-semibold text-foreground">
                Understand your workforce trends at a glance
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Filter by department or location to surface precise headcount, hiring velocity, attrition and contract signals across every tenant.
              </p>
              {typeof data?.metrics.activeRatio === "number" && (
                <p className="text-sm text-foreground/80">
                  Active workforce: <span className="font-semibold text-foreground">{data.metrics.activeRatio}%</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedDepartment ?? "all"}
                onValueChange={(value) =>
                  setSelectedDepartment(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="w-48">
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
                <SelectTrigger className="w-48">
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
                <SelectTrigger className="w-40">
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
          </CardContent>
        </Card>

        {error && (
          <Card variant="flat" className="border border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 text-destructive">
              <TrendingUp className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">Unable to load analytics</p>
                <p className="text-sm text-destructive/80">{error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => mutate()}
                >
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="grid gap-6">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-3xl" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-3xl" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-80 w-full rounded-3xl" />
              <Skeleton className="h-80 w-full rounded-3xl" />
            </div>
          </div>
        )}

        {isEmptyState && (
          <Card variant="flat" className="border-dashed border-primary/40">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <Users className="h-10 w-10 text-primary" />
              <div className="space-y-2">
                <CardTitle className="text-2xl">No people data available yet</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add employees, departments, or onboarding data to unlock tenant-level analytics.
                </p>
              </div>
              <Button asChild variant="primary">
                <Link href="/employees/new">Add your first employee</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isEmptyState && data && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Active headcount"
                value={latestHeadcount.toLocaleString()}
                change={formattedHeadcountChange}
                trend={headcountTrend}
                icon={<Users className="h-5 w-5" />}
                hoverable
                onClick={() => handleDrillDown(
                  "all",
                  "all",
                  "All Active Employees",
                  "Complete list of all active employees in your organization"
                )}
              />
              <MetricCard
                title="New hires (30d)"
                value={data.metrics.newHiresLast30Days.toLocaleString()}
                icon={<UserPlus className="h-5 w-5 text-emerald-500" />}
                hoverable
                onClick={() => handleDrillDown(
                  "newHires",
                  "newHires",
                  "New Hires (Last 30 Days)",
                  "Employees who started in the last 30 days"
                )}
              />
              <MetricCard
                title="Departures (30d)"
                value={data.metrics.departuresLast30Days.toLocaleString()}
                icon={<UserMinus className="h-5 w-5 text-rose-500" />}
                hoverable
                onClick={() => handleDrillDown(
                  "departures",
                  "departures",
                  "Recent Departures (Last 30 Days)",
                  "Employees who left in the last 30 days"
                )}
              />
              <MetricCard
                title="Average tenure"
                value={
                  data.metrics.averageTenureMonths !== null
                    ? `${data.metrics.averageTenureMonths} months`
                    : "—"
                }
                icon={<Clock3 className="h-5 w-5 text-sky-500" />}
              />
              <MetricCard
                title="Attrition (90d)"
                value={
                  data.metrics.attritionRate90d !== null
                    ? `${data.metrics.attritionRate90d.toFixed(1)}%`
                    : "—"
                }
                icon={<TrendingUp className="h-5 w-5 text-rose-500" />}
              />
              <MetricCard
                title="Retention (90d)"
                value={
                  data.metrics.retentionRate90d !== null
                    ? `${data.metrics.retentionRate90d.toFixed(1)}%`
                    : "—"
                }
                icon={<Brain className="h-5 w-5 text-emerald-500" />}
              />
              <MetricCard
                title="Contracts expiring (60d)"
                value={data.metrics.upcomingContractEndings60d.toLocaleString()}
                icon={<CalendarClock className="h-5 w-5 text-amber-500" />}
                hoverable
                onClick={() => handleDrillDown(
                  "contractsExpiring",
                  "contractsExpiring",
                  "Contracts Expiring (Next 60 Days)",
                  "Employees with contracts expiring in the next 60 days"
                )}
              />
            </div>

            <Card className="shadow-depth-2">
              <CardHeader className="flex flex-col gap-2 border-none bg-transparent">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <CardTitle className="text-xl font-semibold">Headcount momentum</CardTitle>
                  <Badge variant="outline" className="bg-white/40 dark:bg-slate-900/40">
                    {rangeInMonths} month range
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Headcount tracked alongside hires and departures from your live people dataset.
                </p>
              </CardHeader>
              <CardContent className="h-[360px] p-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0" }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8 }} />
                    <Bar dataKey="hires" name="Hires" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="departures" name="Departures" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="headcount"
                      name="Headcount"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="flex flex-col xl:h-[420px]">
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    Headcount by department
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Active employees by department with total records alongside live HR data.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 min-h-0 flex-col gap-4 !space-y-0">
                  <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                    {(data.breakdowns.byDepartment ?? []).map((dept) => (
                      <div
                        key={dept.id ?? dept.name}
                        className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 shadow-inner dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
                        onClick={() => handleDrillDown(
                          "department",
                          dept.id || "unassigned",
                          `${dept.name} Department`,
                          `All employees in the ${dept.name} department`
                        )}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{dept.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {dept.active.toLocaleString()} active · {dept.total.toLocaleString()} total
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full border-primary/30 text-primary">
                          {dept.active}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="flex flex-col xl:h-[420px]">
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    Location & employment mix
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Compare where your people work today and how their employment agreements are distributed.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 min-h-0 flex-col gap-6 lg:flex-row lg:items-stretch">
                  <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                    {locationData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No location data yet. Add locations to your company profile to unlock this view.
                      </div>
                    ) : (
                      locationData.map((location) => (
                        <div
                          key={location.id ?? location.name}
                          className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 shadow-inner dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
                          onClick={() => handleDrillDown(
                            "location",
                            location.id || "unassigned",
                            `${location.name} Location`,
                            `All employees at the ${location.name} location`
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{location.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {location.active.toLocaleString()} active · {location.total.toLocaleString()} total
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full border-primary/30 text-primary">
                            {location.active}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-4 lg:w-1/2 lg:min-h-0">
                    <div className="flex-1 min-h-[200px] lg:h-full lg:min-h-0">
                      {employmentData.length === 0 ? (
                        <div className="flex h-full items-center justify-center rounded-2xl bg-white/60 text-sm text-muted-foreground dark:bg-slate-900/40">
                          Add employment types to view mix insights
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={employmentData}
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              nameKey="label"
                            >
                              {employmentData.map((entry) => (
                                <Cell key={entry.label} fill={entry.fill} stroke="transparent" />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, label: string) => [
                                `${value.toLocaleString()} active`,
                                label,
                              ]}
                              contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="space-y-2 overflow-y-auto pr-1 lg:flex-1 lg:min-h-0">
                      {(data.breakdowns.byEmploymentType ?? []).map((item, index) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between hover:bg-white/60 dark:hover:bg-slate-900/40 rounded-lg px-2 py-1 cursor-pointer transition-colors"
                          onClick={() => handleDrillDown(
                            "employmentType",
                            item.label.toLowerCase(),
                            `${item.label} Employees`,
                            `All employees with ${item.label} employment type`
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm text-foreground">{item.label}</span>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {item.value.toLocaleString()} active
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex flex-col xl:h-[420px]">
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Job role coverage
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Understand which job families hold the majority of active talent.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 min-h-0 flex-col gap-3 !space-y-0">
                  <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                    {(data.breakdowns.byJobRole ?? []).length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Assign job roles to employees to view this breakdown.
                      </div>
                    ) : (
                      (data.breakdowns.byJobRole ?? []).map((role) => (
                        <div
                          key={role.id ?? role.name}
                          className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 shadow-inner dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
                          onClick={() => handleDrillDown(
                            "jobRole",
                            role.id || "unassigned",
                            `${role.name} Job Role`,
                            `All employees with the ${role.name} job role`
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{role.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {role.active.toLocaleString()} active · {role.total.toLocaleString()} total
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full border-primary/30 text-primary">
                            {role.active}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Strategic insights
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tailored recommendations rooted in your tenant data. Layer AI commentary for a board-ready narrative.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {data.supportsAIInsights && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleGenerateAI}
                        disabled={isGeneratingAI}
                        className="flex items-center gap-2"
                      >
                        <Brain className="h-4 w-4" />
                        {isGeneratingAI ? "Generating" : "Generate AI recommendations"}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setAiInsights([])}>
                      Clear AI layer
                    </Button>
                  </div>
                  {aiError && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-200">
                      {aiError}
                    </div>
                  )}
                  <InsightsList insights={combinedInsights} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Tenure distribution
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Spot where experience is concentrated to inform succession planning and workforce design.
                  </p>
                </CardHeader>
                <CardContent className="h-72">
                  {tenureBands.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-2xl bg-white/60 text-sm text-muted-foreground dark:bg-slate-900/40">
                      Tenure data will appear once employees have confirmed start dates.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tenureBands}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number) => [`${value.toLocaleString()} employees`, "Employees"]}
                          contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0" }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[8, 8, 0, 0]}
                          fill="#6366f1"
                          onClick={(_, index) => {
                            const chartData = tenureBands[index];
                            if (chartData && chartData.label) {
                              const tenureBandMap: Record<string, string> = {
                                "Under 1 year": "under_1",
                                "1 - 3 years": "1_to_3",
                                "3 - 5 years": "3_to_5",
                                "5+ years": "5_plus"
                              };
                              const bandKey =
                                tenureBandMap[chartData.label] ||
                                chartData.label.toLowerCase().replace(/\s+/g, "_");
                              handleDrillDown(
                                "tenureBand",
                                bandKey,
                                `${chartData.label} Tenure Band`,
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
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <TemplateGallery templates={data.templates} onApply={handleApplyTemplate} />

              <Card>
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wrench className="h-5 w-5 text-primary" />
                    Custom analytics workspace
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Assemble bespoke charts across any demographic, contract type, or geography in seconds.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button size="sm" variant="outline" onClick={() => setIsBuilderOpen((open) => !open)}>
                    {isBuilderOpen ? "Close builder" : "Add custom widget"}
                  </Button>
                  {isBuilderOpen && (
                    <CustomWidgetBuilder
                      dimensions={data.explorer.dimensionOptions}
                      metrics={data.explorer.metricOptions}
                      onCreate={handleAddWidget}
                      onCancel={() => setIsBuilderOpen(false)}
                    />
                  )}

                  {customWidgets.length === 0 && !isBuilderOpen && (
                    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-sm text-muted-foreground">
                      Build your first widget or pull from the template gallery to extend the dashboard.
                    </div>
                  )}

                  {customWidgets.length > 0 && (
                    <div className="space-y-4">
                      {customWidgets.map((widget) => (
                        <CustomWidgetCard
                          key={widget.id}
                          widget={widget}
                          dataset={data.explorer.datasets[widget.dimensionKey] ?? []}
                          metric={metricLookup.get(widget.metricId)}
                          onRemove={() => handleRemoveWidget(widget.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {customWidgets.length > 0 && (
              <Card>
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="text-lg">Custom visualisations</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    These charts update live with your tenant data and respect the filters applied above.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-2">
                  {customWidgets.map((widget, index) => (
                    <CustomWidgetVisualization
                      key={widget.id}
                      widget={widget}
                      dataset={data.explorer.datasets[widget.dimensionKey] ?? []}
                      metric={metricLookup.get(widget.metricId)}
                      colors={index % 2 === 0 ? COLORS : ALT_COLORS}
                      formatMetric={formatMetricValue}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

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
  
  // Initialize hooks before any conditional returns (React rules)
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
      <div className="rounded-2xl border border-dashed border-muted px-4 py-6 text-sm text-muted-foreground">
        Add more people data to unlock custom dimensions and metrics.
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
    <div className="rounded-2xl border border-primary/20 bg-white/70 p-4 shadow-inner dark:bg-slate-900/40">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Widget title
          </p>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Attrition by department" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dimension
          </p>
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
            <SelectTrigger>
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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Metric
          </p>
          <Select value={metricId} onValueChange={(value) => setMetricId(value)}>
            <SelectTrigger>
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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visualisation
          </p>
          <Select
            value={visualization}
            onValueChange={(value: VisualizationType) => setVisualization(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(selectedDimension?.supportedVisualizations ?? ["bar"]).map((option) => (
                <SelectItem key={option} value={option}>
                  {option.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Data points
          </p>
          <Input
            type="number"
            min={3}
            max={12}
            value={topN}
            onChange={(event) => setTopN(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={handleSubmit}>
          Save widget
        </Button>
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
    <div className="rounded-2xl border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">{widget.title}</p>
          {metric && <p className="text-xs text-muted-foreground">Metric: {metric.label}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Previewing top {widget.topN} results across {dataset.length} segments.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
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
    <Card className="overflow-hidden">
      <CardHeader className="border-none bg-transparent pb-2">
        <CardTitle className="text-base font-semibold">{widget.title}</CardTitle>
        {metric && (
          <p className="text-xs text-muted-foreground">Metric: {metric.label}</p>
        )}
      </CardHeader>
      <CardContent className="h-72">
        {dataPoints.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl bg-white/60 text-sm text-muted-foreground dark:bg-slate-900/40">
            No data available for this widget.
          </div>
        ) : widget.visualization === "pie" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataPoints}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                nameKey="label"
              >
                {dataPoints.map((entry, index) => (
                  <Cell key={entry.key} fill={colors[index % colors.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | string, name: string, payload) => {
                  const numericValue =
                    typeof value === "number" ? value : Number(value ?? 0);
                  return [
                    formatMetric(metricKey, numericValue),
                    payload?.payload?.label ?? name,
                  ];
                }}
                contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataPoints}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number | string, name: string, payload) => {
                  const numericValue =
                    typeof value === "number" ? value : Number(value ?? 0);
                  return [
                    formatMetric(metricKey, numericValue),
                    payload?.payload?.label ?? name,
                  ];
                }}
                contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0" }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb">
                {dataPoints.map((entry, index) => (
                  <Cell key={entry.key} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface TemplateGalleryProps {
  templates: AnalyticsTemplate[];
  onApply: (template: AnalyticsTemplate) => void;
}

function TemplateGallery({ templates, onApply }: TemplateGalleryProps) {
  return (
    <Card>
      <CardHeader className="border-none bg-transparent pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Template gallery
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Launch ready-made charts curated for mid-market HR leaders. Customise after adding to your workspace.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-2xl border border-muted bg-muted/20 px-4 py-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-medium text-foreground">{template.name}</p>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                {template.insight && (
                  <p className="mt-2 text-xs text-primary/80">{template.insight}</p>
                )}
              </div>
              <Button size="sm" variant="secondary" onClick={() => onApply(template)}>
                Use template
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Templates will appear once seeded for this tenant.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InsightsList({ insights }: { insights: AnalyticsInsight[] }) {
  if (insights.length === 0) {
    return <p className="text-sm text-muted-foreground">Insights will populate as data flows in.</p>;
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className="rounded-2xl border border-muted bg-muted/20 px-4 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium text-foreground">{insight.title}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_BADGES[insight.priority]}`}>
              {insight.priority.toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{insight.summary}</p>
          {insight.action && (
            <p className="mt-3 text-xs font-medium text-primary/80">
              Recommended action: {insight.action}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="bg-white/60 text-muted-foreground">
              {insight.source === "ai" ? "AI" : "Heuristic"}
            </Badge>
            {insight.impactedMetrics && insight.impactedMetrics.length > 0 && (
              <span>Key metrics: {insight.impactedMetrics.join(", ")}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
