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
      // Only require reason if new value is non-empty
      const requiresReason = Boolean(change.newValue);
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

  const allReasonsProvided = changes.every(change => 
    !change.newValue || (reasons[change.field] && reasons[change.field].trim() !== "")
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Please provide a reason for each change</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {changes.map((change, index) => (
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
              
              {change.newValue ? (
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
                  Field is being cleared - no reason required
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
