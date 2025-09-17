"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import ChangeReasonModal, { ChangeInfo } from "@/components/audit/ChangeReasonModal";

export default function AddDriverLicence() {
  const router = useRouter();
  const params = useParams();
  const employeeIdRaw = params?.id ?? "";
  const employeeId = Array.isArray(employeeIdRaw)
    ? employeeIdRaw[0]
    : employeeIdRaw;

  const [loading, setLoading] = useState(false);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    formData.append("employeeId", employeeId);

    // Build change summary for modal
    const summary: Record<string, string> = {
      type: String(formData.get("type") || ""),
      licenceNumber: String(formData.get("licenceNumber") || ""),
      issueDate: String(formData.get("issueDate") || ""),
      expiryDate: String(formData.get("expiryDate") || ""),
    };
    const changes: ChangeInfo[] = Object.entries(summary).map(([field, value]) => ({
      field,
      oldValue: "",
      newValue: String(value || ""),
    }));

    setPendingFormData(formData);
    setPendingChanges(changes);
    setIsReasonOpen(true);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Add Driver Licence</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Type</Label>
          <Input
            name="type"
            type="text"
            placeholder="e.g., Full NZ Car"
            required
          />
        </div>

        <div>
          <Label>Licence Number</Label>
          <Input
            name="licenceNumber"
            type="text"
            placeholder="Licence Number"
            required
          />
        </div>

        <div>
          <Label>Issue Date</Label>
          <Input name="issueDate" type="date" required />
        </div>

        <div>
          <Label>Expiry Date</Label>
          <Input name="expiryDate" type="date" required />
        </div>

        <div>
          <Label>Upload Document (optional)</Label>
          <Input name="file" type="file" accept="application/pdf,image/*" />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Add Licence"}
        </Button>
      </form>

      <ChangeReasonModal
        isOpen={isReasonOpen}
        onClose={() => {
          setIsReasonOpen(false);
          setPendingChanges([]);
          setPendingFormData(null);
          setLoading(false);
        }}
        changes={pendingChanges}
        onSubmit={async (reasons) => {
          if (!pendingFormData) return;
          try {
            setLoading(true);
            pendingFormData.append("reasons", JSON.stringify(reasons));
            const res = await fetch("/api/driver-licenses/create", {
              method: "POST",
              body: pendingFormData,
            });
            if (res.ok) {
              router.push(`/employees/${employeeId}/driver-licenses`);
            } else {
              const error = await res.json().catch(() => ({}));
              alert("Error: " + (error.error || "Failed"));
            }
          } catch (error) {
            console.error(error);
            alert("Upload failed.");
          } finally {
            setLoading(false);
            setIsReasonOpen(false);
            setPendingChanges([]);
            setPendingFormData(null);
          }
        }}
      />
    </div>
  );
}
