"use client";

import { useState, ChangeEvent } from "react";
import Button from "@/components/ui/Button";
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface AddSubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentCategoryId: string;
  parentCategoryName: string;
}

export default function AddSubcategoryModal({
  isOpen,
  onClose,
  onSuccess,
  parentCategoryId,
  parentCategoryName,
}: AddSubcategoryModalProps) {
  const [name, setName] = useState("");
  const [defaultPaidStatus, setDefaultPaidStatus] = useState<"PAID" | "UNPAID">(
    "PAID",
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/event-subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          eventCategoryId: parentCategoryId,
          defaultPaidStatus,
          isActive: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Subcategory added under ${parentCategoryName}`);
        setName("");
        setDefaultPaidStatus("PAID");
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to add subcategory.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={<DialogTitle>Add Subcategory under {parentCategoryName}</DialogTitle>}>
        <div className="space-y-3">
          <div>
            <label htmlFor="subcategoryName" className="block text-sm font-medium mb-1">
              Subcategory Name
            </label>
            <Input
              id="subcategoryName"
              placeholder="e.g., Doctor's Appointment"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Default Paid Status</label>
            <select
              value={defaultPaidStatus}
              onChange={(e) => setDefaultPaidStatus(e.target.value as "PAID" | "UNPAID")}
              className="glass-subtle rounded-xl px-3 py-2 text-sm w-full"
            >
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose} variant="ghost" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} loadingText="Adding subcategory" icon={<PlusCircle className="h-4 w-4" />}>
            Add Subcategory
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
