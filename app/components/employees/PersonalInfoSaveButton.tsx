"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import ChangeReasonModal, { ChangeInfo } from "../audit/ChangeReasonModal";

export default function PersonalInfoSaveButton({
  employeeId,
}: {
  employeeId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingPayload, setPendingPayload] = useState<Record<string, any>>({});

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
      if (payload.dateOfBirth)
        payload.dateOfBirth = new Date(payload.dateOfBirth as string);

      // Compute changes
      const changes = computeChanges(payload);
      
      if (changes.length === 0) {
        toast.success("No changes to save");
        return;
      }

      // Check if any changes have non-empty new values (require reasons)
      if (changes.some(change => change.newValue)) {
        setPendingChanges(changes);
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
      const res = await fetch(`/api/employees/${employeeId}/personal-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, reasons }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save");
      }
      
      toast.success("Changes saved successfully");
      
      // Update initial values to current values
      setInitialValues(payload);
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
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
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
    </>
  );
}
