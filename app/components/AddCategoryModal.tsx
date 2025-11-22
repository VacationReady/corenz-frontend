"use client";

import { useState } from "react";
import { PlusIcon, BriefcaseIcon, UmbrellaIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/switch";
import { IconPicker } from "@/components/IconPicker";

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
  const [categoryType, setCategoryType] = useState<
    "TIME_OFF" | "WORKING_EVENT" | null
  >(null);
  const [name, setName] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [defaultPaidStatus, setDefaultPaidStatus] = useState<"PAID" | "UNPAID">(
    "PAID",
  );
  const [color, setColor] = useState("#3b82f6");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [iconKey, setIconKey] = useState<string | null>(null);

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
          iconKey,
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
        setIconKey(null);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={<DialogTitle>Add Event Category</DialogTitle>}>
        {/* Category Type Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCategoryType("TIME_OFF")}
            className={`flex items-center justify-center gap-2 h-12 rounded-2xl transition-premium ${
              categoryType === "TIME_OFF" ? "bg-primary text-primary-foreground" : "glass-subtle"
            }`}
          >
            <UmbrellaIcon className="w-5 h-5" />
            <span>Time Off</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryType("WORKING_EVENT")}
            className={`flex items-center justify-center gap-2 h-12 rounded-2xl transition-premium ${
              categoryType === "WORKING_EVENT" ? "bg-primary text-primary-foreground" : "glass-subtle"
            }`}
          >
            <BriefcaseIcon className="w-5 h-5" />
            <span>Working Event</span>
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-40">
            <IconPicker value={iconKey} onChange={setIconKey} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm">Color</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 rounded-md overflow-hidden bg-transparent" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Requires Approval</span>
            <Switch checked={requiresApproval} onChange={setRequiresApproval} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Admin Only</span>
            <Switch checked={adminOnly} onChange={setAdminOnly} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Active</span>
            <Switch checked={isActive} onChange={setIsActive} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm">Default Paid Status</span>
          <select
            value={defaultPaidStatus}
            onChange={(e) => setDefaultPaidStatus(e.target.value as "PAID" | "UNPAID")}
            className="glass-subtle rounded-xl px-3 py-2 text-sm"
          >
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full" icon={<PlusIcon className="w-4 h-4" />}>
          {loading ? "Adding..." : "Add Category"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
