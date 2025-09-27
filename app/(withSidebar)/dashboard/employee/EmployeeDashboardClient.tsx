"use client";

import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Calendar, User, Receipt, Bell } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { Skeleton } from "@/components/ui/Skeleton";

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
  // Use employee-scoped onboarding instances endpoint
  const { data, error, isLoading } = useSWR(
    employeeId ? `/api/onboarding/instances/employee/${employeeId}` : null,
    fetcher,
  );
  // API returns a list of instances; each has OnboardingStepInstance
  const instances = Array.isArray(data) ? data : [];
  const steps = instances.flatMap((inst: any) =>
    Array.isArray(inst?.OnboardingStepInstance) ? inst.OnboardingStepInstance : [],
  );

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
  const docs = Array.isArray(data) ? data : [];

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
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents awaiting action.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.slice(0, 5).map((d: any) => (
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

function DocumentActionItems({ employeeId }: { employeeId: string }) {
  const { data: employeeDocs, error: errEmp, isLoading: loadingEmp } = useSWR(
    employeeId ? `/api/documents/list-employee?employeeId=${employeeId}` : null,
    fetcher,
  );
  const { data: companyDocs, error: errCo, isLoading: loadingCo } = useSWR(
    `/api/documents/list-company`,
    fetcher,
  );

  const [pendingAck, setPendingAck] = React.useState<Array<{ id: string; name: string }>>([]);
  const [pendingSign, setPendingSign] = React.useState<Array<{ id: string; name: string }>>([]);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    const run = async () => {
      if (loadingEmp || loadingCo) return;
      const all = [...(Array.isArray(employeeDocs) ? employeeDocs : []), ...(Array.isArray(companyDocs) ? companyDocs : [])];
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
  }, [employeeDocs, companyDocs, loadingEmp, loadingCo]);

  const loadingAny = loadingEmp || loadingCo || checking;

  return (
    <DashboardWidget title="Action Items" icon={Bell}>
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

function QuickActions({ employeeId }: { employeeId?: string }) {
  return (
    <DashboardWidget title="Quick Actions" icon={User}>
      <div className="flex flex-wrap gap-2">
        {employeeId && (
          <Link
            href={`/employees/${employeeId}/leave`}
            aria-label="Book Leave"
          >
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Book Leave
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
      {employeeId && <DocumentActionItems employeeId={employeeId} />}
      {employeeId && <MyDocuments employeeId={employeeId} />}
      <QuickActions employeeId={employeeId} />
      <WellbeingSpotlight />
    </>
  );
}
