"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import ChangeReasonModal, { ChangeInfo, changeRequiresReason } from "../audit/ChangeReasonModal";
import { useUnsavedChangesContext } from "@/components/ui/UnsavedChangesGuard";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";

interface EmployeeSaveButtonProps {
  employeeId: string;
  endpoint: string; // e.g., "bank-payroll", "employment-details"
  initialValues: Record<string, any>;
  currentValues: Record<string, any>;
  onSaveSuccess?: () => void;
  disabled?: boolean;
  /**
   * Optional formatter to render user-friendly display values in the reason modal
   * without affecting the raw payload comparison or submission.
   */
  valueFormatter?: (field: string, value: any) => string;
}

function serialize(value: any): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function computeChanges(
  initial: Record<string, any>,
  current: Record<string, any>,
  displaySerialize: (field: string, value: any) => string,
): ChangeInfo[] {
  const changes: ChangeInfo[] = [];
  
  for (const [field, newValue] of Object.entries(current)) {
    const oldValue = initial[field];
    const oldValueStr = serialize(oldValue);
    const newValueStr = serialize(newValue);
    
    if (oldValueStr !== newValueStr) {
      changes.push({
        field,
        oldValue: displaySerialize(field, oldValue),
        newValue: displaySerialize(field, newValue),
      });
    }
  }
  
  return changes;
}

export default function EmployeeSaveButton({
  employeeId,
  endpoint,
  initialValues,
  currentValues,
  onSaveSuccess,
  disabled = false,
  valueFormatter,
}: EmployeeSaveButtonProps) {
  const tenantFetch = useTenantFetch();
  const [loading, setLoading] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const unsavedChanges = useUnsavedChangesContext();

  // Derive friendly label from endpoint
  const getEndpointLabel = () => {
    const labels: Record<string, string> = {
      "bank-payroll": "Bank & Payroll",
      "employment-details": "Employment Details",
      "personal-info": "Personal Information",
      "contact-info": "Contact Information",
      "emergency-contacts": "Emergency Contacts",
      "documents": "Documents",
    };
    return labels[endpoint] || endpoint.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Compute changes (compare on raw values; display using formatter)
      const displaySerialize = (field: string, value: any) =>
        (valueFormatter ? valueFormatter(field, value) : serialize(value));
      const changes = computeChanges(initialValues, currentValues, displaySerialize);
      
      if (changes.length === 0) {
        toast.success("No changes to save");
        unsavedChanges?.markSaved();
        return;
      }

      // Check if any changes require reasons (existing values being updated or synthetic changes)
      if (changes.some(changeRequiresReason)) {
        setPendingChanges(changes);
        setIsReasonModalOpen(true);
        return;
      }

      // No reasons required, save directly
      await performSave({});
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const performSave = async (reasons: Record<string, string>) => {
    try {
      // Only send changed fields to avoid unintended diffs (e.g., Decimal vs number)
      const displaySerializeFn = (field: string, value: any) =>
        (valueFormatter ? valueFormatter(field, value) : serialize(value));
      const changes = computeChanges(initialValues, currentValues, displaySerializeFn);
      const changedPayload: Record<string, any> = {};
      for (const change of changes) {
        changedPayload[change.field] = currentValues[change.field];
      }

      const res = await tenantFetch(`/api/employees/${employeeId}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...changedPayload, reasons }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save");
      }
      
      const data = await res.json().catch(() => ({}));
      
      // Check if change is pending approval (transactional)
      const isPending = data?.pendingApproval === true || data?.status === "PENDING";
      setIsPendingApproval(isPending);
      setShowSuccess(true);
      
      onSaveSuccess?.();
      unsavedChanges?.markSaved();
    } catch (error: any) {
      throw error;
    }
  };

  const handleReasonSubmit = async (reasons: Record<string, string>) => {
    try {
      setLoading(true);
      await performSave(reasons);
      setIsReasonModalOpen(false);
      setPendingChanges([]);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSave}
        disabled={disabled}
        loading={loading}
        loadingText="Saving changes"
        icon={<Save className="h-4 w-4" />}
      >
        Save changes
      </Button>
      
      <ChangeReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => {
          setIsReasonModalOpen(false);
          setPendingChanges([]);
          setLoading(false);
        }}
        changes={pendingChanges}
        onSubmit={handleReasonSubmit}
        loading={loading}
      />

      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName={getEndpointLabel()}
        updateType={isPendingApproval ? "pending_approval" : "instant"}
      />
    </>
  );
}
