"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Building2,
  Clock3,
  LineChart as LineChartIcon,
  MapPin,
  TrendingUp,
  Users,
  UserPlus,
  UserMinus,
} from "lucide-react";

import { PageShell } from "@/components/ui/PageShell";
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
  };
  trend: {
    monthly: {
      key: string;
      label: string;
      headcount: number;
      hires: number;
      departures: number;
    }[];
  };
  breakdowns: {
    byDepartment: { id: string | null; name: string; active: number; total: number }[];
    byLocation: { id: string | null; name: string; active: number; total: number }[];
    byEmploymentType: { label: string; value: number }[];
  };
}

export default function AnalyticsDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [rangeInMonths, setRangeInMonths] = useState<number>(12);

  const analyticsUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("rangeInMonths", String(rangeInMonths));
    if (selectedDepartment) params.set("departmentId", selectedDepartment);
    if (selectedLocation) params.set("locationId", selectedLocation);
    return `/api/analytics/people?${params.toString()}`;
  }, [rangeInMonths, selectedDepartment, selectedLocation]);

  const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(analyticsUrl, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

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
      : `${
          headcountChange > 0 ? "+" : headcountChange < 0 ? "-" : ""
        }${Math.abs(headcountChange).toLocaleString()}`;

  const isEmptyState = !isLoading && !error && trendData.length === 0;

  return (
    <PageShell
      title="People analytics"
      description="Live, multi-tenant workforce intelligence connected to your people data platform."
      icon={<LineChartIcon className="h-6 w-6" />}
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
                Filter by department or location to surface precise headcount, hiring velocity, and attrition
                signals across every tenant.
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
              />
              <MetricCard
                title="New hires (30d)"
                value={data.metrics.newHiresLast30Days.toLocaleString()}
                icon={<UserPlus className="h-5 w-5 text-emerald-500" />}
              />
              <MetricCard
                title="Departures (30d)"
                value={data.metrics.departuresLast30Days.toLocaleString()}
                icon={<UserMinus className="h-5 w-5 text-rose-500" />}
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
            </div>

            <Card className="shadow-depth-2">
              <CardHeader className="flex flex-col gap-2 border-none bg-transparent">
                <div className="flex items-center justify-between gap-4 flex-wrap">
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

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    Headcount by department
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Active employees by department with total records alongside live HR data.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {(data.breakdowns.byDepartment ?? []).map((dept) => (
                      <div
                        key={dept.id ?? dept.name}
                        className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 shadow-inner dark:bg-slate-900/40"
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

              <Card>
                <CardHeader className="border-none bg-transparent pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    Location & employment mix
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Compare where your people work today and how their employment agreements are distributed.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="flex-1 space-y-3 pr-1 max-h-72 overflow-y-auto">
                    {locationData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No location data yet. Add locations to your company profile to unlock this view.
                      </p>
                    ) : (
                      locationData.map((location) => (
                        <div
                          key={location.id ?? location.name}
                          className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 shadow-inner dark:bg-slate-900/40"
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
                  <div className="flex w-full flex-col gap-4 lg:w-1/2">
                    <div className="h-64 w-full">
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
                    <div className="space-y-2">
                      {(data.breakdowns.byEmploymentType ?? []).map((item, index) => (
                        <div key={item.label} className="flex items-center justify-between">
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
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
