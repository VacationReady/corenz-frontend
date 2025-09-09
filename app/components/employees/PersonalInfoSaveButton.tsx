"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

export default function PersonalInfoSaveButton({ employeeId }: { employeeId: string }) {
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const form = document.querySelector("form[action*='personal-info']") as HTMLFormElement | null;
      if (!form) return;
      const formData = new FormData(form);
      const payload: Record<string, any> = {};
      formData.forEach((v, k) => (payload[k] = v));
      if (payload.dateOfBirth) payload.dateOfBirth = new Date(payload.dateOfBirth as string);
      const res = await fetch(`/api/employees/${employeeId}/personal-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save");
      }
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-end">
      <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
    </div>
  );
}


