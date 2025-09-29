"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import {
  Megaphone,
  FileText,
  Users,
  ClipboardList,
  CalendarCheck2,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";
import { Dialog, DialogContent } from "@/components/ui/dialog";
 
function EntitlementProjection({
  employeeId,
  eventCategoryId,
  startDate,
  endDate,
}: {
  employeeId: string;
  eventCategoryId: string;
  startDate: string;
  endDate: string;
}) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [entsRes, dedRes] = await Promise.all([
          fetch(`/api/employees/${encodeURIComponent(employeeId)}/entitlement`, { cache: "no-store" }),
          fetch(`/api/employees/${encodeURIComponent(employeeId)}/leave-requests/preview-deduction?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, { cache: "no-store" }),
        ]);
        const ents = await entsRes.json();
        const ded = await dedRes.json().catch(() => ({ deduction: null }));
        const ent = Array.isArray(ents)
          ? ents.find((e: any) => e?.eventCategory?.id === eventCategoryId)
          : null;
        if (!ent || typeof ded?.deduction !== "number") {
          if (active) setText(null);
          return;
        }
        const after = (ent.totalDays - ent.usedDays - ded.deduction);
        if (active) setText(`Total entitlement after approved: ${after.toFixed(2)} days`);
      } catch {
        if (active) setText(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [employeeId, eventCategoryId, startDate, endDate]);
  return text ? <div className="text-xs text-muted-foreground">{text}</div> : null;
}


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
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
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
  const [docActionItems, setDocActionItems] = useState<{
    ack: Array<{ id: string; name: string }>;
    sign: Array<{ id: string; name: string }>;
    loading: boolean;
    urlMap?: Record<string, string | undefined>;
  }>({ ack: [], sign: [], loading: true, urlMap: {} });
  const [approvalItem, setApprovalItem] = useState<any | null>(null);
  const [docItem, setDocItem] = useState<{ id: string; name: string; url?: string } | null>(null);

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
  
  // ---------------- Documents Action Items (Ack & Sign) ----------------
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setDocActionItems((prev) => ({ ...prev, loading: true }));
        // Fetch documents visible to current user (company-scoped)
        const [companyDocsRes, employeeDocsRes] = await Promise.all([
          fetch(`/api/documents/list-company`, { cache: "no-store" }),
          employeeId
            ? fetch(`/api/documents/list-employee?employeeId=${employeeId}`, {
                cache: "no-store",
              })
            : Promise.resolve({ ok: false, json: async () => [] as any[] } as Response),
        ]);
        const companyDocs = companyDocsRes.ok
          ? ((await companyDocsRes.json()) as any[])
          : [];
        const employeeDocs = employeeDocsRes.ok
          ? ((await employeeDocsRes.json()) as any[])
          : [];
        const docs: any[] = [...companyDocs, ...employeeDocs];
        // De-duplicate by id
        const uniqueDocsMap = new Map<string, any>();
        for (const d of docs) {
          if (d && d.id && !uniqueDocsMap.has(d.id)) uniqueDocsMap.set(d.id, d);
        }
        const uniqueDocs = Array.from(uniqueDocsMap.values());

        // Limit to a reasonable number to avoid too many network calls
        const candidates = uniqueDocs
          .filter((d) => d?.requiresAck || d?.requiresSignature)
          .slice(0, 20);

        const ackChecks = await Promise.all(
          candidates.map(async (d) => {
            if (!d?.requiresAck) return { id: d.id, name: d.name, needed: false };
            try {
              const r = await fetch(`/api/documents/acknowledge/${d.id}/me`, {
                cache: "no-store",
              });
              const j = await r.json();
              return { id: d.id, name: d.name, needed: !j?.acknowledged };
            } catch {
              return { id: d.id, name: d.name, needed: true };
            }
          }),
        );

        const signChecks = await Promise.all(
          candidates.map(async (d) => {
            if (!d?.requiresSignature) return { id: d.id, name: d.name, needed: false };
            try {
              const r = await fetch(`/api/documents/signatures/${d.id}/me`, {
                cache: "no-store",
              });
              const j = await r.json();
              return { id: d.id, name: d.name, needed: !j?.signed };
            } catch {
              return { id: d.id, name: d.name, needed: true };
            }
          }),
        );

        if (!isMounted) return;
        const urlMap: Record<string, string | undefined> = {};
        uniqueDocs.forEach((d) => { if (d?.id) urlMap[d.id] = d.url; });
        setDocActionItems({
          ack: ackChecks.filter((x) => x.needed).slice(0, 5).map(({ id, name }) => ({ id, name })),
          sign: signChecks.filter((x) => x.needed).slice(0, 5).map(({ id, name }) => ({ id, name })),
          loading: false,
          urlMap,
        });
      } catch {
        if (!isMounted) return;
        setDocActionItems({ ack: [], sign: [], loading: false });
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [employeeId]);
  
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
          // Gather both leave approvals and transactional change requests
          const qs = new URLSearchParams({ status: "PENDING", limit: "5" });
          if (scope) qs.set("scope", scope);
          if (departmentId) qs.set("departmentId", departmentId);
          const [leaveRes, txnRes] = await Promise.all([
            fetch(`/api/approvals?${qs.toString()}`, { cache: "no-store" }),
            fetch(`/api/transactional-change-requests?scope=${scope === "all" ? "all" : "assigned"}`, { cache: "no-store" }),
          ]);
          const leaveData = await leaveRes.json().catch(() => ({}));
          const txnData = await txnRes.json().catch(() => ({}));
          const leaveItems = Array.isArray(leaveData?.items) ? leaveData.items : [];
          const txnItems = Array.isArray(txnData?.data)
            ? txnData.data.map((r: any) => {
                const empUser = r.Employee?.User || {};
                const reqUser = r.Requester || {};
                const employeeDisplayName = (empUser.name && empUser.name.trim()) || `${empUser.firstName ?? ""} ${empUser.lastName ?? ""}`.trim() || empUser.email || "Employee";
                const actorDisplayName = (reqUser.name && reqUser.name.trim()) || `${reqUser.firstName ?? ""} ${reqUser.lastName ?? ""}`.trim() || reqUser.email || "Unknown";
                return {
                  id: r.id,
                  type: `Change: ${r.section}`,
                  employee: { user: empUser },
                  employeeDisplayName,
                  actor: reqUser,
                  actorDisplayName,
                  actorAvatarUrl: reqUser.profileImageUrl || null,
                  diffs: r.diffs,
                  reasons: r.reasons,
                  source: "txn",
                };
              })
            : [];
          // Sign profile image URLs for avatars when needed
          const signedCache = new Map<string, string>();
          async function signByUser(userId?: string | null): Promise<string | null> {
            if (!userId) return null;
            if (signedCache.has(userId)) return signedCache.get(userId)!;
            try {
              const r = await fetch(`/api/users/${encodeURIComponent(userId)}/profile-image`);
              const j = await r.json().catch(() => ({}));
              const url = j?.url ?? null;
              if (url) signedCache.set(userId, url);
              return url;
            } catch {
              return null;
            }
          }
          // sign actor avatars for txn items
          for (const it of txnItems) {
            // Try requester id first
            if (!it.actorAvatarUrl && it.actor?.id) {
              it.actorAvatarUrl = await signByUser(it.actor.id);
            }
            // fallback: employee user id
            if (!it.actorAvatarUrl && (it.employee?.user as any)?.id) {
              const fallback = await signByUser((it.employee?.user as any).id);
              if (fallback) it.actorAvatarUrl = fallback;
            }
          }
          // Map leave items into modal-friendly structure
          const normalizedLeave = leaveItems.map((r: any) => {
            const name = r?.employee?.name || r?.title?.split(" — ")?.[0] || "Employee";
            const employeeUserId = r?.employee?.userId ?? null;
            const initial: any = {
              id: r.id,
              type: r.typeName || r.type || "Leave",
              employee: { user: { name } },
              employeeDisplayName: name,
              dates: r.dates || r.subtitle,
              // entitlement projection inputs
              employeeId: r.employeeId,
              eventCategoryId: r.eventCategoryId,
              startDate: r.startDate,
              endDate: r.endDate,
              employeeUserId,
              mode: "leave",
              source: "leave",
            };
            return initial;
          });
          // sign avatars for leave items using employee userId
          for (const it of normalizedLeave) {
            if (!it.actorAvatarUrl && it.employeeUserId) {
              const url = await signByUser(it.employeeUserId);
              if (url) it.actorAvatarUrl = url;
            }
          }
          const merged = [...txnItems, ...normalizedLeave].slice(0, 5);
          if (active) setItems(merged);
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
        // Try leave approvals first; if 404, try transactional
        let res = await fetch(`/api/approvals/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
        if (res.status === 404) {
          res = await fetch(`/api/transactional-change-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, comment: action === "decline" ? "Declined from dashboard" : undefined }) });
        }
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
          const name = it.employeeDisplayName ||
            it.employee?.user?.name ||
            `${it.employee?.user?.firstName ?? ""} ${it.employee?.user?.lastName ?? ""}`.trim();
          return (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 text-left hover:bg-muted/40 rounded-lg px-2 py-1 cursor-pointer"
              onClick={async () => {
                // Open inline modal with diff preview when it's a transactional item
                if (it.source === "txn") {
                  setApprovalItem({
                    id: it.id,
                    employee: { name },
                    employeeDisplayName: it.employeeDisplayName,
                    type: it.type,
                    diffs: it.diffs,
                    mode: "txn",
                    actorDisplayName: it.actorDisplayName,
                    actorAvatarUrl: it.actorAvatarUrl,
                  });
                  return;
                }
                // Leave approval: open inline modal with essential details
                setApprovalItem({
                  id: it.id,
                  employee: { name },
                  employeeDisplayName: it.employeeDisplayName,
                  type: it.type || "Leave",
                  dates: it.dates,
                  employeeId: it.employeeId,
                  eventCategoryId: it.eventCategoryId,
                  startDate: it.startDate,
                  endDate: it.endDate,
                  mode: "leave",
                });
              }}
            >
              <Avatar
                size={28}
                name={(it.actorDisplayName || it.actor?.name || name)}
                src={(it.actorAvatarUrl ?? undefined) as any}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {it.type ?? "Approval"}
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
    { label: "Edit Employee", icon: Users },
  ];

  // ---------------- Edit Employee Dialog state & helpers ----------------
  const [employeesForEdit, setEmployeesForEdit] = useState<any[] | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<any | null>(null);

  useEffect(() => {
    if (!editEmployeeOpen) return;
    let active = true;
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch("/api/employees?status=all", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active) setEmployeesForEdit(Array.isArray(data) ? data : []);
        } else {
          if (active) setEmployeesForEdit([]);
        }
      } catch {
        if (active) setEmployeesForEdit([]);
      } finally {
        if (active) setLoadingEmployees(false);
      }
    };
    loadEmployees();
    return () => {
      active = false;
    };
  }, [editEmployeeOpen]);

  const employeeOptions = useMemo(() => {
    if (!employeesForEdit) return [] as { id: string; label: string }[];
    return employeesForEdit.map((e: any) => {
      const id = e.id || e.employeeId;
      const first = e.firstName || e.User?.firstName || "";
      const last = e.lastName || e.User?.lastName || "";
      const email = e.email || e.User?.email || "";
      const label = `${first} ${last}`.trim() || email || id;
      return { id, label };
    });
  }, [employeesForEdit]);

  const getEmployeeDisplay = (e: any) => {
    const first = e.firstName || e.User?.firstName || "";
    const last = e.lastName || e.User?.lastName || "";
    const email = e.email || e.User?.email || "";
    const name = `${first} ${last}`.trim() || email || "Unknown";
    const avatar = e.User?.profileImageUrl || e.profileImageUrl;
    const sub = e.departmentName || e.JobRole?.name || e.jobRoleName || e.User?.JobRole?.name || email;
    return { name, email, avatar, sub };
  };

  const employeeScreens = (employeeId: string) => [
    { label: "Overview", href: `/employees/${employeeId}/overview` },
    { label: "Personal Information", href: `/employees/${employeeId}/personal-information` },
    { label: "Employment Details", href: `/employees/${employeeId}/employment-details` },
    { label: "Bank & Payroll", href: `/employees/${employeeId}/bank-payroll` },
    { label: "Emergency Contacts", href: `/employees/${employeeId}/emergency-contacts` },
    { label: "Documents", href: `/employees/${employeeId}/documents` },
    { label: "Leave", href: `/employees/${employeeId}/leave` },
    { label: "Performance", href: `/employees/${employeeId}/performance` },
    { label: "Training", href: `/employees/${employeeId}/training` },
    { label: "Driver Licenses", href: `/employees/${employeeId}/driver-licenses` },
    { label: "Employment Checks", href: `/employees/${employeeId}/employment-checks` },
    { label: "Onboarding", href: `/employees/${employeeId}/onboarding` },
    { label: "Offboarding", href: `/employees/${employeeId}/offboarding` },
    { label: "Settings", href: `/employees/${employeeId}/settings` },
  ];

  const resetEditEmployeeDialog = () => {
    setSelectedEmployeeId("");
    setSelectedEmployeeForEdit(null);
  };

  // (Dialog inlined below to avoid remounting per keystroke)

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
                  if (label === "Post News") router.push("/news/create");
                  if (label === "Add Employee") setModalOpen(true);
                  if (label === "Add Document") setAddDocumentOpen(true);
                  if (label === "Edit Employee") setEditEmployeeOpen(true);
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
        <Dialog
          open={editEmployeeOpen}
          onOpenChange={(open) => {
            setEditEmployeeOpen(open);
            if (!open) resetEditEmployeeDialog();
          }}
        >
          <DialogContent
            title={selectedEmployeeForEdit ? "Choose a screen" : "Edit Employee"}
            description={
              selectedEmployeeForEdit
                ? "Select a screen to edit for this employee"
                : "Choose an employee to edit"
            }
          >
            {!selectedEmployeeForEdit ? (
              <div className="space-y-3">
                {loadingEmployees ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                ) : (
                  <>
                    <Select value={selectedEmployeeId} onValueChange={(v) => setSelectedEmployeeId(v)}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeOptions.slice(0, 200).map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end">
                      <Button
                        disabled={!selectedEmployeeId}
                        onClick={() => {
                          const selected = employeesForEdit?.find(
                            (e: any) => (e.id || e.employeeId) === selectedEmployeeId,
                          );
                          if (selected) setSelectedEmployeeForEdit(selected);
                        }}
                      >
                        Continue
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedEmployeeForEdit(null)}>
                      Back
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getEmployeeDisplay(selectedEmployeeForEdit).name}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {employeeScreens(selectedEmployeeForEdit.id).map((s) => (
                    <Button
                      key={s.href}
                      variant="outline"
                      className="justify-start"
                      onClick={() => {
                        router.push(s.href);
                        setEditEmployeeOpen(false);
                        resetEditEmployeeDialog();
                      }}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
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
                <div className="flex items-center justify-between mb-3 flex-shrink-0 flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary mb-1">
                        {approvalsCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        pending approvals
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="px-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                      icon={<ArrowRight className="w-4 h-4" />}
                      iconPosition="end"
                    >
                      <Link href="/dashboard/approvals">View All</Link>
                    </Button>
                  </div>
                  <div className="flex items-center">
                    <Button
                      size="sm"
                      className="whitespace-nowrap shadow-none hover:shadow-none"
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
              {/* Documents subsection inside Action items */}
              <div className="border-t pt-3 mt-3">
                {docActionItems.loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : docActionItems.ack.length === 0 && docActionItems.sign.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No document actions pending</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold mb-2">Read acknowledgements</div>
                      <ul className="space-y-2">
                        {docActionItems.ack.map((d) => (
                          <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{d.name}</span>
                            <Button size="sm" variant="outline" onClick={() => setDocItem({ id: d.id, name: d.name, url: docActionItems.urlMap?.[d.id] })}>Open</Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {docActionItems.sign.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold mb-2">Signatures</div>
                        <ul className="space-y-2">
                          {docActionItems.sign.map((d) => (
                            <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="truncate">{d.name}</span>
                              <Button size="sm" variant="outline" onClick={() => setDocItem({ id: d.id, name: d.name, url: docActionItems.urlMap?.[d.id] })}>Open</Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        </DashboardWidget>
        {/* Inline Approval Modal */}
        {approvalItem ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="glass rounded-2xl w-full max-w-xl border border-glass p-4 shadow-depth-2 bg-background">
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-semibold">Approve request</div>
                <button className="text-sm text-muted-foreground" onClick={() => setApprovalItem(null)}>Close</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar
                    size={40}
                    name={(approvalItem.actorDisplayName || approvalItem.actor?.name || approvalItem.employee?.name || "?")}
                    src={(approvalItem.actorAvatarUrl ?? undefined) as any}
                  />
                  <div>
                    <div className="font-medium">{approvalItem.type ?? "Request"}</div>
                    <div className="text-muted-foreground text-xs">
                      Requested by {approvalItem.actorDisplayName || approvalItem.actor?.name || "Someone"}
                      {approvalItem.employeeDisplayName || approvalItem.employee?.name ? ` • For ${approvalItem.employeeDisplayName || approvalItem.employee?.name}` : ""}
                  </div>
                </div>
                </div>
                {approvalItem.mode === "txn" && Array.isArray(approvalItem.diffs) && approvalItem.diffs.length > 0 ? (
                  <div className="rounded-lg border p-2">
                    <div className="text-xs font-semibold mb-1">Changes</div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left py-1 pr-2">Field</th>
                          <th className="text-left py-1 pr-2">Old</th>
                          <th className="text-left py-1">New</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvalItem.diffs.map((d: any, i: number) => (
                          <tr key={i} className="align-top">
                            <td className="py-1 pr-2 font-medium">{labelForField(d.field)}</td>
                            <td className="py-1 pr-2 text-muted-foreground break-all">{formatAuditValue(String(d.oldValue ?? ""))}</td>
                            <td className="py-1 break-all">{formatAuditValue(String(d.newValue ?? ""))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {approvalItem.dates ? (<div>Dates: {approvalItem.dates}</div>) : null}
                {/* Entitlement after approval (optimistic projection) */}
                {approvalItem.mode === "leave" && approvalItem.employeeId && approvalItem.eventCategoryId && (
                  <EntitlementProjection
                    employeeId={approvalItem.employeeId}
                    eventCategoryId={approvalItem.eventCategoryId}
                    startDate={approvalItem.startDate}
                    endDate={approvalItem.endDate}
                  />
                )}
                {Array.isArray(approvalItem.conflicts) && approvalItem.conflicts.length > 0 && (
                  <div className="rounded-lg border p-2">
                    <div className="text-xs font-semibold mb-1">Potential clashes</div>
                    <ul className="text-xs list-disc pl-4 space-y-1">
                      {approvalItem.conflicts.map((c: any, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={async () => {
                    try {
                      if (approvalItem.mode === "txn") {
                        await fetch(`/api/transactional-change-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: approvalItem.id, action: "decline", comment: "Declined" }) });
                      } else {
                      // Require comment
                      const comment = prompt("Add a short reason for declining:")?.trim();
                      if (!comment) return;
                      await fetch(`/api/approvals/${approvalItem.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decline", comment }) });
                      }
                    } finally {
                      setApprovalItem(null);
                    }
                  }}>Decline</Button>
                  <Button onClick={async () => {
                    try {
                      if (approvalItem.mode === "txn") {
                        await fetch(`/api/transactional-change-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: approvalItem.id, action: "approve" }) });
                      } else {
                      await fetch(`/api/approvals/${approvalItem.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
                      }
                    } finally {
                      setApprovalItem(null);
                    }
                  }}>Approve</Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {/* Inline Document Preview & Acknowledge */}
        {docItem ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="glass rounded-2xl w-full max-w-3xl border border-glass p-4 shadow-depth-2 bg-background">
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-semibold">{docItem.name}</div>
                <button className="text-sm text-muted-foreground" onClick={() => setDocItem(null)}>Close</button>
              </div>
              {docItem.url ? (
                <div className="rounded border overflow-hidden mb-3">
                  <embed src={`${docItem.url}#toolbar=0&navpanes=0&scrollbar=1`} type="application/pdf" className="w-full h-[60vh]" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">Preview not available.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDocItem(null)}>Close</Button>
                <Button onClick={async () => {
                  try {
                    await fetch("/api/documents/acknowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: docItem.id }) });
                  } finally {
                    setDocActionItems((prev) => ({ ...prev, ack: prev.ack.filter((x) => x.id !== docItem.id) }));
                    setDocItem(null);
                  }
                }}>Acknowledge</Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Default fallback - should not happen
  return null;
}
