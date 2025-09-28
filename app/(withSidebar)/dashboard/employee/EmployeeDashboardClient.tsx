"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Calendar, User, Bell } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

function ActionItems({ employeeId }: { employeeId: string }) {
  // Onboarding tasks
  const { data, error, isLoading } = useSWR(
    employeeId ? `/api/onboarding/instances/employee/${employeeId}` : null,
    fetcher,
  );
  const instances = Array.isArray(data) ? data : [];
  const steps = instances.flatMap((inst: any) =>
    Array.isArray(inst?.OnboardingStepInstance) ? inst.OnboardingStepInstance : [],
  );

  // Document acknowledgements
  const { data: employeeDocs, isLoading: loadingEmp } = useSWR(
    employeeId ? `/api/documents/list-employee?employeeId=${employeeId}` : null,
    fetcher,
  );
  const { data: companyDocs, isLoading: loadingCo } = useSWR(
    `/api/documents/list-company`,
    fetcher,
  );
  const [pendingAck, setPendingAck] = useState<Array<{ id: string; name: string }>>([]);
  const [checking, setChecking] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<null | { id: string; name: string; url?: string }>(null);

  useEffect(() => {
    const run = async () => {
      if (loadingEmp || loadingCo) return;
      const all = [
        ...(Array.isArray(employeeDocs) ? employeeDocs : []),
        ...(Array.isArray(companyDocs) ? companyDocs : []),
      ];
      const map = new Map<string, any>();
      for (const d of all) if (d?.id && !map.has(d.id)) map.set(d.id, d);
      const docs = Array.from(map.values())
        .filter((d) => d?.requiresAck)
        .slice(0, 20);
      setChecking(true);
      try {
        const ack = await Promise.all(
          docs.map(async (d) => {
            try {
              const r = await fetch(`/api/documents/acknowledge/${d.id}/me`, { cache: "no-store" });
              const j = await r.json();
              return j?.acknowledged ? null : { id: d.id, name: d.name };
            } catch {
              return { id: d.id, name: d.name };
            }
          }),
        );
        setPendingAck(ack.filter(Boolean).slice(0, 5) as any);
      } finally {
        setChecking(false);
      }
    };
    run();
  }, [employeeDocs, companyDocs, loadingEmp, loadingCo]);

  const loadingAny = isLoading || loadingEmp || loadingCo || checking;

  return (
    <DashboardWidget title="Action Items" icon={Bell}>
      {loadingAny ? (
        <WidgetLoading />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">Tasks</div>
            {error ? (
              <WidgetError message="Failed to load tasks." />
            ) : steps.filter((s: any) => s.status !== "completed").length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding tasks.</p>
            ) : (
              <ul className="space-y-2">
                {steps
                  .filter((s: any) => s.status !== "completed")
                  .slice(0, 5)
                  .map((s: any) => (
                    <li key={s.id} className="text-sm flex items-center justify-between">
                      <span>{s.label}</span>
                      <Link href={`/onboarding`} className="text-xs underline">
                        Complete
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Read acknowledgements</div>
            {pendingAck.length === 0 ? (
              <p className="text-sm text-muted-foreground">No document acknowledgements pending.</p>
            ) : (
              <ul className="space-y-2">
                {pendingAck.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{d.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const allDocs = [
                          ...(Array.isArray(employeeDocs) ? employeeDocs : []),
                          ...(Array.isArray(companyDocs) ? companyDocs : []),
                        ];
                        const doc = allDocs.find((x: any) => x?.id === d.id);
                        setPreviewDoc({ id: d.id, name: d.name, url: doc?.url });
                        setPreviewOpen(true);
                      }}
                    >
                      Preview
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewDoc?.name || "Document"}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-3">
              {previewDoc.url ? (
                <div className="rounded border overflow-hidden">
                  <embed
                    src={(previewDoc.url || "") + "#toolbar=0&navpanes=0&scrollbar=1"}
                    type="application/pdf"
                    className="w-full h-[70vh]"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Preview not available.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    if (!previewDoc) return;
                    try {
                      await fetch("/api/documents/acknowledge", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ documentId: previewDoc.id }),
                      });
                    } finally {
                      setPendingAck((prev) => prev.filter((x) => x.id !== previewDoc.id));
                      setPreviewOpen(false);
                      setPreviewDoc(null);
                    }
                  }}
                >
                  Acknowledge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardWidget>
  );
}

// Removed separate MyDocuments widget; document acknowledgements are shown in ActionItems


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
      {employeeId && <ActionItems employeeId={employeeId} />}
      <QuickActions employeeId={employeeId} />
      <WellbeingSpotlight />
    </>
  );
}
