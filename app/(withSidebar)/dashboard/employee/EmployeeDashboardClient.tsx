"use client";

import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Calendar, User, Receipt, Bell } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function UpcomingLeave({ employeeId }: { employeeId: string }) {
  const { data, error, isLoading } = useSWR(
    employeeId
      ? `/api/employees/${employeeId}/leave-requests?upcoming=true&limit=3`
      : null,
    fetcher,
  );

  const items = Array.isArray(data) ? data : [];

  return (
    <DashboardWidget
      title="Upcoming Leave"
      icon={Calendar}
      action={
        <Link href="/employees" className="text-sm underline">
          View all leave
        </Link>
      }
    >
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load." />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming leave.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((lr: any) => (
            <li key={lr.id} className="text-sm">
              <span className="font-medium">{lr.eventCategory?.name}</span>
              <span className="text-muted-foreground">
                {" "}
                — {new Date(lr.startDate).toLocaleDateString()} to{" "}
                {new Date(lr.endDate).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}

function PendingTasks({ employeeId }: { employeeId: string }) {
  const { data, error, isLoading } = useSWR(
    `/api/onboarding/instances/${employeeId}`,
    fetcher,
  );
  const steps = Array.isArray(data?.steps) ? data.steps : [];

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
              <li
                key={s.id}
                className="text-sm flex items-center justify-between"
              >
                <span>{s.label}</span>
                <Link href={`/onboarding`} className="text-xs underline">
                  Complete
                </Link>
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
    fetcher,
  );

  return (
    <DashboardWidget
      title="My Documents"
      icon={Receipt}
      action={
        <Link href="/documents" className="text-sm underline">
          View all documents
        </Link>
      }
    >
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load documents." />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents awaiting action.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 5).map((d: any) => (
            <li
              key={d.id}
              className="text-sm flex items-center justify-between"
            >
              <span>{d.name}</span>
              <Link href={`/documents`} className="text-xs underline">
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
}

function QuickActions({ employeeId }: { employeeId?: string }) {
  return (
    <DashboardWidget title="Quick Actions" icon={User}>
      <div className="flex flex-wrap gap-2">
        {employeeId && (
          <Link
            href={`/employees/${employeeId}/leave`}
            aria-label="Book Holiday"
          >
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Book Holiday
            </Button>
          </Link>
        )}
        <Link href="/profile" aria-label="View Profile">
          <Button variant="outline" size="sm">
            <User className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        </Link>
      </div>
    </DashboardWidget>
  );
}

function WellbeingSpotlight() {
  const { data, error, isLoading } = useSWR("/api/wellbeing/tips", fetcher);
  if (error) return null;
  return (
    <DashboardWidget title="Wellbeing Spotlight" icon={Bell}>
      {isLoading ? (
        <WidgetLoading />
      ) : Array.isArray(data) && data.length > 0 ? (
        <ul className="space-y-2">
          {data.slice(0, 3).map((tip: any, idx: number) => (
            <li key={idx} className="text-sm">
              {tip.title ?? tip.text ?? String(tip)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Stay healthy and productive.
        </p>
      )}
    </DashboardWidget>
  );
}

export default function EmployeeDashboardClient({
  employeeId,
}: {
  employeeId?: string;
}) {
  return (
    <>
      {employeeId && <UpcomingLeave employeeId={employeeId} />}
      {employeeId && <PendingTasks employeeId={employeeId} />}
      {employeeId && <MyDocuments employeeId={employeeId} />}
      <QuickActions employeeId={employeeId} />
      <WellbeingSpotlight />
    </>
  );
}
