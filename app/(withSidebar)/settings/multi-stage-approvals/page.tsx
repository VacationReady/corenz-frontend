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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { MultiSelect } from "@/components/ui/MultiSelect";

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
        setEmployees((Array.isArray(emps) ? emps : emps?.data || []).map((e: any) => ({ id: e.User?.id || e.id, name: e.User?.name || `${e.User?.firstName ?? ""} ${e.User?.lastName ?? ""}`.trim() })));
      } catch {}
    };
    run();
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
    setStages([{ name: "", mode: "SEQUENTIAL", order: 0, approvers: [] }]);
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
    setStages((w.stages || []).map((s: any) => ({ name: s.name || "", mode: s.mode, order: s.order, approvers: (s.approvers || []).map((a: any) => ({ type: a.type || (a.userId ? "USER" : "MANAGER"), userId: a.userId || undefined, order: a.order })) })));
    setOpen(true);
  }

  async function save() {
    try {
      if (!name || !eventCategoryId || stages.length === 0 || stages.some((s) => !s.approvers || s.approvers.length === 0)) {
        toast.error("Please fill name, event category and ensure each stage has at least one approver.");
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
            name: s.name || undefined,
            mode: s.mode,
            order: typeof s.order === "number" ? s.order : idx,
            approvers: (s.approvers || []).map((a: any, ix: number) => ({ type: a.type || (a.userId ? "USER" : "MANAGER"), userId: a.userId || undefined, order: typeof a.order === "number" ? a.order : ix })),
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
    SEQUENTIAL: "Approvers must approve in the listed order.",
    FIRST_RESPONDER: "Any one approver can approve to complete the stage.",
    UNANIMOUS: "All listed approvers must approve.",
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
        ) : workflows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No workflows yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Create your first approval workflow to start multi-stage approvals.</p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((w: any) => (
            <Card key={w.id} className="border-enhanced">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{w.name}</CardTitle>
                  <Badge variant={w.isActive ? "default" : "secondary"}>{w.isActive ? "Active" : "Inactive"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Event</span><span className="font-medium">{w.eventCategory?.name}</span></div>
                <div className="flex justify-between"><span>Scope</span><span className="font-medium">{w.scope?.type}</span></div>
                <div className="flex justify-between"><span>Stages</span><span className="font-medium">{w.stages?.length ?? 0}</span></div>
                <div className="flex justify-between"><span>Priority</span><span className="font-medium">{w.priority ?? 0}</span></div>
                <div className="pt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(w)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={async () => {
                    const ok = confirm("Delete this workflow?");
                    if (!ok) return;
                    const res = await fetch(`/api/approval-workflows/${w.id}`, { method: "DELETE" });
                    if (res.ok) { toast.success("Workflow deleted"); load(); } else { toast.error("Failed to delete"); }
                  }}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))
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
            {/* Minimal stage builder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Stages</div>
                <Button size="sm" variant="outline" onClick={() => setStages((prev) => [...prev, { name: "", mode: "SEQUENTIAL", order: prev.length, approvers: [] }])}>Add stage</Button>
              </div>
              <div className="space-y-2">
                {stages.map((s, idx) => (
                  <div key={idx} className="rounded border p-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input placeholder={`Stage ${idx + 1} name (optional)`} value={s.name} onChange={(e) => setStages((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                        <p className="text-xs text-muted-foreground mt-1">{(modeHelp as any)[s.mode]}</p>
                      </div>
                      <Select value={s.mode} onValueChange={(v) => setStages((prev) => prev.map((x, i) => i === idx ? { ...x, mode: v } : x))}>
                        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEQUENTIAL">Approve in sequence</SelectItem>
                          <SelectItem value="FIRST_RESPONDER">First responder wins</SelectItem>
                          <SelectItem value="UNANIMOUS">Everyone must approve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">Approvers</div>
                    <div className="mt-1 space-y-1">
                      {(s.approvers || []).map((a: any, ix: number) => (
                        <div key={ix} className="flex gap-2 items-center">
                          <div className="flex-1 flex gap-2">
                            <Select value={a.type || (a.userId ? "USER" : "MANAGER")} onValueChange={(v) => setStages((prev) => prev.map((x, i) => i === idx ? { ...x, approvers: x.approvers.map((y: any, j: number) => j === ix ? { ...y, type: v, userId: v === "USER" ? (y.userId || "") : undefined } : y) } : x))}>
                              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="USER">Specific employee</SelectItem>
                              </SelectContent>
                            </Select>
                            { (a.type || (a.userId ? "USER" : "MANAGER")) === "USER" && (
                              <Command className="border rounded flex-1">
                                <CommandInput placeholder="Search employees..." />
                                <CommandList>
                                  <CommandEmpty>No results found.</CommandEmpty>
                                  <CommandGroup>
                                    {employees.map((emp) => (
                                      <CommandItem key={emp.id} value={emp.name} onSelect={() => setStages((prev) => prev.map((x, i) => i === idx ? { ...x, approvers: x.approvers.map((y: any, j: number) => j === ix ? { ...y, userId: emp.id, type: "USER" } : y) } : x))}>
                                        {emp.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            )}
                          </div>
                          <Input placeholder="Order" value={String(a.order ?? ix)} onChange={(e) => setStages((prev) => prev.map((x, i) => i === idx ? { ...x, approvers: x.approvers.map((y: any, j: number) => j === ix ? { ...y, order: Number(e.target.value) || 0 } : y) } : x))} />
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => setStages((prev) => prev.map((x, i) => i === idx ? { ...x, approvers: [...(x.approvers || []), { type: "MANAGER", userId: undefined, order: (x.approvers?.length ?? 0) }] } : x))}>Add approver</Button>
                    </div>
                  </div>
                ))}
              </div>
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


