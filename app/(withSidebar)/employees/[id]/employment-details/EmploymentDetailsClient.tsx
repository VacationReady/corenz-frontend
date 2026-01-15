"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import EmployeeSaveButton from "@/components/employees/EmployeeSaveButton";
import UnsavedChangesGuard from "@/components/ui/UnsavedChangesGuard";
import EmployeeFormCard, { FormSection, FormField } from "@/components/employees/EmployeeFormCard";
import { useSession } from "next-auth/react";
import { useTenantFetch } from "@/hooks/useTenantFetch";
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
import {
  Briefcase,
  MapPin,
  Building2,
  Calendar,
  Users,
  FileText,
  Plus,
  Settings,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Helper functions for searchable dropdowns
const normalizeSearch = (value: string) => value.trim().toLowerCase();

const SelectSearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <div className="sticky top-0 z-10 bg-popover p-2 border-b border-muted/40">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search..."}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.stopPropagation()}
        autoFocus
        className="h-9 pl-9"
      />
    </div>
  </div>
);

const filterBySearch = <T,>(
  items: T[],
  accessor: (item: T) => string | undefined,
  query: string,
) => {
  const normalized = normalizeSearch(query);
  if (!normalized) {
    return items;
  }

  return items.filter((item) => {
    const value = accessor(item);
    if (!value) {
      return false;
    }
    return value.toLowerCase().includes(normalized);
  });
};

// Manage options modal component
function ManageOptionsModal({
  open,
  onOpenChange,
  kind,
  options,
  onAdd,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "employment" | "contract" | "location" | "department" | "jobRole" | null;
  options: Array<{ id: string; label?: string; name?: string }>;
  onAdd: (label: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [newOption, setNewOption] = useState("");
  const [loading, setLoading] = useState(false);

  const titles = {
    employment: "Manage Employment Types",
    contract: "Manage Contract Types",
    location: "Manage Locations",
    department: "Manage Departments",
    jobRole: "Manage Job Roles",
  };

  const placeholders = {
    employment: "Add new employment type",
    contract: "Add new contract type",
    location: "Add new location",
    department: "Add new department",
    jobRole: "Add new job role",
  };

  const handleAdd = async () => {
    if (!newOption.trim()) return;
    setLoading(true);
    await onAdd(newOption.trim());
    setNewOption("");
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    await onDelete(id);
    setLoading(false);
  };

  if (!kind) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setNewOption(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {titles[kind]}
          </DialogTitle>
          <DialogDescription>Add or remove options available in this dropdown</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            <AnimatePresence mode="popLayout">
              {options.map((opt) => (
                <motion.div
                  key={opt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 group hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">{opt.label || opt.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(opt.id)}
                    disabled={loading}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {options.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No options available. Add one below.
              </div>
            )}
          </div>

          {/* Add New Option */}
          <div className="flex gap-2 pt-2 border-t border-muted/40">
            <Input
              placeholder={placeholders[kind]}
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={loading || !newOption.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EmploymentDetailsClient({ employeeId }: { employeeId: string }) {
  const { data: session } = useSession();
  const tenantFetch = useTenantFetch();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; userId: string; firstName?: string | null; lastName?: string | null; email: string }>>([]);
  const [employmentTypes, setEmploymentTypes] = useState<Array<{ id: string; label: string }>>([]);
  const [contractTypes, setContractTypes] = useState<Array<{ id: string; label: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [jobRoles, setJobRoles] = useState<Array<{ id: string; name: string }>>([]);

  const [newOption, setNewOption] = useState("");
  const [manageKind, setManageKind] = useState<"employment" | "contract" | "location" | "department" | "jobRole" | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedManagerEmployeeId, setSelectedManagerEmployeeId] = useState<string>("none");
  const [managerSearch, setManagerSearch] = useState("");
  const [jobRoleSearch, setJobRoleSearch] = useState("");
  // Control select open states so they close when opening Manage dialog
  const [employmentSelectOpen, setEmploymentSelectOpen] = useState(false);
  const [contractSelectOpen, setContractSelectOpen] = useState(false);
  const [locationSelectOpen, setLocationSelectOpen] = useState(false);
  const [jobRoleSelectOpen, setJobRoleSelectOpen] = useState(false);
  const [isManagerSelectOpen, setIsManagerSelectOpen] = useState(false);

  const canEdit =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const startDateDisplay = useMemo(() => {
    if (!form?.startDate) return "";
    const raw = String(form.startDate);
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const y = raw.slice(0, 4);
      const m = raw.slice(5, 7);
      const d = raw.slice(8, 10);
      return `${d}-${m}-${y}`;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    const y = String(parsed.getFullYear());
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${d}-${m}-${y}`;
  }, [form?.startDate]);

  // Helper function to get employee display name
  const getEmployeeDisplayName = (emp: { firstName?: string | null; lastName?: string | null; email: string }) =>
    (emp.firstName || emp.lastName)
      ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
      : emp.email ?? "";

  // Sort and filter employees for manager dropdown
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const lastNameCompare = (a.lastName || "").localeCompare(b.lastName || "", undefined, {
        sensitivity: "base",
      });
      if (lastNameCompare !== 0) return lastNameCompare;

      const firstNameCompare = (a.firstName || "").localeCompare(b.firstName || "", undefined, {
        sensitivity: "base",
      });
      if (firstNameCompare !== 0) return firstNameCompare;

      return (a.email || "").localeCompare(b.email || "", undefined, { sensitivity: "base" });
    });
  }, [employees]);

  const shouldShowManagerSearch = sortedEmployees.length > 10;
  const managerOptions = useMemo(
    () =>
      shouldShowManagerSearch
        ? filterBySearch(sortedEmployees, (emp) => getEmployeeDisplayName(emp), managerSearch)
        : sortedEmployees,
    [sortedEmployees, managerSearch, shouldShowManagerSearch],
  );

  const shouldShowJobRoleSearch = jobRoles.length > 10;
  const jobRoleOptions = useMemo(
    () =>
      shouldShowJobRoleSearch
        ? filterBySearch(jobRoles, (role) => role.name, jobRoleSearch)
        : jobRoles,
    [jobRoles, jobRoleSearch, shouldShowJobRoleSearch],
  );

  const handleManagerOpenChange = (open: boolean) => {
    setIsManagerSelectOpen(open);
    if (!open) setManagerSearch("");
  };

  const handleJobRoleOpenChange = (open: boolean) => {
    setJobRoleSelectOpen(open);
    if (!open) setJobRoleSearch("");
  };

  const reloadOptions = async (isActive?: () => boolean) => {
    const [et, ct, loc, deps, roles] = await Promise.all([
      tenantFetch(`/api/employment-type-options`).then((r) => r.json()).catch(() => []),
      tenantFetch(`/api/contract-type-options`).then((r) => r.json()).catch(() => []),
      tenantFetch(`/api/locations`).then((r) => r.json()).catch(() => []),
      tenantFetch(`/api/departments`).then((r) => r.json()).catch(() => []),
      tenantFetch(`/api/job-roles`).then((r) => r.json()).catch(() => []),
    ]);
    if (isActive && !isActive()) return;
    setEmploymentTypes(et);
    setContractTypes(ct);
    setLocations(loc);
    setDepartments(deps);
    setJobRoles(roles);
  };

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const res = await tenantFetch(`/api/employees/${employeeId}/employment-details`);
        if (!res.ok || !isActive) return;
        const data = await res.json();
        if (!isActive) return;
        setForm(data);
        setInitialValues(data);
        await reloadOptions(() => isActive);
      } catch {
        return;
      }
    })();

    return () => {
      isActive = false;
    };
  }, [employeeId, tenantFetch]);

  useEffect(() => {
    if (!form?.siteLocation || form.locationId || locations.length === 0) {
      return;
    }
    const match = locations.find(
      (location) => location.name?.toLowerCase() === form.siteLocation.toLowerCase(),
    );
    if (!match) {
      return;
    }
    setForm((previous: any) => ({ ...previous, locationId: match.id }));
    setInitialValues((previous: any | null) =>
      previous ? { ...previous, locationId: match.id } : previous,
    );
  }, [form?.siteLocation, form?.locationId, locations]);

  const managerUserId = (form as any)?.manager?.id as string | undefined;
  const managerEmployeeIdFromForm =
    typeof form?.managerId === "string" ? form.managerId : undefined;

  // Load employees for manager dropdown (exclude current employee)
  useEffect(() => {
    (async () => {
      try {
        const res = await tenantFetch(`/api/employees?status=active`);
        if (!res.ok) return;
        const result = await res.json();
        // Handle paginated response format
        const list = result.data || result;
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
      } catch {
        // no-op
      }
    })();
  }, [employeeId, tenantFetch]);

  // Keep manager select + initial values in sync without re-fetching
  useEffect(() => {
    const hasExplicitSelection = managerEmployeeIdFromForm !== undefined;
    const derivedFromSelection =
      managerEmployeeIdFromForm === ""
        ? "none"
        : managerEmployeeIdFromForm;
    const derivedFromRelation = managerUserId
      ? employees.find((emp) => emp.userId === managerUserId)?.id
      : undefined;

    const nextSelected = hasExplicitSelection
      ? derivedFromSelection ?? "none"
      : derivedFromRelation ?? "none";

    setSelectedManagerEmployeeId((prev) =>
      prev === nextSelected ? prev : nextSelected,
    );

    setInitialValues((prev: any | null) => {
      if (!prev) return prev;
      const normalizedInitial = derivedFromRelation ?? "";
      if ((prev.managerId ?? "") === normalizedInitial) {
        return prev;
      }
      return { ...prev, managerId: normalizedInitial };
    });
  }, [employees, managerUserId, managerEmployeeIdFromForm]);

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
      await tenantFetch(`/api/employment-type-options`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    } else if (manageKind === "contract") {
      await tenantFetch(`/api/contract-type-options`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    } else if (manageKind === "location") {
      await tenantFetch(`/api/locations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label }) });
    } else if (manageKind === "department") {
      await tenantFetch(`/api/departments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label }) });
    } else if (manageKind === "jobRole") {
      await tenantFetch(`/api/job-roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label }) });
    }
    setNewOption("");
    await reloadOptions();
  };

  const deleteOption = async (id: string) => {
    if (manageKind === "employment") {
      await tenantFetch(`/api/employment-type-options`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } else if (manageKind === "contract") {
      await tenantFetch(`/api/contract-type-options`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } else if (manageKind === "location") {
      await tenantFetch(`/api/locations`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } else if (manageKind === "department") {
      await tenantFetch(`/api/departments`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } else if (manageKind === "jobRole") {
      await tenantFetch(`/api/job-roles`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    }
    await reloadOptions();
  };

  const getManageOptions = () => {
    if (manageKind === "employment") return employmentTypes;
    if (manageKind === "contract") return contractTypes;
    if (manageKind === "location") return locations.map(l => ({ id: l.id, label: l.name }));
    if (manageKind === "department") return departments.map(d => ({ id: d.id, label: d.name }));
    if (manageKind === "jobRole") return jobRoles.map(r => ({ id: r.id, label: r.name }));
    return [];
  };

  // Helper for manage button styling
  const ManageButton = ({ onClick }: { onClick: () => void }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
    >
      <Settings className="w-3 h-3 mr-1" />
      Manage
    </Button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4 sm:px-6 lg:px-8">
      <HeaderWithHistory
        title="Employment details"
        employeeId={employeeId}
        section="employment-details"
        description="Manage position, contract and organizational information"
      />

      <UnsavedChangesGuard>
        {/* Position & Status Card */}
        <EmployeeFormCard
          title="Position & Status"
          description="Employment type, contract, and location details"
          icon={Briefcase}
          iconColor="from-primary/20 to-blue-500/20"
          delay={0.1}
        >
          <FormSection columns={2}>
            {/* Employment Type */}
            <FormField
              label="Employment type"
              action={canEdit && <ManageButton onClick={() => { setManageKind("employment"); setManageOpen(true); }} />}
            >
              {canEdit ? (
                <Select
                  open={employmentSelectOpen}
                  onOpenChange={setEmploymentSelectOpen}
                  value={form.employmentType || undefined}
                  onValueChange={(v) => setForm((f: any) => ({ ...f, employmentType: v }))}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((t) => (
                      <SelectItem key={t.id} value={t.label}>
                        {t.label}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-2 border-t border-muted/40 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-primary"
                        onClick={() => { setEmploymentSelectOpen(false); setManageKind("employment"); setManageOpen(true); }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add new option
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value={form.employmentType || ""} className="h-11 rounded-xl bg-muted/30" />
              )}
            </FormField>

            {/* Contract Type */}
            <FormField
              label="Contract type"
              action={canEdit && <ManageButton onClick={() => { setManageKind("contract"); setManageOpen(true); }} />}
            >
              {canEdit ? (
                <Select
                  open={contractSelectOpen}
                  onOpenChange={setContractSelectOpen}
                  value={form.contractType || undefined}
                  onValueChange={(v) => setForm((f: any) => ({ ...f, contractType: v }))}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20">
                    <SelectValue placeholder="Select contract type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map((t) => (
                      <SelectItem key={t.id} value={t.label}>
                        {t.label}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-2 border-t border-muted/40 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-primary"
                        onClick={() => { setContractSelectOpen(false); setManageKind("contract"); setManageOpen(true); }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add new option
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value={form.contractType || ""} className="h-11 rounded-xl bg-muted/30" />
              )}
            </FormField>

            {/* Site Location */}
            <FormField
              label="Site location"
              action={canEdit && <ManageButton onClick={() => { setManageKind("location"); setManageOpen(true); }} />}
            >
              {canEdit ? (
                <Select
                  open={locationSelectOpen}
                  onOpenChange={setLocationSelectOpen}
                  value={form.locationId || undefined}
                  onValueChange={(v) => setForm((f: any) => ({ ...f, locationId: v }))}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <SelectValue
                        placeholder={form.siteLocation ? `Current: ${form.siteLocation}` : "Select site location"}
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-2 border-t border-muted/40 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-primary"
                        onClick={() => { setLocationSelectOpen(false); setManageKind("location"); setManageOpen(true); }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add new option
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value={form.siteLocation || ""} className="h-11 rounded-xl bg-muted/30" />
              )}
            </FormField>

            {/* Department */}
            <FormField
              label="Department"
              action={canEdit && <ManageButton onClick={() => { setManageKind("department"); setManageOpen(true); }} />}
            >
              {canEdit ? (
                <Select
                  value={form.departmentId || undefined}
                  onValueChange={(v) => setForm((f: any) => ({ ...f, departmentId: v }))}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Select department" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-2 border-t border-muted/40 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-primary"
                        onClick={() => { setManageKind("department"); setManageOpen(true); }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add new option
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              ) : (
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    readOnly
                    value={form?.department?.name || ""}
                    className="h-11 pl-10 rounded-xl bg-muted/30"
                  />
                </div>
              )}
            </FormField>

            {/* Job Role */}
            <FormField
              label="Job role"
              action={canEdit && <ManageButton onClick={() => { setManageKind("jobRole"); setManageOpen(true); }} />}
            >
              {canEdit ? (
                <Select
                  open={jobRoleSelectOpen}
                  onOpenChange={handleJobRoleOpenChange}
                  value={form.jobRoleId || undefined}
                  onValueChange={(v) => setForm((f: any) => ({ ...f, jobRoleId: v }))}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20">
                    <SelectValue placeholder="Select job role" />
                  </SelectTrigger>
                  <SelectContent>
                    {shouldShowJobRoleSearch && (
                      <SelectSearchInput
                        value={jobRoleSearch}
                        onChange={setJobRoleSearch}
                        placeholder="Search job roles..."
                      />
                    )}
                    {jobRoleOptions.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-2 border-t border-muted/40 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-primary"
                        onClick={() => { setJobRoleSelectOpen(false); setManageKind("jobRole"); setManageOpen(true); }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add new option
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value={form?.jobRole?.name || ""} className="h-11 rounded-xl bg-muted/30" />
              )}
            </FormField>

            {/* Start Date */}
            <FormField label="Start date">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  readOnly={!canEdit}
                  value={form.startDate ? String(form.startDate).substring(0, 10) : ""}
                  onChange={(e) => setForm((f: any) => ({ ...f, startDate: e.target.value }))}
                  className={cn(
                    "h-11 pl-10 rounded-xl",
                    canEdit 
                      ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20" 
                      : "bg-muted/30"
                  )}
                />
              </div>
              {!!startDateDisplay && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {startDateDisplay}
                </div>
              )}
            </FormField>

            {/* Manager */}
            <FormField label="Manager">
              {canEdit ? (
                <Select
                  open={isManagerSelectOpen}
                  onOpenChange={handleManagerOpenChange}
                  value={selectedManagerEmployeeId}
                  onValueChange={(v) => {
                    setSelectedManagerEmployeeId(v);
                    setForm((f: any) => ({ ...f, managerId: v === "none" ? "" : v }));
                  }}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Select Line Manager" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {shouldShowManagerSearch && (
                      <SelectSearchInput
                        value={managerSearch}
                        onChange={setManagerSearch}
                        placeholder="Search managers..."
                      />
                    )}
                    <SelectItem value="none">No manager</SelectItem>
                    {managerOptions.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {getEmployeeDisplayName(emp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    readOnly
                    value={form?.manager ? `${form.manager.firstName ?? ""} ${form.manager.lastName ?? ""}`.trim() : ""}
                    className="h-11 pl-10 rounded-xl bg-muted/30"
                  />
                </div>
              )}
            </FormField>
          </FormSection>
        </EmployeeFormCard>

        {/* Manage Options Modal */}
        <ManageOptionsModal
          open={manageOpen}
          onOpenChange={setManageOpen}
          kind={manageKind}
          options={getManageOptions()}
          onAdd={async (label) => {
            if (manageKind === "employment") {
              await tenantFetch(`/api/employment-type-options`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
            } else if (manageKind === "contract") {
              await tenantFetch(`/api/contract-type-options`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
            } else if (manageKind === "location") {
              await tenantFetch(`/api/locations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label }) });
            } else if (manageKind === "department") {
              await tenantFetch(`/api/departments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label }) });
            } else if (manageKind === "jobRole") {
              await tenantFetch(`/api/job-roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label }) });
            }
            await reloadOptions();
          }}
          onDelete={async (id) => {
            if (manageKind === "employment") {
              await tenantFetch(`/api/employment-type-options`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            } else if (manageKind === "contract") {
              await tenantFetch(`/api/contract-type-options`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            } else if (manageKind === "location") {
              await tenantFetch(`/api/locations`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            } else if (manageKind === "department") {
              await tenantFetch(`/api/departments`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            } else if (manageKind === "jobRole") {
              await tenantFetch(`/api/job-roles`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            }
            await reloadOptions();
          }}
        />

        {/* Save Button */}
        {canEdit && initialValues && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-end pt-4"
          >
            <EmployeeSaveButton
              employeeId={employeeId}
              endpoint="employment-details"
              initialValues={initialValues}
              currentValues={form}
              valueFormatter={(field, value) => {
                if (field === "managerId") {
                  // Display friendly names for manager changes
                  if (!value) return "(none)";
                  const match = employees.find((e) => e.id === value);
                  if (!match) return String(value);
                  const name = `${match.firstName ?? ""} ${match.lastName ?? ""}`.trim();
                  return name || match.email || String(value);
                }
                return String(value ?? "");
              }}
              onSaveSuccess={async () => {
                try {
                  setLoading(true);
                  const res = await tenantFetch(`/api/employees/${employeeId}/employment-details`);
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
          </motion.div>
        )}
      </UnsavedChangesGuard>
    </div>
  );
}
