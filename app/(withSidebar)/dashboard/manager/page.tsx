"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PageShell } from "@/components/ui/PageShell";
import DashboardGrid from "@/components/ui/DashboardGrid";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { UnifiedActionItems } from "@/components/dashboard/UnifiedActionItems";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTenantRegion } from "@/hooks/useTenantRegion";
import {
  CalendarCheck2,
  Users,
  BarChart3,
  Search,
  UserPlus,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";
import { User } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function MetricsSummary() {
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR("/api/employees?status=active", fetcher);

  const metrics = useMemo(() => {
    if (!Array.isArray(data) || !session?.user?.id) return null;
    const me = session.user.id as string;
    const employees: any[] = data;
    // Build map by userId for quick lookup and compute team closure
    const byManager = new Map<string, string[]>();
    employees.forEach((e: any) => {
      const mgr = e.managerUserId || null;
      if (!mgr) return;
      if (!byManager.has(mgr)) byManager.set(mgr, []);
      byManager.get(mgr)!.push(e.userId);
    });
    const team = new Set<string>();
    let frontier: string[] = byManager.get(me) || [];
    while (frontier.length) {
      const next: string[] = [];
      for (const uid of frontier) {
        if (team.has(uid)) continue;
        team.add(uid);
        const children = byManager.get(uid) || [];
        for (const c of children) if (!team.has(c)) next.push(c);
      }
      frontier = next;
    }

    const teamEmployees = employees.filter((e: any) => team.has(e.userId));
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newStartersThisMonth = teamEmployees.filter((e: any) => {
      const created = e.createdAt ? new Date(e.createdAt) : null;
      return created ? created >= startOfMonth : false;
    }).length;

    return { headcount: teamEmployees.length, newStartersThisMonth };
  }, [data, session]);

  return (
    <DashboardWidget title="Team Metrics" icon={BarChart3}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load metrics." />
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded bg-muted/30">
            <div className="text-muted-foreground">Headcount</div>
            <div className="text-lg font-semibold">{metrics?.headcount ?? 0}</div>
          </div>
          <div className="p-3 rounded bg-muted/30">
            <div className="text-muted-foreground">New starters</div>
            <div className="text-lg font-semibold">{metrics?.newStartersThisMonth ?? 0}</div>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}

// Removed old DocumentActionItems component - now using UnifiedActionItems

function TeamAbsenceOverview() {
  const today = useMemo(() => new Date(), []);
  const from = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).toISOString();
  const to = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  ).toISOString();
  const { data, error, isLoading } = useSWR(
    `/api/calendar-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    fetcher,
  );
  const { template, regionName } = useTenantRegion();
  return (
    <DashboardWidget title="Team Absences Today" icon={Users}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load absences." />
      ) : !data || data.length === 0 ? (
        <EmptyState
          tone="success"
          title="Everyone's in"
          description="No absences are scheduled today."
          className="py-8"
          guidance={[
            template === "NZ"
              ? "Check the NZ public holiday calendar so upcoming regional days don't surprise the roster."
              : template === "AU"
              ? "Review your AU award roster to confirm coverage before the next payroll run."
              : template === "UK"
              ? "Give the UK bank holiday calendar a quick scan for any last-minute impacts."
              : "Review your upcoming roster to stay ahead of any coverage gaps.",
            regionName
              ? `Keep an eye on ${regionName} sickness trends so you can react quickly.`
              : "Keep an eye on sickness trends so you can react quickly.",
          ]}
        />
      ) : (
        <ul className="space-y-1 text-sm">
          {data.map((ev: any) => (
            <li key={ev.id}>
              {ev.employee?.name} ({ev.title?.split(" - ")[0]})
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}

function QuickLinks() {
  return (
    <DashboardWidget title="Quick Links" icon={UserPlus}>
      <div className="flex flex-wrap gap-2">
        <Link href="/employees">
          <Button
            variant="outline"
            size="sm"
            icon={<UserPlus className="h-4 w-4" />}
          >
            View Team
          </Button>
        </Link>
        <Link href="/calendar">
          <Button
            variant="outline"
            size="sm"
            icon={<CalendarCheck2 className="h-4 w-4" />}
          >
            Team Calendar
          </Button>
        </Link>
      </div>
    </DashboardWidget>
  );
}

function TeamInsights() {
  const { data, error, isLoading } = useSWR(
    `/api/employees?status=active`,
    fetcher,
  );
  const { template, regionName } = useTenantRegion();

  const insights = useMemo(() => {
    if (!Array.isArray(data)) return null;

    const now = new Date();
    const msInYear = 365.25 * 24 * 60 * 60 * 1000;

    const tenures = data
      .map((e: any) => {
        const started = e.createdAt ? new Date(e.createdAt) : null;
        return started ? (now.getTime() - started.getTime()) / msInYear : null;
      })
      .filter((x: number | null) => typeof x === "number") as number[];

    const avgTenure =
      tenures.length > 0
        ? tenures.reduce((a, b) => a + b, 0) / tenures.length
        : 0;
    const turnover12mo = 0;
    const upcomingAnniversaries = data
      .filter((e: any) => {
        if (!e.createdAt) return false;
        const started = new Date(e.createdAt);
        const nextAnniv = new Date(
          now.getFullYear(),
          started.getMonth(),
          started.getDate(),
        );
        if (nextAnniv < now) nextAnniv.setFullYear(now.getFullYear() + 1);
        const diffDays = Math.ceil(
          (nextAnniv.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        return diffDays <= 30;
      })
      .slice(0, 5);

    return { avgTenure, turnover12mo, upcomingAnniversaries };
  }, [data]);

  return (
    <DashboardWidget title="Team Insights" icon={BarChart3}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load insights." />
      ) : insights ? (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Avg Tenure:</span>{" "}
            <span className="font-medium">
              {insights.avgTenure.toFixed(1)} years
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Turnover (12 mo):</span>{" "}
            <span className="font-medium">{insights.turnover12mo}%</span>
          </div>
          <div>
            <div className="text-muted-foreground">
              Upcoming Anniversaries (30d)
            </div>
            {insights.upcomingAnniversaries.length === 0 ? (
              <div className="text-muted-foreground">None</div>
            ) : (
              <ul className="list-disc pl-5">
                {insights.upcomingAnniversaries.map((e: any) => (
                  <li key={e.id}>
                    {e.firstName ?? ""} {e.lastName ?? ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          tone="brand"
          title="Build your first insight"
          description="We need a little more information to surface team insights."
          className="py-8"
          guidance={[
            template === "NZ"
              ? "Run the NZ payroll insights report to seed tenure and anniversary trends."
              : template === "AU"
              ? "Start with the AU award compliance report to benchmark allowance usage."
              : template === "UK"
              ? "Generate the UK payroll starter report to baseline tenure data."
              : "Save a core people analytics report to baseline tenure data.",
            regionName
              ? `Tag upcoming ${regionName} public holidays so celebrations land on the right day.`
              : "Tag upcoming public holidays so celebrations land on the right day.",
          ]}
        />
      )}
    </DashboardWidget>
  );
}

export default function ManagerDashboardPage() {
  const { data: session } = useSession();
  const sessionEmployeeId = (session?.user as any)?.employeeId as string | undefined;
  const [employeeId, setEmployeeId] = useState<string | undefined>(sessionEmployeeId);

  // Fallback: some managers may not have employeeId on the session; resolve via API
  useEffect(() => {
    let active = true;
    const resolve = async () => {
      if (employeeId) return;
      const userId = (session?.user as any)?.id as string | undefined;
      if (!userId) return;
      try {
        const res = await fetch(`/api/employees?status=active&userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
        const data = await res.json().catch(() => []);
        const emp = Array.isArray(data) ? data[0] : null;
        if (active && emp?.id) setEmployeeId(emp.id as string);
      } catch {
        // no-op
      }
    };
    resolve();
    return () => { active = false; };
  }, [session, employeeId]);
  return (
    <PageShell
      title="Manager Dashboard"
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Manager" },
        ],
      }}
      action={
        <div className="flex items-center gap-2">
          {employeeId && (
            <Link href={`/employees/${employeeId}/overview`}>
              <Button size="sm" variant="outline" icon={<User className="h-4 w-4" />}>View profile</Button>
            </Link>
          )}
          <div className="relative">
            <input
              aria-label="Search team"
              type="text"
              placeholder="Search team"
              className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          </div>
        <Link href="/employees">
          <Button size="sm" icon={<UserPlus className="h-4 w-4" />}>
            Add Employee
          </Button>
        </Link>
        </div>
      }
    >
      <DashboardGrid>
        {employeeId && <LeaveSummaryCard employeeId={employeeId} />}
        <MetricsSummary />
        <TeamAbsenceOverview />
        <TeamInsights />
        <QuickLinks />
        <UnifiedActionItems employeeId={employeeId} isManager={true} />
        <NewsWidget limit={3} />
      </DashboardGrid>
    </PageShell>
  );
}
