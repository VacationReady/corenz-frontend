"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { PlusIcon, XIcon, BriefcaseIcon, UmbrellaIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCategoryModalProps) {
  const [categoryType, setCategoryType] = useState<"TIME_OFF" | "WORKING_EVENT" | null>(null);
  const [name, setName] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [defaultPaidStatus, setDefaultPaidStatus] = useState<"PAID" | "UNPAID">("PAID");
  const [color, setColor] = useState("#3b82f6");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!categoryType || !name) {
      alert("Please select a category type and enter a name.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/event-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          categoryType,
          requiresApproval,
          adminOnly,
          defaultPaidStatus,
          color,
          isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
        setName("");
        setCategoryType(null);
        setRequiresApproval(false);
        setAdminOnly(false);
        setDefaultPaidStatus("PAID");
        setColor("#3b82f6");
        setIsActive(true);
      } else {
        alert(data.error || "Failed to add category.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to add category.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Event Category</h2>
          <button onClick={onClose}>
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Category Type Selection */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setCategoryType("TIME_OFF")}
            className={cn(
              "flex-1 border rounded p-2 flex items-center justify-center space-x-2 font-medium transition-colors",
              categoryType === "TIME_OFF"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 text-blue-600 border border-blue-600 hover:bg-blue-50"
            )}
          >
            <UmbrellaIcon
              className={cn(
                "w-5 h-5",
                categoryType === "TIME_OFF" ? "text-white" : "text-blue-600"
              )}
            />
            <span>Time Off</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryType("WORKING_EVENT")}
            className={cn(
              "flex-1 border rounded p-2 flex items-center justify-center space-x-2 font-medium transition-colors",
              categoryType === "WORKING_EVENT"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 text-blue-600 border border-blue-600 hover:bg-blue-50"
            )}
          >
            <BriefcaseIcon
              className={cn(
                "w-5 h-5",
                categoryType === "WORKING_EVENT" ? "text-white" : "text-blue-600"
              )}
            />
            <span>Working Event</span>
          </button>
        </div>

        {/* Name Input */}
        <input
          type="text"
          placeholder="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded p-2"
        />

        {/* Color Picker */}
        <div className="flex items-center space-x-2">
          <label className="text-sm">Color:</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Requires Approval</span>
            <Toggle checked={requiresApproval} onChange={setRequiresApproval} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Admin Only</span>
            <Toggle checked={adminOnly} onChange={setAdminOnly} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Active</span>
            <Toggle checked={isActive} onChange={setIsActive} />
          </div>
        </div>

        {/* Default Paid Status Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm">Default Paid Status:</label>
          <select
            value={defaultPaidStatus}
            onChange={(e) => setDefaultPaidStatus(e.target.value as "PAID" | "UNPAID")}
            className="border rounded p-1"
          >
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Adding..." : (
            <>
              <PlusIcon className="w-4 h-4 mr-2" /> Add Category
            </>
          )}
        </Button>
      </div>
    </Dialog>
  );
}
