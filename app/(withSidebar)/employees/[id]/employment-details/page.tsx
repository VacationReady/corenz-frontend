"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
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
	DialogTrigger,
} from "@/components/ui/dialog";

export default function EmploymentDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session } = useSession();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [employmentTypes, setEmploymentTypes] = useState<Array<{ id: string; label: string }>>([]);
  const [contractTypes, setContractTypes] = useState<Array<{ id: string; label: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  const [newOption, setNewOption] = useState("");
  const [manageKind, setManageKind] = useState<"employment" | "contract" | "location" | "department" | null>(null);

  const canEdit = session?.user?.role === "ADMIN";
  const canViewComp = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

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
      const res = await fetch(`/api/employees/${params.id}/employment-details`);
      if (!res.ok) return;
      const data = await res.json();
      setForm(data);
      await reloadOptions();
    })();
  }, [params.id]);

  const save = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employees/${params.id}/employment-details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (e: any) {
      // no-op toast infra here
    } finally {
      setLoading(false);
    }
  };

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
      // add DELETE for locations if needed; skipping destructive ops if not supported
    } else if (manageKind === "department") {
      // departments deletion may have constraints; skipping here
    }
    await reloadOptions();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Employment details</h1>

      <Card>
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Position & status</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-1">Employment type</label>
              {canEdit && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" onClick={() => setManageKind("employment")}>Manage</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage employment types</DialogTitle>
                      <DialogDescription>Add, remove, or edit options</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {employmentTypes.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm">{t.label}</span>
                          <Button variant="danger" onClick={() => deleteOption(t.id)}>Delete</Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Input placeholder="Add new option" value={newOption} onChange={(e) => setNewOption(e.target.value)} />
                      <Button onClick={addOption}>Add</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {canEdit ? (
              <Select
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
                    <Button variant="ghost" onClick={() => setManageKind("employment")}>+ Add new option</Button>
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" onClick={() => setManageKind("contract")}>Manage</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage contract types</DialogTitle>
                      <DialogDescription>Add, remove, or edit options</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {contractTypes.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm">{t.label}</span>
                          <Button variant="danger" onClick={() => deleteOption(t.id)}>Delete</Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Input placeholder="Add new option" value={newOption} onChange={(e) => setNewOption(e.target.value)} />
                      <Button onClick={addOption}>Add</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {canEdit ? (
              <Select
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
                    <Button variant="ghost" onClick={() => setManageKind("contract")}>+ Add new option</Button>
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" onClick={() => setManageKind("location")}>Manage</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage locations</DialogTitle>
                      <DialogDescription>Add or remove locations</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {locations.map((l) => (
                        <div key={l.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm">{l.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Input placeholder="Add new location" value={newOption} onChange={(e) => setNewOption(e.target.value)} />
                      <Button onClick={addOption}>Add</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {canEdit ? (
              <Select
                value={form.siteLocation || undefined}
                onValueChange={(v) => setForm((f: any) => ({ ...f, siteLocation: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.name}>
                      {l.name}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-2">
                    <Button variant="ghost" onClick={() => setManageKind("location")}>+ Add new option</Button>
                  </div>
                </SelectContent>
              </Select>
            ) : (
              <Input readOnly value={form.siteLocation || ""} />
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-1">Department</label>
              {canEdit && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" onClick={() => setManageKind("department")}>Manage</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage departments</DialogTitle>
                      <DialogDescription>Add new departments</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {departments.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm">{d.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Input placeholder="Add new department" value={newOption} onChange={(e) => setNewOption(e.target.value)} />
                      <Button onClick={addOption}>Add</Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
            <Input
              readOnly
              value={form?.manager ? `${form.manager.firstName ?? ""} ${form.manager.lastName ?? ""}`.trim() : ""}
            />
          </div>
        </div>
      </Card>

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

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      )}
    </div>
  );
}


