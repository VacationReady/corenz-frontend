"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import {
  Briefcase,
  Filter,
  LineChart as LineChartIcon,
  Palette,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const RANGE_MAP: Record<string, number> = {
  "90d": 4,
  "180d": 7,
  "365d": 12,
};

const COLOR_PALETTE = [
  "#2563eb",
  "#22d3ee",
  "#a855f7",
  "#f97316",
  "#34d399",
  "#facc15",
];

const HEADCOUNT_TIMELINE = [
  {
    month: "Aug",
    year: 2023,
    data: {
      all: { actual: 298, forecast: 302 },
      engineering: { actual: 108, forecast: 110 },
      people: { actual: 44, forecast: 45 },
      operations: { actual: 72, forecast: 73 },
      sales: { actual: 42, forecast: 44 },
      product: { actual: 32, forecast: 30 },
    },
  },
  {
    month: "Sep",
    year: 2023,
    data: {
      all: { actual: 304, forecast: 307 },
      engineering: { actual: 112, forecast: 113 },
      people: { actual: 45, forecast: 46 },
      operations: { actual: 73, forecast: 74 },
      sales: { actual: 43, forecast: 45 },
      product: { actual: 31, forecast: 33 },
    },
  },
  {
    month: "Oct",
    year: 2023,
    data: {
      all: { actual: 312, forecast: 315 },
      engineering: { actual: 118, forecast: 119 },
      people: { actual: 46, forecast: 47 },
      operations: { actual: 74, forecast: 75 },
      sales: { actual: 44, forecast: 46 },
      product: { actual: 30, forecast: 32 },
    },
  },
  {
    month: "Nov",
    year: 2023,
    data: {
      all: { actual: 318, forecast: 320 },
      engineering: { actual: 121, forecast: 122 },
      people: { actual: 47, forecast: 48 },
      operations: { actual: 76, forecast: 77 },
      sales: { actual: 45, forecast: 47 },
      product: { actual: 29, forecast: 31 },
    },
  },
  {
    month: "Dec",
    year: 2023,
    data: {
      all: { actual: 322, forecast: 325 },
      engineering: { actual: 123, forecast: 124 },
      people: { actual: 48, forecast: 49 },
      operations: { actual: 78, forecast: 79 },
      sales: { actual: 45, forecast: 47 },
      product: { actual: 28, forecast: 30 },
    },
  },
  {
    month: "Jan",
    year: 2024,
    data: {
      all: { actual: 328, forecast: 332 },
      engineering: { actual: 128, forecast: 130 },
      people: { actual: 49, forecast: 50 },
      operations: { actual: 80, forecast: 81 },
      sales: { actual: 46, forecast: 48 },
      product: { actual: 25, forecast: 28 },
    },
  },
  {
    month: "Feb",
    year: 2024,
    data: {
      all: { actual: 332, forecast: 336 },
      engineering: { actual: 130, forecast: 132 },
      people: { actual: 49, forecast: 50 },
      operations: { actual: 81, forecast: 82 },
      sales: { actual: 47, forecast: 49 },
      product: { actual: 25, forecast: 28 },
    },
  },
  {
    month: "Mar",
    year: 2024,
    data: {
      all: { actual: 336, forecast: 340 },
      engineering: { actual: 132, forecast: 134 },
      people: { actual: 50, forecast: 51 },
      operations: { actual: 82, forecast: 83 },
      sales: { actual: 48, forecast: 50 },
      product: { actual: 24, forecast: 27 },
    },
  },
  {
    month: "Apr",
    year: 2024,
    data: {
      all: { actual: 341, forecast: 344 },
      engineering: { actual: 135, forecast: 137 },
      people: { actual: 51, forecast: 52 },
      operations: { actual: 83, forecast: 84 },
      sales: { actual: 49, forecast: 51 },
      product: { actual: 23, forecast: 26 },
    },
  },
  {
    month: "May",
    year: 2024,
    data: {
      all: { actual: 347, forecast: 350 },
      engineering: { actual: 138, forecast: 140 },
      people: { actual: 52, forecast: 53 },
      operations: { actual: 84, forecast: 85 },
      sales: { actual: 50, forecast: 52 },
      product: { actual: 23, forecast: 26 },
    },
  },
  {
    month: "Jun",
    year: 2024,
    data: {
      all: { actual: 353, forecast: 356 },
      engineering: { actual: 141, forecast: 143 },
      people: { actual: 52, forecast: 53 },
      operations: { actual: 85, forecast: 86 },
      sales: { actual: 52, forecast: 53 },
      product: { actual: 23, forecast: 25 },
    },
  },
  {
    month: "Jul",
    year: 2024,
    data: {
      all: { actual: 358, forecast: 362 },
      engineering: { actual: 144, forecast: 146 },
      people: { actual: 53, forecast: 54 },
      operations: { actual: 86, forecast: 87 },
      sales: { actual: 53, forecast: 55 },
      product: { actual: 22, forecast: 24 },
    },
  },
];

const DEPARTMENT_SUMMARIES = {
  engineering: {
    headcount: 144,
    monthlyChange: 6.2,
    yoyGrowth: 18.4,
    attrition: 6.1,
    engagement: 82,
    hiringVelocity: 26,
    pendingOffers: 9,
  },
  people: {
    headcount: 53,
    monthlyChange: 2.1,
    yoyGrowth: 12.6,
    attrition: 4.2,
    engagement: 88,
    hiringVelocity: 19,
    pendingOffers: 3,
  },
  operations: {
    headcount: 86,
    monthlyChange: 3.4,
    yoyGrowth: 9.8,
    attrition: 5.7,
    engagement: 76,
    hiringVelocity: 22,
    pendingOffers: 5,
  },
  sales: {
    headcount: 53,
    monthlyChange: 4.7,
    yoyGrowth: 15.3,
    attrition: 7.4,
    engagement: 74,
    hiringVelocity: 28,
    pendingOffers: 7,
  },
  product: {
    headcount: 22,
    monthlyChange: -1.2,
    yoyGrowth: 6.8,
    attrition: 3.9,
    engagement: 90,
    hiringVelocity: 14,
    pendingOffers: 2,
  },
};

type DepartmentKey = keyof typeof DEPARTMENT_SUMMARIES | "all";

const PIPELINE_DATA: Record<DepartmentKey, { stage: string; candidates: number; sla: number }[]> = {
  all: [
    { stage: "Sourcing", candidates: 94, sla: 7 },
    { stage: "Screen", candidates: 61, sla: 5 },
    { stage: "Interview", candidates: 48, sla: 6 },
    { stage: "Offer", candidates: 23, sla: 4 },
    { stage: "Hired", candidates: 16, sla: 3 },
  ],
  engineering: [
    { stage: "Sourcing", candidates: 38, sla: 8 },
    { stage: "Screen", candidates: 26, sla: 6 },
    { stage: "Interview", candidates: 21, sla: 7 },
    { stage: "Offer", candidates: 11, sla: 5 },
    { stage: "Hired", candidates: 8, sla: 4 },
  ],
  people: [
    { stage: "Sourcing", candidates: 11, sla: 6 },
    { stage: "Screen", candidates: 8, sla: 4 },
    { stage: "Interview", candidates: 6, sla: 5 },
    { stage: "Offer", candidates: 3, sla: 4 },
    { stage: "Hired", candidates: 2, sla: 3 },
  ],
  operations: [
    { stage: "Sourcing", candidates: 17, sla: 6 },
    { stage: "Screen", candidates: 12, sla: 5 },
    { stage: "Interview", candidates: 8, sla: 5 },
    { stage: "Offer", candidates: 4, sla: 4 },
    { stage: "Hired", candidates: 3, sla: 3 },
  ],
  sales: [
    { stage: "Sourcing", candidates: 19, sla: 5 },
    { stage: "Screen", candidates: 13, sla: 4 },
    { stage: "Interview", candidates: 9, sla: 4 },
    { stage: "Offer", candidates: 4, sla: 3 },
    { stage: "Hired", candidates: 3, sla: 3 },
  ],
  product: [
    { stage: "Sourcing", candidates: 9, sla: 7 },
    { stage: "Screen", candidates: 7, sla: 5 },
    { stage: "Interview", candidates: 4, sla: 6 },
    { stage: "Offer", candidates: 2, sla: 5 },
    { stage: "Hired", candidates: 1, sla: 4 },
  ],
};

const ENGAGEMENT_PULSE: Record<DepartmentKey, { week: string; engagement: number; responseRate: number }[]> = {
  all: [
    { week: "W1", engagement: 74, responseRate: 64 },
    { week: "W2", engagement: 76, responseRate: 66 },
    { week: "W3", engagement: 79, responseRate: 69 },
    { week: "W4", engagement: 83, responseRate: 72 },
    { week: "W5", engagement: 82, responseRate: 71 },
    { week: "W6", engagement: 84, responseRate: 74 },
    { week: "W7", engagement: 86, responseRate: 76 },
    { week: "W8", engagement: 88, responseRate: 78 },
  ],
  engineering: [
    { week: "W1", engagement: 71, responseRate: 62 },
    { week: "W2", engagement: 74, responseRate: 63 },
    { week: "W3", engagement: 76, responseRate: 65 },
    { week: "W4", engagement: 79, responseRate: 68 },
    { week: "W5", engagement: 81, responseRate: 69 },
    { week: "W6", engagement: 82, responseRate: 70 },
    { week: "W7", engagement: 84, responseRate: 72 },
    { week: "W8", engagement: 86, responseRate: 73 },
  ],
  people: [
    { week: "W1", engagement: 82, responseRate: 70 },
    { week: "W2", engagement: 84, responseRate: 72 },
    { week: "W3", engagement: 87, responseRate: 75 },
    { week: "W4", engagement: 88, responseRate: 77 },
    { week: "W5", engagement: 87, responseRate: 76 },
    { week: "W6", engagement: 89, responseRate: 79 },
    { week: "W7", engagement: 90, responseRate: 80 },
    { week: "W8", engagement: 92, responseRate: 82 },
  ],
  operations: [
    { week: "W1", engagement: 68, responseRate: 58 },
    { week: "W2", engagement: 70, responseRate: 59 },
    { week: "W3", engagement: 72, responseRate: 61 },
    { week: "W4", engagement: 75, responseRate: 63 },
    { week: "W5", engagement: 74, responseRate: 62 },
    { week: "W6", engagement: 76, responseRate: 64 },
    { week: "W7", engagement: 78, responseRate: 66 },
    { week: "W8", engagement: 80, responseRate: 67 },
  ],
  sales: [
    { week: "W1", engagement: 69, responseRate: 60 },
    { week: "W2", engagement: 71, responseRate: 61 },
    { week: "W3", engagement: 74, responseRate: 63 },
    { week: "W4", engagement: 77, responseRate: 65 },
    { week: "W5", engagement: 76, responseRate: 64 },
    { week: "W6", engagement: 78, responseRate: 66 },
    { week: "W7", engagement: 80, responseRate: 68 },
    { week: "W8", engagement: 82, responseRate: 69 },
  ],
  product: [
    { week: "W1", engagement: 84, responseRate: 71 },
    { week: "W2", engagement: 85, responseRate: 72 },
    { week: "W3", engagement: 86, responseRate: 73 },
    { week: "W4", engagement: 88, responseRate: 75 },
    { week: "W5", engagement: 87, responseRate: 74 },
    { week: "W6", engagement: 89, responseRate: 76 },
    { week: "W7", engagement: 90, responseRate: 77 },
    { week: "W8", engagement: 91, responseRate: 78 },
  ],
};

const ATTRITION_MATRIX = [
  { team: "Engineering", voluntary: 3.2, involuntary: 1.5, regretted: 0.8 },
  { team: "Operations", voluntary: 2.5, involuntary: 1.1, regretted: 0.4 },
  { team: "Sales", voluntary: 3.7, involuntary: 1.4, regretted: 0.9 },
  { team: "People", voluntary: 1.4, involuntary: 0.6, regretted: 0.3 },
  { team: "Product", voluntary: 1.1, involuntary: 0.5, regretted: 0.2 },
];

const TALENT_MOVERS = [
  {
    name: "Aisha Khan",
    newRole: "Lead Product Designer",
    impact: "+12% sprint velocity",
    department: "Product",
  },
  {
    name: "Marcus Taylor",
    newRole: "Principal Engineer",
    impact: "Mentor program launched",
    department: "Engineering",
  },
  {
    name: "Sofia Martins",
    newRole: "Head of Revenue Ops",
    impact: "+8% pipeline hygiene",
    department: "Sales",
  },
  {
    name: "Ethan Walker",
    newRole: "HR Analytics Lead",
    impact: "Turnover forecasting live",
    department: "People",
  },
];

const TEMPLATE_LIBRARY = [
  {
    id: "headcount-health",
    name: "Headcount Health",
    description: "Growth, attrition, and hiring velocity in one view",
    icon: TrendingUp,
  },
  {
    id: "talent-experience",
    name: "Talent Experience",
    description: "Engagement pulse plus pipeline health",
    icon: Sparkles,
  },
  {
    id: "executive-brief",
    name: "Executive Brief",
    description: "Board-ready metrics with forecast overlays",
    icon: LineChartIcon,
  },
  {
    id: "diversity-eq",
    name: "Diversity & Equity",
    description: "Representation, promotions, and pay equity",
    icon: PieChartIcon,
  },
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "rgba(15, 23, 42, 0.85)",
  borderRadius: "1rem",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  color: "#f8fafc",
  padding: "0.75rem 1rem",
  backdropFilter: "blur(8px)",
};

const formatMonthLabel = (month: string, year: number) => {
  return `${month} '${String(year).slice(-2)}`;
};

const departmentOptions: { value: DepartmentKey; label: string }[] = [
  { value: "all", label: "All Teams" },
  { value: "engineering", label: "Engineering" },
  { value: "people", label: "People" },
  { value: "operations", label: "Operations" },
  { value: "sales", label: "Revenue" },
  { value: "product", label: "Product" },
];

const rangeOptions = [
  { value: "90d", label: "Last 90 days" },
  { value: "180d", label: "Last 6 months" },
  { value: "365d", label: "Last 12 months" },
];

function aggregateAllDepartments() {
  const totals = {
    headcount: 0,
    monthlyChange: 0,
    yoyGrowth: 0,
    attrition: 0,
    engagement: 0,
    hiringVelocity: 0,
    pendingOffers: 0,
  };

  const entries = Object.values(DEPARTMENT_SUMMARIES);

  entries.forEach((dept) => {
    totals.headcount += dept.headcount;
    totals.monthlyChange += dept.monthlyChange;
    totals.yoyGrowth += dept.yoyGrowth;
    totals.attrition += dept.attrition;
    totals.engagement += dept.engagement;
    totals.hiringVelocity += dept.hiringVelocity;
    totals.pendingOffers += dept.pendingOffers;
  });

  const divisor = entries.length;

  return {
    headcount: totals.headcount,
    monthlyChange: totals.monthlyChange / divisor,
    yoyGrowth: totals.yoyGrowth / divisor,
    attrition: totals.attrition / divisor,
    engagement: totals.engagement / divisor,
    hiringVelocity: totals.hiringVelocity / divisor,
    pendingOffers: totals.pendingOffers,
  };
}

const allDepartmentSummary = aggregateAllDepartments();

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>("180d");
  const [department, setDepartment] = useState<DepartmentKey>("all");
  const [distributionMetric, setDistributionMetric] = useState<
    "headcount" | "growth" | "attrition"
  >("headcount");
  const [activeTemplate, setActiveTemplate] = useState<string>("headcount-health");

  const selectedSummary = useMemo(() => {
    if (department === "all") return allDepartmentSummary;
    return DEPARTMENT_SUMMARIES[department];
  }, [department]);

  const headcountSeries = useMemo(() => {
    const slice = RANGE_MAP[timeRange];

    return HEADCOUNT_TIMELINE.slice(-slice).map((entry) => {
      const label = formatMonthLabel(entry.month, entry.year);
      const data = department === "all" ? entry.data.all : entry.data[department];
      return {
        label,
        actual: data.actual,
        forecast: data.forecast,
      };
    });
  }, [timeRange, department]);

  const latestHeadcount = headcountSeries[headcountSeries.length - 1]?.actual ?? 0;
  const previousHeadcount = headcountSeries[0]?.actual ?? 1;
  const headcountDelta = latestHeadcount - previousHeadcount;

  const departmentDistribution = useMemo(() => {
    const base = Object.entries(DEPARTMENT_SUMMARIES).map(([key, value]) => ({
      department: key,
      ...value,
    }));

    switch (distributionMetric) {
      case "growth":
        return base.map((entry) => ({
          name: entry.department,
          value: Number(entry.yoyGrowth.toFixed(1)),
        }));
      case "attrition":
        return base.map((entry) => ({
          name: entry.department,
          value: Number(entry.attrition.toFixed(1)),
        }));
      default:
        return base.map((entry) => ({
          name: entry.department,
          value: entry.headcount,
        }));
    }
  }, [distributionMetric]);

  const pipelineSeries = useMemo(() => PIPELINE_DATA[department], [department]);
  const engagementSeries = useMemo(() => ENGAGEMENT_PULSE[department], [department]);

  const netChangePercent = ((headcountDelta / (previousHeadcount || 1)) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.25),transparent_55%)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.35),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-12 lg:px-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-6">
              <Badge variant="outline" className="border-sky-400/40 bg-sky-400/10 text-sky-200">
                Enterprise Analytics Studio
              </Badge>
              <div className="max-w-2xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Rich, real-time people analytics built for strategic HR teams
                </h1>
                <p className="text-lg text-slate-300">
                  Explore curated templates, layer your own filters, and share data-driven stories in minutes. Every widget below
                  is fully composable—save layouts, mix chart types, and align your analytics to executive goals.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button className="rounded-full bg-sky-500 px-5 text-sky-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Launch AI narrative
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-slate-700 bg-slate-900/60 px-5 text-slate-200 backdrop-blur hover:bg-slate-800/80"
                >
                  <Palette className="mr-2 h-4 w-4" />
                  Customize layout
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full bg-transparent px-4 text-slate-300 hover:bg-slate-800/60 hover:text-white"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate template
                </Button>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="glass-strong relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/5 p-8 text-left shadow-xl"
            >
              <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-sky-500/40 via-transparent to-transparent" />
              <div className="relative space-y-5">
                <p className="text-sm uppercase tracking-widest text-sky-200/80">Live benchmark</p>
                <h2 className="text-3xl font-semibold text-white">People health index</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-300">Composite score</p>
                    <p className="mt-1 text-3xl font-bold text-white">87</p>
                    <p className="mt-1 text-sm text-emerald-300">+4.2 vs prior month</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Forecast confidence</p>
                    <p className="mt-1 text-3xl font-bold text-white">92%</p>
                    <p className="mt-1 text-sm text-slate-300">Data refreshed 12m ago</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-xs text-slate-200/80">Attrition outlook</p>
                    <p className="mt-2 text-lg font-semibold text-white">Low</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-xs text-slate-200/80">Engagement</p>
                    <p className="mt-2 text-lg font-semibold text-white">+6.1%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-xs text-slate-200/80">Hiring pace</p>
                    <p className="mt-2 text-lg font-semibold text-white">On track</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <section className="relative -mt-10 pb-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent" />
        <div className="relative mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
          <Card
            variant="gradient"
            className="border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent text-slate-100 backdrop-blur-xl"
          >
            <CardHeader className="flex flex-col gap-6 border-none bg-transparent px-8 pb-0 pt-8 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl text-white">Interactive control center</CardTitle>
                <p className="mt-2 max-w-2xl text-base text-slate-300">
                  Dial in the audience, timeframe, and template to instantly adapt every widget below. All selections sync across
                  cards so you can export a consistent narrative.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 backdrop-blur">
                  <Filter className="h-4 w-4 text-sky-300" />
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Active filters</p>
                    <p className="text-sm text-white">
                      {departmentOptions.find((item) => item.value === department)?.label} •
                      {" "}
                      {rangeOptions.find((item) => item.value === timeRange)?.label}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800/80"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset filters
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 px-8 pb-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Focus</p>
                  <Select value={department} onValueChange={(value) => setDepartment(value as DepartmentKey)}>
                    <SelectTrigger className="h-12 rounded-3xl border-slate-700 bg-slate-900/60 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-800 bg-slate-900 text-slate-100">
                      {departmentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Timeframe</p>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="h-12 rounded-3xl border-slate-700 bg-slate-900/60 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-800 bg-slate-900 text-slate-100">
                      {rangeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Template</p>
                  <Tabs
                    value={activeTemplate}
                    onValueChange={setActiveTemplate}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/60 p-2"
                  >
                    <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-2xl bg-transparent">
                      {TEMPLATE_LIBRARY.slice(0, 2).map((template) => (
                        <TabsTrigger
                          key={template.id}
                          value={template.id}
                          className="rounded-2xl border border-transparent bg-slate-900/40 px-3 py-2 text-xs text-slate-300 data-[state=active]:border-sky-400/40 data-[state=active]:bg-sky-400/10 data-[state=active]:text-white"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <template.icon className="h-4 w-4" />
                            {template.name}
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {TEMPLATE_LIBRARY.slice(0, 2).map((template) => (
                      <TabsContent key={template.id} value={template.id} className="hidden" />
                    ))}
                  </Tabs>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Current headcount"
                  value={latestHeadcount}
                  change={`${headcountDelta > 0 ? "+" : ""}${headcountDelta} vs start`}
                  trend={headcountDelta >= 0 ? "up" : "down"}
                  icon={<Briefcase className="h-5 w-5" />}
                  className="border border-white/5 bg-slate-900/60 text-white"
                />
                <MetricCard
                  title="Average monthly change"
                  value={`${selectedSummary.monthlyChange.toFixed(1)}%`}
                  change={`Net ${netChangePercent}% over period`}
                  trend={Number(netChangePercent) >= 0 ? "up" : "down"}
                  icon={<TrendingUp className="h-5 w-5" />}
                  className="border border-white/5 bg-slate-900/60 text-white"
                />
                <MetricCard
                  title="Attrition rate"
                  value={`${selectedSummary.attrition.toFixed(1)}%`}
                  change={`Pending offers: ${selectedSummary.pendingOffers}`}
                  trend="neutral"
                  icon={<PieChartIcon className="h-5 w-5" />}
                  className="border border-white/5 bg-slate-900/60 text-white"
                />
                <MetricCard
                  title="Engagement index"
                  value={`${selectedSummary.engagement.toFixed(0)}`}
                  change={`Hiring velocity: ${selectedSummary.hiringVelocity} days`}
                  trend="up"
                  icon={<Sparkles className="h-5 w-5" />}
                  className="border border-white/5 bg-slate-900/60 text-white"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="border border-white/10 bg-slate-950/60 text-slate-100">
              <CardHeader className="border-none bg-transparent">
                <CardTitle className="flex items-center justify-between text-xl text-white">
                  Headcount momentum
                  <Badge className="rounded-full bg-emerald-500/20 text-emerald-200">Forecast</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] p-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={headcountSeries} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="headcountActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="headcountForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ paddingTop: 16 }} />
                    <Area type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={3} fill="url(#headcountActual)" />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stroke="#a855f7"
                      strokeDasharray="4 4"
                      strokeWidth={2.5}
                      fill="url(#headcountForecast)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-slate-950/60 text-slate-100">
              <CardHeader className="border-none bg-transparent">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl text-white">Workforce distribution</CardTitle>
                    <p className="mt-1 text-sm text-slate-400">Switch metrics to view growth, attrition or raw headcount</p>
                  </div>
                  <Tabs
                    value={distributionMetric}
                    onValueChange={(value) => setDistributionMetric(value as typeof distributionMetric)}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-1"
                  >
                    <TabsList className="flex h-auto gap-2 bg-transparent">
                      {[
                        { value: "headcount", label: "Headcount" },
                        { value: "growth", label: "Growth" },
                        { value: "attrition", label: "Attrition" },
                      ].map((item) => (
                        <TabsTrigger
                          key={item.value}
                          value={item.value}
                          className="rounded-xl border border-transparent px-3 py-1 text-xs text-slate-300 data-[state=active]:border-sky-400/40 data-[state=active]:bg-sky-400/10 data-[state=active]:text-white"
                        >
                          {item.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {[
                      { value: "headcount" },
                      { value: "growth" },
                      { value: "attrition" },
                    ].map((item) => (
                      <TabsContent key={item.value} value={item.value} className="hidden" />
                    ))}
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="h-[320px] p-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={4}
                    >
                      {departmentDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
            <Card className="border border-white/10 bg-slate-950/60 text-slate-100">
              <CardHeader className="flex flex-col gap-4 border-none bg-transparent md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-xl text-white">Hiring velocity & SLA adherence</CardTitle>
                  <p className="mt-1 text-sm text-slate-400">Track candidate drop-off and service level commitments stage-by-stage</p>
                </div>
                <Button size="sm" className="rounded-full bg-sky-500/80 text-slate-900 hover:bg-sky-400/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Add widget
                </Button>
              </CardHeader>
              <CardContent className="h-[360px] p-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineSeries} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="stage" stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}d`}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="candidates" name="Candidates" radius={[10, 10, 0, 0]} fill="#38bdf8" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sla"
                      name="SLA"
                      stroke="#fbbf24"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "#0f172a" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-slate-950/60 text-slate-100">
              <CardHeader className="border-none bg-transparent">
                <CardTitle className="text-xl text-white">Talent movers spotlight</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {TALENT_MOVERS.map((mover) => (
                  <div
                    key={mover.name}
                    className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 shadow-inner shadow-black/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{mover.name}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-400">{mover.department}</p>
                      </div>
                      <Badge className="rounded-full bg-sky-500/10 text-sky-300">Promotion</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{mover.newRole}</p>
                    <p className="mt-1 text-xs text-emerald-300">{mover.impact}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="border border-white/10 bg-slate-950/60 text-slate-100">
              <CardHeader className="flex flex-col gap-2 border-none bg-transparent">
                <CardTitle className="text-xl text-white">Engagement pulse</CardTitle>
                <p className="text-sm text-slate-400">Weekly sentiment blended with response rate to gauge readiness</p>
              </CardHeader>
              <CardContent className="h-[300px] p-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={engagementSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="week" stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="engagement" stroke="#22d3ee" fill="#22d3ee33" name="Engagement" />
                    <Line
                      type="monotone"
                      dataKey="responseRate"
                      stroke="#a855f7"
                      strokeWidth={3}
                      name="Response rate"
                      dot={{ r: 3, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-slate-950/60 text-slate-100">
              <CardHeader className="border-none bg-transparent">
                <CardTitle className="text-xl text-white">Attrition risk mix</CardTitle>
              </CardHeader>
              <CardContent className="flex h-[300px] flex-col">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="30%"
                    outerRadius="95%"
                    barSize={16}
                    data={ATTRITION_MATRIX.map((item, index) => ({
                      name: item.team,
                      x: index,
                      uv: item.voluntary + item.involuntary + item.regretted,
                      fill: COLOR_PALETTE[index % COLOR_PALETTE.length],
                    }))}
                  >
                    <RadialBar background dataKey="uv" cornerRadius={16} />
                    <Legend iconType="circle" />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-300">
                  {ATTRITION_MATRIX.map((item) => (
                    <div key={item.team} className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                      <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">{item.team}</p>
                      <p className="mt-1 font-semibold text-white">{(item.voluntary + item.involuntary).toFixed(1)}% overall</p>
                      <p className="text-[0.65rem] text-emerald-300">{item.regretted.toFixed(1)}% regretted</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-slate-950/60 text-slate-100">
              <CardHeader className="border-none bg-transparent">
                <CardTitle className="text-xl text-white">Template library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {TEMPLATE_LIBRARY.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setActiveTemplate(template.id)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left transition",
                      "border-white/5 bg-slate-900/60 hover:border-sky-400/40 hover:bg-sky-400/10",
                      activeTemplate === template.id && "border-sky-400/40 bg-sky-400/10 text-white",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-slate-800/80 p-2 text-sky-300">
                        <template.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{template.name}</p>
                        <p className="text-xs text-slate-300">{template.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
                <Button className="w-full rounded-full bg-sky-500/80 text-slate-900 hover:bg-sky-400/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Save as new template
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
