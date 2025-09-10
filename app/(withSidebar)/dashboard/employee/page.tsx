// app/dashboard/employee/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { PageShell } from "@/components/ui/PageShell";
import DashboardGrid from "@/components/ui/DashboardGrid";
import LeaveBalanceWidget from "@/components/dashboard/LeaveBalanceWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import Button from "@/components/ui/Button";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { Calendar, User, Receipt, Bell } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useEmployeeId(userId?: string) {
  const { data } = useSWR(userId ? `/api/employees?userId=${userId}` : null, fetcher);
  return data?.[0]?.id as string | undefined;
}

function UpcomingLeave({ employeeId }: { employeeId: string }) {
  const { data, error, isLoading } = useSWR(
    employeeId ? `/api/employees/${employeeId}/leave-requests?upcoming=true&limit=3` : null,
    fetcher
  );

  return (
    <DashboardWidget title="Upcoming Leave" icon={Calendar} action={<Link href="/leave/request" className="text-sm underline">View all leave</Link>}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load." />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming leave.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((lr: any) => (
            <li key={lr.id} className="text-sm">
              <span className="font-medium">{lr.eventCategory?.name}</span>
              <span className="text-muted-foreground"> — {new Date(lr.startDate).toLocaleDateString()} to {new Date(lr.endDate).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}

function PendingTasks({ employeeId }: { employeeId: string }) {
  const { data, error, isLoading } = useSWR(`/api/onboarding/instances/${employeeId}`, fetcher);
  const steps = useMemo(() => data?.steps || [], [data]);

  return (
    <DashboardWidget title="Pending Tasks" icon={Bell}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load tasks." />
      ) : steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No outstanding tasks.</p>
      ) : (
        <ul className="space-y-2">
          {steps
            .filter((s: any) => s.status !== "completed")
            .slice(0, 5)
            .map((s: any) => (
              <li key={s.id} className="text-sm flex items-center justify-between">
                <span>{s.label}</span>
                <Link href={`/onboarding`} className="text-xs underline">Complete</Link>
              </li>
            ))}
        </ul>
      )}
    </DashboardWidget>
  );
}

function MyDocuments({ employeeId }: { employeeId: string }) {
  const { data, error, isLoading } = useSWR(
    `/api/documents/list-employee?employeeId=${employeeId}`,
    fetcher
  );

  return (
    <DashboardWidget title="My Documents" icon={Receipt} action={<Link href="/documents" className="text-sm underline">View all documents</Link>}>
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load documents." />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents awaiting action.</p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 5).map((d: any) => (
            <li key={d.id} className="text-sm flex items-center justify-between">
              <span>{d.name}</span>
              <Link href={`/documents`} className="text-xs underline">Open</Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}

function QuickActions() {
  return (
    <DashboardWidget title="Quick Actions" icon={User}>
      <div className="flex flex-wrap gap-2">
        <Link href="/leave/request" aria-label="Book Holiday">
          <Button variant="outline" size="sm"><Calendar className="w-4 h-4 mr-2" />Book Holiday</Button>
        </Link>
        <Link href="/profile" aria-label="View Profile">
          <Button variant="outline" size="sm"><User className="w-4 h-4 mr-2" />View Profile</Button>
        </Link>
        <Link href="/payroll/payslips" aria-label="Payslips">
          <Button variant="outline" size="sm"><Receipt className="w-4 h-4 mr-2" />Payslips</Button>
        </Link>
      </div>
    </DashboardWidget>
  );
}

function WellbeingSpotlight() {
  const { data, error, isLoading } = useSWR("/api/wellbeing/tips", fetcher);
  if (error) return null; // optional widget
  return (
    <DashboardWidget title="Wellbeing Spotlight" icon={Bell}>
      {isLoading ? (
        <WidgetLoading />
      ) : Array.isArray(data) && data.length > 0 ? (
        <ul className="space-y-2">
          {data.slice(0, 3).map((tip: any, idx: number) => (
            <li key={idx} className="text-sm">{tip.title ?? tip.text ?? String(tip)}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Stay healthy and productive.</p>
      )}
    </DashboardWidget>
  );
}

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const employeeId = useEmployeeId(session?.user?.id);

  return (
    <PageShell
      title="Employee Dashboard"
      breadcrumbs={{ items: [{ label: "Dashboard", href: "/dashboard" }, { label: "Employee" }] }}
    >
      <DashboardGrid>
        {employeeId && <LeaveBalanceWidget employeeId={employeeId} />}
        {employeeId && <UpcomingLeave employeeId={employeeId} />}
        <NewsWidget limit={5} />
        {employeeId && <PendingTasks employeeId={employeeId} />}
        {employeeId && <MyDocuments employeeId={employeeId} />}
        <QuickActions />
        <WellbeingSpotlight />
      </DashboardGrid>
    </PageShell>
  );
}
