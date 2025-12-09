"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Mail, 
  Building2, 
  X,
  Calendar,
  Timer,
  DollarSign,
  FileText,
  TrendingUp,
  Coffee
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TimesheetApprovalModalProps {
  timesheetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
}

interface TimesheetEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hours: number;
  notes?: string | null;
  isOvertime: boolean;
  entryType: "CLOCK" | "MANUAL" | "ADJUSTED";
}

interface TimesheetDetails {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    department?: string;
  };
  period: {
    start: string;
    end: string;
    label: string;
  };
  hours: {
    total: number;
    regular: number;
    overtime: number;
    break: number;
  };
  cost?: {
    estimated: number;
    hourlyRate?: number;
    payType: 'HOURLY' | 'SALARY' | 'UNKNOWN';
  } | null;
  entries: TimesheetEntry[];
  submittedAt?: string;
  notes?: string;
  clockEntryCount: number;
}

export function TimesheetApprovalModal({
  timesheetId,
  open,
  onOpenChange,
  onApprove,
  onDecline,
}: TimesheetApprovalModalProps) {
  const [processing, setProcessing] = useState(false);

  // Fetch timesheet details using API hook
  const { data: response, error, isLoading: loading } = useApi<{ success: boolean; data: TimesheetDetails }>(
    timesheetId && open ? `/api/timesheets/${timesheetId}/approval-details` : null
  );

  const details = response?.success ? response.data : null;

  // Handle fetch errors
  useEffect(() => {
    if (error && open) {
      toast.error("Failed to load timesheet details");
      onOpenChange(false);
    }
  }, [error, open, onOpenChange]);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove();
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      await onDecline();
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NZ", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-NZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!open) return null;

  // Glass card styles
  const glassCard = "relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden";
  const glassCardInner = "relative backdrop-blur-md bg-gradient-to-br from-emerald-50/80 via-white/60 to-teal-50/80 dark:from-slate-800/80 dark:via-slate-900/60 dark:to-slate-800/80 border border-emerald-100/50 dark:border-emerald-900/30 rounded-xl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent rawContent className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-0 shadow-2xl overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-green-400/15 to-cyan-400/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-48 h-48 bg-gradient-to-l from-emerald-300/10 to-transparent rounded-full blur-2xl" />
        </div>

        {loading ? (
          <div className="relative py-16 text-center">
            <div className="relative mx-auto w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 animate-spin opacity-30" />
              <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-500 animate-pulse" />
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading timesheet details...</p>
          </div>
        ) : details ? (
          <div className="relative overflow-y-auto max-h-[90vh]">
            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-5 top-5 z-10 p-2 rounded-xl text-slate-400 hover:text-slate-600 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/80 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* Header Section */}
            <div className="relative px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/25">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                    Timesheet Approval
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Review and approve hours worked</p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {/* Employee Profile Card */}
              <div className={cn(glassCard, "p-5")}>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full opacity-75 blur-sm" />
                    <Avatar className="relative w-16 h-16 ring-3 ring-white dark:ring-slate-900 shadow-xl">
                      <AvatarImage src={details.employee.profileImageUrl || undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-lg font-semibold">
                        {getInitials(details.employee.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                      {details.employee.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{details.employee.email}</span>
                    </div>
                    {details.employee.department && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-medium">{details.employee.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Period & Hours Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Period Card */}
                <div className={cn(glassCardInner, "p-4")}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Period
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    {details.period.label}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {formatDate(details.period.start).split(',')[0]} - {formatDate(details.period.end).split(',')[0]}
                  </p>
                </div>

                {/* Total Hours Card */}
                <div className={cn(glassCardInner, "p-4")}>
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Hours
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">
                    {details.hours.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      {details.entries.length}
                    </span>
                    <span>{details.entries.length === 1 ? "entry" : "entries"}</span>
                  </p>
                </div>
              </div>

              {/* Hours Breakdown */}
              <div className={cn(glassCard, "p-4")}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Hours Breakdown
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Regular", value: details.hours.regular, color: "text-slate-700 dark:text-slate-200" },
                    { 
                      label: "Overtime", 
                      value: details.hours.overtime, 
                      color: details.hours.overtime > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-200"
                    },
                    { label: "Break", value: details.hours.break, color: "text-slate-500 dark:text-slate-400", icon: Coffee },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-center gap-1">
                        {item.icon && <item.icon className="w-3 h-3" />}
                        {item.label}
                      </p>
                      <p className={cn("text-xl font-bold tabular-nums", item.color)}>
                        {item.value.toFixed(1)}h
                      </p>
                    </div>
                  ))}
                </div>
                {details.hours.overtime > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-800/50 flex items-start gap-2.5">
                    <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      <strong className="font-semibold">Overtime hours:</strong> This timesheet includes{" "}
                      <span className="font-bold">{details.hours.overtime.toFixed(1)}</span> hours of overtime.
                    </p>
                  </div>
                )}
              </div>

              {/* Cost Summary (if available) */}
              {details.cost && details.cost.estimated > 0 && (
                <div className={cn(glassCard, "p-4")}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Cost Estimate
                    </h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {details.cost.payType === 'HOURLY' && details.cost.hourlyRate 
                          ? `$${details.cost.hourlyRate.toFixed(2)}/hr × ${details.hours.total.toFixed(1)}h`
                          : details.cost.payType === 'SALARY' 
                            ? 'Salaried Employee'
                            : 'Estimated cost'
                        }
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      ${details.cost.estimated.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Timesheet Entries */}
              <div className={cn(glassCard, "p-4")}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Time Entries
                  </h4>
                  {details.clockEntryCount > 0 && (
                    <span className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                      {details.clockEntryCount} from clock
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {details.entries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 dark:text-white text-sm">
                            {format(new Date(entry.date), "EEE, MMM d")}
                          </p>
                          {entry.entryType === "CLOCK" && (
                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                              Clock
                            </span>
                          )}
                          {entry.isOvertime && (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                              OT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                          {entry.breakMinutes > 0 && ` • ${entry.breakMinutes}min break`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 dark:text-white text-sm">
                          {entry.hours.toFixed(2)}h
                        </p>
                      </div>
                    </div>
                  ))}
                  {details.entries.length > 10 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-1 font-medium">
                      +{details.entries.length - 10} more entries
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {details.notes && (
                <div className={cn(glassCardInner, "p-4")}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Notes
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {details.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={processing}
                  className="min-w-[120px] h-11 rounded-xl font-semibold border-2 border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:border-rose-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-all duration-200"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="min-w-[120px] h-11 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200"
                >
                  {processing ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
