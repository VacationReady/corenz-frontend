"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { toast } from "sonner";
import { ArrowDownToLine } from "lucide-react";

export interface Option {
  value: string;
  label: string;
}

export interface SelectedEmployeeSummary {
  id: string;
  name: string;
  email: string;
}

export interface BulkActionResult {
  processed: number;
  failures: Array<{ employeeId: string; error: string }>;
}

interface BaseDialogProps {}

interface MessagingEmployee {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  jobRoleId: string | null;
  isActive: boolean;
}

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: MessagingEmployee[];
  departments: Option[];
  jobRoles: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}

export function DepartmentBulkActionDialog({
  open,
  onOpenChange,
  allEmployees,
  departments,
  jobRoles,
  onCompleted,
}: DepartmentDialogProps) {
  const [departmentId, setDepartmentId] = useState<string>("");
  const [jobRoleId, setJobRoleId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState<{
    query: string;
    status: "all" | "active" | "inactive";
    departments: string[];
    jobRoles: string[];
  }>({ query: "", status: "active", departments: ["all"], jobRoles: ["all"] });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEmployees = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return allEmployees.filter((employee) => {
      if (filters.status === "active" && !employee.isActive) return false;
      if (filters.status === "inactive" && employee.isActive) return false;

      if (!filters.departments.includes("all")) {
        if (!employee.departmentId) return false;
        if (!filters.departments.includes(employee.departmentId)) return false;
      }

      if (!filters.jobRoles.includes("all")) {
        if (!employee.jobRoleId) return false;
        if (!filters.jobRoles.includes(employee.jobRoleId)) return false;
      }

      if (query.length > 0) {
        const haystack = `${employee.name} ${employee.email}`
          .toLowerCase()
          .trim();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [allEmployees, filters]);

  const allFilteredSelected = useMemo(
    () =>
      filteredEmployees.length > 0 &&
      filteredEmployees.every((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const someFilteredSelected = useMemo(
    () => filteredEmployees.some((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const selectionState = allFilteredSelected
    ? true
    : someFilteredSelected
    ? "indeterminate"
    : false;

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredEmployees.forEach((employee) => next.delete(employee.id));
      } else {
        filteredEmployees.forEach((employee) => next.add(employee.id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredEmployees]);

  const toggleEmployeeSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedSummaries: SelectedEmployeeSummary[] = useMemo(
    () =>
      allEmployees
        .filter((employee) => selectedIds.has(employee.id))
        .map((employee) => ({ id: employee.id, name: employee.name, email: employee.email })),
    [allEmployees, selectedIds],
  );

  const employeeIds = useMemo(() => selectedSummaries.map((e) => e.id), [selectedSummaries]);

  const canSubmit =
    employeeIds.length > 0 &&
    (departmentId !== "" || jobRoleId !== "") &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = selectedSummaries.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [selectedSummaries, employeeIds.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds,
          departmentId: departmentId || undefined,
          jobRoleId: jobRoleId || undefined,
          reason,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to apply department changes");
      }

      const payload = (await res.json()) as BulkActionResult;
      toast.success("Department updates queued", {
        description: `${payload.processed - payload.failures.length} updated${
          payload.failures.length ? `, ${payload.failures.length} failed` : ""
        }`,
      });
      onCompleted?.(payload);
      setDepartmentId("");
      setJobRoleId("");
      setReason("");
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to update departments");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Change department or job role">
        <DialogHeader>
          <DialogTitle>Change department or job role</DialogTitle>
          <DialogDescription>
            {employeeIds.length} employees selected. {employeePreview}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search</label>
                <Input
                  placeholder="Search by name or email"
                  value={filters.query}
                  onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Employment status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value as typeof prev.status }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active employees</SelectItem>
                    <SelectItem value="inactive">Inactive employees</SelectItem>
                    <SelectItem value="all">All employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Departments</label>
                <MultiSelect
                  options={departments}
                  value={filters.departments}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, departments: value }))}
                  placeholder="Filter departments"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Job roles</label>
                <MultiSelect
                  options={jobRoles}
                  value={filters.jobRoles}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, jobRoles: value }))}
                  placeholder="Filter job roles"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-glass">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Checkbox
                        checked={selectionState}
                        onCheckedChange={() => toggleSelectAllFiltered()}
                        aria-label="Select all filtered employees"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="max-h-64 divide-y divide-border/60 overflow-y-auto bg-background">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm">
                        No employees match your filters yet.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const isSelected = selectedIds.has(employee.id);
                      return (
                        <tr key={employee.id} className={isSelected ? "bg-primary/5" : undefined}>
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                              aria-label={`Select ${employee.name}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            <div>{employee.name}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {employee.isActive ? "Active" : "Inactive"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              New department
            </label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Keep existing departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Keep existing departments</SelectItem>
                {departments.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              New job role
            </label>
            <Select value={jobRoleId} onValueChange={setJobRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Keep existing job roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Keep existing job roles</SelectItem>
                {jobRoles.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason for change
            </label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why these changes are required"
              rows={4}
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={submitting}>
              Apply changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CompensationDialogProps extends BaseDialogProps {}

interface EmployeeCompensation {
  id: string;
  name: string;
  email: string;
  salaryAmount: number | null;
  hourlyRate: number | null;
}

export function CompensationBulkActionDialog({
  open,
  onOpenChange,
  allEmployees,
  departments,
  jobRoles,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: MessagingEmployee[];
  departments: Option[];
  jobRoles: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}) {
  const [mode, setMode] = useState<"percent" | "flat">("percent");
  const [amount, setAmount] = useState<string>("");
  const [targets, setTargets] = useState<string[]>(["salary"]);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [compensationData, setCompensationData] = useState<Map<string, EmployeeCompensation>>(new Map());
  const [loadingCompensation, setLoadingCompensation] = useState(false);

  const toggleTarget = (value: string) => {
    setTargets((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const parsedAmount = Number(amount);
  const amountIsValid = !Number.isNaN(parsedAmount) && amount.trim() !== "";

  const [filters, setFilters] = useState<{
    query: string;
    status: "all" | "active" | "inactive";
    departments: string[];
    jobRoles: string[];
  }>({ query: "", status: "active", departments: ["all"], jobRoles: ["all"] });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch compensation data when selected employees change
  const fetchCompensationData = useCallback(async (employeeIds: string[]) => {
    if (employeeIds.length === 0) {
      setCompensationData(new Map());
      return;
    }

    setLoadingCompensation(true);
    try {
      const response = await fetch("/api/bulk-actions/compensation/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds }),
      });

      if (response.ok) {
        const data: EmployeeCompensation[] = await response.json();
        const dataMap = new Map(data.map((emp) => [emp.id, emp]));
        setCompensationData(dataMap);
      }
    } catch (error) {
      console.error("Failed to fetch compensation data:", error);
    } finally {
      setLoadingCompensation(false);
    }
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return allEmployees.filter((employee) => {
      if (filters.status === "active" && !employee.isActive) return false;
      if (filters.status === "inactive" && employee.isActive) return false;
      if (!filters.departments.includes("all")) {
        if (!employee.departmentId) return false;
        if (!filters.departments.includes(employee.departmentId)) return false;
      }
      if (!filters.jobRoles.includes("all")) {
        if (!employee.jobRoleId) return false;
        if (!filters.jobRoles.includes(employee.jobRoleId)) return false;
      }
      if (query.length > 0) {
        const haystack = `${employee.name} ${employee.email}`.toLowerCase().trim();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [allEmployees, filters]);

  // Prefetch current compensation for all filtered employees so current values are visible
  useEffect(() => {
    if (!open) return;
    if (filteredEmployees.length === 0) {
      setCompensationData(new Map());
      return;
    }
    fetchCompensationData(filteredEmployees.map((e) => e.id));
  }, [open, filteredEmployees, fetchCompensationData]);

  const allFilteredSelected = useMemo(
    () =>
      filteredEmployees.length > 0 &&
      filteredEmployees.every((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const someFilteredSelected = useMemo(
    () => filteredEmployees.some((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const selectionState = allFilteredSelected
    ? true
    : someFilteredSelected
    ? "indeterminate"
    : false;

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredEmployees.forEach((employee) => next.delete(employee.id));
      } else {
        filteredEmployees.forEach((employee) => next.add(employee.id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredEmployees]);

  const toggleEmployeeSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedSummaries: SelectedEmployeeSummary[] = useMemo(
    () =>
      allEmployees
        .filter((employee) => selectedIds.has(employee.id))
        .map((employee) => ({ id: employee.id, name: employee.name, email: employee.email })),
    [allEmployees, selectedIds],
  );

  const employeeIds = useMemo(() => selectedSummaries.map((e) => e.id), [selectedSummaries]);

  // Fetch compensation data when selection changes
  useEffect(() => {
    if (open && employeeIds.length > 0) {
      fetchCompensationData(employeeIds);
    }
  }, [open, employeeIds, fetchCompensationData]);

  // Calculate new salary/hourly rate
  const calculateNewValue = useCallback((current: number | null): number | null => {
    if (current === null || !amountIsValid) return null;
    
    if (mode === "percent") {
      return current * (1 + parsedAmount / 100);
    } else {
      return current + parsedAmount;
    }
  }, [mode, parsedAmount, amountIsValid]);

  // Calculate total cost impact
  const totalCostImpact = useMemo(() => {
    let salaryImpact = 0;
    let hourlyImpact = 0;
    let affectedEmployees = 0;

    employeeIds.forEach((id) => {
      const comp = compensationData.get(id);
      if (!comp) return;

      let hasChange = false;

      if (targets.includes("salary") && comp.salaryAmount !== null) {
        const newValue = calculateNewValue(comp.salaryAmount);
        if (newValue !== null) {
          salaryImpact += newValue - comp.salaryAmount;
          hasChange = true;
        }
      }

      if (targets.includes("hourly") && comp.hourlyRate !== null) {
        const newValue = calculateNewValue(comp.hourlyRate);
        if (newValue !== null) {
          hourlyImpact += newValue - comp.hourlyRate;
          hasChange = true;
        }
      }

      if (hasChange) affectedEmployees++;
    });

    return { salaryImpact, hourlyImpact, total: salaryImpact + (hourlyImpact * 2080), affectedEmployees };
  }, [employeeIds, compensationData, targets, calculateNewValue]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const rows = [
      ["Name", "Email", "Current Salary", "New Salary", "Current Hourly Rate", "New Hourly Rate", "Salary Change", "Hourly Change"],
    ];

    employeeIds.forEach((id) => {
      const comp = compensationData.get(id);
      if (!comp) return;

      const currentSalary = comp.salaryAmount ?? 0;
      const newSalary = targets.includes("salary") ? calculateNewValue(currentSalary) ?? 0 : currentSalary;
      const currentHourly = comp.hourlyRate ?? 0;
      const newHourly = targets.includes("hourly") ? calculateNewValue(currentHourly) ?? 0 : currentHourly;

      rows.push([
        comp.name,
        comp.email,
        currentSalary.toFixed(2),
        newSalary.toFixed(2),
        currentHourly.toFixed(2),
        newHourly.toFixed(2),
        (newSalary - currentSalary).toFixed(2),
        (newHourly - currentHourly).toFixed(2),
      ]);
    });

    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compensation-bulk-action-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  }, [employeeIds, compensationData, targets, calculateNewValue]);

  const canSubmit =
    employeeIds.length > 0 &&
    targets.length > 0 &&
    amountIsValid &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = selectedSummaries.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [selectedSummaries, employeeIds.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds,
          mode,
          amount: parsedAmount,
          targets,
          reason,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to apply compensation changes");
      }

      const payload = (await res.json()) as BulkActionResult;
      toast.success("Compensation updated", {
        description: `${payload.processed - payload.failures.length} updated${
          payload.failures.length ? `, ${payload.failures.length} failed` : ""
        }`,
      });
      onCompleted?.(payload);
      setAmount("");
      setTargets(["salary"]);
      setReason("");
      setSelectedIds(new Set());
      setCompensationData(new Map());
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to update compensation");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Adjust compensation" className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Adjust compensation</DialogTitle>
          <DialogDescription className="text-base">
            {employeeIds.length} employees selected. {employeePreview}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Filters */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search</label>
                <Input
                  placeholder="Search by name or email"
                  value={filters.query}
                  onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Employment status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value as typeof prev.status }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active employees</SelectItem>
                    <SelectItem value="inactive">Inactive employees</SelectItem>
                    <SelectItem value="all">All employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Departments</label>
                <MultiSelect
                  options={departments}
                  value={filters.departments}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, departments: value }))}
                  placeholder="Filter departments"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Job roles</label>
                <MultiSelect
                  options={jobRoles}
                  value={filters.jobRoles}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, jobRoles: value }))}
                  placeholder="Filter job roles"
                />
              </div>
            </div>

            {/* Employee Selection Table */}
            <div className="overflow-hidden rounded-xl border border-glass shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-gradient-to-r from-muted/60 to-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <Checkbox
                          checked={selectionState}
                          onCheckedChange={() => toggleSelectAllFiltered()}
                          aria-label="Select all filtered employees"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Current Salary
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        New Salary
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Current Hourly
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        New Hourly
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-background">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No employees match your filters yet.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const isSelected = selectedIds.has(employee.id);
                        const comp = compensationData.get(employee.id);
                        const newSalary = comp && targets.includes("salary") ? calculateNewValue(comp.salaryAmount) : comp?.salaryAmount;
                        const newHourly = comp && targets.includes("hourly") ? calculateNewValue(comp.hourlyRate) : comp?.hourlyRate;

                        return (
                          <tr 
                            key={employee.id} 
                            className={`${isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"} transition-colors`}
                          >
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                                aria-label={`Select ${employee.name}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{employee.name}</div>
                              <div className="text-xs text-muted-foreground">{employee.email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {loadingCompensation ? (
                                <span className="text-muted-foreground">Loading...</span>
                              ) : (
                                <span className="font-medium">{formatCurrency(comp?.salaryAmount ?? null)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {loadingCompensation ? (
                                <span className="text-muted-foreground">—</span>
                              ) : comp && newSalary !== null && comp.salaryAmount !== null && newSalary !== comp.salaryAmount ? (
                                <span className={`font-semibold ${newSalary > comp.salaryAmount ? "text-green-600" : "text-red-600"}`}>
                                  {formatCurrency(newSalary)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {loadingCompensation ? (
                                <span className="text-muted-foreground">Loading...</span>
                              ) : (
                                <span className="font-medium">{formatCurrency(comp?.hourlyRate ?? null)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {loadingCompensation ? (
                                <span className="text-muted-foreground">—</span>
                              ) : comp && newHourly !== null && comp.hourlyRate !== null && newHourly !== comp.hourlyRate ? (
                                <span className={`font-semibold ${newHourly > comp.hourlyRate ? "text-green-600" : "text-red-600"}`}>
                                  {formatCurrency(newHourly)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Adjustment Configuration */}
          <div className="space-y-4 rounded-xl border border-glass bg-gradient-to-br from-muted/20 to-muted/5 p-6">
            <h3 className="text-lg font-semibold text-foreground">Adjustment Configuration</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Adjustment type</label>
                <Select value={mode} onValueChange={(value) => setMode(value as "percent" | "flat")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select adjustment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Fixed amount (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Amount</label>
                <Input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={mode === "percent" ? "e.g. 5" : "e.g. 1500"}
                  type="number"
                  step="0.01"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {mode === "percent"
                    ? "Use negative values to decrease compensation."
                    : "Enter the currency amount to add or subtract."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Apply to</label>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={targets.includes("salary")}
                    onCheckedChange={() => toggleTarget("salary")}
                  />
                  <span className="font-medium">Salary amount</span>
                </label>
                <label className="inline-flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={targets.includes("hourly")}
                    onCheckedChange={() => toggleTarget("hourly")}
                  />
                  <span className="font-medium">Hourly rate</span>
                </label>
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          {totalCostImpact.affectedEmployees > 0 && (
            <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Total Cost Impact</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Affected Employees</p>
                  <p className="text-2xl font-bold text-foreground">{totalCostImpact.affectedEmployees}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Annual Salary Impact</p>
                  <p className={`text-2xl font-bold ${totalCostImpact.salaryImpact >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(totalCostImpact.salaryImpact)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Estimated Annual Cost (Hourly)</p>
                  <p className={`text-2xl font-bold ${totalCostImpact.hourlyImpact >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(totalCostImpact.hourlyImpact * 2080)}
                  </p>
                  <p className="text-xs text-muted-foreground">Based on 2,080 hours/year</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason for adjustment</label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the rationale for this compensation adjustment (e.g., annual review, promotion, market adjustment)"
              rows={4}
              required
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={exportToCSV}
              disabled={employeeIds.length === 0 || loadingCompensation}
              className="gap-2"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Export CSV
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={submitting}>
              Apply to {employeeIds.length} employee{employeeIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: MessagingEmployee[];
  departments: Option[];
  jobRoles: Option[];
  courses: Option[];
  providers: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}

export function TrainingBulkActionDialog({
  open,
  onOpenChange,
  allEmployees,
  departments,
  jobRoles,
  courses,
  providers,
  onCompleted,
}: TrainingDialogProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [providerId, setProviderId] = useState<string>("");
  const [dateCompleted, setDateCompleted] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState<{
    query: string;
    status: "all" | "active" | "inactive";
    departments: string[];
    jobRoles: string[];
  }>({ query: "", status: "active", departments: ["all"], jobRoles: ["all"] });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEmployees = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return allEmployees.filter((employee) => {
      if (filters.status === "active" && !employee.isActive) return false;
      if (filters.status === "inactive" && employee.isActive) return false;
      if (!filters.departments.includes("all")) {
        if (!employee.departmentId) return false;
        if (!filters.departments.includes(employee.departmentId)) return false;
      }
      if (!filters.jobRoles.includes("all")) {
        if (!employee.jobRoleId) return false;
        if (!filters.jobRoles.includes(employee.jobRoleId)) return false;
      }
      if (query.length > 0) {
        const haystack = `${employee.name} ${employee.email}`.toLowerCase().trim();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [allEmployees, filters]);

  const allFilteredSelected = useMemo(
    () =>
      filteredEmployees.length > 0 &&
      filteredEmployees.every((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const someFilteredSelected = useMemo(
    () => filteredEmployees.some((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const selectionState = allFilteredSelected
    ? true
    : someFilteredSelected
    ? "indeterminate"
    : false;

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredEmployees.forEach((employee) => next.delete(employee.id));
      } else {
        filteredEmployees.forEach((employee) => next.add(employee.id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredEmployees]);

  const toggleEmployeeSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedSummaries: SelectedEmployeeSummary[] = useMemo(
    () =>
      allEmployees
        .filter((employee) => selectedIds.has(employee.id))
        .map((employee) => ({ id: employee.id, name: employee.name, email: employee.email })),
    [allEmployees, selectedIds],
  );

  const employeeIds = useMemo(() => selectedSummaries.map((e) => e.id), [selectedSummaries]);

  const canSubmit =
    employeeIds.length > 0 &&
    courseId !== "" &&
    providerId !== "" &&
    dateCompleted !== "" &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = selectedSummaries.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [selectedSummaries, employeeIds.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds,
          courseId,
          providerId,
          dateCompleted,
          expiryDate: expiryDate || undefined,
          reason,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to add training records");
      }

      const payload = (await res.json()) as BulkActionResult;
      toast.success("Training records created", {
        description: `${payload.processed - payload.failures.length} added${
          payload.failures.length ? `, ${payload.failures.length} failed` : ""
        }`,
      });
      onCompleted?.(payload);
      setCourseId("");
      setProviderId("");
      setDateCompleted("");
      setExpiryDate("");
      setReason("");
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to add training records");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add training records">
        <DialogHeader>
          <DialogTitle>Add training records</DialogTitle>
          <DialogDescription>
            {employeeIds.length} employees selected. {employeePreview}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search</label>
                <Input
                  placeholder="Search by name or email"
                  value={filters.query}
                  onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Employment status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value as typeof prev.status }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active employees</SelectItem>
                    <SelectItem value="inactive">Inactive employees</SelectItem>
                    <SelectItem value="all">All employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-glass">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Checkbox
                        checked={selectionState}
                        onCheckedChange={() => toggleSelectAllFiltered()}
                        aria-label="Select all filtered employees"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="max-h-64 divide-y divide-border/60 overflow-y-auto bg-background">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm">
                        No employees match your filters yet.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const isSelected = selectedIds.has(employee.id);
                      return (
                        <tr key={employee.id} className={isSelected ? "bg-primary/5" : undefined}>
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                              aria-label={`Select ${employee.name}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            <div>{employee.name}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {employee.isActive ? "Active" : "Inactive"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Training course
            </label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent enableSearch>
                {courses.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Training provider
            </label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent enableSearch>
                {providers.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Date completed
              </label>
              <Input
                type="date"
                value={dateCompleted}
                onChange={(event) => setDateCompleted(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Expiry date (optional)
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason for assignment
            </label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this training is being assigned"
              rows={4}
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={submitting}>
              Add records
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: MessagingEmployee[];
  departments: Option[];
  jobRoles: Option[];
  eventCategories: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}

export function LeaveBulkActionDialog({
  open,
  onOpenChange,
  allEmployees,
  departments,
  jobRoles,
  eventCategories,
  onCompleted,
}: LeaveDialogProps) {
  const [eventCategoryId, setEventCategoryId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dayType, setDayType] = useState<string>("FULL_DAY");
  const [reason, setReason] = useState<string>("");
  const [forceApprove, setForceApprove] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState<{
    query: string;
    status: "all" | "active" | "inactive";
    departments: string[];
    jobRoles: string[];
  }>({ query: "", status: "active", departments: ["all"], jobRoles: ["all"] });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEmployees = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return allEmployees.filter((employee) => {
      if (filters.status === "active" && !employee.isActive) return false;
      if (filters.status === "inactive" && employee.isActive) return false;
      if (!filters.departments.includes("all")) {
        if (!employee.departmentId) return false;
        if (!filters.departments.includes(employee.departmentId)) return false;
      }
      if (!filters.jobRoles.includes("all")) {
        if (!employee.jobRoleId) return false;
        if (!filters.jobRoles.includes(employee.jobRoleId)) return false;
      }
      if (query.length > 0) {
        const haystack = `${employee.name} ${employee.email}`.toLowerCase().trim();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [allEmployees, filters]);

  const allFilteredSelected = useMemo(
    () =>
      filteredEmployees.length > 0 &&
      filteredEmployees.every((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const someFilteredSelected = useMemo(
    () => filteredEmployees.some((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const selectionState = allFilteredSelected
    ? true
    : someFilteredSelected
    ? "indeterminate"
    : false;

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredEmployees.forEach((employee) => next.delete(employee.id));
      } else {
        filteredEmployees.forEach((employee) => next.add(employee.id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredEmployees]);

  const toggleEmployeeSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedSummaries: SelectedEmployeeSummary[] = useMemo(
    () =>
      allEmployees
        .filter((employee) => selectedIds.has(employee.id))
        .map((employee) => ({ id: employee.id, name: employee.name, email: employee.email })),
    [allEmployees, selectedIds],
  );

  const employeeIds = useMemo(() => selectedSummaries.map((e) => e.id), [selectedSummaries]);

  const canSubmit =
    employeeIds.length > 0 &&
    eventCategoryId !== "" &&
    startDate !== "" &&
    endDate !== "" &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = selectedSummaries.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [selectedSummaries, employeeIds.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds,
          eventCategoryId,
          startDate,
          endDate,
          dayType,
          reason,
          forceApprove,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to book leave");
      }

      const payload = (await res.json()) as BulkActionResult;
      toast.success("Leave booked", {
        description: `${payload.processed - payload.failures.length} created${
          payload.failures.length ? `, ${payload.failures.length} failed` : ""
        }`,
      });
      onCompleted?.(payload);
      setEventCategoryId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setForceApprove(false);
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to book leave");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Book leave">
        <DialogHeader>
          <DialogTitle>Book leave in bulk</DialogTitle>
          <DialogDescription>
            {employeeIds.length} employees selected. {employeePreview}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search</label>
                <Input
                  placeholder="Search by name or email"
                  value={filters.query}
                  onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Employment status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value as typeof prev.status }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active employees</SelectItem>
                    <SelectItem value="inactive">Inactive employees</SelectItem>
                    <SelectItem value="all">All employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Departments</label>
                <MultiSelect
                  options={departments}
                  value={filters.departments}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, departments: value }))}
                  placeholder="Filter departments"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Job roles</label>
                <MultiSelect
                  options={jobRoles}
                  value={filters.jobRoles}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, jobRoles: value }))}
                  placeholder="Filter job roles"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-glass">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Checkbox
                        checked={selectionState}
                        onCheckedChange={() => toggleSelectAllFiltered()}
                        aria-label="Select all filtered employees"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="max-h-64 divide-y divide-border/60 overflow-y-auto bg-background">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm">
                        No employees match your filters yet.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const isSelected = selectedIds.has(employee.id);
                      return (
                        <tr key={employee.id} className={isSelected ? "bg-primary/5" : undefined}>
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                              aria-label={`Select ${employee.name}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            <div>{employee.name}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {employee.isActive ? "Active" : "Inactive"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Leave category
            </label>
            <Select value={eventCategoryId} onValueChange={setEventCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a leave category" />
              </SelectTrigger>
              <SelectContent enableSearch>
                {eventCategories.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Start date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                End date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Day type
            </label>
            <Select value={dayType} onValueChange={setDayType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_DAY">Full day</SelectItem>
                <SelectItem value="HALF_DAY_AM">Half day (AM)</SelectItem>
                <SelectItem value="HALF_DAY_PM">Half day (PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason for booking
            </label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Provide context for these bookings"
              rows={4}
              required
            />
          </div>

          <label className="inline-flex items-center gap-3 text-sm">
            <Checkbox
              checked={forceApprove}
              onCheckedChange={(checked) => setForceApprove(!!checked)}
            />
            Approve immediately (skip approval workflow)
          </label>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={submitting}>
              Book leave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MessagingEmployee {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  jobRoleId: string | null;
  isActive: boolean;
}

interface MessagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: MessagingEmployee[];
  departments: Option[];
  jobRoles: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}

export function MessagingBulkActionDialog({
  open,
  onOpenChange,
  allEmployees,
  departments,
  jobRoles,
  onCompleted,
}: MessagingDialogProps) {
  const [subject, setSubject] = useState<string>("");
  const [previewText, setPreviewText] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [ctaLabel, setCtaLabel] = useState<string>("");
  const [ctaUrl, setCtaUrl] = useState<string>("");
  const [sendTestTo, setSendTestTo] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState<{
    query: string;
    status: "all" | "active" | "inactive";
    departments: string[];
    jobRoles: string[];
  }>({ query: "", status: "active", departments: ["all"], jobRoles: ["all"] });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEmployees = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return allEmployees.filter((employee) => {
      if (filters.status === "active" && !employee.isActive) return false;
      if (filters.status === "inactive" && employee.isActive) return false;

      if (!filters.departments.includes("all")) {
        if (!employee.departmentId) return false;
        if (!filters.departments.includes(employee.departmentId)) return false;
      }

      if (!filters.jobRoles.includes("all")) {
        if (!employee.jobRoleId) return false;
        if (!filters.jobRoles.includes(employee.jobRoleId)) return false;
      }

      if (query.length > 0) {
        const haystack = `${employee.name} ${employee.email}`
          .toLowerCase()
          .trim();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [allEmployees, filters]);

  const allFilteredSelected = useMemo(
    () =>
      filteredEmployees.length > 0 &&
      filteredEmployees.every((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const someFilteredSelected = useMemo(
    () => filteredEmployees.some((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const selectionState = allFilteredSelected
    ? true
    : someFilteredSelected
    ? "indeterminate"
    : false;

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredEmployees.forEach((employee) => next.delete(employee.id));
      } else {
        filteredEmployees.forEach((employee) => next.add(employee.id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredEmployees]);

  const toggleEmployeeSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedSummaries: SelectedEmployeeSummary[] = useMemo(
    () =>
      allEmployees
        .filter((employee) => selectedIds.has(employee.id))
        .map((employee) => ({ id: employee.id, name: employee.name, email: employee.email })),
    [allEmployees, selectedIds],
  );

  const employeeIds = useMemo(() => selectedSummaries.map((e) => e.id), [selectedSummaries]);

  const canSubmit =
    employeeIds.length > 0 &&
    subject.trim().length > 3 &&
    body.trim().length > 5 &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = selectedSummaries.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [selectedSummaries, employeeIds.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds,
          subject,
          previewText: previewText || undefined,
          body,
          ctaLabel: ctaLabel || undefined,
          ctaUrl: ctaUrl || undefined,
          sendTestTo: sendTestTo || undefined,
          reason,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to send messages");
      }

      const payload = (await res.json()) as BulkActionResult;
      toast.success("Messages sent", {
        description: `${payload.processed - payload.failures.length} sent${
          payload.failures.length ? `, ${payload.failures.length} failed` : ""
        }`,
      });
      onCompleted?.(payload);
      setSubject("");
      setPreviewText("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
      setSendTestTo("");
      setReason("");
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to send messages");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Send announcement">
        <DialogHeader>
          <DialogTitle>Send a bulk announcement</DialogTitle>
          <DialogDescription>
            {employeeIds.length} employees selected. {employeePreview}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search</label>
                <Input
                  placeholder="Search by name or email"
                  value={filters.query}
                  onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Employment status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value as typeof prev.status }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active employees</SelectItem>
                    <SelectItem value="inactive">Inactive employees</SelectItem>
                    <SelectItem value="all">All employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Departments</label>
                <MultiSelect
                  options={departments}
                  value={filters.departments}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, departments: value }))}
                  placeholder="Filter departments"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Job roles</label>
                <MultiSelect
                  options={jobRoles}
                  value={filters.jobRoles}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, jobRoles: value }))}
                  placeholder="Filter job roles"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-glass">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Checkbox
                        checked={selectionState}
                        onCheckedChange={() => toggleSelectAllFiltered()}
                        aria-label="Select all filtered employees"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="max-h-64 divide-y divide-border/60 overflow-y-auto bg-background">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm">
                        No employees match your filters yet.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const isSelected = selectedIds.has(employee.id);
                      return (
                        <tr key={employee.id} className={isSelected ? "bg-primary/5" : undefined}>
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                              aria-label={`Select ${employee.name}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            <div>{employee.name}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {employee.isActive ? "Active" : "Inactive"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subject</label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject line"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Preview text (optional)
            </label>
            <Input
              value={previewText}
              onChange={(event) => setPreviewText(event.target.value)}
              placeholder="Short summary that appears in inbox previews"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Message body
            </label>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              placeholder="Share the full message you want to send"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use paragraphs to keep the message readable. Links will be automatically detected.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Call-to-action label (optional)
              </label>
              <Input
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
                placeholder="e.g. View policy"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Call-to-action URL (optional)
              </label>
              <Input
                value={ctaUrl}
                onChange={(event) => setCtaUrl(event.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Send a test copy first (optional)
            </label>
            <Input
              value={sendTestTo}
              onChange={(event) => setSendTestTo(event.target.value)}
              placeholder="email@example.com"
              type="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason for communication
            </label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this communication is being sent"
              rows={4}
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={submitting}>
              Send message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
