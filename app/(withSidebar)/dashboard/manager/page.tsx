
"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { PageShell } from "@/components/ui/PageShell";
import DashboardGrid from "@/components/ui/DashboardGrid";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { CalendarCheck2, Users, BarChart3, Search, FileBarChart2, UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function MetricsSummary() {
  const { data, error, isLoading } = useSWR("/api/dashboard/metrics", fetcher);
  return (
    <DashboardWidget title="Team Metrics" icon={FileBarChart2}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load metrics." />
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded bg-muted/30"><div className="text-muted-foreground">Headcount</div><div className="text-lg font-semibold">{data?.headcount ?? 0}</div></div>
          <div className="p-3 rounded bg-muted/30"><div className="text-muted-foreground">New starters</div><div className="text-lg font-semibold">{data?.newStartersThisMonth ?? 0}</div></div>
          <div className="p-3 rounded bg-muted/30"><div className="text-muted-foreground">Pending approvals</div><div className="text-lg font-semibold">{data?.pendingApprovals?.my ?? 0}</div></div>
          {data?.canViewAllApprovals && (
            <div className="p-3 rounded bg-muted/30"><div className="text-muted-foreground">All pending</div><div className="text-lg font-semibold">{data?.pendingApprovals?.all ?? 0}</div></div>
          )}
        </div>
      )}
    </DashboardWidget>
  );
}

function PendingLeaveApprovals() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/leave-request?approvalStatus=PENDING",
    fetcher
  );

  const handleAction = async (id: string, action: "approve" | "decline") => {
    await fetch(`/api/leave-request/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    mutate();
  };

  const items: any[] = Array.isArray((data as any)?.data) ? (data as any).data : [];

  return (
    <DashboardWidget title="Pending Leave Approvals" icon={CalendarCheck2} action={<Link href="/dashboard/approvals" className="text-sm underline">Approve Leave</Link>}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load approvals." />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={async () => {
              await Promise.all(items.map((r: any) => handleAction(r.id, "approve")));
            }}>Approve all</Button>
          </div>
          <ul className="divide-y divide-border">
            {items.slice(0, 5).map((r: any) => (
              <li key={r.id} className="py-2 text-sm flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{r.employee?.user?.name ?? r.employee?.user?.firstName ?? "Employee"}</div>
                  <div className="text-muted-foreground">{r.eventCategory?.name} — {new Date(r.startDate).toLocaleDateString()} to {new Date(r.endDate).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAction(r.id, "approve")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "decline")}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardWidget>
  );
}

function TeamAbsenceOverview() {
  const today = useMemo(() => new Date(), []);
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const { data, error, isLoading } = useSWR(`/api/calendar-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, fetcher);
  return (
    <DashboardWidget title="Team Absences Today" icon={Users}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load absences." />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No absences today.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.map((ev: any) => (
            <li key={ev.id}>{ev.employee?.name} ({ev.title?.split(" - ")[0]})</li>
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
        <Link href="/employees"><Button variant="outline" size="sm"><UserPlus className="w-4 h-4 mr-2" />Add Employee</Button></Link>
        <Link href="/reports"><Button variant="outline" size="sm"><FileBarChart2 className="w-4 h-4 mr-2" />Run Report</Button></Link>
      </div>
    </DashboardWidget>
  );
}

function TeamInsights() {
  const { data, error, isLoading } = useSWR(`/api/employees?status=active`, fetcher);

  const insights = useMemo(() => {
    if (!Array.isArray(data)) return null;

    const now = new Date();
    const msInYear = 365.25 * 24 * 60 * 60 * 1000;

    const tenures = data
      .map((e: any) => {
        const started = e.createdAt ? new Date(e.createdAt) : null;
        return started ? (now.getTime() - started.getTime()) / msInYear : null;
      })
      .filter((x: number | null) => typeof x === 'number') as number[];

    const avgTenure = tenures.length > 0 ? (tenures.reduce((a, b) => a + b, 0) / tenures.length) : 0;
    const turnover12mo = 0;
    const upcomingAnniversaries = data.filter((e: any) => {
      if (!e.createdAt) return false;
      const started = new Date(e.createdAt);
      const nextAnniv = new Date(now.getFullYear(), started.getMonth(), started.getDate());
      if (nextAnniv < now) nextAnniv.setFullYear(now.getFullYear() + 1);
      const diffDays = Math.ceil((nextAnniv.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return diffDays <= 30;
    }).slice(0, 5);

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
          <div><span className="text-muted-foreground">Avg Tenure:</span> <span className="font-medium">{insights.avgTenure.toFixed(1)} years</span></div>
          <div><span className="text-muted-foreground">Turnover (12 mo):</span> <span className="font-medium">{insights.turnover12mo}%</span></div>
          <div>
            <div className="text-muted-foreground">Upcoming Anniversaries (30d)</div>
            {insights.upcomingAnniversaries.length === 0 ? (
              <div className="text-muted-foreground">None</div>
            ) : (
              <ul className="list-disc pl-5">
                {insights.upcomingAnniversaries.map((e: any) => (
                  <li key={e.id}>{e.firstName ?? ''} {e.lastName ?? ''}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data.</p>
      )}
    </DashboardWidget>
  );
}

export default function ManagerDashboardPage() {
  return (
    <PageShell title="Manager Dashboard" breadcrumbs={{ items: [{ label: "Dashboard", href: "/dashboard" }, { label: "Manager" }] }}
      action={
        <div className="flex items-center gap-2">
          <div className="relative">
            <input aria-label="Search team" type="text" placeholder="Search team" className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          </div>
          <Link href="/employees"><Button size="sm"><UserPlus className="w-4 h-4 mr-2" />Add Employee</Button></Link>
          <Link href="/reports"><Button size="sm" variant="outline"><FileBarChart2 className="w-4 h-4 mr-2" />Run Report</Button></Link>
        </div>
      }
    >
      <DashboardGrid>
        <MetricsSummary />
        <PendingLeaveApprovals />
        <TeamAbsenceOverview />
        <TeamInsights />
        <QuickLinks />
      </DashboardGrid>
    </PageShell>
  );
}


