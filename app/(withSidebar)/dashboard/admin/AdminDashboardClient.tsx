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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar Widget - spans 1 column */}
      <DashboardWidget title="Calendar" icon={CalendarCheck2} className="h-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Upcoming</h3>
          </div>
          <div className="space-y-3">
            {loadingWhosOff ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : whosOff.length === 0 ? (
              <p className="text-muted-foreground text-center">No upcoming events</p>
            ) : (
              <ul className="space-y-3">
                {whosOff
                  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                  .slice(0, 5)
                  .map((ev) => (
                    <li key={ev.id} className="flex items-center gap-3">
                      <Avatar size={32} name={ev.employee?.name} src={ev.employee?.profileImageUrl} />
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

      {/* Time Planner Widget - spans 1 column */}
      <DashboardWidget title="Time planner" icon={ClipboardList} className="h-full">
        <div className="flex flex-col items-center justify-center h-32">
          {loadingMetrics || !metrics ? (
            <div className="space-y-3 text-center">
              <Skeleton className="h-10 w-24 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          ) : (
            <>
              <div className="text-6xl font-light text-primary mb-2">{approvalsCount}</div>
              <div className="text-sm text-muted-foreground">days</div>
              <div className="text-sm font-medium text-foreground">Paid Time Off</div>
            </>
          )}
        </div>
      </DashboardWidget>

      {/* Action Items - spans 2 columns */}
      <div className="lg:col-span-2">
        <DashboardWidget title="Action items" icon={ClipboardList} className="h-full">
          <div className="space-y-3">
            {loadingMetrics || !metrics ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p className="text-2xl font-bold text-primary mb-1">{approvalsCount}</p>
                  <p className="text-sm text-muted-foreground">pending approvals</p>
                </div>
                <CompactApprovalsList 
                  scope={metrics?.canViewAllApprovals ? (approvalsScopeMy ? "my" : "all") : undefined} 
                  departmentId={selectedDepartment !== "all" ? selectedDepartment : undefined} 
                />
                <div className="pt-3 text-center">
                  <Link href="/dashboard/approvals" className="text-sm text-primary hover:text-primary/80 font-medium transition-smooth">
                    2 more items
                  </Link>
                </div>
              </>
            )}
          </div>
        </DashboardWidget>
      </div>

      {/* Attendance Widget - spans 2 columns */}
      <div className="lg:col-span-2">
        <DashboardWidget title="Attendance" icon={Users} className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-4 text-center">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className="space-y-2">
                  <div className="text-xs text-muted-foreground">{day}</div>
                  <div className={`text-lg font-semibold ${index === 1 ? 'text-primary bg-primary/10 rounded-lg py-1' : 'text-foreground'}`}>
                    {index === 0 ? 8 : index === 1 ? 9 : index === 2 ? 10 : index === 3 ? 11 : index === 4 ? 12 : index === 5 ? 13 : 14}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {index < 5 ? '09:00' : 'Not'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {index < 5 ? 'Start' : index === 5 ? 'Not' : 'Not'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardWidget>
      </div>

      {/* Modals */}
      <AddEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <AddDocumentModal open={addDocumentOpen} onClose={() => setAddDocumentOpen(false)} />
    </div>
  );
}
