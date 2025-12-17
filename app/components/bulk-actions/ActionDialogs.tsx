"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Building2,
  Coins,
  GraduationCap,
  PlaneTakeoff,
  Megaphone,
  ArrowDownToLine,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Calendar,
  Clock,
  FileText,
  Send,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Users,
  DollarSign,
  Percent,
  Mail,
  MessageSquare,
  Link2,
  TestTube,
  Info,
} from "lucide-react";

import { EmployeeSelector, type Option, type EmployeeRow } from "./EmployeeSelector";
import { BulkActionDialogWrapper, ActionButtons } from "./BulkActionDialogWrapper";

export type { Option };

export interface SelectedEmployeeSummary {
  id: string;
  name: string;
  email: string;
}

export interface BulkActionResult {
  processed: number;
  failures: Array<{ employeeId: string; error: string }>;
}

const KEEP_EXISTING_DEPARTMENT = "__keep-existing-department__";
const KEEP_EXISTING_JOB_ROLE = "__keep-existing-job-role__";

// ============================================================================
// DEPARTMENT BULK ACTION DIALOG
// ============================================================================

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: EmployeeRow[];
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
  const [departmentId, setDepartmentId] = useState<string>(KEEP_EXISTING_DEPARTMENT);
  const [jobRoleId, setJobRoleId] = useState<string>(KEEP_EXISTING_JOB_ROLE);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const employeeIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const hasDepartmentChange = departmentId !== KEEP_EXISTING_DEPARTMENT;
  const hasJobRoleChange = jobRoleId !== KEEP_EXISTING_JOB_ROLE;
  const canSubmit = employeeIds.length > 0 && (hasDepartmentChange || hasJobRoleChange) && reason.trim().length > 3 && !submitting;

  const selectedDepartmentLabel = departments.find(d => d.value === departmentId)?.label;
  const selectedJobRoleLabel = jobRoles.find(r => r.value === jobRoleId)?.label;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds,
          departmentId: hasDepartmentChange ? departmentId : undefined,
          jobRoleId: hasJobRoleChange ? jobRoleId : undefined,
          reason,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to apply department changes");
      }
      const payload = (await res.json()) as BulkActionResult;
      toast.success("Team realignment complete", {
        description: `${payload.processed - payload.failures.length} updated`,
      });
      onCompleted?.(payload);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to update departments");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDepartmentId(KEEP_EXISTING_DEPARTMENT);
    setJobRoleId(KEEP_EXISTING_JOB_ROLE);
    setReason("");
    setSelectedIds(new Set());
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  return (
    <BulkActionDialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="Realign Teams"
      description="Move employees between departments or job roles"
      icon={<Building2 className="h-5 w-5" />}
      iconGradient="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500"
      selectedCount={selectedIds.size}
      size="xl"
      footer={
        <ActionButtons
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          submitLabel={`Apply to ${employeeIds.length} employee${employeeIds.length !== 1 ? "s" : ""}`}
          submitDisabled={!canSubmit}
          loading={submitting}
          submitGradient="from-sky-500 to-blue-600"
        />
      }
    >
      <div className="space-y-6">
        <EmployeeSelector
          employees={allEmployees}
          departments={departments}
          jobRoles={jobRoles}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        <div className="space-y-5 p-5 rounded-2xl bg-gradient-to-br from-sky-50/50 to-blue-50/30 dark:from-sky-900/10 dark:to-blue-900/5 border border-sky-200/30">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
            <Sparkles className="h-4 w-4" />
            <h3 className="font-semibold">Configure Changes</h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-500" />
                New Department
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50">
                  <SelectValue placeholder="Keep existing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_EXISTING_DEPARTMENT}>Keep existing</SelectItem>
                  {departments.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                New Job Role
              </Label>
              <Select value={jobRoleId} onValueChange={setJobRoleId}>
                <SelectTrigger className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50">
                  <SelectValue placeholder="Keep existing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_EXISTING_JOB_ROLE}>Keep existing</SelectItem>
                  {jobRoles.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(hasDepartmentChange || hasJobRoleChange) && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-sky-200/30">
              <p className="text-sm font-medium text-foreground mb-2">Changes to be applied:</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {hasDepartmentChange && (
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-500" />
                    Move to <span className="font-medium text-foreground">{selectedDepartmentLabel}</span>
                  </li>
                )}
                {hasJobRoleChange && (
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    Assign role <span className="font-medium text-foreground">{selectedJobRoleLabel}</span>
                  </li>
                )}
              </ul>
            </motion.div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Reason for Change
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why these changes are required"
              rows={3}
              className="rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 resize-none"
            />
          </div>
        </div>
      </div>
    </BulkActionDialogWrapper>
  );
}

// ============================================================================
// COMPENSATION BULK ACTION DIALOG
// ============================================================================

interface EmployeeCompensation {
  id: string;
  name: string;
  email: string;
  salaryAmount: number | null;
  hourlyRate: number | null;
}

interface CompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: EmployeeRow[];
  departments: Option[];
  jobRoles: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}

export function CompensationBulkActionDialog({
  open,
  onOpenChange,
  allEmployees,
  departments,
  jobRoles,
  onCompleted,
}: CompensationDialogProps) {
  const [mode, setMode] = useState<"percent" | "flat">("percent");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [compensationData, setCompensationData] = useState<Map<string, EmployeeCompensation>>(new Map());
  const [loadingCompensation, setLoadingCompensation] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const parsedAmount = Number(amount);
  const amountIsValid = !Number.isNaN(parsedAmount) && amount.trim() !== "";
  const employeeIds = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const fetchCompensationData = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setCompensationData(new Map()); return; }
    setLoadingCompensation(true);
    try {
      const response = await fetch("/api/bulk-actions/compensation/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: ids }),
      });
      if (response.ok) {
        const data: EmployeeCompensation[] = await response.json();
        setCompensationData(new Map(data.map((emp) => [emp.id, emp])));
      }
    } catch (error) {
      console.error("Failed to fetch compensation data:", error);
    } finally {
      setLoadingCompensation(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const visibleIds = allEmployees.filter(e => e.isActive).map(e => e.id);
    fetchCompensationData(visibleIds);
  }, [open, allEmployees, fetchCompensationData]);

  const calculateNewCompensation = useCallback(
    (comp: EmployeeCompensation | undefined) => {
      if (!comp || !amountIsValid) return { newSalary: null, newHourly: null };
      let newSalary: number | null = null;
      let newHourly: number | null = null;
      if (comp.salaryAmount !== null) {
        newSalary = mode === "percent" ? comp.salaryAmount * (1 + parsedAmount / 100) : comp.salaryAmount + parsedAmount;
        newHourly = newSalary / 2080;
      } else if (comp.hourlyRate !== null) {
        newHourly = mode === "percent" ? comp.hourlyRate * (1 + parsedAmount / 100) : comp.hourlyRate + parsedAmount;
        newSalary = newHourly * 2080;
      }
      return { newSalary, newHourly };
    },
    [mode, parsedAmount, amountIsValid]
  );

  const payrollTotals = useMemo(() => {
    let oldTotal = 0;
    let newTotal = 0;
    employeeIds.forEach((id) => {
      const comp = compensationData.get(id);
      if (!comp) return;
      const { newSalary, newHourly } = calculateNewCompensation(comp);
      if (comp.salaryAmount !== null) {
        oldTotal += comp.salaryAmount;
        newTotal += newSalary ?? comp.salaryAmount;
      } else if (comp.hourlyRate !== null) {
        const oldAnnual = comp.hourlyRate * 2080;
        const newAnnual = newHourly ? newHourly * 2080 : oldAnnual;
        oldTotal += oldAnnual;
        newTotal += newAnnual;
      }
    });
    return { oldTotal, newTotal, difference: newTotal - oldTotal };
  }, [employeeIds, compensationData, calculateNewCompensation]);

  const canSubmit = employeeIds.length > 0 && amountIsValid && reason.trim().length > 3 && !submitting;

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const exportToCSV = useCallback(() => {
    const rows = [["Name", "Email", "Current Salary", "New Salary", "Change"]];
    employeeIds.forEach((id) => {
      const comp = compensationData.get(id);
      if (!comp) return;
      const { newSalary } = calculateNewCompensation(comp);
      const currentSalary = comp.salaryAmount ?? 0;
      const finalNewSalary = newSalary ?? currentSalary;
      rows.push([comp.name, comp.email, currentSalary.toFixed(2), finalNewSalary.toFixed(2), (finalNewSalary - currentSalary).toFixed(2)]);
    });
    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compensation-bulk-action-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [employeeIds, compensationData, calculateNewCompensation]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds, mode, amount: parsedAmount, reason }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to apply compensation changes");
      }
      const payload = (await res.json()) as BulkActionResult;
      toast.success("Compensation updated", { description: `${payload.processed - payload.failures.length} updated` });
      onCompleted?.(payload);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to update compensation");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setMode("percent");
    setAmount("");
    setReason("");
    setSelectedIds(new Set());
    setCompensationData(new Map());
  };

  useEffect(() => { if (!open) resetForm(); }, [open]);

  return (
    <BulkActionDialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust Compensation"
      description="Apply salary or hourly rate adjustments"
      icon={<Coins className="h-5 w-5" />}
      iconGradient="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500"
      selectedCount={selectedIds.size}
      size="full"
      footer={
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={exportToCSV} disabled={employeeIds.length === 0 || loadingCompensation} className="rounded-xl">
            <ArrowDownToLine className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-xl">Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl font-semibold text-white shadow-lg bg-gradient-to-r from-sky-500 to-blue-600">
              Apply to {employeeIds.length} employee{employeeIds.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <EmployeeSelector
          employees={allEmployees}
          departments={departments}
          jobRoles={jobRoles}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          maxHeight="240px"
          extraColumnHeaders={
            <>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">New</th>
            </>
          }
          renderExtraColumns={(employee) => {
            const comp = compensationData.get(employee.id);
            const { newSalary } = calculateNewCompensation(comp);
            const currentSalary = comp?.salaryAmount ?? null;
            const hasChange = newSalary !== null && currentSalary !== null && newSalary !== currentSalary;
            return (
              <>
                <td className="px-4 py-3 text-sm">{loadingCompensation ? <span className="text-muted-foreground">Loading...</span> : <span className="font-medium">{formatCurrency(currentSalary)}</span>}</td>
                <td className="px-4 py-3 text-sm">{hasChange ? <span className={cn("font-semibold", newSalary! > currentSalary! ? "text-sky-600" : "text-rose-600")}>{formatCurrency(newSalary)}</span> : <span className="text-muted-foreground">—</span>}</td>
              </>
            );
          }}
        />

        <div className="space-y-5 p-5 rounded-2xl bg-gradient-to-br from-sky-50/50 to-blue-50/30 dark:from-sky-900/10 dark:to-blue-900/5 border border-sky-200/30">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
            <TrendingUp className="h-4 w-4" />
            <h3 className="font-semibold">Adjustment Configuration</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-sky-500" />Adjustment Type</Label>
              <div className="flex rounded-xl overflow-hidden border border-sky-200/50">
                <button type="button" onClick={() => setMode("percent")} className={cn("flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors", mode === "percent" ? "bg-blue-500 text-white" : "bg-white/80 dark:bg-white/5 text-foreground hover:bg-sky-50")}>
                  <Percent className="h-4 w-4" />Percentage
                </button>
                <button type="button" onClick={() => setMode("flat")} className={cn("flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors", mode === "flat" ? "bg-blue-500 text-white" : "bg-white/80 dark:bg-white/5 text-foreground hover:bg-sky-50")}>
                  <DollarSign className="h-4 w-4" />Fixed Amount
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Amount {mode === "percent" ? "(%)" : "($)"}</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={mode === "percent" ? "e.g. 5" : "e.g. 1500"} type="number" step="0.01" className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" />
              <p className="text-xs text-muted-foreground">{mode === "percent" ? "Use negative values to decrease" : "Enter amount to add or subtract"}</p>
            </div>
          </div>

          {employeeIds.length > 0 && amountIsValid && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 sm:grid-cols-3 p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-sky-200/30">
              <div className="text-center p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Current Payroll</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(payrollTotals.oldTotal)}</p>
              </div>
              <div className="text-center p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">New Payroll</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(payrollTotals.newTotal)}</p>
              </div>
              <div className="text-center p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Impact</p>
                <p className={cn("text-2xl font-bold flex items-center justify-center gap-1", payrollTotals.difference >= 0 ? "text-sky-600" : "text-rose-600")}>
                  {payrollTotals.difference >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                  {formatCurrency(Math.abs(payrollTotals.difference))}
                </p>
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Reason for Adjustment</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual review, promotion, market adjustment" rows={3} className="rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 resize-none" />
          </div>
        </div>
      </div>
    </BulkActionDialogWrapper>
  );
}

// ============================================================================
// TRAINING BULK ACTION DIALOG
// ============================================================================

interface TrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: EmployeeRow[];
  departments: Option[];
  jobRoles: Option[];
  courses: Option[];
  providers: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}

export function TrainingBulkActionDialog({ open, onOpenChange, allEmployees, departments, jobRoles, courses, providers, onCompleted }: TrainingDialogProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [providerId, setProviderId] = useState<string>("");
  const [dateCompleted, setDateCompleted] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const employeeIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const canSubmit = employeeIds.length > 0 && courseId !== "" && providerId !== "" && dateCompleted !== "" && reason.trim().length > 3 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/training", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeIds, courseId, providerId, dateCompleted, expiryDate: expiryDate || undefined, reason }) });
      if (!res.ok) { const payload = await res.json().catch(() => ({})); throw new Error(payload?.error || "Failed"); }
      const payload = (await res.json()) as BulkActionResult;
      toast.success("Training records created", { description: `${payload.processed - payload.failures.length} added` });
      onCompleted?.(payload);
      resetForm();
      onOpenChange(false);
    } catch (error: any) { toast.error(error?.message || "Unable to add training"); } finally { setSubmitting(false); }
  };

  const resetForm = () => { setCourseId(""); setProviderId(""); setDateCompleted(""); setExpiryDate(""); setReason(""); setSelectedIds(new Set()); };
  useEffect(() => { if (!open) resetForm(); }, [open]);

  const selectedCourseLabel = courses.find(c => c.value === courseId)?.label;
  const selectedProviderLabel = providers.find(p => p.value === providerId)?.label;

  return (
    <BulkActionDialogWrapper open={open} onOpenChange={onOpenChange} title="Assign Training" description="Create training records" icon={<GraduationCap className="h-5 w-5" />} iconGradient="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" selectedCount={selectedIds.size} size="xl"
      footer={<ActionButtons onCancel={() => onOpenChange(false)} onSubmit={handleSubmit} submitLabel={`Add records for ${employeeIds.length}`} submitDisabled={!canSubmit} loading={submitting} submitGradient="from-sky-500 to-blue-600" />}
    >
      <div className="space-y-6">
        <EmployeeSelector employees={allEmployees} departments={departments} jobRoles={jobRoles} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
        <div className="space-y-5 p-5 rounded-2xl bg-gradient-to-br from-sky-50/50 to-blue-50/30 dark:from-sky-900/10 dark:to-blue-900/5 border border-sky-200/30">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400"><GraduationCap className="h-4 w-4" /><h3 className="font-semibold">Training Details</h3></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label className="text-sm font-medium">Training Course</Label><Select value={courseId} onValueChange={setCourseId}><SelectTrigger className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50"><SelectValue placeholder="Select a course" /></SelectTrigger><SelectContent>{courses.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Training Provider</Label><Select value={providerId} onValueChange={setProviderId}><SelectTrigger className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50"><SelectValue placeholder="Select a provider" /></SelectTrigger><SelectContent>{providers.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-sky-500" />Date Completed</Label><Input type="date" value={dateCompleted} onChange={(e) => setDateCompleted(e.target.value)} className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" />Expiry Date (optional)</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
          </div>
          {courseId && providerId && dateCompleted && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-sky-200/30">
              <p className="text-sm font-medium text-foreground mb-2">Training record summary:</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500" />Course: <span className="font-medium text-foreground">{selectedCourseLabel}</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" />Provider: <span className="font-medium text-foreground">{selectedProviderLabel}</span></li>
                {expiryDate && <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" />Expires: <span className="font-medium text-foreground">{expiryDate}</span></li>}
              </ul>
            </motion.div>
          )}
          <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this training being assigned" rows={3} className="rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 resize-none" /></div>
        </div>
      </div>
    </BulkActionDialogWrapper>
  );
}

// ============================================================================
// LEAVE BULK ACTION DIALOG
// ============================================================================

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: EmployeeRow[];
  departments: Option[];
  jobRoles: Option[];
  eventCategories: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}

export function LeaveBulkActionDialog({ open, onOpenChange, allEmployees, departments, jobRoles, eventCategories, onCompleted }: LeaveDialogProps) {
  const [eventCategoryId, setEventCategoryId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dayType, setDayType] = useState<string>("FULL_DAY");
  const [reason, setReason] = useState<string>("");
  const [forceApprove, setForceApprove] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const employeeIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const canSubmit = employeeIds.length > 0 && eventCategoryId !== "" && startDate !== "" && endDate !== "" && reason.trim().length > 3 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeIds, eventCategoryId, startDate, endDate, dayType, reason, forceApprove }) });
      if (!res.ok) { const payload = await res.json().catch(() => ({})); throw new Error(payload?.error || "Failed"); }
      const payload = (await res.json()) as BulkActionResult;
      toast.success("Leave booked", { description: `${payload.processed - payload.failures.length} created` });
      onCompleted?.(payload);
      resetForm();
      onOpenChange(false);
    } catch (error: any) { toast.error(error?.message || "Unable to book leave"); } finally { setSubmitting(false); }
  };

  const resetForm = () => { setEventCategoryId(""); setStartDate(""); setEndDate(""); setDayType("FULL_DAY"); setReason(""); setForceApprove(false); setSelectedIds(new Set()); };
  useEffect(() => { if (!open) resetForm(); }, [open]);

  const selectedCategoryLabel = eventCategories.find(c => c.value === eventCategoryId)?.label;

  return (
    <BulkActionDialogWrapper open={open} onOpenChange={onOpenChange} title="Book Leave" description="Book time off for multiple employees" icon={<PlaneTakeoff className="h-5 w-5" />} iconGradient="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" selectedCount={selectedIds.size} size="xl"
      footer={<ActionButtons onCancel={() => onOpenChange(false)} onSubmit={handleSubmit} submitLabel={`Book for ${employeeIds.length}`} submitDisabled={!canSubmit} loading={submitting} submitGradient="from-sky-500 to-blue-600" />}
    >
      <div className="space-y-6">
        <EmployeeSelector employees={allEmployees} departments={departments} jobRoles={jobRoles} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
        <div className="space-y-5 p-5 rounded-2xl bg-gradient-to-br from-sky-50/50 to-blue-50/30 dark:from-sky-900/10 dark:to-blue-900/5 border border-sky-200/30">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400"><Calendar className="h-4 w-4" /><h3 className="font-semibold">Leave Details</h3></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label className="text-sm font-medium">Leave Category</Label><Select value={eventCategoryId} onValueChange={setEventCategoryId}><SelectTrigger className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50"><SelectValue placeholder="Select a leave category" /></SelectTrigger><SelectContent>{eventCategories.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-sky-500" />Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-500" />End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Day Type</Label><Select value={dayType} onValueChange={setDayType}><SelectTrigger className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FULL_DAY">Full day</SelectItem><SelectItem value="HALF_DAY_AM">Half day (AM)</SelectItem><SelectItem value="HALF_DAY_PM">Half day (PM)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 flex items-end"><label className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-sky-200/30 cursor-pointer hover:bg-sky-50/50 transition-colors w-full"><Switch checked={forceApprove} onCheckedChange={setForceApprove} /><div><span className="text-sm font-medium text-foreground">Auto-approve</span><p className="text-xs text-muted-foreground">Skip approval workflow</p></div></label></div>
          </div>
          {eventCategoryId && startDate && endDate && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-sky-200/30">
              <p className="text-sm font-medium text-foreground mb-2">Leave summary:</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500" />Type: <span className="font-medium text-foreground">{selectedCategoryLabel}</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" />Period: <span className="font-medium text-foreground">{startDate} to {endDate}</span></li>
                {forceApprove && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="font-medium text-emerald-600">Will be auto-approved</span></li>}
              </ul>
            </motion.div>
          )}
          <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide context for these bookings" rows={3} className="rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 resize-none" /></div>
        </div>
      </div>
    </BulkActionDialogWrapper>
  );
}

// ============================================================================
// MESSAGING BULK ACTION DIALOG
// ============================================================================

interface MessagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: EmployeeRow[];
  departments: Option[];
  jobRoles: Option[];
  onCompleted?: (result: BulkActionResult) => void;
}

export function MessagingBulkActionDialog({ open, onOpenChange, allEmployees, departments, jobRoles, onCompleted }: MessagingDialogProps) {
  const [subject, setSubject] = useState<string>("");
  const [previewText, setPreviewText] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [ctaLabel, setCtaLabel] = useState<string>("");
  const [ctaUrl, setCtaUrl] = useState<string>("");
  const [sendTestTo, setSendTestTo] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const employeeIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const canSubmit = employeeIds.length > 0 && subject.trim().length > 3 && body.trim().length > 5 && reason.trim().length > 3 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-actions/messaging", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeIds, subject, previewText: previewText || undefined, body, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined, sendTestTo: sendTestTo || undefined, reason }) });
      if (!res.ok) { const payload = await res.json().catch(() => ({})); throw new Error(payload?.error || "Failed"); }
      const payload = (await res.json()) as BulkActionResult;
      toast.success("Messages sent", { description: `${payload.processed - payload.failures.length} sent` });
      onCompleted?.(payload);
      resetForm();
      onOpenChange(false);
    } catch (error: any) { toast.error(error?.message || "Unable to send"); } finally { setSubmitting(false); }
  };

  const resetForm = () => { setSubject(""); setPreviewText(""); setBody(""); setCtaLabel(""); setCtaUrl(""); setSendTestTo(""); setReason(""); setSelectedIds(new Set()); };
  useEffect(() => { if (!open) resetForm(); }, [open]);

  return (
    <BulkActionDialogWrapper open={open} onOpenChange={onOpenChange} title="Send Announcement" description="Craft and send messages" icon={<Megaphone className="h-5 w-5" />} iconGradient="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" selectedCount={selectedIds.size} size="xl"
      footer={<ActionButtons onCancel={() => onOpenChange(false)} onSubmit={handleSubmit} submitLabel={`Send to ${employeeIds.length}`} submitDisabled={!canSubmit} loading={submitting} submitIcon={<Send className="h-4 w-4" />} submitGradient="from-sky-500 to-blue-600" />}
    >
      <div className="space-y-6">
        <EmployeeSelector employees={allEmployees} departments={departments} jobRoles={jobRoles} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
        <div className="space-y-5 p-5 rounded-2xl bg-gradient-to-br from-sky-50/50 to-blue-50/30 dark:from-sky-900/10 dark:to-blue-900/5 border border-sky-200/30">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400"><MessageSquare className="h-4 w-4" /><h3 className="font-semibold">Message Content</h3></div>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4 text-sky-500" />Subject Line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter a compelling subject line" className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium flex items-center justify-between"><span className="flex items-center gap-2"><Info className="h-4 w-4 text-blue-500" />Preview Text</span><span className="text-xs text-muted-foreground font-normal">Optional</span></Label><Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Short summary for inbox previews" className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4 text-sky-500" />Message Body</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Write your message here..." className="rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 resize-none" /><p className="text-xs text-muted-foreground">Links will be automatically detected</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label className="text-sm font-medium flex items-center justify-between"><span>CTA Button Label</span><span className="text-xs text-muted-foreground font-normal">Optional</span></Label><Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="e.g. View Policy" className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><Link2 className="h-4 w-4 text-muted-foreground" />CTA URL</Label><Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." type="url" className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium flex items-center gap-2"><TestTube className="h-4 w-4 text-blue-500" />Send Test Email<span className="text-xs text-muted-foreground font-normal ml-auto">Optional</span></Label><Input value={sendTestTo} onChange={(e) => setSendTestTo(e.target.value)} placeholder="your-email@example.com" type="email" className="h-11 rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50" /></div>
          </div>
          <div className="space-y-2 pt-2 border-t border-sky-200/30"><Label className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Reason for Communication</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For audit purposes" rows={2} className="rounded-xl bg-white/80 dark:bg-white/5 border-sky-200/50 resize-none" /></div>
        </div>
      </div>
    </BulkActionDialogWrapper>
  );
}
