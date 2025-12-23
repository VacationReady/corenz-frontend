"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { EnhancedWidget } from "@/components/ui/EnhancedWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { UnifiedActionItems } from "@/components/dashboard/UnifiedActionItems";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Users,
  BarChart3,
  Search,
  User,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function MetricsSummary() {
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR("/api/employees?status=active", fetcher);

  const metrics = useMemo(() => {
    // API returns { data: [...], pagination: {...} }
    const employeeList = data?.data || (Array.isArray(data) ? data : []);
    if (!employeeList.length || !session?.user?.id) return null;
    const me = session.user.id as string;
    const employees: any[] = employeeList;
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
      const startDate = e.startDate ? new Date(e.startDate) : null;
      return startDate && !Number.isNaN(startDate.getTime())
        ? startDate >= startOfMonth
        : false;
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


function TeamInsights() {
  const { data, error, isLoading } = useSWR(
    `/api/employees?status=active`,
    fetcher,
  );

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
        />
      )}
    </DashboardWidget>
  );
}

interface ManagerDashboardClientProps {
  firstName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export default function ManagerDashboardClient({
  firstName,
  fullName,
  avatarUrl,
}: ManagerDashboardClientProps) {
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

  const title = firstName ? `Hi, ${firstName}!` : "Manager Dashboard";

  return (
    <div className="h-full">
      <div className="relative z-10 flex flex-col w-full h-full overflow-y-auto">
        {/* Compact Hero Header */}
        <div className="p-4">
          <div className="glass-premium rounded-2xl shadow-premium p-5 hover-lift-premium transition-premium">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-1.5 bg-gradient-to-br from-primary to-[hsl(var(--sunset-2))] rounded-full opacity-60 blur-md" />
                  <Avatar
                    src={avatarUrl ?? undefined}
                    name={fullName ?? firstName ?? "User"}
                    size={56}
                    className="relative border-2 border-white shadow-premium"
                  />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-primary">{title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dashboard &rsaquo; Manager
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                <div className="relative">
                  <input
                    aria-label="Search team"
                    type="text"
                    placeholder="Search team"
                    className="w-full sm:w-64 glass-subtle rounded-2xl border-white/20 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-premium"
                  />
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                </div>
                {employeeId && (
                  <Link href={`/employees/${employeeId}/overview`}>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">
                      <User className="h-4 w-4 mr-2" /> View Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Bento Grid */}
        <div className="flex-1 p-4 pt-0">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {/* Top row - 3 equal cards that stretch full width */}
            <EnhancedWidget size="small" delay={0.1} className="xl:col-span-1">
              <MetricsSummary />
            </EnhancedWidget>

            <EnhancedWidget size="small" delay={0.15} className="xl:col-span-1">
              <TeamAbsenceOverview />
            </EnhancedWidget>

            <EnhancedWidget size="small" delay={0.2} className="xl:col-span-1">
              <TeamInsights />
            </EnhancedWidget>
          </div>
          
          {/* Bottom section - 2 column grid for Action Items and News */}
          <div className="grid gap-4 grid-cols-1 xl:grid-cols-2 mt-4">
            <EnhancedWidget size="wide" delay={0.25}>
              <UnifiedActionItems employeeId={employeeId} isManager={true} />
            </EnhancedWidget>

            <EnhancedWidget size="wide" delay={0.3}>
              <NewsWidget limit={3} />
            </EnhancedWidget>
          </div>
        </div>
      </div>
    </div>
  );
}
