import { z } from "zod";

import { ensurePrismaConnected, prisma } from "@/lib/prisma";

const RANGE_BOUNDS = { min: 3, max: 24 } as const;

export const analyticsFilterSchema = z.object({
  rangeInMonths: z
    .number()
    .min(RANGE_BOUNDS.min)
    .max(RANGE_BOUNDS.max)
    .default(12),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
});

export type AnalyticsFilters = z.infer<typeof analyticsFilterSchema>;

export type VisualizationType = "bar" | "pie" | "line";

export interface AnalyticsInsight {
  id: string;
  title: string;
  summary: string;
  priority: "low" | "medium" | "high";
  source: "heuristic" | "ai";
  action?: string;
  impactedMetrics?: string[];
}

export interface AnalyticsTemplate {
  id: string;
  name: string;
  description: string;
  dimensionKey: string;
  metricId: string;
  visualization: VisualizationType;
  insight?: string;
}

export interface ExplorerMetricOption {
  id: string;
  label: string;
  description: string;
  format: "number" | "percentage";
}

export interface ExplorerDimensionOption {
  key: string;
  label: string;
  description: string;
  supportedVisualizations: VisualizationType[];
  defaultVisualization: VisualizationType;
}

export interface ExplorerDatasetEntry {
  key: string;
  label: string;
  metrics: Record<string, number | null>;
}

export interface ExplorerData {
  dimensionOptions: ExplorerDimensionOption[];
  metricOptions: ExplorerMetricOption[];
  datasets: Record<string, ExplorerDatasetEntry[]>;
}

export interface PeopleAnalyticsResult {
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
    byJobRole: { id: string | null; name: string; active: number; total: number }[];
    tenureBands: { label: string; value: number }[];
  };
  explorer: ExplorerData;
  templates: AnalyticsTemplate[];
  insights: AnalyticsInsight[];
}

type AnalyticsEmployeeRecord = {
  id: string;
  isActive: boolean;
  departmentId: string | null;
  locationId: string | null;
  employmentType: string | null;
  contractType: string | null;
  jobRoleId: string | null;
  startDate: Date | null;
  lastWorkingDate: Date | null;
  offboardingDate: Date | null;
  contractEndDate: Date | null;
};

interface MonthBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

function shiftMonths(base: Date, offset: number) {
  const shifted = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  shifted.setUTCMonth(shifted.getUTCMonth() + offset);
  return shifted;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function isWithinRange(value: Date | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  return value >= start && value <= end;
}

function differenceInMonths(start: Date, end: Date) {
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  const months = end.getUTCMonth() - start.getUTCMonth();
  const days = end.getUTCDate() - start.getUTCDate();
  return years * 12 + months + days / 30;
}

interface ExplorerAccumulator {
  key: string;
  label: string;
  active: number;
  total: number;
  hires90d: number;
  departures90d: number;
  expiring60d: number;
  tenureSum: number;
  tenureCount: number;
}

function toTitleCase(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

function computeExplorerDatasets(
  employees: AnalyticsEmployeeRecord[],
  options: {
    departmentMap: Map<string, string>;
    locationMap: Map<string, string>;
    jobRoleMap: Map<string, string>;
    ninetyDaysAgo: Date;
    now: Date;
    sixtyDaysAhead: Date;
  },
) {
  const dimensionAccumulators = new Map<string, Map<string, ExplorerAccumulator>>();

  const getDimensionBucket = (
    dimensionKey: string,
    bucketKey: string,
    bucketLabel: string,
  ) => {
    if (!dimensionAccumulators.has(dimensionKey)) {
      dimensionAccumulators.set(dimensionKey, new Map());
    }
    const dimensionBuckets = dimensionAccumulators.get(dimensionKey)!;
    if (!dimensionBuckets.has(bucketKey)) {
      dimensionBuckets.set(bucketKey, {
        key: bucketKey,
        label: bucketLabel,
        active: 0,
        total: 0,
        hires90d: 0,
        departures90d: 0,
        expiring60d: 0,
        tenureSum: 0,
        tenureCount: 0,
      });
    }
    return dimensionBuckets.get(bucketKey)!;
  };

  for (const employee of employees) {
    const startDate = employee.startDate ?? null;
    const departureDate = employee.lastWorkingDate ?? employee.offboardingDate ?? null;
    const contractEndDate = employee.contractEndDate ?? null;

    const tenureMonths = startDate ? differenceInMonths(startDate, options.now) : null;

    const dimensionSelectors: [string, string, string][] = [];

    const departmentId = employee.departmentId ?? "unassigned";
    const departmentName =
      employee.departmentId
        ? options.departmentMap.get(employee.departmentId) ?? "Unassigned"
        : "Unassigned";
    dimensionSelectors.push(["department", departmentId, departmentName]);

    const locationId = employee.locationId ?? "unassigned";
    const locationName = employee.locationId 
      ? (options.locationMap.get(employee.locationId) ?? "Unknown Location")
      : "Unassigned";
    dimensionSelectors.push(["location", locationId, locationName]);

    const employmentType = employee.employmentType?.trim();
    const employmentKey = employmentType?.toLowerCase() || "unspecified";
    const employmentLabel = employmentType ? toTitleCase(employmentType) : "Unspecified";
    dimensionSelectors.push(["employmentType", employmentKey, employmentLabel]);

    const contractType = employee.contractType?.trim();
    const contractKey = contractType?.toLowerCase() || "unspecified";
    const contractLabel = contractType ? toTitleCase(contractType) : "Unspecified";
    dimensionSelectors.push(["contractType", contractKey, contractLabel]);

    const jobRoleId = employee.jobRoleId ?? "unassigned";
    const jobRoleName =
      employee.jobRoleId
        ? options.jobRoleMap.get(employee.jobRoleId) ?? "Unassigned"
        : "Unassigned";
    dimensionSelectors.push(["jobRole", jobRoleId, jobRoleName]);

    for (const [dimensionKey, bucketKey, bucketLabel] of dimensionSelectors) {
      const bucket = getDimensionBucket(dimensionKey, bucketKey, bucketLabel);
      bucket.total += 1;
      if (employee.isActive) {
        bucket.active += 1;
      }
      if (startDate && isWithinRange(startDate, options.ninetyDaysAgo, options.now)) {
        bucket.hires90d += 1;
      }
      if (departureDate && isWithinRange(departureDate, options.ninetyDaysAgo, options.now)) {
        bucket.departures90d += 1;
      }
      if (
        contractEndDate &&
        contractEndDate >= options.now &&
        contractEndDate <= options.sixtyDaysAhead
      ) {
        bucket.expiring60d += 1;
      }
      if (typeof tenureMonths === "number" && Number.isFinite(tenureMonths)) {
        bucket.tenureSum += tenureMonths;
        bucket.tenureCount += 1;
      }
    }
  }

  const datasets: Record<string, ExplorerDatasetEntry[]> = {};

  for (const [dimensionKey, buckets] of dimensionAccumulators.entries()) {
    const entries: ExplorerDatasetEntry[] = [];
    for (const bucket of buckets.values()) {
      const averageTenure =
        bucket.tenureCount > 0
          ? Math.round((bucket.tenureSum / bucket.tenureCount) * 10) / 10
          : null;
      const attritionRate = bucket.active > 0
        ? Math.round((bucket.departures90d / bucket.active) * 1000) / 10
        : bucket.departures90d > 0
          ? 100
          : 0;

      entries.push({
        key: bucket.key,
        label: bucket.label,
        metrics: {
          active: bucket.active,
          total: bucket.total,
          hires90d: bucket.hires90d,
          departures90d: bucket.departures90d,
          expiring60d: bucket.expiring60d,
          averageTenureMonths: averageTenure,
          attritionRate,
        },
      });
    }

    entries.sort((a, b) => (b.metrics.active ?? 0) - (a.metrics.active ?? 0));
    datasets[dimensionKey] = entries;
  }

  return datasets;
}

function buildEmploymentTypeBreakdown(
  employees: AnalyticsEmployeeRecord[],
) {
  const totals = new Map<string, number>();
  for (const employee of employees) {
    if (!employee.isActive) continue;
    const key = employee.employmentType?.trim().toLowerCase() || "unspecified";
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }

  return Array.from(totals.entries()).map(([key, value]) => ({
    label: key === "unspecified" ? "Unspecified" : toTitleCase(key),
    value,
  }));
}

function buildTenureBands(
  employees: AnalyticsEmployeeRecord[],
  now: Date,
) {
  const bands = [
    { key: "under_1", label: "Under 1 year", value: 0 },
    { key: "1_to_3", label: "1 - 3 years", value: 0 },
    { key: "3_to_5", label: "3 - 5 years", value: 0 },
    { key: "5_plus", label: "5+ years", value: 0 },
  ];

  for (const employee of employees) {
    if (!employee.isActive || !employee.startDate) continue;
    const tenureMonths = differenceInMonths(employee.startDate, now);
    if (tenureMonths < 12) {
      bands[0].value += 1;
    } else if (tenureMonths < 36) {
      bands[1].value += 1;
    } else if (tenureMonths < 60) {
      bands[2].value += 1;
    } else {
      bands[3].value += 1;
    }
  }

  return bands.map(({ label, value }) => ({ label, value }));
}

function buildExplorerMetadata(): {
  dimensions: ExplorerDimensionOption[];
  metrics: ExplorerMetricOption[];
} {
  const dimensions: ExplorerDimensionOption[] = [
    {
      key: "department",
      label: "Department",
      description: "Segment performance by organisational department",
      supportedVisualizations: ["bar", "pie"],
      defaultVisualization: "bar",
    },
    {
      key: "location",
      label: "Location",
      description: "Compare workforce distribution by location",
      supportedVisualizations: ["bar", "pie"],
      defaultVisualization: "bar",
    },
    {
      key: "employmentType",
      label: "Employment type",
      description: "Analyse permanent, fixed-term, contractor and other mixes",
      supportedVisualizations: ["pie", "bar"],
      defaultVisualization: "pie",
    },
    {
      key: "contractType",
      label: "Contract type",
      description: "Review agreements and contract exposure across the workforce",
      supportedVisualizations: ["bar", "pie"],
      defaultVisualization: "bar",
    },
    {
      key: "jobRole",
      label: "Job role",
      description: "Understand coverage by job family and role",
      supportedVisualizations: ["bar"],
      defaultVisualization: "bar",
    },
  ];

  const metrics: ExplorerMetricOption[] = [
    {
      id: "active",
      label: "Active headcount",
      description: "Current active employees in the segment",
      format: "number",
    },
    {
      id: "total",
      label: "Total records",
      description: "All employees historically associated with the segment",
      format: "number",
    },
    {
      id: "hires90d",
      label: "Hires (90d)",
      description: "Employees who started within the last 90 days",
      format: "number",
    },
    {
      id: "departures90d",
      label: "Departures (90d)",
      description: "Employees who departed within the last 90 days",
      format: "number",
    },
    {
      id: "expiring60d",
      label: "Contracts expiring (60d)",
      description: "Upcoming contract end dates within the next 60 days",
      format: "number",
    },
    {
      id: "averageTenureMonths",
      label: "Average tenure (months)",
      description: "Average tenure in months for active employees",
      format: "number",
    },
    {
      id: "attritionRate",
      label: "Attrition rate",
      description: "Departures over active headcount for the last 90 days",
      format: "percentage",
    },
  ];

  return { dimensions, metrics };
}

function buildTemplates(): AnalyticsTemplate[] {
  return [
    {
      id: "dept-attrition",
      name: "Attrition by department",
      description: "Spot teams with high departure activity over the last 90 days",
      dimensionKey: "department",
      metricId: "departures90d",
      visualization: "bar",
      insight: "Focus retention efforts where exits are spiking",
    },
    {
      id: "employment-mix",
      name: "Employment mix",
      description: "Compare your permanent, contractor, and flexible workforce mix",
      dimensionKey: "employmentType",
      metricId: "active",
      visualization: "pie",
      insight: "Assess balance between core staff and contingent labour",
    },
    {
      id: "contract-risk",
      name: "Contract expiry risk",
      description: "Track contracts nearing expiry to plan renewals or transitions",
      dimensionKey: "contractType",
      metricId: "expiring60d",
      visualization: "bar",
      insight: "Protect against key talent loss with proactive renewals",
    },
  ];
}

function deriveHeuristicInsights(data: {
  metrics: PeopleAnalyticsResult["metrics"];
  explorer: ExplorerData;
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  if (data.metrics.attritionRate90d && data.metrics.attritionRate90d > 8) {
    insights.push({
      id: "attrition-spike",
      title: "Attrition is trending high",
      summary: `Attrition over the last 90 days is ${data.metrics.attritionRate90d.toFixed(1)}%, which exceeds the typical healthy range. Investigate departure drivers and reinforce stay conversations.`,
      priority: "high",
      source: "heuristic",
      action: "Review exit interview signals and engage managers in retention plans",
      impactedMetrics: ["departuresLast30Days", "attritionRate90d"],
    });
  }

  if (data.metrics.upcomingContractEndings60d > 0) {
    insights.push({
      id: "contract-renewals",
      title: "Contracts expiring soon",
      summary: `${data.metrics.upcomingContractEndings60d} contracts are due to end in the next 60 days. Coordinate with managers on renewal or transition plans.`,
      priority: data.metrics.upcomingContractEndings60d > 5 ? "medium" : "low",
      source: "heuristic",
      action: "Flag these employees in your people ops stand-up and confirm renewal intent",
      impactedMetrics: ["upcomingContractEndings60d"],
    });
  }

  const departmentDataset = data.explorer.datasets.department ?? [];
  if (departmentDataset.length > 0) {
    const byAttrition = [...departmentDataset].sort(
      (a, b) => (b.metrics.attritionRate ?? 0) - (a.metrics.attritionRate ?? 0),
    );
    const top = byAttrition[0];
    if (top && (top.metrics.attritionRate ?? 0) > 5) {
      insights.push({
        id: "dept-attrition-hotspot",
        title: `${top.label} is an attrition hotspot`,
        summary: `${top.label} recorded ${top.metrics.departures90d} departures in the last quarter with an attrition rate of ${
          top.metrics.attritionRate?.toFixed(1) ?? "0"
        }%.`,
        priority: top.metrics.attritionRate && top.metrics.attritionRate > 10 ? "high" : "medium",
        source: "heuristic",
        action: "Partner with the department lead on targeted retention and engagement actions",
        impactedMetrics: ["departures90d", "attritionRate"],
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "steady-state",
      title: "Workforce trends are stable",
      summary: "No acute risk indicators detected this cycle. Continue monitoring hiring velocity and engagement pulse surveys.",
      priority: "low",
      source: "heuristic",
      impactedMetrics: ["activeHeadcount"],
    });
  }

  return insights;
}

export async function getPeopleAnalytics(
  companyId: string,
  filters: AnalyticsFilters,
): Promise<PeopleAnalyticsResult> {
  await ensurePrismaConnected();

  const range = filters.rangeInMonths;

  const [employees, departments, locations, jobRoles] = (await Promise.all([
    prisma.employee.findMany({
      where: {
        companyId,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
      },
      select: {
        id: true,
        isActive: true,
        departmentId: true,
        locationId: true,
        jobRoleId: true,
        employmentType: true,
        contractType: true,
        startDate: true,
        lastWorkingDate: true,
        offboardingDate: true,
        contractEndDate: true,
      },
    }),
    prisma.department.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { OR: [{ companyId }, { companyId: null }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.jobRole.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])) as [
    AnalyticsEmployeeRecord[],
    { id: string; name: string }[],
    { id: string; name: string }[],
    { id: string; name: string }[],
  ];

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const monthBuckets: MonthBucket[] = [];
  for (let i = range - 1; i >= 0; i -= 1) {
    const monthStart = shiftMonths(currentMonthStart, -i);
    const monthEnd = endOfMonth(monthStart);
    monthBuckets.push({
      key: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(monthStart),
      start: monthStart,
      end: monthEnd,
    });
  }

  const monthlyTrend = monthBuckets.map((bucket) => {
    let hires = 0;
    let departures = 0;
    let headcount = 0;

    for (const employee of employees) {
      const startDate = employee.startDate ?? null;
      const departureDate = employee.lastWorkingDate ?? employee.offboardingDate ?? null;

      if (isWithinRange(startDate, bucket.start, bucket.end)) {
        hires += 1;
      }
      if (isWithinRange(departureDate, bucket.start, bucket.end)) {
        departures += 1;
      }

      const startedBeforePeriodEnd = !startDate || startDate <= bucket.end;
      const stillEmployedDuringPeriod = !departureDate || departureDate >= bucket.start;
      if (startedBeforePeriodEnd && stillEmployedDuringPeriod) {
        headcount += 1;
      }
    }

    return {
      key: bucket.key,
      label: bucket.label,
      hires,
      departures,
      headcount,
    };
  });

  const latestHeadcount = monthlyTrend.at(-1)?.headcount ?? 0;
  const previousHeadcount = monthlyTrend.at(-2)?.headcount ?? null;
  const headcountChange =
    previousHeadcount !== null ? latestHeadcount - previousHeadcount : null;

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

  const sixtyDaysAhead = new Date(now);
  sixtyDaysAhead.setUTCDate(sixtyDaysAhead.getUTCDate() + 60);

  let newHiresLast30Days = 0;
  let departuresLast30Days = 0;
  let departuresLast90Days = 0;
  let totalTenureMonths = 0;
  let tenureSamples = 0;
  let activeEmployeesCount = 0;
  let upcomingContractEndings60d = 0;

  for (const employee of employees) {
    const startDate = employee.startDate ?? null;
    const departureDate = employee.lastWorkingDate ?? employee.offboardingDate ?? null;
    const contractEndDate = employee.contractEndDate ?? null;

    if (employee.isActive) {
      activeEmployeesCount += 1;
    }

    if (startDate && startDate >= thirtyDaysAgo && startDate <= now) {
      newHiresLast30Days += 1;
    }

    if (departureDate && departureDate >= thirtyDaysAgo && departureDate <= now) {
      departuresLast30Days += 1;
    }

    if (departureDate && departureDate >= ninetyDaysAgo && departureDate <= now) {
      departuresLast90Days += 1;
    }

    if (
      contractEndDate &&
      contractEndDate >= now &&
      contractEndDate <= sixtyDaysAhead
    ) {
      upcomingContractEndings60d += 1;
    }

    if (employee.isActive && startDate) {
      const tenureMonths = differenceInMonths(startDate, now);
      totalTenureMonths += tenureMonths;
      tenureSamples += 1;
    }
  }

  const averageTenureMonths =
    tenureSamples > 0 ? Math.round((totalTenureMonths / tenureSamples) * 10) / 10 : null;

  const averageHeadcountLast90Days = (() => {
    if (monthlyTrend.length === 0) return null;
    const recentTrend = monthlyTrend.slice(-3);
    if (recentTrend.length === 0) return null;
    const total = recentTrend.reduce((acc, entry) => acc + entry.headcount, 0);
    return total / recentTrend.length;
  })();

  const attritionRate90d = averageHeadcountLast90Days
    ? Math.round((departuresLast90Days / averageHeadcountLast90Days) * 1000) / 10
    : null;

  const retentionRate90d =
    typeof attritionRate90d === "number"
      ? Math.max(0, Math.round((100 - attritionRate90d) * 10) / 10)
      : null;

  const employmentTypeBreakdown = buildEmploymentTypeBreakdown(employees);
  const departmentMap = new Map(departments.map((department) => [department.id, department.name]));
  const locationMap = new Map(locations.map((location) => [location.id, location.name]));
  const jobRoleMap = new Map(jobRoles.map((jobRole) => [jobRole.id, jobRole.name]));

  const explorerDatasets = computeExplorerDatasets(employees, {
    departmentMap,
    locationMap,
    jobRoleMap,
    ninetyDaysAgo,
    now,
    sixtyDaysAhead,
  });

  const { dimensions, metrics } = buildExplorerMetadata();
  const explorer: ExplorerData = {
    dimensionOptions: dimensions,
    metricOptions: metrics,
    datasets: explorerDatasets,
  };

  const breakdownByDepartment = explorerDatasets.department?.map((entry) => ({
    id: entry.key === "unassigned" ? null : entry.key,
    name: entry.label,
    active: entry.metrics.active ?? 0,
    total: entry.metrics.total ?? entry.metrics.active ?? 0,
  })) ?? [];

  const breakdownByLocation = explorerDatasets.location?.map((entry) => ({
    id: entry.key === "unassigned" ? null : entry.key,
    name: entry.label,
    active: entry.metrics.active ?? 0,
    total: entry.metrics.total ?? entry.metrics.active ?? 0,
  })) ?? [];

  const breakdownByJobRole = explorerDatasets.jobRole?.map((entry) => ({
    id: entry.key === "unassigned" ? null : entry.key,
    name: entry.label,
    active: entry.metrics.active ?? 0,
    total: entry.metrics.total ?? entry.metrics.active ?? 0,
  })) ?? [];

  const tenureBands = buildTenureBands(employees, now);

  const templates = buildTemplates();

  const insights = deriveHeuristicInsights({
    metrics: {
      activeHeadcount: latestHeadcount,
      headcountChange,
      averageTenureMonths,
      activeRatio:
        employees.length > 0
          ? Math.round((activeEmployeesCount / employees.length) * 100)
          : null,
      newHiresLast30Days,
      departuresLast30Days,
      attritionRate90d,
      retentionRate90d,
      upcomingContractEndings60d,
    },
    explorer,
  });

  return {
    generatedAt: now.toISOString(),
    rangeInMonths: range,
    filters: {
      departments,
      locations,
    },
    metrics: {
      activeHeadcount: latestHeadcount,
      headcountChange,
      averageTenureMonths,
      activeRatio:
        employees.length > 0
          ? Math.round((activeEmployeesCount / employees.length) * 100)
          : null,
      newHiresLast30Days,
      departuresLast30Days,
      attritionRate90d,
      retentionRate90d,
      upcomingContractEndings60d,
    },
    trend: {
      monthly: monthlyTrend,
    },
    breakdowns: {
      byDepartment: breakdownByDepartment,
      byLocation: breakdownByLocation,
      byEmploymentType: employmentTypeBreakdown,
      byJobRole: breakdownByJobRole,
      tenureBands,
    },
    explorer,
    templates,
    insights,
  };
}

