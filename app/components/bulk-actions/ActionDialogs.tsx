"use client";

import { useMemo, useState, useCallback } from "react";
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

interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeIds: string[];
  employees: SelectedEmployeeSummary[];
  onCompleted?: (result: BulkActionResult) => void;
}

interface DepartmentDialogProps extends BaseDialogProps {
  departments: Option[];
  jobRoles: Option[];
}

export function DepartmentBulkActionDialog({
  open,
  onOpenChange,
  employeeIds,
  employees,
  departments,
  jobRoles,
  onCompleted,
}: DepartmentDialogProps) {
  const [departmentId, setDepartmentId] = useState<string>("");
  const [jobRoleId, setJobRoleId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    employeeIds.length > 0 &&
    (departmentId !== "" || jobRoleId !== "") &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = employees.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [employees, employeeIds.length]);

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
        <form onSubmit={handleSubmit} className="space-y-4">
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

export function CompensationBulkActionDialog({
  open,
  onOpenChange,
  employeeIds,
  employees,
  onCompleted,
}: CompensationDialogProps) {
  const [mode, setMode] = useState<"percent" | "flat">("percent");
  const [amount, setAmount] = useState<string>("");
  const [targets, setTargets] = useState<string[]>(["salary"]);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const toggleTarget = (value: string) => {
    setTargets((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const parsedAmount = Number(amount);
  const amountIsValid = !Number.isNaN(parsedAmount) && amount.trim() !== "";

  const canSubmit =
    employeeIds.length > 0 &&
    targets.length > 0 &&
    amountIsValid &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = employees.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [employees, employeeIds.length]);

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
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to update compensation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Adjust compensation">
        <DialogHeader>
          <DialogTitle>Adjust compensation</DialogTitle>
          <DialogDescription>
            {employeeIds.length} employees selected. {employeePreview}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Adjustment type
              </label>
              <Select value={mode} onValueChange={(value) => setMode(value as "percent" | "flat")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select adjustment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Amount
              </label>
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
                  ? "Use negative values to decrease salaries."
                  : "Enter the currency amount to add or subtract."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Apply to
            </label>
            <div className="flex flex-col gap-3">
              <label className="inline-flex items-center gap-3 text-sm">
                <Checkbox
                  checked={targets.includes("salary")}
                  onCheckedChange={() => toggleTarget("salary")}
                />
                Salary amount
              </label>
              <label className="inline-flex items-center gap-3 text-sm">
                <Checkbox
                  checked={targets.includes("hourly")}
                  onCheckedChange={() => toggleTarget("hourly")}
                />
                Hourly rate
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason for adjustment
            </label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the rationale for the adjustment"
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
              Apply adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TrainingDialogProps extends BaseDialogProps {
  courses: Option[];
  providers: Option[];
}

export function TrainingBulkActionDialog({
  open,
  onOpenChange,
  employeeIds,
  employees,
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

  const canSubmit =
    employeeIds.length > 0 &&
    courseId !== "" &&
    providerId !== "" &&
    dateCompleted !== "" &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = employees.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [employees, employeeIds.length]);

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
        <form onSubmit={handleSubmit} className="space-y-4">
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

interface LeaveDialogProps extends BaseDialogProps {
  eventCategories: Option[];
}

export function LeaveBulkActionDialog({
  open,
  onOpenChange,
  employeeIds,
  employees,
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

  const canSubmit =
    employeeIds.length > 0 &&
    eventCategoryId !== "" &&
    startDate !== "" &&
    endDate !== "" &&
    reason.trim().length > 3 &&
    !submitting;

  const employeePreview = useMemo(() => {
    const preview = employees.slice(0, 3).map((emp) => emp.name || emp.email);
    const remaining = employeeIds.length - preview.length;
    if (remaining > 0) {
      preview.push(`+${remaining} more`);
    }
    return preview.join(", ");
  }, [employees, employeeIds.length]);

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
        <form onSubmit={handleSubmit} className="space-y-4">
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
