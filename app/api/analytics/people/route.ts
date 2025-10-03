import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import { isAIEnabled } from "@/lib/ai/openai-client";
import { ensurePrismaConnected, prisma } from "@/lib/prisma";

import {
  analyticsFilterSchema,
  getPeopleAnalytics,
} from "./analytics-service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  rangeInMonths: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
});

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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parseResult = querySchema.safeParse({
    rangeInMonths: searchParams.get("rangeInMonths") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    locationId: searchParams.get("locationId") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  // Validate/shape with shared analytics filter schema
  const { rangeInMonths, departmentId, locationId } = parseResult.data;
  const filtersResult = analyticsFilterSchema.safeParse({
    rangeInMonths: rangeInMonths ? Number(rangeInMonths) : undefined,
    departmentId: departmentId?.trim() || undefined,
    locationId: locationId?.trim() || undefined,
  });

  if (!filtersResult.success) {
    return NextResponse.json(
      { error: "Invalid analytics filter", details: filtersResult.error.flatten() },
      { status: 400 },
    );
  }

  try {
    // Prefer the consolidated analytics service which returns the rich dataset
    const analytics = await getPeopleAnalytics(
      session.user.companyId,
      filtersResult.data,
    );

    return NextResponse.json({
      ...analytics,
      supportsAIInsights: isAIEnabled(),
    });
  } catch (serviceError: any) {
    // Fallback: keep earlier functionality by computing a basic analytics snapshot inline
    console.error("[analytics:people] service failed, falling back", serviceError);

    try {
      await ensurePrismaConnected();

      const companyId = session.user.companyId;
      const range = filtersResult.data.rangeInMonths ?? 12;

      const [employees, departments, locations] = await Promise.all([
        prisma.employee.findMany({
          where: {
            companyId,
            ...(filtersResult.data.departmentId
              ? { departmentId: filtersResult.data.departmentId }
              : {}),
            ...(filtersResult.data.locationId
              ? { locationId: filtersResult.data.locationId }
              : {}),
          },
          select: {
            id: true,
            isActive: true,
            departmentId: true,
            locationId: true,
            employmentType: true,
            contractType: true,
            startDate: true,
            lastWorkingDate: true,
            offboardingDate: true,
            Department: { select: { id: true, name: true } },
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
      ]);

      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const monthBuckets: MonthBucket[] = [];
      for (let i = range - 1; i >= 0; i -= 1) {
        const monthStart = shiftMonths(currentMonthStart, -i);
        const monthEnd = endOfMonth(monthStart);
        monthBuckets.push({
          key: `${monthStart.getUTCFullYear()}-${String(
            monthStart.getUTCMonth() + 1,
          ).padStart(2, "0")}`,
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
          const departureDate =
            employee.lastWorkingDate ?? employee.offboardingDate ?? null;

          if (isWithinRange(startDate, bucket.start, bucket.end)) {
            hires += 1;
          }
          if (isWithinRange(departureDate, bucket.start, bucket.end)) {
            departures += 1;
          }

          const startedBeforePeriodEnd = !startDate || startDate <= bucket.end;
          const stillEmployedDuringPeriod =
            !departureDate || departureDate >= bucket.start;
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

      let newHiresLast30Days = 0;
      let departuresLast30Days = 0;
      let totalTenureMonths = 0;
      let tenureSamples = 0;

      const activeEmployees: typeof employees = [];

      for (const employee of employees) {
        if (employee.isActive) {
          activeEmployees.push(employee);
        }

        const startDate = employee.startDate ?? null;
        const departureDate =
          employee.lastWorkingDate ?? employee.offboardingDate ?? null;

        if (isWithinRange(startDate, thirtyDaysAgo, now)) {
          newHiresLast30Days += 1;
        }
        if (isWithinRange(departureDate, thirtyDaysAgo, now)) {
          departuresLast30Days += 1;
        }

        if (employee.isActive && startDate) {
          totalTenureMonths += differenceInMonths(startDate, now);
          tenureSamples += 1;
        }
      }

      const averageTenureMonths =
        tenureSamples > 0
          ? Number((totalTenureMonths / tenureSamples).toFixed(1))
          : null;

      const totalEmployees = employees.length;
      const activeCount = activeEmployees.length;
      const activeRatio =
        totalEmployees > 0
          ? Number(((activeCount / totalEmployees) * 100).toFixed(1))
          : null;

      const departmentBreakdownMap = new Map<
        string,
        { id: string | null; name: string; active: number; total: number }
      >();
      const locationBreakdownMap = new Map<
        string,
        { id: string | null; name: string; active: number; total: number }
      >();
      const employmentTypeMap = new Map<string, number>();

      for (const employee of employees) {
        const departmentKey = employee.departmentId ?? "__unassigned";
        const departmentName =
          employee.Department?.name ||
          departments.find((dept) => dept.id === employee.departmentId)?.name ||
          "Unassigned";
        const deptEntry =
          departmentBreakdownMap.get(departmentKey) ?? {
            id: employee.departmentId ?? null,
            name: departmentName,
            active: 0,
            total: 0,
          };
        deptEntry.total += 1;
        if (employee.isActive) {
          deptEntry.active += 1;
        }
        departmentBreakdownMap.set(departmentKey, deptEntry);

        const locationKey = employee.locationId ?? "__unassigned";
        const locationName =
          locations.find((loc) => loc.id === employee.locationId)?.name ||
          (employee.locationId ? employee.locationId : "Unassigned");
        const locationEntry =
          locationBreakdownMap.get(locationKey) ?? {
            id: employee.locationId ?? null,
            name: locationName,
            active: 0,
            total: 0,
          };
        locationEntry.total += 1;
        if (employee.isActive) {
          locationEntry.active += 1;
        }
        locationBreakdownMap.set(locationKey, locationEntry);

        const employmentLabel =
          employee.employmentType || employee.contractType || "Unspecified";
        employmentTypeMap.set(
          employmentLabel,
          (employmentTypeMap.get(employmentLabel) ?? 0) +
            (employee.isActive ? 1 : 0),
        );
      }

      const departmentBreakdown = Array.from(departmentBreakdownMap.values()).sort(
        (a, b) => b.active - a.active || b.total - a.total,
      );
      const locationBreakdown = Array.from(locationBreakdownMap.values()).sort(
        (a, b) => b.active - a.active || b.total - a.total,
      );
      const employmentBreakdown = Array.from(employmentTypeMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

      // Return a response that matches the richer shape where possible
      return NextResponse.json({
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
          activeRatio,
          newHiresLast30Days,
          departuresLast30Days,
          // Extra fields (best-effort defaults to keep UI happy)
          attritionRate90d: null,
          retentionRate90d: null,
          upcomingContractEndings60d: 0,
        },
        trend: {
          monthly: monthlyTrend,
        },
        breakdowns: {
          byDepartment: departmentBreakdown,
          byLocation: locationBreakdown,
          byEmploymentType: employmentBreakdown,
          byJobRole: [],
          tenureBands: [],
        },
        // Explorer/templates/insights are empty in the fallback
        explorer: {
          dimensionOptions: [],
          metricOptions: [],
          datasets: {},
        },
        templates: [],
        insights: [],
        supportsAIInsights: isAIEnabled(),
      });
    } catch (fallbackError: any) {
      console.error("[analytics:people] fallback failed", fallbackError);
      return NextResponse.json(
        { error: fallbackError?.message ?? "Failed to load analytics" },
        { status: 500 },
      );
    }
  }
}
