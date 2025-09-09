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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import AddDocumentModal from "@/components/documents/AddDocumentModal";

interface AdminDashboardClientProps {
  employeeId: string;
  firstName: string;
}

export default function AdminDashboardClient({
  employeeId,
  firstName,
}: AdminDashboardClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
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
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | "all">("all");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoadingMetrics(true);
      try {
        const res = await fetch(
          `/api/dashboard/metrics${selectedDepartment !== "all" ? `?departmentId=${selectedDepartment}` : ""}`,
          { cache: "no-store" }
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
      ...(selectedDepartment !== "all" ? { departmentId: selectedDepartment } : {}),
    }).toString();
    const load = async () => {
      setLoadingWhosOff(true);
      try {
        const res = await fetch(`/api/calendar-events?${params}`, { cache: "no-store" });
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
          if (isMounted) setDepartments(items.map((d: any) => ({ id: d.id, name: d.name })));
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
    return approvalsScopeMy ? metrics.pendingApprovals.my : metrics.pendingApprovals.all ?? 0;
  }, [metrics, approvalsScopeMy]);

  function CompactApprovalsList({ scope, departmentId }: { scope?: "my" | "all"; departmentId?: string }) {
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
          const res = await fetch(`/api/leave-request?${qs.toString()}`, { cache: "no-store" });
          const data = await res.json();
          if (active) setItems(data?.success ? data.data : []);
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
        const res = await fetch(`/api/leave-request/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
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
      return <p className="text-xs text-muted-foreground text-center">No pending items</p>;
    }
    return (
      <ul className="space-y-2">
        {items.map((it) => {
          const name = it.employee?.user?.name || `${it.employee?.user?.firstName ?? ""} ${it.employee?.user?.lastName ?? ""}`.trim();
          return (
            <li key={it.id} className="flex items-center justify-between gap-3 text-left">
              <Avatar size={28} name={name} src={it.employee?.user?.profileImageUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {it.eventCategory?.name} • {new Date(it.startDate).toLocaleDateString()} → {new Date(it.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => action(it.id, "decline")}>Decline</Button>
                <Button size="sm" onClick={() => action(it.id, "approve")}>Approve</Button>
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Quick Actions Widget - spans 1 column */}
      <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">
        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                if (label === "Add Employee") setModalOpen(true);
                if (label === "Add Document") setAddDocumentOpen(true);
              }}
              className="flex flex-col items-center justify-center glass-subtle border-glass rounded-2xl p-3 hover-glass transition-glass hover-lift group"
            >
              <Icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-smooth" />
              <span className="text-xs font-medium text-foreground text-center">{label}</span>
            </button>
          ))}
        </div>
      </DashboardWidget>

      {/* Calendar Widget - spans 1 column */}
      <DashboardWidget title="Calendar" icon={CalendarCheck2} className="h-full">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Upcoming</h3>
          </div>
          <div className="space-y-2">
            {loadingWhosOff ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : whosOff.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm">No upcoming events</p>
            ) : (
              <ul className="space-y-2">
                {whosOff
                  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                  .slice(0, 4)
                  .map((ev) => (
                    <li key={ev.id} className="flex items-center gap-3">
                      <Avatar size={28} name={ev.employee?.name} src={ev.employee?.profileImageUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{ev.employee?.name ?? ev.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(ev.start).toLocaleDateString()} • {ev.reason || ev.title}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </DashboardWidget>

      {/* Recent Hires/Departures - Critical HR Admin Info */}
      <DashboardWidget title="Recent Activity" icon={UserPlus} className="h-full">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 glass-subtle rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">New Hires</span>
              </div>
              <span className="text-lg font-bold text-green-600">{metrics?.newStartersThisMonth || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 glass-subtle rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium">Pending Reviews</span>
              </div>
              <span className="text-lg font-bold text-amber-600">2</span>
            </div>
            <div className="flex items-center justify-between p-2 glass-subtle rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium">Expiring Docs</span>
              </div>
              <span className="text-lg font-bold text-red-600">3</span>
            </div>
            <div className="flex items-center justify-between p-2 glass-subtle rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">Training Due</span>
              </div>
              <span className="text-lg font-bold text-blue-600">5</span>
            </div>
          </div>
        </div>
      </DashboardWidget>

      {/* People Metrics Widget - spans 1 column */}
      <DashboardWidget title="People Metrics" icon={Users} className="h-full" action={(
        <div className="w-40">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}>
        <div className="space-y-3">
          {loadingMetrics || !metrics ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Employees</span>
                <span className="text-xl font-bold text-foreground">{metrics.headcount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Managers</span>
                <span className="text-xl font-bold text-foreground">{metrics.managers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">New Starters</span>
                <span className="text-xl font-bold text-primary">{metrics.newStartersThisMonth}</span>
              </div>
            </>
          )}
        </div>
      </DashboardWidget>

      {/* Action Items - spans 2 columns, positioned next to People Metrics */}
      <div className="lg:col-span-2">
        <DashboardWidget title="Action items" icon={ClipboardList} className="h-full" action={metrics?.canViewAllApprovals ? (
          <div className="flex items-center gap-2 text-xs">
            <span className={!approvalsScopeMy ? "text-foreground" : "text-muted-foreground"}>All</span>
            <Switch checked={approvalsScopeMy} onChange={setApprovalsScopeMy} />
            <span className={approvalsScopeMy ? "text-foreground" : "text-muted-foreground"}>My</span>
          </div>
        ) : undefined}>
          <div className="space-y-3">
            {loadingMetrics || !metrics ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary mb-1">{approvalsCount}</p>
                    <p className="text-xs text-muted-foreground">pending approvals</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/dashboard/approvals">
                      <Button size="sm" variant="outline">View All</Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const qs = new URLSearchParams({ status: "PENDING" });
                          if (metrics?.canViewAllApprovals) qs.set("scope", approvalsScopeMy ? "my" : "all");
                          if (selectedDepartment !== "all") qs.set("departmentId", selectedDepartment);
                          qs.set("limit", "5");
                          const res = await fetch(`/api/leave-request?${qs.toString()}`, { cache: "no-store" });
                          const data = await res.json();
                          if (!data?.success) return;
                          const first = data.data?.[0];
                          if (!first) return;
                          await fetch(`/api/leave-request/${first.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "approve" }),
                          });
                          const metricsRes = await fetch(`/api/dashboard/metrics${selectedDepartment !== "all" ? `?departmentId=${selectedDepartment}` : ""}`, { cache: "no-store" });
                          if (metricsRes.ok) setMetrics(await metricsRes.json());
                        } catch {}
                      }}
                    >
                      Quick Approve
                    </Button>
                  </div>
                </div>
                <CompactApprovalsList 
                  scope={metrics?.canViewAllApprovals ? (approvalsScopeMy ? "my" : "all") : undefined} 
                  departmentId={selectedDepartment !== "all" ? selectedDepartment : undefined} 
                />
              </>
            )}
          </div>
        </DashboardWidget>
      </div>

      {/* Modals */}
      <AddEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <AddDocumentModal open={addDocumentOpen} onClose={() => setAddDocumentOpen(false)} />
    </div>
  );
}
