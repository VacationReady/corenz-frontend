"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { WorkflowStages } from "./WorkflowStages";
import { 
  Calendar, 
  Users, 
  GitMerge, 
  AlertCircle, 
  Edit, 
  Trash2, 
  ShieldCheck,
  Layers
} from "lucide-react";

type Workflow = any;

type Option = { id: string; name: string };

export default function MultiStageApprovalsSettingsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);

  const [eventCategories, setEventCategories] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [jobRoles, setJobRoles] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);

  // Form state (simple for now)
  const [name, setName] = useState("");
  const [eventCategoryId, setEventCategoryId] = useState("");
  const [scopeType, setScopeType] = useState("COMPANY");
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [jobRoleIds, setJobRoleIds] = useState<string[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [stages, setStages] = useState<any[]>([]);
  // Global rule that applies across stages
  const [workflowMode, setWorkflowMode] = useState("SEQUENTIAL");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approval-workflows", { cache: "no-store" });
      const json = await res.json();
      setWorkflows(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const [cats, depts, roles, emps] = await Promise.all([
          fetch("/api/event-categories").then((r) => r.json()),
          fetch("/api/departments").then((r) => r.json()),
          fetch("/api/job-roles").then((r) => r.json()),
          fetch("/api/employees?status=active").then((r) => r.json()),
        ]);
        setEventCategories((Array.isArray(cats) ? cats : cats?.data || []).map((c: any) => ({ id: c.id, name: c.name })));
        setDepartments((Array.isArray(depts) ? depts : depts?.data || []).map((d: any) => ({ id: d.id, name: d.name })));
        setJobRoles(((roles && roles.jobRoles) || []).map((r: any) => ({ id: r.id, name: r.name })));
        const empArr = (Array.isArray(emps) ? emps : emps?.data || []).map((e: any) => {
          const name = [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email || e.User?.name || "Unnamed";
          const id = e.userId || e.User?.id || e.id;
          return { id, name };
        });
        setEmployees(empArr);
      } catch {}
    };
    run();
  }, []);

  const defaultWorkflowCard = useMemo(() => {
    return {
      id: "__default__",
      name: "Default (Manager Approval)",
      eventCategory: { id: "__all__", name: "All leave types" },
      scope: { type: "COMPANY" },
      priority: -1,
      isActive: true,
      stages: [
        {
          id: "__default_stage__",
          name: null,
          mode: "SEQUENTIAL",
          order: 0,
          approvers: [
            { id: "__default_appr__", type: "MANAGER", userId: null, name: null, email: null, order: 0 },
          ],
        },
      ],
    } as any;
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setEventCategoryId("");
    setScopeType("COMPANY");
    setDeptIds([]);
    setJobRoleIds([]);
    setEmployeeIds([]);
    setPriority(0);
    setIsActive(true);
    setWorkflowMode("SEQUENTIAL");
    // Default one stage with Manager approver
    setStages([{ id: `stage-${Date.now()}`, order: 0, approvers: [{ type: "MANAGER", userId: undefined, order: 0 }] }]);
    setOpen(true);
  }

  function openEdit(w: any) {
    setEditing(w);
    setName(w.name || "");
    setEventCategoryId(w.eventCategory?.id || "");
    setScopeType(w.scope?.type || "COMPANY");
    setDeptIds(w.scope?.departmentIds || []);
    setJobRoleIds(w.scope?.jobRoleIds || []);
    setEmployeeIds(w.scope?.employeeIds || []);
    setPriority(w.priority ?? 0);
    setIsActive(Boolean(w.isActive));
    // Use first stage's mode as workflow-level rule (all stages will save with the same mode)
    setWorkflowMode(((w.stages || [])[0]?.mode) || "SEQUENTIAL");
    setStages((w.stages || []).map((s: any, idx: number) => ({
      id: s.id || `stage-${idx}`,
      order: s.order,
      approvers: [
        (() => {
          const a = (s.approvers || [])[0];
          return { type: a?.type || (a?.userId ? "USER" : "MANAGER"), userId: a?.userId || undefined, order: 0 };
        })(),
      ] 
    })));
    setOpen(true);
  }

  async function save() {
    try {
      if (!name || !eventCategoryId || stages.length === 0) {
        toast.error("Please fill name, event category and add at least one stage.");
        return;
      }
      if (stages.some((s) => !s.approvers || s.approvers.length !== 1)) {
        toast.error("Each stage must have exactly one approver.");
        return;
      }
      const anyMissing = stages.some((s) => {
        const a = s.approvers[0];
        return !a || (a.type === "USER" && !a.userId);
      });
      if (anyMissing) {
        toast.error("Select an approver for every stage.");
        return;
      }
      const payload = {
        name,
        eventCategoryId,
        scope: {
          type: scopeType,
          departmentIds: scopeType === "DEPARTMENT" ? deptIds : [],
          jobRoleIds: scopeType === "JOB_ROLE" ? jobRoleIds : [],
          employeeIds: scopeType === "EMPLOYEE" ? employeeIds : [],
        },
        priority,
        isActive,
        stages: stages
          .map((s, idx) => ({
            name: undefined,
            mode: workflowMode,
            order: typeof s.order === "number" ? s.order : idx,
            approvers: [(() => {
              const a = s.approvers[0];
              return { type: a.type, userId: a.type === "USER" ? a.userId : undefined, order: 0 };
            })()],
          }))
          .sort((a: any, b: any) => a.order - b.order),
      } as any;

      const res = await fetch(editing ? `/api/approval-workflows/${editing.id}` : "/api/approval-workflows", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error ? JSON.stringify(json.error) : "Failed to save workflow");
        return;
      }
      toast.success("Workflow saved");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error("Failed to save workflow");
    }
  }

  const scopeHelp = {
    COMPANY: "Applies to everyone in your company.",
    DEPARTMENT: "Applies to selected departments only.",
    JOB_ROLE: "Applies to selected job roles only.",
    EMPLOYEE: "Applies to selected employees only.",
  } as const;

  const modeHelp = {
    SEQUENTIAL: "Stages are approved in sequence (Stage 1 → Stage 2 → …).",
    FIRST_RESPONDER: "All stages are requested in parallel; first approval completes the workflow.",
    UNANIMOUS: "All stages must approve; requested in parallel.",
  } as const;

  return (
    <PageShell
      title="Multi-stage Approvals"
      description="Create and manage reusable approval workflows for Holidays & Absence."
      breadcrumbs={{ items: [{ label: "Settings", href: "/settings" }, { label: "Multi-stage Approvals", isCurrentPage: true }] }}
      action={<Button onClick={openCreate}>Create workflow</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {/* Always show the Default fallback workflow card */}
            <Card key={defaultWorkflowCard.id} className="border-enhanced bg-muted/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{defaultWorkflowCard.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">System default</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                      <Calendar className="h-3 w-3" /> Event
                    </div>
                    <div className="font-medium">{defaultWorkflowCard.eventCategory?.name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                      <Users className="h-3 w-3" /> Scope
                    </div>
                    <div className="font-medium">{defaultWorkflowCard.scope?.type}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                      <Layers className="h-3 w-3" /> Stages
                    </div>
                    <div className="font-medium">1 Stage</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                      <GitMerge className="h-3 w-3" /> Mode
                    </div>
                    <div className="font-medium">Sequential</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
                  Used automatically when no custom workflow matches the request.
                </p>
              </CardContent>
            </Card>

            {workflows.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-muted-foreground">No custom workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    The default manager approval rule is currently active for all requests. 
                    Create a custom workflow to override this behavior for specific departments or leave types.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={openCreate}>
                    Create first workflow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              workflows.map((w: any) => (
                <Card key={w.id} className="border-enhanced hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base truncate pr-2">{w.name}</CardTitle>
                      <Badge 
                        variant={w.isActive ? "default" : "secondary"}
                        className={w.isActive ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200" : ""}
                      >
                        {w.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                          <Calendar className="h-3 w-3" /> Event
                        </div>
                        <div className="font-medium truncate" title={w.eventCategory?.name || ""}>
                          {w.eventCategory?.name}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                          <Users className="h-3 w-3" /> Scope
                        </div>
                        <div className="font-medium truncate">
                          {w.scope?.type === "COMPANY" ? "Company Wide" : 
                           w.scope?.type === "DEPARTMENT" ? `${w.scope?.departmentIds?.length || 0} Depts` :
                           w.scope?.type}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                          <Layers className="h-3 w-3" /> Stages
                        </div>
                        <div className="font-medium">{w.stages?.length ?? 0} Stages</div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                          <AlertCircle className="h-3 w-3" /> Priority
                        </div>
                        <div className="font-medium">{w.priority ?? 0}</div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                        const ok = confirm("Delete this workflow?");
                        if (!ok) return;
                        const res = await fetch(`/api/approval-workflows/${w.id}`, { method: "DELETE" });
                        if (res.ok) { toast.success("Workflow deleted"); load(); } else { toast.error("Failed to delete"); }
                      }}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Workflow" : "Create Workflow"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Workflow name" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <label className="text-xs text-muted-foreground">Event Category</label>
              <Select value={eventCategoryId} onValueChange={setEventCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {eventCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Scope</label>
              <Select value={scopeType} onValueChange={setScopeType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">Company</SelectItem>
                  <SelectItem value="DEPARTMENT">Departments</SelectItem>
                  <SelectItem value="JOB_ROLE">Job roles</SelectItem>
                  <SelectItem value="EMPLOYEE">Employees</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{(scopeHelp as any)[scopeType]}</p>
              {scopeType === "DEPARTMENT" && (
                <div className="mt-2">
                  <MultiSelect
                    options={departments.map((d) => ({ label: d.name, value: d.id }))}
                    selected={deptIds}
                    onChange={setDeptIds}
                    placeholder="Select departments"
                  />
                </div>
              )}
              {scopeType === "JOB_ROLE" && (
                <div className="mt-2">
                  <MultiSelect
                    options={jobRoles.map((r) => ({ label: r.name, value: r.id }))}
                    selected={jobRoleIds}
                    onChange={setJobRoleIds}
                    placeholder="Select job roles"
                  />
                </div>
              )}
              {scopeType === "EMPLOYEE" && (
                <div className="mt-2">
                  <MultiSelect
                    options={employees.map((e) => ({ label: e.name, value: e.id }))}
                    selected={employeeIds}
                    onChange={setEmployeeIds}
                    placeholder="Select employees"
                  />
                </div>
              )}
            </div>
            {/* Stage builder */}
            <WorkflowStages
              stages={stages}
              onChange={setStages}
              employees={employees}
            />
            {/* Global approval rule */}
            <div>
              <label className="text-xs text-muted-foreground">Rule</label>
              <Select value={workflowMode} onValueChange={setWorkflowMode}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEQUENTIAL">Approve in sequence</SelectItem>
                  <SelectItem value="FIRST_RESPONDER">First responder wins</SelectItem>
                  <SelectItem value="UNANIMOUS">Everyone must approve</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{(modeHelp as any)[workflowMode]}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
