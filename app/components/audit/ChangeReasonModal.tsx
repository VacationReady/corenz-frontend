"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";
import { CheckCircle2, FileEdit, ArrowRight, Sparkles } from "lucide-react";

export interface ChangeInfo {
  field: string;
  oldValue: string;
  newValue: string;
  /**
   * When true, this change was not explicitly requested by the user but added implicitly (for example
   * due to backend formatting). These changes should never require the user to supply a reason.
   */
  implicit?: boolean;
}

function hasMeaningfulValue(value: string): boolean {
  if (!value) return false;
  if (typeof value.trim === "function") {
    return value.trim() !== "";
  }
  return Boolean(value);
}

export function changeRequiresReason(change: ChangeInfo): boolean {
  if (change.implicit) {
    return false;
  }

  if (change.field === "__create__" || change.field === "__delete__") {
    return true;
  }

  const hasOldValue = hasMeaningfulValue(change.oldValue);
  // Guardrail: only fields that previously had a value require a reason,
  // even if the new value is being cleared.
  return hasOldValue;
}

interface ChangeReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ChangeInfo[];
  onSubmit: (reasons: Record<string, string>) => void;
  loading?: boolean;
}

export default function ChangeReasonModal({
  isOpen,
  onClose,
  changes,
  onSubmit,
  loading = false,
}: ChangeReasonModalProps) {
  const [reason, setReason] = useState("");

  // Reset reason when modal opens/closes or changes change
  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen, changes]);

  const handleSubmit = () => {
    const trimmedReason = reason.trim();
    
    // Check if reason is provided when required
    const changesRequiringReason = changes.filter(changeRequiresReason);
    if (changesRequiringReason.length > 0 && !trimmedReason) {
      toast.error("Please provide a reason for these changes");
      return;
    }

    // Apply the same reason to all fields that require one
    const reasons: Record<string, string> = {};
    for (const change of changesRequiringReason) {
      reasons[change.field] = trimmedReason;
    }

    onSubmit(reasons);
  };

  // Filter to only show changes that require a reason
  const changesRequiringReason = changes.filter(changeRequiresReason);

  // If no changes require a reason, auto-submit with empty reasons
  useEffect(() => {
    if (isOpen && changesRequiringReason.length === 0 && changes.length > 0) {
      onSubmit({});
    }
  }, [isOpen, changesRequiringReason.length, changes.length, onSubmit]);

  if (!isOpen) return null;

  // Don't render modal if no changes require reasons
  if (changesRequiringReason.length === 0) return null;

  const isReasonProvided = reason.trim() !== "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {/* Header with gradient accent */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
          <DialogHeader className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <FileEdit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  Confirm Changes
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {changesRequiringReason.length} field{changesRequiringReason.length !== 1 ? 's' : ''} will be updated
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-2">
          {/* Changes summary as bullet list */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Changes Summary</span>
            </div>
            <ul className="space-y-2.5">
              <AnimatePresence>
                {changesRequiringReason.map((change, index) => (
                  <motion.li
                    key={change.field}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">
                        {labelForField(change.field)}
                      </span>
                      <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5 flex-wrap">
                        <span className="truncate max-w-[120px]" title={formatAuditValue(change.oldValue)}>
                          {formatAuditValue(change.oldValue) || <em className="text-muted-foreground/60">empty</em>}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        <span className="truncate max-w-[120px] text-foreground" title={formatAuditValue(change.newValue)}>
                          {formatAuditValue(change.newValue) || <em className="text-muted-foreground/60">empty</em>}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>

          {/* Single reason input */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason for changes <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Moved house, Updated contact details, Corrected typo..."
              className="min-h-[100px] resize-none bg-background border-border/60 focus:border-primary/50 focus:ring-primary/20"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              This reason will be recorded in the audit log for all changes above.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/20 border-t border-border/40">
          <div className="flex justify-end gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
              className="border-border/60"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isReasonProvided || loading}
              loading={loading}
              loadingText="Saving..."
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Confirm Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
