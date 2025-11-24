"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, BriefcaseIcon, UmbrellaIcon, Sparkles, CheckCircle2, Palette, Settings, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconPicker } from "@/components/IconPicker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

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
        <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="glass-ultra rounded-3xl overflow-hidden shadow-depth-5"
          >
            {/* Header with gradient accent */}
            <div className="relative px-8 pt-8 pb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-primary/10 to-violet-500/5" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <PlusIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Add Event Category
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Create a new event category for your calendar
                  </p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-8 pb-8 max-h-[65vh] overflow-y-auto space-y-6">
              {/* Category Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground/80">
                  Category Type <span className="text-primary">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        type="button"
                        onClick={() => setCategoryType("TIME_OFF")}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                          categoryType === "TIME_OFF" 
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                            : "border-muted/50 bg-white/30 dark:bg-white/5 hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        {categoryType === "TIME_OFF" && (
                          <motion.div
                            layoutId="categoryIndicator"
                            className="absolute top-3 right-3"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          </motion.div>
                        )}
                        <div className={`p-3 rounded-xl mb-3 w-fit ${categoryType === "TIME_OFF" ? "bg-primary/20" : "bg-muted/50"}`}>
                          <UmbrellaIcon className={`w-5 h-5 ${categoryType === "TIME_OFF" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <h4 className={`font-semibold mb-1 ${categoryType === "TIME_OFF" ? "text-primary" : "text-foreground"}`}>
                          Time Off
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Leave, vacation, sick days
                        </p>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>For leave, vacation, sick days, and absences</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        type="button"
                        onClick={() => setCategoryType("WORKING_EVENT")}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                          categoryType === "WORKING_EVENT" 
                            ? "border-violet-500 bg-violet-500/5 shadow-lg shadow-violet-500/10" 
                            : "border-muted/50 bg-white/30 dark:bg-white/5 hover:border-violet-500/30 hover:bg-violet-500/5"
                        }`}
                      >
                        {categoryType === "WORKING_EVENT" && (
                          <motion.div
                            layoutId="categoryIndicator"
                            className="absolute top-3 right-3"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          </motion.div>
                        )}
                        <div className={`p-3 rounded-xl mb-3 w-fit ${categoryType === "WORKING_EVENT" ? "bg-violet-500/20" : "bg-muted/50"}`}>
                          <BriefcaseIcon className={`w-5 h-5 ${categoryType === "WORKING_EVENT" ? "text-violet-500" : "text-muted-foreground"}`} />
                        </div>
                        <h4 className={`font-semibold mb-1 ${categoryType === "WORKING_EVENT" ? "text-violet-600 dark:text-violet-400" : "text-foreground"}`}>
                          Working Event
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Training, meetings, activities
                        </p>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>For training, meetings, and work-related activities</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <AnimatePresence>
                {categoryType && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Category Name & Icon */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted/30">
                      <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Category Details</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">
                            Category Name <span className="text-primary">*</span>
                          </Label>
                          <Input
                            placeholder="Category Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">Icon</Label>
                          <div className="w-12">
                            <IconPicker value={iconKey} onChange={setIconKey} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Color Picker */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted/30">
                      <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Color</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={color} 
                          onChange={(e) => setColor(e.target.value)} 
                          className="h-11 w-20 rounded-xl overflow-hidden cursor-pointer border-2 border-muted/50 bg-white/50 dark:bg-white/5"
                        />
                        <span className="text-sm text-muted-foreground font-mono">{color}</span>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-primary/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-sm">Settings</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                          <Label className="text-sm cursor-pointer">Requires Approval</Label>
                          <Switch checked={requiresApproval} onChange={setRequiresApproval} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                          <Label className="text-sm cursor-pointer">Admin Only</Label>
                          <Switch checked={adminOnly} onChange={setAdminOnly} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                          <Label className="text-sm cursor-pointer">Active</Label>
                          <Switch checked={isActive} onChange={setIsActive} />
                        </div>
                      </div>
                    </div>

                    {/* Default Paid Status */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">Default Paid Status</Label>
                      <Select
                        value={defaultPaidStatus}
                        onValueChange={(v) => setDefaultPaidStatus(v as "PAID" | "UNPAID")}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PAID">Paid</SelectItem>
                          <SelectItem value="UNPAID">Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Submit Button */}
                    <Button 
                      onClick={handleSubmit} 
                      disabled={loading || !name} 
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-semibold shadow-lg shadow-primary/25"
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                          />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Add Category
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
