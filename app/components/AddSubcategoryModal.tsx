"use client";

import { useState, ChangeEvent } from "react";
import { Dialog } from "@headlessui/react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <Dialog.Panel className="bg-white w-full max-w-md rounded shadow-lg p-6 space-y-4">
        <Dialog.Title className="text-lg font-semibold">
          Add Subcategory under {parentCategoryName}
        </Dialog.Title>

        <div className="space-y-2">
          <div>
            <label
              htmlFor="subcategoryName"
              className="block text-sm font-medium mb-1"
            >
              Subcategory Name
            </label>
            <Input
              id="subcategoryName"
              placeholder="e.g., Doctor's Appointment"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Default Paid Status
            </label>
            <select
              value={defaultPaidStatus}
              onChange={(e) =>
                setDefaultPaidStatus(e.target.value as "PAID" | "UNPAID")
              }
              className="w-full border rounded p-2"
            >
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button onClick={onClose} variant="ghost" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Add Subcategory
          </Button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
