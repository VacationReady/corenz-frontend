"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import EmployeeSaveButton from "@/components/employees/EmployeeSaveButton";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmploymentDetailsClient({ employeeId }: { employeeId: string }) {
  const { data: session } = useSession();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; userId: string; firstName?: string | null; lastName?: string | null; email: string }>>([]);
  const [employmentTypes, setEmploymentTypes] = useState<Array<{ id: string; label: string }>>([]);
  const [contractTypes, setContractTypes] = useState<Array<{ id: string; label: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  const [newOption, setNewOption] = useState("");
  const [manageKind, setManageKind] = useState<"employment" | "contract" | "location" | "department" | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedManagerEmployeeId, setSelectedManagerEmployeeId] = useState<string>("none");
  // Control select open states so they close when opening Manage dialog
  const [employmentSelectOpen, setEmploymentSelectOpen] = useState(false);
  const [contractSelectOpen, setContractSelectOpen] = useState(false);
  const [locationSelectOpen, setLocationSelectOpen] = useState(false);

  const canEdit =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canViewComp =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";

  const reloadOptions = async () => {
    const [et, ct, loc, deps] = await Promise.all([
      fetch(`/api/employment-type-options`).then((r) => r.json()).catch(() => []),
      fetch(`/api/contract-type-options`).then((r) => r.json()).catch(() => []),
      fetch(`/api/locations`).then((r) => r.json()).catch(() => []),
      fetch(`/api/departments`).then((r) => r.json()).catch(() => []),
    ]);
    setEmploymentTypes(et);
    setContractTypes(ct);
    setLocations(loc);
    setDepartments(deps);
  };

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/employees/${employeeId}/employment-details`);
      if (!res.ok) return;
      const data = await res.json();
      setForm(data);
      setInitialValues(data);
      await reloadOptions();
    })();
  }, [employeeId]);

  // Load employees for manager dropdown (exclude current employee)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/employees?status=active`);
        if (!res.ok) return;
        const list = await res.json();
        const filtered = Array.isArray(list)
          ? list.filter((e: any) => e.id !== employeeId)
          : [];
        setEmployees(
          filtered.map((e: any) => ({
            id: e.id,
            userId: e.userId,
            firstName: e.firstName ?? null,
            lastName: e.lastName ?? null,
            email: e.email,
          })),
        );

        // Initialize controlled manager selection once we have both form and employees
        const currentManagerUserId = (form as any)?.manager?.id as string | undefined;
        if (currentManagerUserId) {
          const match = filtered.find((e: any) => e.userId === currentManagerUserId);
          setSelectedManagerEmployeeId(match?.id ?? "none");
        } else {
          setSelectedManagerEmployeeId("none");
        }
      } catch {
        // no-op
      }
    })();
  }, [employeeId, form]);

  const [initialValues, setInitialValues] = useState<any | null>(null);
  useEffect(() => {
    if (!initialValues && form && Object.keys(form).length) {
      setInitialValues(form);
    }
  }, [form, initialValues]);

  const addOption = async () => {
    if (!newOption.trim()) return;
    const label = newOption.trim();
    if (manageKind === "employment") {
      await fetch(`/api/employment-type-options`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    } else if (manageKind === "contract") {
      await fetch(`/api/contract-type-options`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    } else if (manageKind === "location") {
      await fetch(`/api/locations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label }) });
    } else if (manageKind === "department") {
      await fetch(`/api/departments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label }) });
    }
    setNewOption("");
    await reloadOptions();
  };

  const deleteOption = async (id: string) => {
    if (manageKind === "employment") {
      await fetch(`/api/employment-type-options`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } else if (manageKind === "contract") {
      await fetch(`/api/contract-type-options`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } else if (manageKind === "location") {
      await fetch(`/api/locations`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } else if (manageKind === "department") {
      await fetch(`/api/departments`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    }
    await reloadOptions();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <HeaderWithHistory
        title="Employment details"
        employeeId={employeeId}
        section="employment-details"
      />

      <Card>
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Position & status</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-1">Employment type</label>
              {canEdit && (
                <Button variant="ghost" onClick={() => { setManageKind("employment"); setManageOpen(true); }}>Manage</Button>
              )}
            </div>
            {canEdit ? (
              <Select
                open={employmentSelectOpen}
                onOpenChange={setEmploymentSelectOpen}
                value={form.employmentType || undefined}
                onValueChange={(v) => setForm((f: any) => ({ ...f, employmentType: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map((t) => (
                    <SelectItem key={t.id} value={t.label}>
                      {t.label}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-2">
                    <Button variant="ghost" onClick={() => { setEmploymentSelectOpen(false); setManageKind("employment"); setManageOpen(true); }}>+ Add new option</Button>
                  </div>
                </SelectContent>
              </Select>
            ) : (
              <Input readOnly value={form.employmentType || ""} />
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-1">Contract type</label>
              {canEdit && (
                <Button variant="ghost" onClick={() => { setManageKind("contract"); setManageOpen(true); }}>Manage</Button>
              )}
            </div>
            {canEdit ? (
              <Select
                open={contractSelectOpen}
                onOpenChange={setContractSelectOpen}
                value={form.contractType || undefined}
                onValueChange={(v) => setForm((f: any) => ({ ...f, contractType: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((t) => (
                    <SelectItem key={t.id} value={t.label}>
                      {t.label}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-2">
                    <Button variant="ghost" onClick={() => { setContractSelectOpen(false); setManageKind("contract"); setManageOpen(true); }}>+ Add new option</Button>
                  </div>
                </SelectContent>
              </Select>
            ) : (
              <Input readOnly value={form.contractType || ""} />
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-1">Site location</label>
              {canEdit && (
                <Button variant="ghost" onClick={() => { setManageKind("location"); setManageOpen(true); }}>Manage</Button>
              )}
            </div>
            {canEdit ? (
              <Select
                open={locationSelectOpen}
                onOpenChange={setLocationSelectOpen}
                value={form.locationId || undefined}
                onValueChange={(v) => setForm((f: any) => ({ ...f, locationId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-2">
                    <Button variant="ghost" onClick={() => { setLocationSelectOpen(false); setManageKind("location"); setManageOpen(true); }}>+ Add new option</Button>
                  </div>
                </SelectContent>
              </Select>
            ) : (
              <Input readOnly value={form.siteLocation || ""} />
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text sm font-medium mb-1">Department</label>
              {canEdit && (
                <Button variant="ghost" onClick={() => { setManageKind("department"); setManageOpen(true); }}>Manage</Button>
              )}
            </div>
            <Input
              readOnly
              value={form?.department?.name || ""}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start date</label>
            <Input
              type="date"
              readOnly={!canEdit}
              value={form.startDate ? String(form.startDate).substring(0, 10) : ""}
              onChange={(e) => setForm((f: any) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Manager</label>
            {canEdit ? (
              <Select
                value={selectedManagerEmployeeId}
                onValueChange={(v) => {
                  setSelectedManagerEmployeeId(v);
                  setForm((f: any) => ({ ...f, managerId: v === "none" ? "" : v }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Line Manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {(emp.firstName || emp.lastName)
                        ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
                        : emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                readOnly
                value={form?.manager ? `${form.manager.firstName ?? ""} ${form.manager.lastName ?? ""}`.trim() : ""}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Centralized manage modal */}
      {canEdit && (
        <Dialog open={manageOpen} onOpenChange={(o) => { setManageOpen(o); if (!o) setNewOption(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {manageKind === "employment" && "Manage employment types"}
                {manageKind === "contract" && "Manage contract types"}
                {manageKind === "location" && "Manage locations"}
                {manageKind === "department" && "Manage departments"}
              </DialogTitle>
              <DialogDescription>Add or remove options</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-auto">
              {manageKind === "employment" && employmentTypes.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{t.label}</span>
                  <Button variant="danger" onClick={() => deleteOption(t.id)}>Delete</Button>
                </div>
              ))}
              {manageKind === "contract" && contractTypes.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{t.label}</span>
                  <Button variant="danger" onClick={() => deleteOption(t.id)}>Delete</Button>
                </div>
              ))}
              {manageKind === "location" && locations.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{l.name}</span>
                  <Button variant="danger" onClick={() => deleteOption(l.id)}>Delete</Button>
                </div>
              ))}
              {manageKind === "department" && departments.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{d.name}</span>
                  <Button variant="danger" onClick={() => deleteOption(d.id)}>Delete</Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                placeholder={
                  manageKind === "location"
                    ? "Add new location"
                    : manageKind === "department"
                    ? "Add new department"
                    : "Add new option"
                }
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
              />
              <Button onClick={addOption}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Compensation</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Salary amount</label>
            {canViewComp ? (
              <Input
                readOnly={!canEdit}
                type="number"
                value={form.salaryAmount ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, salaryAmount: e.target.value ? Number(e.target.value) : null }))
                }
              />
            ) : (
              <Badge variant="outline">Restricted</Badge>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hourly rate</label>
            {canViewComp ? (
              <Input
                readOnly={!canEdit}
                type="number"
                value={form.hourlyRate ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, hourlyRate: e.target.value ? Number(e.target.value) : null }))
                }
              />
            ) : (
              <Badge variant="outline">Restricted</Badge>
            )}
          </div>
        </div>
      </Card>

      {canEdit && initialValues && (
        <div className="flex justify-end">
          <EmployeeSaveButton
            employeeId={employeeId}
            endpoint="employment-details"
            initialValues={initialValues}
            currentValues={form}
            onSaveSuccess={async () => {
              try {
                setLoading(true);
                const res = await fetch(`/api/employees/${employeeId}/employment-details`);
                if (res.ok) {
                  const latest = await res.json();
                  setForm(latest);
                  setInitialValues(latest);
                }
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}


