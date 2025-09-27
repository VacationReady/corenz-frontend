"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { PageShell } from "@/components/ui/PageShell";
import DashboardGrid from "@/components/ui/DashboardGrid";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTenantRegion } from "@/hooks/useTenantRegion";
import {
  CalendarCheck2,
  Users,
  BarChart3,
  Search,
  FileBarChart2,
  UserPlus,
  CheckSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

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
          <div className="p-3 rounded bg-muted/30">
            <div className="text-muted-foreground">Headcount</div>
            <div className="text-lg font-semibold">{data?.headcount ?? 0}</div>
          </div>
          <div className="p-3 rounded bg-muted/30">
            <div className="text-muted-foreground">New starters</div>
            <div className="text-lg font-semibold">
              {data?.newStartersThisMonth ?? 0}
            </div>
          </div>
          <div className="p-3 rounded bg-muted/30">
            <div className="text-muted-foreground">Pending approvals</div>
            <div className="text-lg font-semibold">
              {data?.pendingApprovals?.my ?? 0}
            </div>
          </div>
          {data?.canViewAllApprovals && (
            <div className="p-3 rounded bg-muted/30">
              <div className="text-muted-foreground">All pending</div>
              <div className="text-lg font-semibold">
                {data?.pendingApprovals?.all ?? 0}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardWidget>
  );
}

function DocumentActionItems() {
  const { data: docsCompany, error: errCo, isLoading: loadingCo } = useSWR(
    "/api/documents/list-company",
    fetcher,
  );

  const [pendingAck, setPendingAck] = useState<Array<{ id: string; name: string }>>([]);
  const [pendingSign, setPendingSign] = useState<Array<{ id: string; name: string }>>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (loadingCo) return;
      const all = Array.isArray(docsCompany) ? docsCompany : [];
      const map = new Map<string, any>();
      for (const d of all) if (d?.id && !map.has(d.id)) map.set(d.id, d);
      const docs = Array.from(map.values())
        .filter((d) => d?.requiresAck || d?.requiresSignature)
        .slice(0, 20);
      setChecking(true);
      try {
        const ack = await Promise.all(
          docs.map(async (d) => {
            if (!d?.requiresAck) return null;
            try {
              const r = await fetch(`/api/documents/acknowledge/${d.id}/me`, { cache: "no-store" });
              const j = await r.json();
              return j?.acknowledged ? null : { id: d.id, name: d.name };
            } catch {
              return { id: d.id, name: d.name };
            }
          }),
        );
        const sign = await Promise.all(
          docs.map(async (d) => {
            if (!d?.requiresSignature) return null;
            try {
              const r = await fetch(`/api/documents/signatures/${d.id}/me`, { cache: "no-store" });
              const j = await r.json();
              return j?.signed ? null : { id: d.id, name: d.name };
            } catch {
              return { id: d.id, name: d.name };
            }
          }),
        );
        setPendingAck(ack.filter(Boolean).slice(0, 5) as any);
        setPendingSign(sign.filter(Boolean).slice(0, 5) as any);
      } finally {
        setChecking(false);
      }
    };
    run();
  }, [docsCompany, loadingCo]);

  const loadingAny = loadingCo || checking;

  return (
    <DashboardWidget title="Action Items" icon={CheckSquare}>
      {loadingAny ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : pendingAck.length === 0 && pendingSign.length === 0 ? (
        <p className="text-sm text-muted-foreground">No document actions pending.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold mb-2">Read acknowledgements</div>
            <ul className="space-y-2">
              {pendingAck.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{d.name}</span>
                  <Link href={`/documents?open=${d.id}`} className="text-xs underline">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Signatures</div>
            <ul className="space-y-2">
              {pendingSign.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{d.name}</span>
                  <Link href={`/documents?open=${d.id}`} className="text-xs underline">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}
function PendingApprovals() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/approvals?status=PENDING",
    fetcher,
  );
  const { template, regionName } = useTenantRegion();

  const handleAction = async (id: string, action: "approve" | "decline") => {
    await fetch(`/api/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    mutate();
  };

  const items: any[] = Array.isArray((data as any)?.items)
    ? (data as any).items
    : [];

  return (
    <DashboardWidget
      title="Pending Approvals"
      icon={CalendarCheck2}
      action={
        <Link href="/dashboard/approvals" className="text-sm underline">
          Open Approvals
        </Link>
      }
    >
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load approvals." />
      ) : items.length === 0 ? (
        <EmptyState
          tone="brand"
          title="You're all caught up"
          description="There aren't any items waiting for approval."
          className="py-8"
          guidance={[
            template === "NZ"
              ? "Glance at the NZ payroll cut-off so approved leave is captured in your PAYE run."
              : template === "AU"
              ? "Use the AU award interpreter to confirm allowances before you approve."
              : template === "UK"
              ? "Check your UK payroll draft so statutory leave balances stay tidy."
              : "Double-check your payroll draft so balances stay accurate.",
            regionName
              ? `Encourage your ${regionName} team to submit requests ahead of busy periods.`
              : "Encourage your team to submit requests ahead of busy periods.",
          ]}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await Promise.all(
                  items.map((r: any) => handleAction(r.id, "approve")),
                );
              }}
              icon={<CheckSquare className="h-4 w-4" />}
            >
              Approve all
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {items.slice(0, 5).map((r: any) => (
              <li
                key={r.id}
                className="py-2 text-sm flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span className="inline-flex px-2 py-0.5 text-xs rounded bg-muted">{r.type}</span>
                    <span>{r.title}</span>
                  </div>
                  {r.subtitle && (
                    <div className="text-muted-foreground">{r.subtitle}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAction(r.id, "approve")}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(r.id, "decline")}
                    icon={<XCircle className="h-4 w-4" />}
                  >
                    Reject
                  </Button>
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
            Add Employee
          </Button>
        </Link>
        <Link href="/reports">
          <Button
            variant="outline"
            size="sm"
            icon={<FileBarChart2 className="h-4 w-4" />}
          >
            Run Report
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
        <Link href="/reports">
          <Button
            size="sm"
            variant="outline"
            icon={<FileBarChart2 className="h-4 w-4" />}
          >
            Run Report
          </Button>
        </Link>
        </div>
      }
    >
      <DashboardGrid>
        <MetricsSummary />
        <PendingApprovals />
        <TeamAbsenceOverview />
        <TeamInsights />
        <QuickLinks />
        <DocumentActionItems />
        <NewsWidget limit={3} />
      </DashboardGrid>
    </PageShell>
  );
}
