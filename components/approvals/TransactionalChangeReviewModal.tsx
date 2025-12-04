"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";
import { 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  FileEdit, 
  X,
  CalendarDays,
  Sparkles,
  Building2,
  Mail
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

interface AuditDiff {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

interface TransactionalChangeReviewModalProps {
  open: boolean;
  item: any | null;
  processing?: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => Promise<void> | void;
  onDecline: () => Promise<void> | void;
}

function getEmployeeName(item: any): string {
  if (!item) return "Employee";

  if (typeof item.employeeDisplayName === "string" && item.employeeDisplayName.trim()) {
    return item.employeeDisplayName.trim();
  }

  const empUser = item.Employee?.User || item.employee?.user;
  if (empUser) {
    if (typeof empUser.name === "string" && empUser.name.trim()) {
      return empUser.name.trim();
    }
    const composed = `${empUser.firstName ?? ""} ${empUser.lastName ?? ""}`.trim();
    if (composed) return composed;
    if (empUser.email) return empUser.email;
  }

  return "Employee";
}

function getEmployeeEmail(item: any): string | null {
  if (!item) return null;
  const empUser = item.Employee?.User || item.employee?.user;
  return empUser?.email || null;
}

function getEmployeeDepartment(item: any): string | null {
  if (!item) return null;
  const emp = item.Employee || item.employee;
  return emp?.department?.name || emp?.Department?.name || null;
}

function getEmployeeAvatar(item: any): string | null {
  if (!item) return null;
  const emp = item.Employee || item.employee;
  return emp?.profileImageUrl || emp?.User?.image || item.employee?.user?.image || null;
}

function getRequesterName(item: any): string | null {
  if (!item) return null;

  if (typeof item.actorDisplayName === "string" && item.actorDisplayName.trim()) {
    return item.actorDisplayName.trim();
  }

  const u = item.Requester || item.actor;
  if (!u) return null;

  if (typeof u.name === "string" && u.name.trim()) {
    return u.name.trim();
  }

  const composed = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  if (composed) return composed;

  return u.email || null;
}

function formatSubmittedAt(dateString?: string | null): string | null {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-NZ", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getSectionIcon(section: string) {
  const normalized = section?.toLowerCase() || "";
  if (normalized.includes("personal") || normalized.includes("contact")) return "👤";
  if (normalized.includes("employment") || normalized.includes("job")) return "💼";
  if (normalized.includes("bank") || normalized.includes("payment")) return "🏦";
  if (normalized.includes("emergency")) return "🚨";
  if (normalized.includes("address")) return "📍";
  if (normalized.includes("tax")) return "📋";
  return "📝";
}

export function TransactionalChangeReviewModal({
  open,
  item,
  processing = false,
  onOpenChange,
  onApprove,
  onDecline,
}: TransactionalChangeReviewModalProps) {
  if (!open || !item) return null;

  const diffs: AuditDiff[] = Array.isArray(item.diffs) ? item.diffs : [];
  const reasons: Record<string, string> = (item.reasons as Record<string, string>) || {};
  const employeeName = getEmployeeName(item);
  const employeeEmail = getEmployeeEmail(item);
  const employeeDepartment = getEmployeeDepartment(item);
  const employeeAvatar = getEmployeeAvatar(item);
  const requesterName = getRequesterName(item);
  const submittedAt = formatSubmittedAt(item.createdAt as string | undefined);
  const sectionName = item.section || "Profile";
  const sectionIcon = getSectionIcon(sectionName);

  // Glass card styles matching HolidayApprovalModal
  const glassCard = "relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden";
  const glassCardInner = "relative backdrop-blur-md bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/80 dark:from-slate-800/80 dark:via-slate-900/60 dark:to-slate-800/80 border border-sky-100/50 dark:border-sky-900/30 rounded-xl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent rawContent className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-sky-50 via-white to-cyan-50/50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-0 shadow-2xl overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-sky-400/20 to-cyan-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-blue-400/15 to-teal-400/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-48 h-48 bg-gradient-to-l from-sky-300/10 to-transparent rounded-full blur-2xl" />
        </div>

        <div className="relative overflow-y-auto max-h-[90vh]">
          {/* Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-5 z-10 p-2 rounded-xl text-slate-400 hover:text-slate-600 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/80 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </button>

          {/* Header Section */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 shadow-lg shadow-sky-500/25">
                <FileEdit className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                  Change Request
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Review profile update request</p>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Employee Profile Card */}
            <div className={cn(glassCard, "p-5")}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-full opacity-75 blur-sm" />
                  <Avatar className="relative w-16 h-16 ring-3 ring-white dark:ring-slate-900 shadow-xl">
                    <AvatarImage src={employeeAvatar || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-600 text-white text-lg font-semibold">
                      {getInitials(employeeName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                    {employeeName}
                  </h3>
                  {employeeEmail && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{employeeEmail}</span>
                    </div>
                  )}
                  {employeeDepartment && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-sky-500" />
                      <span className="font-medium">{employeeDepartment}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Request Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Section Card */}
              <div className={cn(glassCardInner, "p-4")}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{sectionIcon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Section
                  </span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                  {sectionName}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 font-bold text-xs">
                    {diffs.length}
                  </span>
                  <span>{diffs.length === 1 ? "field change" : "field changes"}</span>
                </p>
              </div>

              {/* Submitted Card */}
              <div className={cn(glassCardInner, "p-4")}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-3.5 h-3.5 text-sky-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Submitted
                  </span>
                </div>
                {submittedAt ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {submittedAt}
                    </p>
                    {requesterName && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <User className="w-3 h-3" />
                        <span>by {requesterName}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Recently submitted</p>
                )}
              </div>
            </div>

            {/* Field Changes Section */}
            <div className={cn(glassCard, "p-4")}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                </div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Proposed Changes
                </h4>
              </div>

              {diffs.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No field-level changes were recorded for this request.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {diffs.map((diff, index) => {
                    const reason = reasons[diff.field];
                    return (
                      <div
                        key={`${diff.field}-${index}`}
                        className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-100/80 dark:border-slate-700/50"
                      >
                        {/* Field Label */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-100 to-cyan-100 dark:from-sky-900/50 dark:to-cyan-900/50 text-sky-700 dark:text-sky-300 uppercase tracking-wide">
                            {labelForField(diff.field)}
                          </span>
                        </div>

                        {/* Value Changes */}
                        <div className="flex items-center gap-3">
                          {/* Old Value */}
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                              Current
                            </span>
                            <div className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30">
                              <p className="text-sm font-medium text-rose-800 dark:text-rose-200 break-words">
                                {formatAuditValue(diff.oldValue) || (
                                  <span className="italic text-rose-400 dark:text-rose-600">Empty</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/25">
                            <ArrowRight className="w-4 h-4 text-white" />
                          </div>

                          {/* New Value */}
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                              Proposed
                            </span>
                            <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 break-words">
                                {formatAuditValue(diff.newValue) || (
                                  <span className="italic text-emerald-400 dark:text-emerald-600">Empty</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Reason */}
                        {reason && (
                          <div className="mt-3 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 block mb-1">
                              Reason for change
                            </span>
                            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                              {reason}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
              <Button
                variant="outline"
                onClick={onDecline}
                disabled={processing}
                className="min-w-[120px] h-11 rounded-xl font-semibold border-2 border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:border-rose-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-all duration-200"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={onApprove}
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
      </DialogContent>
    </Dialog>
  );
}
