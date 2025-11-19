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
import { UnifiedActionItems } from "@/components/dashboard/UnifiedActionItems";
import { Input } from "@/components/ui/Input";
import { useApi, useBatchedApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
 
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
  const [newStartersOpen, setNewStartersOpen] = useState(false);
  const [newStarters, setNewStarters] = useState<any[] | null>(null);
  const [loadingNewStarters, setLoadingNewStarters] = useState(false);

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
            .join(" \u2022 ") || undefined}
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
                Dates: {new Date(detail.startDate).toLocaleDateString()} {" \u2192 "}
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
  // Fetch documents list
  const { data: companyDocs } = useApi<any[]>('/api/documents/list-company');
  const { data: employeeDocs } = useApi<any[]>(
    employeeId ? `/api/documents/list-employee` : null,
    { params: employeeId ? { employeeId } : undefined }
  );

  // Combine and deduplicate documents
  const candidateDocuments = useMemo(() => {
    const docs = [...(companyDocs || []), ...(employeeDocs || [])];
    const uniqueDocsMap = new Map<string, any>();
    for (const d of docs) {
      if (d && d.id && !uniqueDocsMap.has(d.id)) uniqueDocsMap.set(d.id, d);
    }
    return Array.from(uniqueDocsMap.values())
      .filter((d) => d?.requiresAck || d?.requiresSignature)
      .slice(0, 20);
  }, [companyDocs, employeeDocs]);

  // Batch fetch document statuses
  const documentIds = useMemo(
    () => candidateDocuments.map((d) => d.id),
    [candidateDocuments]
  );

  const { data: statusData, isLoading: loadingStatuses } = useBatchedApi<
    { statuses: Record<string, { requiresAck: boolean; acknowledged: boolean; requiresSignature: boolean; signed: boolean }> },
    { documentIds: string[] }
  >(
    '/api/documents/status',
    { documentIds },
    { enabled: documentIds.length > 0 }
  );

  // Build action items from batched response
  useEffect(() => {
    if (!statusData || !candidateDocuments.length) {
      setDocActionItems({ ack: [], sign: [], loading: false, urlMap: {} });
      return;
    }

    const ackItems: Array<{ id: string; name: string }> = [];
    const signItems: Array<{ id: string; name: string }> = [];
    const urlMap: Record<string, string | undefined> = {};

    for (const doc of candidateDocuments) {
      const status = statusData.statuses[doc.id];
      if (!status) continue;

      if (doc.url) urlMap[doc.id] = doc.url;

      if (status.requiresAck && !status.acknowledged) {
        ackItems.push({ id: doc.id, name: doc.name });
      }

      if (status.requiresSignature && !status.signed) {
        signItems.push({ id: doc.id, name: doc.name });
      }
    }

    setDocActionItems({
      ack: ackItems.slice(0, 5),
      sign: signItems.slice(0, 5),
      loading: loadingStatuses,
      urlMap,
    });
  }, [statusData, candidateDocuments, loadingStatuses]);
  
  // Fetch dashboard metrics with department filter
  const { data: metricsData, isLoading: loadingMetricsData } = useApi<{
    headcount: number;
    managers: number;
    newStartersThisMonth: number;
    pendingApprovals: { my: number; all?: number };
    canViewAllApprovals: boolean;
  }>('/api/dashboard/metrics', {
    params: selectedDepartment !== 'all' ? { departmentId: selectedDepartment } : undefined,
  });

  useEffect(() => {
    if (metricsData) {
      setMetrics(metricsData);
      setLoadingMetrics(false);
    }
  }, [metricsData]);

  useEffect(() => {
    setLoadingMetrics(loadingMetricsData);
  }, [loadingMetricsData]);

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
            const name = r?.employee?.name || r?.title?.split(" â€” ")?.[0] || "Employee";
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
                  actorAvatarUrl: it.actorAvatarUrl,
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
  const [isEmployeeSelectOpen, setIsEmployeeSelectOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  useEffect(() => {
    if (!editEmployeeOpen) return;
    let active = true;
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        // Load all employees with pagination
        let allEmployees: any[] = [];
        let cursor: string | null = null;
        let hasMore = true;
        
        while (hasMore && active) {
          const url: string = `/api/employees?status=all&limit=100${cursor ? `&cursor=${cursor}` : ""}`;
          const res: any = await fetch(url, { cache: "no-store" });
          
          if (res.ok) {
            const response: any = await res.json();
            
            // Handle both old array format and new paginated format
            const employeesData = Array.isArray(response) 
              ? response 
              : (response.data || []);
            
            allEmployees = [...allEmployees, ...employeesData];
            
            // Check pagination
            if (response.pagination) {
              cursor = response.pagination.cursor;
              hasMore = response.pagination.hasMore;
            } else {
              // Old format, no more pages
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        
        if (active) setEmployeesForEdit(allEmployees);
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
    return employeesForEdit
      .map((e: any) => {
        const id = e.id || e.employeeId;
        const first = e.firstName || e.User?.firstName || "";
        const last = e.lastName || e.User?.lastName || "";
        const email = e.email || e.User?.email || "";
        const label = `${first} ${last}`.trim() || email || id || "";
        return { id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [employeesForEdit]);

  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();
  const filteredEmployeeOptions = useMemo(() => {
    if (!normalizedEmployeeSearch) return employeeOptions;
    return employeeOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedEmployeeSearch),
    );
  }, [employeeOptions, normalizedEmployeeSearch]);

  const shouldShowEmployeeSearch = employeeOptions.length > 10;
  const displayedEmployeeOptions = shouldShowEmployeeSearch
    ? filteredEmployeeOptions
    : employeeOptions;

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

  const handleEmployeeSelectOpenChange = (open: boolean) => {
    setIsEmployeeSelectOpen(open);
    if (!open) {
      setEmployeeSearch("");
    }
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
                    <Select
                      open={isEmployeeSelectOpen}
                      onOpenChange={handleEmployeeSelectOpenChange}
                      value={selectedEmployeeId}
                      onValueChange={(v) => setSelectedEmployeeId(v)}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {shouldShowEmployeeSearch && (
                          <div className="sticky top-0 z-10 bg-popover p-2 border-b border-muted/40">
                            <Input
                              value={employeeSearch}
                              onChange={(e) => setEmployeeSearch(e.target.value)}
                              placeholder="Search employees..."
                              onKeyDown={(e) => e.stopPropagation()}
                              autoFocus
                              className="h-9"
                            />
                          </div>
                        )}
                        {displayedEmployeeOptions.slice(0, 200).map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                        {displayedEmployeeOptions.length === 0 && (
                          <div className="py-4 text-center text-sm text-muted-foreground">
                            No employees found
                          </div>
                        )}
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
                    <li
                      key={ev.id}
                      className="flex items-center gap-3 hover:bg-muted/40 rounded-lg px-2 py-1 cursor-pointer"
                      onClick={() => {
                        try {
                          const d = new Date(ev.start);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, "0");
                          const day = String(d.getDate()).padStart(2, "0");
                          const iso = `${y}-${m}-${day}`;
                          router.push(`/calendar?date=${iso}`);
                        } catch (_err) {}
                      }}
                    >
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
                          {new Date(ev.start).toLocaleDateString()} {" \u2022 "}
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
      <>
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
                <button
                  className="text-2xl font-bold text-primary hover:underline"
                  onClick={async () => {
                    try {
                      setNewStartersOpen(true);
                      setLoadingNewStarters(true);
                      const qs = new URLSearchParams();
                      if (selectedDepartment !== "all") qs.set("departmentId", selectedDepartment);
                      const res = await fetch(`/api/dashboard/new-starters${qs.toString() ? `?${qs.toString()}` : ""}`, { cache: "no-store" });
                      const data = await res.json();
                      setNewStarters(Array.isArray(data?.items) ? data.items : []);
                    } catch {
                      setNewStarters([]);
                    } finally {
                      setLoadingNewStarters(false);
                    }
                  }}
                >
                  {metrics.newStartersThisMonth}
                </button>
              </div>
            </div>
          )}
        </div>
      </DashboardWidget>
      {newStartersOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="glass rounded-2xl w-full max-w-2xl border border-glass p-4 shadow-depth-2 bg-background">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">New starters (last 30 days)</div>
              <button className="text-sm text-muted-foreground" onClick={() => setNewStartersOpen(false)}>Close</button>
            </div>
            {loadingNewStarters ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ) : !newStarters || newStarters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No starters in the last 30 days.</p>
            ) : (
              <ul className="divide-y">
                {newStarters.map((ns) => (
                  <li key={ns.employeeId} className="py-2 flex items-center gap-3">
                    <Avatar size={32} name={ns.name} src={ns.profileImageUrl || undefined} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ns.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Start: {new Date(ns.startDate).toLocaleDateString()} {ns.department ? `â€¢ ${ns.department}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-muted-foreground">Onboarding</div>
                      <div className="text-sm font-medium">
                        {ns.onboarding?.status === "completed" ? "Completed" : `${ns.onboarding?.percent ?? 0}%`}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/employees/${ns.employeeId}/onboarding`)}>Open</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
      </>
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
        <UnifiedActionItems employeeId={employeeId} isManager={true} />
      </div>
    );
  }

  // Default fallback - should not happen  
  return null;
}
