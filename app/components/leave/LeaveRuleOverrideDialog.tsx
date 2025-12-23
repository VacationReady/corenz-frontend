"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Button from "@/components/ui/Button";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export interface LeaveValidationWarning {
  code: string;
  message: string;
  severity: "warning" | "error";
  ruleType: string;
}

interface LeaveRuleOverrideDialogProps {
  open: boolean;
  warnings: LeaveValidationWarning[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function getRuleTypeLabel(ruleType: string): string {
  const labels: Record<string, string> = {
    notice_period: "Notice Period",
    max_booking_length: "Maximum Booking Length",
    blackout_day: "Blackout Day",
    entitlement: "Leave Entitlement",
    max_days_per_period: "Maximum Days Per Period",
    overlap: "Leave Overlap",
    sick_leave_eligibility: "Sick Leave Eligibility",
    public_holiday: "Public Holiday",
  };
  return labels[ruleType] || "Rule Violation";
}

function getRuleTypeIcon(ruleType: string) {
  // All use AlertTriangle for now, but could be customized
  return AlertTriangle;
}

export default function LeaveRuleOverrideDialog({
  open,
  warnings,
  onConfirm,
  onCancel,
  isLoading = false,
}: LeaveRuleOverrideDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">
                Override Leave Rules?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm mt-1">
                This booking violates {warnings.length === 1 ? "a rule" : `${warnings.length} rules`}. 
                As an admin/manager, you can override.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-3 py-4 max-h-[300px] overflow-y-auto">
          {warnings.map((warning, index) => {
            const Icon = getRuleTypeIcon(warning.ruleType);
            return (
              <div
                key={index}
                className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {getRuleTypeLabel(warning.ruleType)}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {warning.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? "Processing..." : "Continue Anyway"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
