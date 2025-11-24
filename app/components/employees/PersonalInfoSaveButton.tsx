"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import ChangeReasonModal, { ChangeInfo, changeRequiresReason } from "../audit/ChangeReasonModal";
import { useUnsavedChangesContext } from "@/components/ui/UnsavedChangesGuard";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";

export default function PersonalInfoSaveButton({
  employeeId,
  section,
}: {
  employeeId: string;
  section?: string;
}) {
  const tenantFetch = useTenantFetch();
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingPayload, setPendingPayload] = useState<Record<string, any>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const unsavedChanges = useUnsavedChangesContext();

  // Derive friendly section name for animation
  const getSectionLabel = () => {
    if (!section) return "Personal Information";
    const labels: Record<string, string> = {
      "personal": "Personal Details",
      "contact": "Contact Information",
      "address": "Address Details",
      "bank": "Bank Details",
      "payment": "Payment Information",
      "emergency": "Emergency Contacts",
      "identification": "ID Documents",
    };
    return labels[section.toLowerCase()] || section.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  // Capture initial form values when component mounts
  useEffect(() => {
    const form = document.querySelector(
      "form[action*='personal-info']",
    ) as HTMLFormElement | null;
    if (!form) return;

    const formData = new FormData(form);
    const values: Record<string, any> = {};
    formData.forEach((v, k) => (values[k] = v));
    setInitialValues(values);
  }, []);

  const computeChanges = (currentValues: Record<string, any>): ChangeInfo[] => {
    const changes: ChangeInfo[] = [];

    for (const [field, newValue] of Object.entries(currentValues)) {
      const oldValue = initialValues[field] || "";
      const newValueStr = String(newValue || "");

      if (oldValue !== newValueStr) {
        changes.push({
          field,
          oldValue: String(oldValue),
          newValue: newValueStr,
        });
      }
    }

    return changes;
  };

  const annotateChanges = (changes: ChangeInfo[], payload: Record<string, any>): ChangeInfo[] => {
    return changes.map((change) => {
      if (change.field === "dateOfBirth" && payload.dateOfBirth instanceof Date) {
        const originalValue = initialValues.dateOfBirth;
        if (originalValue) {
          const originalDateOnly = new Date(originalValue);
          const newDateOnly = payload.dateOfBirth;

          const datesAreEqual = () => {
            const pad = (value: number) => String(value).padStart(2, "0");
            const original = `${originalDateOnly.getFullYear()}-${pad(originalDateOnly.getMonth() + 1)}-${pad(originalDateOnly.getDate())}`;
            const next = `${newDateOnly.getFullYear()}-${pad(newDateOnly.getMonth() + 1)}-${pad(newDateOnly.getDate())}`;
            return original === next;
          };

          if (!Number.isNaN(originalDateOnly.getTime()) && !Number.isNaN(newDateOnly.getTime()) && datesAreEqual()) {
            return { ...change, implicit: true };
          }
        }
      }

      return change;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const form = document.querySelector(
        "form[action*='personal-info']",
      ) as HTMLFormElement | null;
      if (!form) return;
      
      const formData = new FormData(form);
      const payload: Record<string, any> = {};
      formData.forEach((v, k) => (payload[k] = v));
      if (payload.dateOfBirth) {
        const date = new Date(payload.dateOfBirth as string);
        payload.dateOfBirth = Number.isNaN(date.getTime()) ? undefined : date;
      }

      // Compute changes
      const annotatedChanges = annotateChanges(computeChanges(payload), payload);
      const actionableChanges = annotatedChanges.filter((change) => !change.implicit);

      if (actionableChanges.length === 0) {
        toast.success("No changes to save");
        unsavedChanges?.markSaved();
        return;
      }

      // Check if any changes require reasons (existing values being updated or synthetic changes)
      if (actionableChanges.some(changeRequiresReason)) {
        setPendingChanges(actionableChanges);
        setPendingPayload(payload);
        setIsReasonModalOpen(true);
        return;
      }

      // No reasons required, save directly
      await performSave(payload, {});
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const performSave = async (payload: Record<string, any>, reasons: Record<string, string>) => {
    try {
      const res = await tenantFetch(`/api/employees/${employeeId}/personal-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, reasons, section }),
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

      // Update initial values to current values
      setInitialValues(payload);
      unsavedChanges?.markSaved();
    } catch (error: any) {
      throw error;
    }
  };

  const handleReasonSubmit = async (reasons: Record<string, string>) => {
    try {
      setLoading(true);
      await performSave(pendingPayload, reasons);
      setIsReasonModalOpen(false);
      setPendingChanges([]);
      setPendingPayload({});
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          loading={loading}
          loadingText="Saving changes"
          icon={<Save className="h-4 w-4" />}
        >
          Save changes
        </Button>
      </div>
      
      <ChangeReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => {
          setIsReasonModalOpen(false);
          setPendingChanges([]);
          setPendingPayload({});
          setLoading(false);
        }}
        changes={pendingChanges}
        onSubmit={handleReasonSubmit}
        loading={loading}
      />

      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName={getSectionLabel()}
        updateType={isPendingApproval ? "pending_approval" : "instant"}
      />
    </>
  );
}
