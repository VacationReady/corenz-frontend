"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";
import { Clock, User } from "lucide-react";

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
  const empUser = item?.Employee?.User;
  if (!empUser) return "Employee";

  if (typeof empUser.name === "string" && empUser.name.trim()) {
    return empUser.name.trim();
  }

  const composed = `${empUser.firstName ?? ""} ${empUser.lastName ?? ""}`.trim();
  if (composed) return composed;

  return empUser.email || "Employee";
}

function getRequesterName(item: any): string | null {
  const u = item?.Requester;
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
  const requesterName = getRequesterName(item);
  const submittedAt = formatSubmittedAt(item.createdAt as string | undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Review change request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Employee</span>
                <span className="font-medium">{employeeName}</span>
              </div>
              {requesterName && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>Requested by {requesterName}</span>
                </div>
              )}
            </div>
            {submittedAt && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Submitted {submittedAt}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {diffs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No field-level changes were recorded for this request.
              </p>
            ) : (
              diffs.map((diff, index) => {
                const reason = reasons[diff.field];
                return (
                  <div
                    key={`${diff.field}-${index}`}
                    className="border rounded-lg p-4 bg-background"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                          {labelForField(diff.field)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          From
                        </span>
                        <div className="mt-1 p-2 rounded border bg-red-50 text-sm text-foreground">
                          {formatAuditValue(diff.oldValue)}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          To
                        </span>
                        <div className="mt-1 p-2 rounded border bg-green-50 text-sm text-foreground">
                          {formatAuditValue(diff.newValue)}
                        </div>
                      </div>
                    </div>

                    {reason && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Reason
                        </span>
                        <div className="mt-1 p-2 rounded border bg-blue-50 text-sm text-foreground">
                          {reason}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="outline"
              onClick={onDecline}
              disabled={processing}
            >
              Decline
            </Button>
            <Button
              onClick={onApprove}
              disabled={processing}
            >
              {processing && (
                <Clock className="w-4 h-4 mr-2 animate-spin" />
              )}
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
