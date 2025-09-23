"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import {
  Megaphone,
  FileText,
  Mail,
  Users,
  ClipboardList,
  CalendarCheck2,
  UserPlus,
} from "lucide-react";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import AddDocumentModal from "@/components/documents/AddDocumentModal";
import { StageTimeline } from "@/components/approvals/StageTimeline";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AdminDashboardClientProps {
  employeeId: string;
  firstName: string;
  section?: string;
}

export default function AdminDashboardClient({
  employeeId,
  firstName,
  section,
}: AdminDashboardClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<{
    headcount: number;
    managers: number;
    newStartersThisMonth: number;
    pendingApprovals: { my: number; all?: number };
    canViewAllApprovals: boolean;
  } | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [approvalsScopeMy, setApprovalsScopeMy] = useState(true);
  const [whosOff, setWhosOff] = useState<any[]>([]);
  const [loadingWhosOff, setLoadingWhosOff] = useState(true);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | "all">(
    "all",
  );

  useEffect(() => {
    const handler = (e: any) => setDetail(e.detail);
    window.addEventListener("open-leave-detail", handler as any);
    return () => window.removeEventListener("open-leave-detail", handler as any);
  }, []);

  const handleDetailOpenChange = (open: boolean) => {
    if (!open) {
      setDetail(null);
    }
  };

  const handleDetailAction = async (action: "approve" | "decline") => {
    const currentDetail = detail;
    if (!currentDetail) return;

    try {
      await fetch(`/api/leave-request/${currentDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          currentDetail?.myDecision?.id
            ? { action, decisionId: currentDetail.myDecision.id }
            : { action },
        ),
      });
    } finally {
      setDetail(null);
    }
  };

  const LeaveDetailDialog = () => (
    <Dialog open={Boolean(detail)} onOpenChange={handleDetailOpenChange}>
      {detail ? (
        <DialogContent
          title="Leave request"
          description={[detail.employee?.department, detail.type]
            .filter(Boolean)
            .join(" • ") || undefined}
          actions={
            <>
              <Button variant="outline" onClick={() => handleDetailAction("decline")}>
                Decline
              </Button>
              <Button onClick={() => handleDetailAction("approve")}>
                Approve
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar
                size={36}
                name={detail.employee?.user?.name}
                src={detail.employee?.user?.profileImageUrl}
              />
              <div>
                <div className="font-medium">{detail.employee?.user?.name}</div>
                <div className="text-xs text-muted-foreground">{detail.type}</div>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <div>
                Dates: {new Date(detail.startDate).toLocaleDateString()} →{" "}
                {new Date(detail.endDate).toLocaleDateString()}
              </div>
              {detail.reason && <div>Reason: {detail.reason}</div>}
              {detail.employee?.department && (
                <div>Department: {detail.employee.department}</div>
              )}
            </div>
            {Array.isArray(detail.approvalStages) ? (
              <div>
                <StageTimeline stages={detail.approvalStages} />
              </div>
            ) : null}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
  
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoadingMetrics(true);
      try {
        const res = await fetch(
          `/api/dashboard/metrics${selectedDepartment !== "all" ? `?departmentId=${selectedDepartment}` : ""}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setMetrics(data);
        }
      } finally {
        if (isMounted) setLoadingMetrics(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedDepartment]);

  useEffect(() => {
    let isMounted = true;
    const today = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(today.getDate() + 30);
    const params = new URLSearchParams({
      from: today.toISOString(),
      to: weekAhead.toISOString(),
      ...(selectedDepartment !== "all"
        ? { departmentId: selectedDepartment }
        : {}),
    }).toString();
    const load = async () => {
      setLoadingWhosOff(true);
      try {
        const res = await fetch(`/api/calendar-events?${params}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setWhosOff(data);
        }
      } finally {
        if (isMounted) setLoadingWhosOff(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedDepartment]);

  useEffect(() => {
    let isMounted = true;
    const loadDepts = async () => {
      try {
        const res = await fetch("/api/departments", { cache: "no-store" });
        if (res.ok) {
          const items = await res.json();
          if (isMounted)
            setDepartments(items.map((d: any) => ({ id: d.id, name: d.name })));
        }
      } catch {}
    };
    loadDepts();
    return () => {
      isMounted = false;
    };
  }, []);

  const approvalsCount = useMemo(() => {
    if (!metrics) return 0;
    if (!metrics.canViewAllApprovals) return metrics.pendingApprovals.my;
    return approvalsScopeMy
      ? metrics.pendingApprovals.my
      : (metrics.pendingApprovals.all ?? 0);
  }, [metrics, approvalsScopeMy]);

  function CompactApprovalsList({
    scope,
    departmentId,
  }: {
    scope?: "my" | "all";
    departmentId?: string;
  }) {
    const [items, setItems] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        try {
          const qs = new URLSearchParams({ status: "PENDING", limit: "5" });
          if (scope) qs.set("scope", scope);
          if (departmentId) qs.set("departmentId", departmentId);
          const res = await fetch(`/api/leave-request?${qs.toString()}`, {
            cache: "no-store",
          });
          const data = await res.json();
          const parsed = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : [];
          if (active) setItems(parsed);
        } catch {
          if (active) setItems([]);
        } finally {
          if (active) setLoading(false);
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [scope, departmentId]);

    const action = async (id: string, action: "approve" | "decline") => {
      try {
        const item = items?.find((i) => i.id === id);
        const res = await fetch(`/api/leave-request/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item?.myDecision?.id ? { action, decisionId: item.myDecision.id } : { action }),
        });
        if (res.ok) {
          toast.success(action === "approve" ? "Approved" : "Declined");
          setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
        } else {
          const data = await res.json();
          toast.error(data?.error || "Action failed");
        }
      } catch {
        toast.error("Action failed");
      }
    };

    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      );
    }
    if (!items || items.length === 0) {
      return (
        <p className="text-xs text-muted-foreground text-center">
          No pending items
        </p>
      );
    }
    return (
      <ul className="space-y-2">
        {items.map((it) => {
          const name =
            it.employee?.user?.name ||
            `${it.employee?.user?.firstName ?? ""} ${it.employee?.user?.lastName ?? ""}`.trim();
          return (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 text-left hover:bg-muted/40 rounded-lg px-2 py-1 cursor-pointer"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/leave-request/${it.id}`);
                  const data = await res.json();
                  if (data?.success) {
                    window.dispatchEvent(
                      new CustomEvent("open-leave-detail", { detail: data.data }),
                    );
                  }
                } catch {}
              }}
            >
              <Avatar
                size={28}
                name={name}
                src={it.employee?.user?.profileImageUrl}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(it.eventCategory?.name || it.type)} •{" "}
                  {new Date(it.startDate).toLocaleDateString()} →{" "}
                  {new Date(it.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => action(it.id, "decline")}
                >
                  Decline
                </Button>
                <Button size="sm" onClick={() => action(it.id, "approve")}>
                  Approve
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  const actions = [
    { label: "Post News", icon: FileText },
    { label: "Add Employee", icon: UserPlus },
    { label: "Add Document", icon: FileText },
    { label: "Email Employee", icon: Mail },
  ];

  // Quick Actions Section
  if (section === "quick-actions") {
    return (
      <>
        <DashboardWidget
          title="Quick Actions"
          icon={Megaphone}
          className="h-full"
        >
          <div className="grid grid-cols-2 gap-3">
            {actions.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => {
                  if (label === "Add Employee") setModalOpen(true);
                  if (label === "Add Document") setAddDocumentOpen(true);
                }}
                className="flex flex-col items-center justify-center glass-subtle border-glass rounded-2xl p-4 hover-glass transition-glass hover-lift group"
              >
                <Icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-smooth" />
                <span className="text-sm font-medium text-foreground text-center">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </DashboardWidget>
        <AddEmployeeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
        <AddDocumentModal
          open={addDocumentOpen}
          onClose={() => setAddDocumentOpen(false)}
        />
      </>
    );
  }

  // Calendar Section
  if (section === "calendar") {
    return (
      <DashboardWidget
        title="Calendar"
        icon={CalendarCheck2}
        className="h-full"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
          </div>
          <div className="space-y-2">
            {loadingWhosOff ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : whosOff.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm">
                No upcoming events
              </p>
            ) : (
              <ul className="space-y-2">
                {whosOff
                  .sort(
                    (a, b) =>
                      new Date(a.start).getTime() - new Date(b.start).getTime(),
                  )
                  .slice(0, 4)
                  .map((ev) => (
                    <li key={ev.id} className="flex items-center gap-3">
                      <Avatar
                        size={32}
                        name={ev.employee?.name}
                        src={ev.employee?.profileImageUrl}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {ev.employee?.name ?? ev.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(ev.start).toLocaleDateString()} •{" "}
                          {ev.reason || ev.title}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </DashboardWidget>
    );
  }

  // People Metrics Section
  if (section === "people-metrics") {
    return (
      <DashboardWidget title="People Metrics" icon={Users} className="h-full">
        <div className="space-y-4">
          {/* Department Filter */}
          <div className="mb-4">
            <Select
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
            >
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingMetrics || !metrics ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-5/6" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Active Employees
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {metrics.headcount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Managers</span>
                <span className="text-2xl font-bold text-foreground">
                  {metrics.managers}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  New Starters
                </span>
                <span className="text-2xl font-bold text-primary">
                  {metrics.newStartersThisMonth}
                </span>
              </div>
            </div>
          )}
        </div>
      </DashboardWidget>
    );
  }

  // News Section
  if (section === "news") {
    return (
      <div className="h-full flex flex-col">
        <NewsWidget />
      </div>
    );
  }

  // Action Items Section
  if (section === "action-items") {
    return (
      <div className="h-full flex flex-col">
        <DashboardWidget
          title="Action items"
          icon={ClipboardList}
          className="h-full flex flex-col"
          action={
            metrics?.canViewAllApprovals ? (
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={
                    !approvalsScopeMy
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  All
                </span>
                <Switch
                  checked={approvalsScopeMy}
                  onChange={setApprovalsScopeMy}
                />
                <span
                  className={
                    approvalsScopeMy
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  My
                </span>
              </div>
            ) : undefined
          }
        >
          <div className="flex-1 flex flex-col space-y-3 min-h-0">
            {loadingMetrics || !metrics ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary mb-1">
                      {approvalsCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      pending approvals
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/dashboard/approvals">
                      <Button size="sm" variant="outline">
                        View All
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={async () => {
                        try {
                          const qs = new URLSearchParams({ status: "PENDING" });
                          if (metrics?.canViewAllApprovals)
                            qs.set("scope", approvalsScopeMy ? "my" : "all");
                          if (selectedDepartment !== "all")
                            qs.set("departmentId", selectedDepartment);
                          qs.set("limit", "5");
                          const res = await fetch(
                            `/api/leave-request?${qs.toString()}`,
                            { cache: "no-store" },
                          );
                          const data = await res.json();
                          if (!data?.success) return;
                          const first = data.data?.[0];
                          if (!first) return;
                          await fetch(`/api/leave-request/${first.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(first?.myDecision?.id ? { action: "approve", decisionId: first.myDecision.id } : { action: "approve" }),
                          });
                          const metricsRes = await fetch(
                            `/api/dashboard/metrics${selectedDepartment !== "all" ? `?departmentId=${selectedDepartment}` : ""}`,
                            { cache: "no-store" },
                          );
                          if (metricsRes.ok)
                            setMetrics(await metricsRes.json());
                        } catch {}
                      }}
                    >
                      Quick Approve
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  <CompactApprovalsList
                    scope={
                      metrics?.canViewAllApprovals
                        ? approvalsScopeMy
                          ? "my"
                          : "all"
                        : undefined
                    }
                    departmentId={
                      selectedDepartment !== "all"
                        ? selectedDepartment
                        : undefined
                    }
                  />
                </div>
              </>
            )}
          </div>
        </DashboardWidget>
        <LeaveDetailDialog />
      </div>
    );
  }

  // Default fallback - should not happen
  return null;
}
