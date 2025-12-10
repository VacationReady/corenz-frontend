"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";
import { CheckCircle2 } from "lucide-react";

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
  const [reasons, setReasons] = useState<Record<string, string>>({});

  // Reset reasons when modal opens/closes or changes change
  useEffect(() => {
    if (isOpen) {
      setReasons({});
    }
  }, [isOpen, changes]);

  const handleSubmit = () => {
    // Check that all required fields have reasons
    const missingReasons: string[] = [];
    
    for (const change of changes) {
      const requiresReason = changeRequiresReason(change);
      if (requiresReason && (!reasons[change.field] || reasons[change.field].trim() === "")) {
        missingReasons.push(labelForField(change.field));
      }
    }

    if (missingReasons.length > 0) {
      toast.error(`Please provide reasons for: ${missingReasons.join(", ")}`);
      return;
    }

    onSubmit(reasons);
  };

  const allReasonsProvided = changes.every(change => {
    if (!changeRequiresReason(change)) return true;
    const reason = reasons[change.field];
    return Boolean(reason && reason.trim() !== "");
  });

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Please provide a reason for each change</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {changesRequiringReason.map((change, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">
                  {labelForField(change.field)}
                </h4>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">From:</span> {formatAuditValue(change.oldValue)} 
                  {" → "}
                  <span className="font-medium">To:</span> {formatAuditValue(change.newValue)}
                </div>
              </div>
              
              {changeRequiresReason(change) ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for change <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={reasons[change.field] || ""}
                    onChange={(e) => 
                      setReasons(prev => ({ ...prev, [change.field]: e.target.value }))
                    }
                    placeholder="Enter reason for this change..."
                    className="min-h-[80px]"
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No reason required for this change
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allReasonsProvided || loading}
            loading={loading}
            loadingText="Saving changes"
            icon={<CheckCircle2 className="h-4 w-4" />}
          >
            Confirm Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
