"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Calendar,
  CalendarDays,
  UserPlus,
  Users,
  X,
  Search,
  Sparkles,
  Check,
  Clock,
  Palmtree,
  CalendarCheck,
  ChevronDown,
  Building2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import LeaveRuleOverrideDialog, { LeaveValidationWarning } from "@/components/leave/LeaveRuleOverrideDialog";
import { useSession } from "next-auth/react";

interface Employee {
  id: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    profileImageUrl: string | null;
  };
  department?: {
    name: string;
  } | null;
}

interface EventCategory {
  id: string;
  name: string;
  iconKey?: string | null;
  color?: string;
}

interface QuickLeaveBookingModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  defaultStartDate: Date | null;
  defaultEndDate: Date | null;
  onSubmitted: () => void;
}

// Stagger animation variants for children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
} as const;

export default function QuickLeaveBookingModal({
  open,
  setOpen,
  defaultStartDate,
  defaultEndDate,
  onSubmitted,
}: QuickLeaveBookingModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [sickReason, setSickReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Rule override dialog state
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<LeaveValidationWarning[]>([]);
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);
  
  // Discard confirmation dialog state
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as
    | "ADMIN"
    | "SUPER_ADMIN"
    | "MANAGER"
    | "EMPLOYEE"
    | undefined;
  const employeeScope =
    role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER"
      ? "directory"
      : "direct";
  
  // Track previous open state to detect close transitions
  // Initialize to false so first open triggers fetchData
  const prevOpenRef = useRef(false);
  const lastScopeRef = useRef<string | null>(null);

  // Check if form has any user-entered data (dirty state)
  const hasUnsavedChanges = useCallback(() => {
    return !!(selectedEmployee || selectedCategory || reason || sickReason);
  }, [selectedEmployee, selectedCategory, reason, sickReason]);

  // Handle close with confirmation if form has data
  const handleClose = useCallback(() => {
    if (loading) return;
    
    if (hasUnsavedChanges()) {
      setShowDiscardDialog(true);
    } else {
      setOpen(false);
    }
  }, [loading, hasUnsavedChanges, setOpen]);

  // Confirm discard and close
  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    setOpen(false);
  }, [setOpen]);

  useEffect(() => {
    // Detect when modal transitions from open to closed
    if (prevOpenRef.current && !open) {
      // Modal is closing - reset all form state
      resetForm();
      setEmployeeSearchOpen(false);
      setShowSuccess(false);
      setShowDiscardDialog(false);
      setValidationWarnings([]);
    }
    
    if (open && !prevOpenRef.current) {
      // Modal is opening - fetch data and apply default dates
      fetchData();
      lastScopeRef.current = employeeScope;
      if (defaultStartDate) {
        setStartDate(defaultStartDate.toISOString().split("T")[0]);
      }
      if (defaultEndDate) {
        setEndDate(defaultEndDate.toISOString().split("T")[0]);
      }
    }
    
    prevOpenRef.current = open;
  }, [open, defaultStartDate, defaultEndDate]);

  useEffect(() => {
    if (!open) return;
    if (lastScopeRef.current === employeeScope) return;
    lastScopeRef.current = employeeScope;
    fetchData();
  }, [employeeScope, open]);

  const fetchData = async () => {
    setIsFetchingData(true);
    setEmployeesError(null);
    setCategoriesError(null);
    try {
      const categoriesPromise = fetch("/api/event-categories");

      let allEmployees: any[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      let iterations = 0;

      while (hasMore && iterations < 20) {
        const url: string = `/api/employees?scope=${employeeScope}&limit=100${
          cursor ? `&cursor=${cursor}` : ""
        }`;
        const empRes: Response = await fetch(url, { cache: "no-store" });

        if (!empRes.ok) {
          setEmployeesError("Failed to load employees");
          toast.error("Failed to load employees");
          allEmployees = [];
          break;
        }

        const empData: any = await empRes.json();
        const employeePage = Array.isArray(empData)
          ? empData
          : (empData.data || []);
        allEmployees = allEmployees.concat(employeePage);

        if (empData.pagination) {
          cursor = empData.pagination.cursor;
          hasMore = empData.pagination.hasMore;
        } else {
          hasMore = false;
        }

        iterations += 1;
      }

      const mappedEmployees = allEmployees.map((emp: any) => ({
        id: emp.id,
        user: {
          firstName: emp.firstName,
          lastName: emp.lastName,
          name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || null,
          profileImageUrl: emp.profileImageUrl,
        },
        department: emp.departmentName ? { name: emp.departmentName } : null,
      }));
      setEmployees(mappedEmployees);

      const catRes = await categoriesPromise;
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      } else {
        setCategoriesError("Failed to load leave types");
        toast.error("Failed to load leave types");
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setEmployeesError((prev) => prev ?? "Failed to load employees");
      setCategoriesError((prev) => prev ?? "Failed to load leave types");
      toast.error("Failed to load data");
    } finally {
      setIsFetchingData(false);
    }
  };

  const employeeSelectionDisabled =
    isFetchingData || !!employeesError || employees.length === 0;
  const categorySelectionDisabled =
    isFetchingData || !!categoriesError || categories.length === 0;

  useEffect(() => {
    if (employeeSelectionDisabled) {
      setEmployeeSearchOpen(false);
    }
  }, [employeeSelectionDisabled]);

  const handleSubmit = async (bypassWarnings = false) => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    if (!selectedCategory) {
      toast.error("Please select a leave type");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    setLoading(true);
    try {
      // Check if selected category is sick leave
      const isSickCategory = selectedCat?.name?.toLowerCase().includes('sick') ?? false;
      
      // Validate sick reason is provided for sick leave
      if (isSickCategory && !sickReason) {
        toast.error("Please select a reason for sickness");
        setLoading(false);
        return;
      }
      
      const res = await fetch(`/api/employees/${selectedEmployee}/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // First-class sick leave flag
          isSick: isSickCategory,
          // Only include eventCategoryId when not sick leave
          ...(isSickCategory ? {} : { eventCategoryId: selectedCategory }),
          startDate,
          endDate,
          reason,
          dayType: "FULL_DAY",
          // Include sickReason if it's sick leave
          ...(isSickCategory ? { sickReason } : {}),
          // Admin/Manager override flag
          bypassWarnings,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Handle warning confirmation flow for admins/managers
      if (data?.requiresConfirmation && data?.warnings?.length > 0) {
        setValidationWarnings(data.warnings);
        setShowOverrideDialog(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Failed to book leave");
        return;
      }

      // Show success animation
      setShowSuccess(true);
      toast.success("Leave booked successfully!");
      
      // Close after success animation
      setTimeout(() => {
        setOpen(false);
        resetForm();
        onSubmitted();
      }, 1500);
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle override confirmation
  const handleOverrideConfirm = async () => {
    setIsOverrideLoading(true);
    setShowOverrideDialog(false);
    await handleSubmit(true); // Resubmit with bypassWarnings=true
    setIsOverrideLoading(false);
    setValidationWarnings([]);
  };

  const handleOverrideCancel = () => {
    setShowOverrideDialog(false);
    setValidationWarnings([]);
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedCategory("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setSickReason("");
    setEmployeeSearch("");
    setShowSuccess(false);
  };
  
  // Predefined sick leave reasons
  const SICK_LEAVE_REASONS = [
    { value: "illness", label: "Personal illness" },
    { value: "injury", label: "Personal injury" },
    { value: "dependent_illness", label: "Caring for dependent (illness)" },
    { value: "dependent_injury", label: "Caring for dependent (injury)" },
    { value: "bereavement", label: "Bereavement" },
    { value: "family_violence", label: "Family violence leave" },
    { value: "other", label: "Other" },
  ];

  const selectedEmp = employees.find((e) => e.id === selectedEmployee);
  const selectedCat = categories.find((c) => c.id === selectedCategory);
  
  // Check if selected category is sick leave
  const isSickCategory = selectedCat?.name?.toLowerCase().includes('sick') ?? false;

  const leaveTypePlaceholder = isFetchingData
    ? "Loading leave types..."
    : categoriesError
      ? "Failed to load leave types"
      : categories.length === 0
        ? "No leave types available"
        : "Choose leave type...";

  const getEmployeeName = (emp: Employee) => {
    return emp.user?.name || `${emp.user?.firstName || ""} ${emp.user?.lastName || ""}`.trim() || "Unknown";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.toLowerCase().trim();
    if (!term) return employees;
    return employees.filter((emp) => {
      const name = getEmployeeName(emp).toLowerCase();
      const dept = emp.department?.name?.toLowerCase() || "";
      return name.includes(term) || dept.includes(term);
    });
  }, [employees, employeeSearch]);

  // Calculate days between dates using UTC to avoid timezone issues
  const daysDiff = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Use UTC dates to get accurate calendar day count regardless of timezone
    const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const diff = Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diff);
  }, [startDate, endDate]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-NZ", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isFormValid = selectedEmployee && selectedCategory && startDate && endDate && daysDiff > 0;

  if (!open) return null;

  return (
    <>
      {/* Rule Override Confirmation Dialog */}
      <LeaveRuleOverrideDialog
        open={showOverrideDialog}
        warnings={validationWarnings}
        onConfirm={handleOverrideConfirm}
        onCancel={handleOverrideCancel}
        isLoading={isOverrideLoading}
      />
      
      {/* Discard Changes Confirmation Dialog */}
      <AnimatePresence>
        {showDiscardDialog && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDiscardDialog(false)}
            />
            <motion.div
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Discard changes?
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                You have unsaved changes. Are you sure you want to close without saving?
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDiscardDialog(false)}
                  className="flex-1 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700"
                >
                  Keep editing
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Discard
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Overlay */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700"
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
                    {daysDiff} {daysDiff === 1 ? "day" : "days"} of leave scheduled
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700" />
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
                    onClick={handleClose}
                    disabled={loading}
                    className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="p-6 space-y-5"
            >
              {/* Employee Selection */}
              <motion.div variants={itemVariants} className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Employee <span className="text-rose-500">*</span>
                </Label>
                {(employeesError || (employees.length === 0 && !isFetchingData)) && (
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("font-medium", employeesError ? "text-rose-600" : "text-slate-500")}>
                      {employeesError ?? "No employees available"}
                    </span>
                    {employeesError && (
                      <button
                        type="button"
                        onClick={fetchData}
                        disabled={isFetchingData}
                        className="text-blue-600 hover:text-blue-700 font-medium underline disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setEmployeeSearchOpen(!employeeSearchOpen)}
                    disabled={employeeSelectionDisabled}
                    data-testid="quick-leave-employee-trigger"
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all duration-200",
                      "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
                      employeeSearchOpen
                        ? "border-blue-600 ring-4 ring-blue-600/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-blue-300",
                      selectedEmployee && "border-blue-200 bg-blue-50/50 dark:bg-blue-900/20",
                      employeeSelectionDisabled && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {selectedEmp ? (
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-10 h-10 border-2 border-white shadow-md">
                            <AvatarImage src={selectedEmp.user?.profileImageUrl || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-semibold">
                              {getInitials(getEmployeeName(selectedEmp))}
                            </AvatarFallback>
                          </Avatar>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center"
                          >
                            <Check className="w-2.5 h-2.5 text-white" />
                          </motion.div>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {getEmployeeName(selectedEmp)}
                          </div>
                          {selectedEmp.department && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {selectedEmp.department.name}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        {isFetchingData ? (
                          <span
                            className="flex items-center gap-2"
                            data-testid="quick-leave-employees-loading"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-500 rounded-full"
                            />
                            Loading employees...
                          </span>
                        ) : employeesError ? (
                          "Failed to load employees"
                        ) : employees.length === 0 ? (
                          "No employees available"
                        ) : (
                          "Search for an employee..."
                        )}
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
                        className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                      >
                        {isFetchingData ? (
                          <div
                            className="flex items-center gap-2 p-4 text-sm text-slate-500"
                            data-testid="quick-leave-employees-loading-dropdown"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-500 rounded-full"
                            />
                            Loading employees...
                          </div>
                        ) : employeesError ? (
                          <div className="p-4 text-sm">
                            <div className="text-rose-600 font-medium">Failed to load employees</div>
                            <button
                              type="button"
                              onClick={fetchData}
                              className="mt-2 text-blue-600 hover:text-blue-700 font-medium underline"
                            >
                              Retry
                            </button>
                          </div>
                        ) : employees.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">No employees available</p>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="text"
                                  value={employeeSearch}
                                  onChange={(e) => setEmployeeSearch(e.target.value)}
                                  placeholder="Search by name or department..."
                                  autoFocus
                                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-0 text-sm focus:ring-2 focus:ring-blue-600/30 outline-none transition-all"
                                />
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
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
                                      setSelectedEmployee(emp.id);
                                      setEmployeeSearchOpen(false);
                                      setEmployeeSearch("");
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150",
                                      selectedEmployee === emp.id
                                        ? "bg-blue-100 dark:bg-blue-900/40"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                    )}
                                  >
                                    <Avatar className="w-9 h-9 border border-slate-200 dark:border-slate-600">
                                      <AvatarImage src={emp.user?.profileImageUrl || undefined} />
                                      <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-xs font-semibold">
                                        {getInitials(getEmployeeName(emp))}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left min-w-0">
                                      <div className="font-medium text-slate-900 dark:text-white truncate">
                                        {getEmployeeName(emp)}
                                      </div>
                                      {emp.department && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                          {emp.department.name}
                                        </div>
                                      )}
                                    </div>
                                    {selectedEmployee === emp.id && (
                                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Leave Type */}
              <motion.div variants={itemVariants} className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  Leave Type <span className="text-rose-500">*</span>
                </Label>
                {(categoriesError || (categories.length === 0 && !isFetchingData)) && (
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("font-medium", categoriesError ? "text-rose-600" : "text-slate-500")}>
                      {categoriesError ?? "No leave types available"}
                    </span>
                    {categoriesError && (
                      <button
                        type="button"
                        onClick={fetchData}
                        disabled={isFetchingData}
                        className="text-blue-600 hover:text-blue-700 font-medium underline disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  disabled={categorySelectionDisabled}
                >
                  <SelectTrigger
                    data-testid="quick-leave-category-trigger"
                    className={cn(
                      "h-auto py-3.5 px-4 rounded-2xl border-2 transition-all duration-200",
                      "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
                      selectedCategory
                        ? "border-blue-200 bg-blue-50/50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <SelectValue placeholder={leaveTypePlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-xl">
                    {[...categories]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((cat) => {
                      const Icon = getEventCategoryIcon(cat.iconKey);
                      return (
                        <SelectItem
                          key={cat.id}
                          value={cat.id}
                          className="py-3 px-4 cursor-pointer rounded-xl my-1 focus:bg-blue-50 dark:focus:bg-blue-900/30"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{
                                backgroundColor: cat.color ? `${cat.color}20` : "#2563eb20",
                              }}
                            >
                              <Icon
                                className="w-4 h-4"
                                style={{ color: cat.color || "#2563eb" }}
                              />
                            </div>
                            <span className="font-medium">{cat.name}</span>
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
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Date Range <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Start Date
                    </span>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      End Date
                    </span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20 transition-all"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Duration Preview Card */}
              <AnimatePresence>
                {daysDiff > 0 && selectedEmp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-xl">
                            <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                              {formatDate(startDate)} → {formatDate(endDate)}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-300">
                              {selectedCat?.name || "Leave"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <motion.p
                            key={daysDiff}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-2xl font-bold text-blue-700 dark:text-blue-300"
                          >
                            {daysDiff}
                          </motion.p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {daysDiff === 1 ? "day" : "days"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sick Leave Reason - Only show when sick category selected */}
              <AnimatePresence>
                {isSickCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-500" />
                      Reason for Sickness <span className="text-rose-500">*</span>
                    </Label>
                    <Select value={sickReason} onValueChange={setSickReason}>
                      <SelectTrigger
                        className={cn(
                          "h-auto py-3.5 px-4 rounded-2xl border-2 transition-all duration-200",
                          "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30",
                          sickReason
                            ? "border-amber-300 dark:border-amber-700"
                            : "border-amber-200 dark:border-amber-800"
                        )}
                      >
                        <SelectValue placeholder="Select reason for sickness..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-xl">
                        {SICK_LEAVE_REASONS.map((reason) => (
                          <SelectItem
                            key={reason.value}
                            value={reason.value}
                            className="py-3 px-4 cursor-pointer rounded-xl my-1"
                          >
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reason */}
              <motion.div variants={itemVariants} className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  {isSickCategory ? "Additional Notes" : "Reason"} <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={isSickCategory ? "Add any additional notes..." : "Add any notes about this leave..."}
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20 transition-all resize-none text-sm placeholder:text-slate-400"
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
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading || !isFormValid}
                  className={cn(
                    "flex-1 h-12 rounded-2xl font-semibold transition-all duration-300",
                    "bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700",
                    "hover:from-blue-500 hover:via-blue-500 hover:to-blue-600",
                    "text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40",
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
