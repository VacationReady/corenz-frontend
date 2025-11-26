"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Calendar, Users, CheckCircle, XCircle, Clock, AlertTriangle, Sparkles, Mail, Building2, Palmtree, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

interface HolidayApprovalModalProps {
  decisionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onDecline: () => void;
}

interface ApprovalDetails {
  id: string;
  leaveRequestId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    department?: string;
  };
  leaveType: {
    id: string;
    name: string;
    color?: string;
  };
  dates: {
    start: string;
    end: string;
    requestedDays: number;
  };
  balance: {
    totalDays: number;
    usedDays: number;
    remainingDays: number;
    remainingAfterApproval: number;
  } | null;
  departmentColleagues: Array<{
    id: string;
    name: string;
    profileImageUrl?: string;
    startDate: string;
    endDate: string;
    leaveType: string;
    leaveColor?: string;
  }>;
  reason?: string;
  dayType?: string;
}

export function HolidayApprovalModal({
  decisionId,
  open,
  onOpenChange,
  onApprove,
  onDecline,
}: HolidayApprovalModalProps) {
  const [processing, setProcessing] = useState(false);

  // Fetch approval details using API hook
  const { data: response, error, isLoading: loading } = useApi<{ success: boolean; data: ApprovalDetails }>(
    decisionId && open ? `/api/approvals/${decisionId}/details` : null
  );

  const details = response?.success ? response.data : null;

  // Handle fetch errors
  useEffect(() => {
    if (error && open) {
      toast.error("Failed to load approval details");
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
  const glassCardInner = "relative backdrop-blur-md bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/80 dark:from-slate-800/80 dark:via-slate-900/60 dark:to-slate-800/80 border border-sky-100/50 dark:border-sky-900/30 rounded-xl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-sky-50 via-white to-cyan-50/50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-0 shadow-2xl overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-sky-400/20 to-cyan-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-blue-400/15 to-teal-400/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-48 h-48 bg-gradient-to-l from-sky-300/10 to-transparent rounded-full blur-2xl" />
        </div>

        {loading ? (
          <div className="relative py-16 text-center">
            <div className="relative mx-auto w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-400 to-cyan-400 animate-spin opacity-30" />
              <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                <Palmtree className="w-6 h-6 text-sky-500 animate-pulse" />
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading request details...</p>
          </div>
        ) : details ? (
          <div className="relative">
            {/* Header Section */}
            <div className="relative px-6 pt-6 pb-4">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 shadow-lg shadow-sky-500/25">
                    <Palmtree className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                      Leave Request
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Review and approve time off</p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {/* Employee Profile Card */}
              <div className={cn(glassCard, "p-5")}>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-full opacity-75 blur-sm" />
                    <Avatar className="relative w-16 h-16 ring-3 ring-white dark:ring-slate-900 shadow-xl">
                      <AvatarImage src={details.employee.profileImageUrl || undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-600 text-white text-lg font-semibold">
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
                        <Building2 className="w-3.5 h-3.5 text-sky-500" />
                        <span className="font-medium">{details.employee.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Leave Type Card */}
                <div className={cn(glassCardInner, "p-4")}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full shadow-lg"
                      style={{ 
                        backgroundColor: details.leaveType.color || "#0ea5e9",
                        boxShadow: `0 4px 12px ${details.leaveType.color || "#0ea5e9"}40`
                      }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Leave Type
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">
                    {details.leaveType.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 font-bold text-xs">
                      {details.dates.requestedDays}
                    </span>
                    <span>{details.dates.requestedDays === 1 ? "day requested" : "days requested"}</span>
                  </p>
                </div>

                {/* Dates Card */}
                <div className={cn(glassCardInner, "p-4")}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Dates
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {formatDate(details.dates.start)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-gradient-to-r from-sky-300 to-cyan-300 dark:from-sky-600 dark:to-cyan-600" />
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">to</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-cyan-300 to-sky-300 dark:from-cyan-600 dark:to-sky-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {formatDate(details.dates.end)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              {details.reason && (
                <div className={cn(glassCardInner, "p-4")}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Reason
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {details.reason}
                  </p>
                </div>
              )}

              {/* Leave Balance Impact */}
              {details.balance && (
                <div className={cn(glassCard, "p-4")}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Balance Impact
                    </h4>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Allowance", value: details.balance.totalDays, color: "text-slate-700 dark:text-slate-200" },
                      { label: "Used", value: details.balance.usedDays, color: "text-slate-700 dark:text-slate-200" },
                      { label: "Current", value: details.balance.remainingDays, color: "text-sky-600 dark:text-sky-400" },
                      { 
                        label: "After", 
                        value: details.balance.remainingAfterApproval, 
                        color: details.balance.remainingAfterApproval < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          {item.label}
                        </p>
                        <p className={cn("text-2xl font-bold tabular-nums", item.color)}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {details.balance.remainingAfterApproval < 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/50 dark:border-rose-800/50 flex items-start gap-2.5">
                      <div className="p-1 rounded-lg bg-rose-100 dark:bg-rose-900/50 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                        <strong className="font-semibold">Negative balance warning:</strong> Approving will result in{" "}
                        <span className="font-bold">{Math.abs(details.balance.remainingAfterApproval)}</span> days deficit.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Team Availability */}
              {details.departmentColleagues.length > 0 ? (
                <div className={cn(glassCard, "p-4")}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                      <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Team Overlap
                    </h4>
                    <span className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                      {details.departmentColleagues.length} {details.departmentColleagues.length === 1 ? "person" : "people"} off
                    </span>
                  </div>
                  <div className="space-y-2">
                    {details.departmentColleagues.slice(0, 3).map((colleague) => (
                      <div
                        key={colleague.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50"
                      >
                        <Avatar className="w-9 h-9 ring-2 ring-white dark:ring-slate-700 shadow">
                          <AvatarImage src={colleague.profileImageUrl || undefined} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-xs font-semibold">
                            {getInitials(colleague.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">
                            {colleague.name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: colleague.leaveColor || "#0ea5e9" }}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">{colleague.leaveType}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(colleague.startDate).toLocaleDateString("en-NZ", { month: "short", day: "numeric" })}
                          <span className="text-slate-300 dark:text-slate-600 mx-1">→</span>
                          {new Date(colleague.endDate).toLocaleDateString("en-NZ", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    ))}
                    {details.departmentColleagues.length > 3 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-1 font-medium">
                        +{details.departmentColleagues.length - 3} more colleagues off
                      </p>
                    )}
                  </div>
                </div>
              ) : details.employee.department ? (
                <div className={cn(glassCardInner, "p-4 flex items-center gap-3")}>
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No other team members from <span className="font-semibold text-slate-800 dark:text-white">{details.employee.department}</span> are scheduled to be off.
                  </p>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={processing}
                  className="min-w-[120px] h-11 rounded-xl font-semibold border-2 border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:border-rose-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-all duration-200"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="min-w-[120px] h-11 rounded-xl font-semibold bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-200"
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
