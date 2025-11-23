"use client";

import { useState } from "react";
import { PlusIcon, BriefcaseIcon, UmbrellaIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/switch";
import { IconPicker } from "@/components/IconPicker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent title={<DialogTitle>Add Event Category</DialogTitle>}>
          <div className="space-y-6">
            {/* Category Type Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Category Type</label>
              <div className="grid grid-cols-2 gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setCategoryType("TIME_OFF")}
                      className={`flex items-center justify-center gap-3 h-16 rounded-2xl transition-all duration-200 ${
                        categoryType === "TIME_OFF" 
                          ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]" 
                          : "glass-subtle hover:shadow-md"
                      }`}
                    >
                      <UmbrellaIcon className="w-5 h-5" />
                      <span className="font-medium">Time Off</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>For leave, vacation, sick days, and absences</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setCategoryType("WORKING_EVENT")}
                      className={`flex items-center justify-center gap-3 h-16 rounded-2xl transition-all duration-200 ${
                        categoryType === "WORKING_EVENT" 
                          ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]" 
                          : "glass-subtle hover:shadow-md"
                      }`}
                    >
                      <BriefcaseIcon className="w-5 h-5" />
                      <span className="font-medium">Working Event</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>For training, meetings, and work-related activities</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Category Name & Icon */}
            <div>
              <label className="text-sm font-medium mb-3 block">Category Details</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Category Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="w-12">
                  <IconPicker value={iconKey} onChange={setIconKey} />
                </div>
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="text-sm font-medium mb-3 block">Color</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)} 
                  className="h-11 w-20 rounded-xl overflow-hidden cursor-pointer border-2 border-border"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="text-sm font-medium mb-3 block">Options</label>
              <div className="space-y-4 glass-subtle rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Requires Approval</span>
                  <Switch checked={requiresApproval} onChange={setRequiresApproval} />
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Admin Only</span>
                  <Switch checked={adminOnly} onChange={setAdminOnly} />
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active</span>
                  <Switch checked={isActive} onChange={setIsActive} />
                </div>
              </div>
            </div>

            {/* Default Paid Status */}
            <div>
              <label className="text-sm font-medium mb-3 block">Default Paid Status</label>
              <select
                value={defaultPaidStatus}
                onChange={(e) => setDefaultPaidStatus(e.target.value as "PAID" | "UNPAID")}
                className="w-full glass-subtle rounded-xl px-4 py-3 text-sm font-medium border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
              >
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="w-full h-12 text-base font-medium" 
              icon={<PlusIcon className="w-5 h-5" />}
            >
              {loading ? "Adding..." : "Add Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
