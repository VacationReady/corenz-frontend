"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import ChangeReasonModal, { ChangeInfo, changeRequiresReason } from "../audit/ChangeReasonModal";

interface EmployeeSaveButtonProps {
  employeeId: string;
  endpoint: string; // e.g., "bank-payroll", "employment-details"
  initialValues: Record<string, any>;
  currentValues: Record<string, any>;
  onSaveSuccess?: () => void;
  disabled?: boolean;
}

function serialize(value: any): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function computeChanges(initial: Record<string, any>, current: Record<string, any>): ChangeInfo[] {
  const changes: ChangeInfo[] = [];
  
  for (const [field, newValue] of Object.entries(current)) {
    const oldValue = initial[field];
    const oldValueStr = serialize(oldValue);
    const newValueStr = serialize(newValue);
    
    if (oldValueStr !== newValueStr) {
      changes.push({
        field,
        oldValue: oldValueStr,
        newValue: newValueStr,
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
}: EmployeeSaveButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Compute changes
      const changes = computeChanges(initialValues, currentValues);
      
      if (changes.length === 0) {
        toast.success("No changes to save");
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
      const res = await fetch(`/api/employees/${employeeId}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentValues, reasons }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save");
      }
      
      toast.success("Changes saved successfully");
      onSaveSuccess?.();
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
    </>
  );
}
