"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

type EmployeeOption = {
  id: string;
  name: string;
  departmentName: string | null;
  profileImageUrl: string | null;
};

type EventCategory = {
  id: string;
  name: string;
};

export default function AddHolidayModal({
  open,
  setOpen,
  defaultDate,
  onSubmitted,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  defaultDate: Date | null;
  onSubmitted?: () => void;
}) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const defaultIso = useMemo(() => {
    if (!defaultDate) return "";
    const y = defaultDate.getFullYear();
    const m = String(defaultDate.getMonth() + 1).padStart(2, "0");
    const d = String(defaultDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [defaultDate]);

  useEffect(() => {
    if (!open) return;
    // Prefill dates on open
    setStartDate(defaultIso || "");
    setEndDate(defaultIso || "");
  }, [open, defaultIso]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [empRes, catRes] = await Promise.all([
          fetch("/api/employees?status=active"),
          fetch("/api/event-categories"),
        ]);
        if (empRes.ok) {
          const data = await empRes.json();
          const opts: EmployeeOption[] = (data || []).map((e: any) => ({
            id: e.id,
            name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email || "Employee",
            departmentName: e.departmentName ?? null,
            profileImageUrl: e.profileImageUrl ?? null,
          }));
          setEmployees(opts);
        } else {
          toast.error("Failed to load employees");
        }
        if (catRes.ok) {
          const cats = await catRes.json();
          // Prefer leave/time-off categories if available
          setCategories((cats || []).filter((c: any) => (c.categoryType ?? "").toLowerCase().includes("time")));
        }
      } catch (e) {
        console.error(e);
        toast.error("Error loading data");
      }
    })();
  }, [open]);

  const handleSubmit = async () => {
    if (!employeeId || !categoryId || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCategoryId: categoryId,
          startDate,
          endDate,
          reason: reason || undefined,
          dayType: "FULL_DAY",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        toast.error(data?.error || `Failed to create leave (status ${res.status})`);
        return;
      }
      toast.success("Holiday booked");
      setOpen(false);
      setEmployeeId("");
      setCategoryId("");
      setReason("");
      onSubmitted?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unexpected error while booking holiday");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Add holiday">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Employee</label>
          <select
            className="w-full border rounded p-2"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}{e.departmentName ? ` — ${e.departmentName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Leave type</label>
          <select
            className="w-full border rounded p-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Select leave type</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Start date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium">End date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium">Reason (optional)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !employeeId || !categoryId || !startDate || !endDate}>
            {loading ? "Submitting..." : "Book"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


