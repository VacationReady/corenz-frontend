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
import { 
  CalendarDays, 
  User, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Users, 
  Search,
  Building2,
  Check,
  ChevronDown,
  Palmtree
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    },
  },
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
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const defaultIso = useMemo(() => {
    if (!defaultDate) return "";
    const y = defaultDate.getFullYear();
    const m = String(defaultDate.getMonth() + 1).padStart(2, "0");
    const d = String(defaultDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [defaultDate]);

  useEffect(() => {
    if (!open) return;
    setStartDate(defaultIso || "");
    setEndDate(defaultIso || "");
    setShowSuccess(false);
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
      setEmployeeSearchOpen(false);
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

  const selectedEmp = employees.find((e) => e.id === employeeId);
  const selectedCat = categories.find((c) => c.id === categoryId);

  // Calculate days
  const daysDiff = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diff);
  }, [startDate, endDate]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
      
      setShowSuccess(true);
      toast.success("Leave booked successfully!");
      
      setTimeout(() => {
        setOpen(false);
        setEmployeeId("");
        setCategoryId("");
        setReason("");
        setShowSuccess(false);
        onSubmitted?.();
      }, 1500);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unexpected error while booking holiday");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = employeeId && categoryId && startDate && endDate && daysDiff > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) setOpen(false); }}>
      <DialogContent 
        rawContent 
        className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col"
      >
        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                className="p-4 bg-white/20 rounded-full backdrop-blur-sm mb-4"
              >
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mb-2"
              >
                Leave Booked!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/90 text-sm"
              >
                {daysDiff} {daysDiff === 1 ? "day" : "days"} scheduled for {selectedEmp?.name}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <div className="relative px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg"
                >
                  <Palmtree className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl font-bold text-white"
                  >
                    Book Leave
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/80 text-sm"
                  >
                    Schedule time off for an employee
                  </motion.p>
                </div>
              </div>
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => setOpen(false)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 py-6 flex-1 overflow-y-auto space-y-5"
        >
          {/* Employee Selection */}
          <motion.div variants={itemVariants} className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Employee <span className="text-emerald-500">*</span>
            </Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmployeeSearchOpen(!employeeSearchOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all duration-200",
                  "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
                  employeeSearchOpen
                    ? "border-emerald-500 ring-4 ring-emerald-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-emerald-300",
                  employeeId && "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20"
                )}
              >
                {selectedEmp ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border-2 border-white shadow-md">
                        <AvatarImage src={selectedEmp.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                          {getInitials(selectedEmp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </motion.div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {selectedEmp.name}
                      </div>
                      {selectedEmp.departmentName && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {selectedEmp.departmentName}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    Search for an employee...
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-slate-400 transition-transform duration-200",
                    employeeSearchOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Employee Dropdown */}
              <AnimatePresence>
                {employeeSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          placeholder="Search by name or department..."
                          autoFocus
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border-0 text-sm focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                      {filteredEmployees.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm">No employees found</p>
                        </div>
                      ) : (
                        filteredEmployees.slice(0, 50).map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setEmployeeId(emp.id);
                              setEmployeeSearchOpen(false);
                              setEmployeeSearch("");
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-150",
                              employeeId === emp.id
                                ? "bg-emerald-100 dark:bg-emerald-900/40"
                                : "hover:bg-slate-100 dark:hover:bg-slate-700/50"
                            )}
                          >
                            <Avatar className="w-9 h-9 border border-slate-200 dark:border-slate-600">
                              <AvatarImage src={emp.profileImageUrl || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-xs font-semibold">
                                {getInitials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium text-slate-900 dark:text-white truncate">
                                {emp.name}
                              </div>
                              {emp.departmentName && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {emp.departmentName}
                                </div>
                              )}
                            </div>
                            {employeeId === emp.id && (
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Leave Type */}
          <motion.div variants={itemVariants} className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-500" />
              Leave Type <span className="text-emerald-500">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                className={cn(
                  "h-auto py-3.5 px-4 rounded-xl border-2 transition-all duration-200",
                  "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
                  categoryId
                    ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-700"
                )}
              >
                <SelectValue placeholder="Choose leave type..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl">
                {categories.map((c) => {
                  const Icon = getEventCategoryIcon(c.iconKey);
                  return (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="py-3 px-4 cursor-pointer rounded-lg my-1 focus:bg-emerald-50 dark:focus:bg-emerald-900/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                          <Icon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Date Range */}
          <motion.div variants={itemVariants} className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Date Range <span className="text-emerald-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Start Date
                </span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  End Date
                </span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  min={startDate}
                  className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>
          </motion.div>

          {/* Duration Preview */}
          <AnimatePresence>
            {daysDiff > 0 && selectedEmp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-xl">
                        <Palmtree className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                          {selectedCat?.name || "Leave"} for {selectedEmp.name}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-300">
                          {new Date(startDate).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {startDate !== endDate && ` → ${new Date(endDate).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.p
                        key={daysDiff}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold text-emerald-700 dark:text-emerald-300"
                      >
                        {daysDiff}
                      </motion.p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {daysDiff === 1 ? "day" : "days"}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reason */}
          <motion.div variants={itemVariants} className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Reason <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add any notes about this leave..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all resize-none text-sm placeholder:text-slate-400"
            />
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !isFormValid}
              className={cn(
                "flex-1 h-12 rounded-xl font-semibold transition-all duration-300",
                "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600",
                "hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500",
                "text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Booking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Book Leave
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
