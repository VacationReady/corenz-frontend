"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Info, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  CalendarDays,
  AlertCircle,
  Sparkles,
  Thermometer
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import { LeaveRequestSuccessAnimation } from "@/components/animations";
import LeaveRuleOverrideDialog, { LeaveValidationWarning } from "@/components/leave/LeaveRuleOverrideDialog";

interface SickLeaveData {
  availableDays: number;
  isEligibleToday: boolean;
  eligibleFrom: string | null;
  nextGrantDate: string | null;
  capDays: number;
  dayLengthHours: number;
}

// Predefined sick leave reasons per NZ standards
const SICK_LEAVE_REASONS = [
  { value: "illness", label: "Personal illness" },
  { value: "injury", label: "Personal injury" },
  { value: "dependent_illness", label: "Caring for dependent (illness)" },
  { value: "dependent_injury", label: "Caring for dependent (injury)" },
  { value: "bereavement", label: "Bereavement" },
  { value: "family_violence", label: "Family violence leave" },
  { value: "other", label: "Other" },
] as const;

interface AddLeaveRequestDialogProps {
  employeeId: string;
  isAdminOrManager: boolean;
  /** Whether the current user is an admin (ADMIN or SUPER_ADMIN) */
  isAdmin?: boolean;
  /** Whether the current user is booking leave for themselves */
  isBookingForSelf?: boolean;
  /** Optional override to control whether sick leave booking is enabled in the UI */
  canBookSickLeaveOverride?: boolean;
  open?: boolean;
  setOpen?: (value: boolean) => void;
  onSubmitted?: () => void;
  sickLeaveData?: SickLeaveData | null;
  initialDate?: Date | null;
}

type EventCategory = {
  id: string;
  name: string;
  subcategories: {
    id: string;
    name: string;
    defaultPaidStatus?: "PAID" | "UNPAID";
    isActive?: boolean;
    eventCategoryId?: string;
  }[];
  iconKey?: string | null;
};

type OtherEntitlement = {
  id: string;
  name: string;
  balance: number;
  unit: string;
};

export default function AddLeaveRequestDialog({
  employeeId,
  isAdminOrManager,
  isAdmin = false,
  isBookingForSelf = true,
  canBookSickLeaveOverride,
  open,
  setOpen,
  onSubmitted,
  sickLeaveData,
  initialDate,
}: AddLeaveRequestDialogProps) {
  // Sick leave toggle is only visible to admins/managers booking for someone else
  // Employees cannot book sick leave for themselves, managers cannot book sick for themselves
  const canBookSickLeave =
    typeof canBookSickLeaveOverride === "boolean"
      ? canBookSickLeaveOverride
      : isAdminOrManager && !isBookingForSelf;
  const [isOpen, setIsOpen] = useState(false);
  const isControlled = open !== undefined && setOpen !== undefined;
  const modalOpen = isControlled ? open : isOpen;
  const handleSetOpen = isControlled ? setOpen : setIsOpen;

  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [otherEntitlements, setOtherEntitlements] = useState<OtherEntitlement[]>([]);
  const [type, setType] = useState("");
  const [selectedOtherEntitlement, setSelectedOtherEntitlement] = useState<string>("");
  const [subcategory, setSubcategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [sickReason, setSickReason] = useState("");
  const [sickReasonId, setSickReasonId] = useState("");
  const [paidStatus, setPaidStatus] = useState("PAID");
  const [totalDays, setTotalDays] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // First-class sick leave toggle
  const [isSickLeave, setIsSickLeave] = useState(false);
  const [fetchedSickLeaveData, setFetchedSickLeaveData] = useState<SickLeaveData | null>(null);
  
  // Use provided sickLeaveData or fetch it
  const effectiveSickLeaveData = sickLeaveData ?? fetchedSickLeaveData;
  
  // Success animation state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    isAutoApproved: boolean;
  } | null>(null);

  // Rule override dialog state
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<LeaveValidationWarning[]>([]);
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/event-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        toast.error("Failed to load leave categories.");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Error fetching leave categories.");
    }
  };

  const fetchOtherEntitlements = async () => {
    // Only fetch for admins booking for someone else
    if (!isAdmin || isBookingForSelf) return;
    
    try {
      const res = await fetch(`/api/employees/${employeeId}/other-entitlements`);
      if (res.ok) {
        const data = await res.json();
        // Filter to only show entitlements with positive balance
        const entitlements = (data.entitlements || []).filter(
          (e: OtherEntitlement) => Number(e.balance) > 0
        );
        setOtherEntitlements(entitlements);
      }
    } catch (error) {
      console.error("Error fetching other entitlements:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (modalOpen) {
      fetchCategories();
      fetchOtherEntitlements();
      // Fetch sick leave data if not provided
      if (!sickLeaveData) {
        fetchSickLeaveData();
      }
    }
  }, [modalOpen, sickLeaveData, isAdmin, isBookingForSelf, employeeId]);

  // Set initial date when provided
  useEffect(() => {
    if (initialDate && !startDate) {
      const dateStr = initialDate.toISOString().slice(0, 10);
      setStartDate(dateStr);
      setEndDate(dateStr);
    }
  }, [initialDate, startDate]);
  
  const fetchSickLeaveData = async () => {
    try {
      const res = await fetch(`/api/employees/${employeeId}/sick-leave-status`);
      if (res.ok) {
        const data = await res.json();
        setFetchedSickLeaveData(data);
      }
    } catch (error) {
      console.error("Error fetching sick leave data:", error);
    }
  };

  const sicknessCategory = useMemo(() => {
    return categories.find((c) => c.name.toLowerCase().includes("sick")) ?? null;
  }, [categories]);

  const configuredSickReasons = useMemo(() => {
    const subs = sicknessCategory?.subcategories ?? [];
    return subs.filter((s) => (s.name ?? "").trim().length > 0);
  }, [sicknessCategory]);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
      setTotalDays(diff > 0 ? diff : 0);
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      (async () => {
        try {
          const res = await fetch(
            `/api/employees/${employeeId}/leave-requests/preview-deduction?startDate=${startDate}&endDate=${endDate}`,
          );
          if (res.ok) {
            const data = await res.json();
            setDeduction(data.deduction);
          } else {
            setDeduction(0);
          }
        } catch {
          setDeduction(0);
        }
      })();
    } else {
      setDeduction(0);
    }
  }, [startDate, endDate, employeeId]);

  const handleSubmit = async (bypassWarnings = false) => {
    // Check if booking against other entitlement
    const isOtherEntitlementBooking = Boolean(selectedOtherEntitlement);
    
    // Validate based on booking type
    if (isOtherEntitlementBooking) {
      if (!startDate || !endDate) {
        toast.error("Please select start and end dates.");
        return;
      }
    } else if (isSickLeave) {
      if (!startDate || !endDate) {
        toast.error("Please select start and end dates.");
        return;
      }
      const hasConfiguredReasons = configuredSickReasons.length > 0;
      if (hasConfiguredReasons ? !sickReasonId : !sickReason) {
        toast.error("Please provide a reason for sickness.");
        return;
      }
      // Check eligibility
      if (effectiveSickLeaveData && !effectiveSickLeaveData.isEligibleToday) {
        toast.error("You are not yet eligible for sick leave.");
        return;
      }
    } else if (!isOtherEntitlementBooking) {
      if (!type || !startDate || !endDate) {
        toast.error("Please fill in all required fields.");
        return;
      }
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date.");
      return;
    }

    const selectedCategory = !isSickLeave && !isOtherEntitlementBooking ? categories.find((cat) => cat.id === type) : null;
    const selectedEntitlement = isOtherEntitlementBooking 
      ? otherEntitlements.find((e) => e.id === selectedOtherEntitlement) 
      : null;

    if (!isSickLeave && !isOtherEntitlementBooking && !selectedCategory) {
      toast.error("Invalid leave type selected.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Other entitlement booking (admin-only)
          ...(isOtherEntitlementBooking ? { otherEntitlementId: selectedOtherEntitlement } : {}),
          // First-class sick leave toggle
          isSick: isSickLeave,
          // Only include eventCategoryId when not sick leave and not other entitlement
          ...(!isSickLeave && !isOtherEntitlementBooking ? { eventCategoryId: type } : {}),
          eventSubcategoryId: subcategory || null,
          startDate,
          endDate,
          reason,
          status: isAdminOrManager ? "APPROVED" : undefined,
          // Sick leave specific fields
          ...(isSickLeave && {
            ...(configuredSickReasons.length > 0
              ? { sickReasonId }
              : { sickReason }),
            paidStatus,
          }),
          // Admin/Manager override flag
          bypassWarnings,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      // Handle warning confirmation flow for admins/managers
      if (data?.requiresConfirmation && data?.warnings?.length > 0) {
        setValidationWarnings(data.warnings);
        setShowOverrideDialog(true);
        setLoading(false);
        return;
      }

      if (!res.ok || data.success === false) {
        if (data?.code === "LEAVE_OVERLAP_FULL_DAY") {
          const attemptedType = isSickLeave
            ? "Sick leave"
            : (selectedCategory?.name ?? "Leave");
          const conflictType = data?.conflict?.eventCategoryName ?? "another leave event";
          const start = typeof data?.conflict?.startDate === "string"
            ? data.conflict.startDate.slice(0, 10)
            : null;
          const end = typeof data?.conflict?.endDate === "string"
            ? data.conflict.endDate.slice(0, 10)
            : null;

          toast.error(`Can’t book ${attemptedType} on these dates`, {
            description: `This employee already has ${conflictType}${start && end ? ` (${start} to ${end})` : ""}. You can’t have sickness and holiday on the same day. Edit or remove the existing event, or choose different dates.`,
          });
          return;
        }

        const errorMessage =
          data?.error ||
          `Failed to submit leave request. Status: ${res.status}`;
        toast.error(errorMessage);
        return;
      }

      // Store success data and show animation
      setSuccessData({
        leaveType: isOtherEntitlementBooking 
          ? (selectedEntitlement?.name ?? "Custom Entitlement")
          : isSickLeave 
            ? "Sick Leave" 
            : (selectedCategory?.name ?? "Leave"),
        startDate,
        endDate,
        totalDays,
        isAutoApproved: isAdminOrManager || isOtherEntitlementBooking,
      });
      handleSetOpen(false);
      setShowSuccess(true);
      
      // Reset form
      setType("");
      setSelectedOtherEntitlement("");
      setSubcategory("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setSickReason("");
      setSickReasonId("");
      setPaidStatus("PAID");
      setTotalDays(0);
      setDeduction(0);
      setIsSickLeave(false);
      setValidationWarnings([]);
      onSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting leave request:", error);
      toast.error(
        error?.message ||
          "An unexpected error occurred while submitting the leave request.",
      );
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

  const totalDeducted = Math.max(0, deduction).toFixed(1);
  const selectedCategory = categories.find((cat) => cat.id === type);
  
  // Determine if submit should be disabled
  const isSickLeaveDisabled = Boolean(
    isSickLeave &&
      effectiveSickLeaveData &&
      !effectiveSickLeaveData.isEligibleToday &&
      effectiveSickLeaveData.availableDays <= 0,
  );
  const isFormIncomplete = selectedOtherEntitlement
    ? !startDate || !endDate
    : isSickLeave
      ? !startDate ||
        !endDate ||
        (configuredSickReasons.length > 0 ? !sickReasonId : !sickReason)
      : !type || !startDate || !endDate;

  return (
    <TooltipProvider>
      <>
        {!isControlled && (
          <Button variant="ghost" onClick={() => handleSetOpen(true)}>
            Book Leave
          </Button>
        )}

        {/* Success Animation */}
        <LeaveRequestSuccessAnimation
          isOpen={showSuccess}
          onClose={() => {
            setShowSuccess(false);
            // Delay clearing successData to allow exit animation to complete
            setTimeout(() => setSuccessData(null), 300);
          }}
          leaveType={successData?.leaveType ?? ""}
          startDate={successData?.startDate ?? ""}
          endDate={successData?.endDate ?? ""}
          totalDays={successData?.totalDays ?? 0}
          isAutoApproved={successData?.isAutoApproved ?? false}
        />

        {/* Rule Override Confirmation Dialog */}
        <LeaveRuleOverrideDialog
          open={showOverrideDialog}
          warnings={validationWarnings}
          onConfirm={handleOverrideConfirm}
          onCancel={handleOverrideCancel}
          isLoading={isOverrideLoading}
        />

        <Dialog
          open={modalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) handleSetOpen(false);
          }}
        >
          <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-2xl rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-8 pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Book Leave
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Request time off from work
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="px-8 pb-8 space-y-6">
                {/* Sick Leave Toggle - Only visible to admins/managers booking for others */}
                {canBookSickLeave && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/20">
                        <Thermometer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-foreground">Sick Leave</Label>
                        <p className="text-xs text-muted-foreground">Register sick leave for this employee</p>
                      </div>
                    </div>
                    <Switch
                      checked={isSickLeave}
                      onChange={setIsSickLeave}
                      aria-label="Sick leave toggle"
                    />
                  </div>
                  
                  {/* Sick Leave Info Panel */}
                  <AnimatePresence>
                    {isSickLeave && effectiveSickLeaveData && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-blue-500/20"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Available balance</span>
                            <span className="font-semibold text-foreground">
                              {effectiveSickLeaveData.availableDays} days
                            </span>
                          </div>
                          {effectiveSickLeaveData.isEligibleToday || effectiveSickLeaveData.availableDays > 0 ? (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Eligible for sick leave</span>
                            </div>
                          ) : effectiveSickLeaveData.eligibleFrom ? (
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-4 h-4" />
                              <span>
                                Not eligible until {effectiveSickLeaveData.eligibleFrom}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-4 h-4" />
                              <span>Not yet eligible for sick leave</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                )}

                {/* Leave Type Selection - Only show when NOT sick leave or when canBookSickLeave is false */}
                <AnimatePresence>
                  {!isSickLeave && !selectedOtherEntitlement && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Label className="text-sm font-medium text-foreground/80">
                        Leave Type <span className="text-primary">*</span>
                      </Label>
                      <Select value={type} onValueChange={(val) => { setType(val); setSelectedOtherEntitlement(""); }}>
                        <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all">
                          <SelectValue placeholder="Select Leave Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => !c.name.toLowerCase().includes('sick')).map((category) => {
                            const Icon = getEventCategoryIcon(category.iconKey);
                            return (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Other Entitlements Section - Admin only, booking for others */}
                <AnimatePresence>
                  {isAdmin && !isBookingForSelf && otherEntitlements.length > 0 && !isSickLeave && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-blue-500/20">
                          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-foreground">Custom Entitlements</Label>
                          <p className="text-xs text-muted-foreground">Book against employee-specific balances (admin only)</p>
                        </div>
                      </div>
                      
                      <Select 
                        value={selectedOtherEntitlement} 
                        onValueChange={(val) => { 
                          setSelectedOtherEntitlement(val === "__none__" ? "" : val); 
                          if (val && val !== "__none__") setType(""); // Clear regular type when selecting other entitlement
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-blue-500/30 bg-white/50 dark:bg-white/5 focus:border-blue-500 focus:ring-blue-500/20 transition-all">
                          <SelectValue placeholder="Select custom entitlement (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">None - use regular leave type</span>
                          </SelectItem>
                          {otherEntitlements.map((entitlement) => (
                            <SelectItem key={entitlement.id} value={entitlement.id}>
                              <div className="flex items-center justify-between gap-4 w-full">
                                <span>{entitlement.name}</span>
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  {entitlement.balance} {entitlement.unit}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {selectedOtherEntitlement && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          This booking will auto-approve and deduct from the custom balance
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subcategory */}
                <AnimatePresence>
                  {selectedCategory && (selectedCategory.subcategories?.length ?? 0) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <Label className="text-sm font-medium text-foreground/80">
                        Subcategory (optional)
                      </Label>
                      <Select value={subcategory} onValueChange={setSubcategory}>
                        <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                          <SelectValue placeholder="Select Subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {selectedCategory.subcategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-foreground/80">
                          End Date <span className="text-primary">*</span>
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-[200px]">
                              If returning to work on Monday, select Sunday as your end date.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Select the last day you will be <em>away</em>. Do not include your return-to-work day.
                  </p>
                </div>

                {/* Summary Cards */}
                {(totalDays > 0 || deduction > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-foreground/80">Total Days</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalDays}</p>
                      <p className="text-xs text-muted-foreground mt-1">Calendar days requested</p>
                    </div>
                    
                    {deduction !== null && deduction > 0 && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-medium text-foreground/80">Days Deducted</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalDeducted}</p>
                        <p className="text-xs text-muted-foreground mt-1">Per working pattern</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Sick Leave Fields - Show when sick leave toggle is ON */}
                <AnimatePresence>
                  {isSickLeave && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Thermometer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-medium text-sm">Sick Leave Details</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">
                            Reason for Sickness <span className="text-primary">*</span>
                          </Label>
                          <Select
                            value={configuredSickReasons.length > 0 ? sickReasonId : sickReason}
                            onValueChange={configuredSickReasons.length > 0 ? setSickReasonId : setSickReason}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {configuredSickReasons.length > 0
                                ? configuredSickReasons.map((sub) => (
                                    <SelectItem key={sub.id} value={sub.id}>
                                      {sub.name}
                                    </SelectItem>
                                  ))
                                : SICK_LEAVE_REASONS.map((reason) => (
                                    <SelectItem key={reason.value} value={reason.value}>
                                      {reason.label}
                                    </SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">Paid Status</Label>
                          <Select value={paidStatus} onValueChange={(v) => setPaidStatus(v)}>
                            <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PAID">Paid</SelectItem>
                              <SelectItem value="UNPAID">Unpaid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* General Reason */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    General Reason (optional)
                  </Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Optional reason for this leave"
                    className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSetOpen(false)}
                    className="h-11 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={loading || isFormIncomplete || isSickLeaveDisabled}
                    className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-semibold shadow-lg shadow-primary/25"
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
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}
