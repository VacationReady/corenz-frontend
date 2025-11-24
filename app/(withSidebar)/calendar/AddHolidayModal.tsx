"use client";

import { ChangeEvent, useEffect, useMemo, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import { CalendarDays, User, Calendar, Sparkles, CheckCircle2 } from "lucide-react";

type EmployeeOption = {
  id: string;
  name: string;
  departmentName: string | null;
  profileImageUrl: string | null;
};

type EventCategory = {
  id: string;
  name: string;
  categoryType?: string;
  iconKey?: string | null;
};

const DropdownSearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) => (
  <div className="sticky top-0 z-10 bg-popover p-2 border-b border-muted/40">
    <Input
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search..."}
      onKeyDown={(e) => e.stopPropagation()}
      autoFocus
      className="h-9"
    />
  </div>
);

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
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
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
        const headers: HeadersInit = {};
        if (session?.user?.companyId) {
          headers["x-company-id"] = session.user.companyId;
        }
        const [empRes, catRes] = await Promise.all([
          fetch("/api/employees?status=active", { headers }),
          fetch("/api/event-categories"),
        ]);
        if (empRes.ok) {
          const data = await empRes.json();
          const opts: EmployeeOption[] = (data || [])
            .map((e: any) => ({
              id: e.id,
              name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email || "Employee",
              departmentName: e.departmentName ?? null,
              profileImageUrl: e.profileImageUrl ?? null,
            }))
            .sort((a: EmployeeOption, b: EmployeeOption) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
            );
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
  }, [open, session?.user?.companyId]);

  useEffect(() => {
    if (!open) {
      setEmployeeSearch("");
    }
  }, [open]);

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) => {
      const nameMatch = e.name.toLowerCase().includes(term);
      const departmentMatch = e.departmentName?.toLowerCase().includes(term);
      return nameMatch || departmentMatch;
    });
  }, [employees, employeeSearch]);

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
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) setOpen(false); }}>
      <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="glass-ultra rounded-3xl overflow-hidden shadow-depth-5"
        >
          {/* Header with gradient accent */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-primary/10 to-blue-500/5" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Add Holiday
                </h2>
                <p className="text-sm text-muted-foreground">
                  Book leave for an employee
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-8 pb-8 max-h-[65vh] overflow-y-auto space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                Employee <span className="text-primary">*</span>
              </Label>
              <Select
                value={employeeId || undefined}
                onValueChange={(value: string) => {
                  if (value === "__clear__") {
                    setEmployeeId("");
                    return;
                  }
                  setEmployeeId(value);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-72 p-0">
                  <DropdownSearchInput
                    value={employeeSearch}
                    onChange={setEmployeeSearch}
                    placeholder="Search employees..."
                  />
                  {employeeId ? (
                    <SelectItem value="__clear__" className="text-muted-foreground">
                      Clear selection
                    </SelectItem>
                  ) : null}
                  {filteredEmployees.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No employees match your search
                    </div>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{employee.name}</span>
                          {employee.departmentName ? (
                            <span className="text-xs text-muted-foreground">
                              {employee.departmentName}
                            </span>
                          ) : null}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Leave Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                Leave Type <span className="text-primary">*</span>
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => {
                    const Icon = getEventCategoryIcon(c.iconKey);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection Section */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted/30">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Date Range</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    Start Date <span className="text-primary">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                    className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    End Date <span className="text-primary">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                    className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                Reason (optional)
              </Label>
              <Input
                value={reason}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                placeholder="Optional note"
                className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !employeeId || !categoryId || !startDate || !endDate}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white font-semibold shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Book Holiday
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}


