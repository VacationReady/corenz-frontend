"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, BriefcaseIcon, UmbrellaIcon, Sparkles, CheckCircle2, Palette, Settings, Shield, Check, Scale } from "lucide-react";
import Button from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconPicker } from "@/components/IconPicker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

// Modern color palette with beautiful, curated colors
const COLOR_PALETTE = [
  // Row 1 - Reds & Pinks
  "#ef4444", "#f43f5e", "#ec4899", "#d946ef", "#a855f7",
  // Row 2 - Purples & Blues
  "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#06b6d4",
  // Row 3 - Teals & Greens
  "#14b8a6", "#10b981", "#22c55e", "#84cc16", "#eab308",
  // Row 4 - Yellows & Oranges
  "#f59e0b", "#f97316", "#fb923c", "#f87171", "#fda4af",
  // Row 5 - Neutrals & Pastels
  "#64748b", "#78716c", "#a8a29e", "#94a3b8", "#cbd5e1",
];

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-select category type when modal opens */
  defaultCategoryType?: "TIME_OFF" | "WORKING_EVENT";
  /** Pre-enable balance tracking when modal opens */
  defaultBalanceRequired?: boolean;
}

export default function AddCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCategoryType,
  defaultBalanceRequired,
}: AddCategoryModalProps) {
  const [categoryType, setCategoryType] = useState<
    "TIME_OFF" | "WORKING_EVENT" | null
  >(defaultCategoryType ?? null);
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
  // Balance configuration
  const [balanceRequired, setBalanceRequired] = useState(defaultBalanceRequired ?? false);
  const [defaultBalance, setDefaultBalance] = useState<string>("");
  const [balanceRefreshMonths, setBalanceRefreshMonths] = useState<string>("12");

  // Reset state when modal opens with defaults
  useEffect(() => {
    if (isOpen) {
      // Reset all fields to defaults when modal opens
      setName("");
      setCategoryType(defaultCategoryType ?? null);
      setRequiresApproval(false);
      setAdminOnly(false);
      setDefaultPaidStatus("PAID");
      setColor("#3b82f6");
      setIsActive(true);
      setIconKey(null);
      setBalanceRequired(defaultBalanceRequired ?? false);
      setDefaultBalance("");
      setBalanceRefreshMonths("12");
    }
  }, [isOpen, defaultCategoryType, defaultBalanceRequired]);

  const handleSubmit = async () => {
    if (!categoryType || !name) {
      toast.error("Please select a category type and enter a name.");
      return;
    }

    if (!iconKey) {
      toast.error("Please select an icon for the category.");
      return;
    }

    // Validate balance configuration if enabled
    if (balanceRequired) {
      if (!defaultBalance || parseFloat(defaultBalance) <= 0) {
        toast.error("Please enter a valid default balance (greater than 0).");
        return;
      }
      if (!balanceRefreshMonths || parseInt(balanceRefreshMonths, 10) < 0) {
        toast.error("Please enter a valid refresh period (0 or more months).");
        return;
      }
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
          balanceRequired,
          defaultBalance: balanceRequired && defaultBalance ? parseFloat(defaultBalance) : null,
          balanceRefreshMonths: balanceRequired && balanceRefreshMonths ? parseInt(balanceRefreshMonths, 10) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Category created successfully!");
        onSuccess();
        onClose();
      } else {
        // Handle field-level errors from Zod validation
        if (typeof data.error === "object" && data.error !== null) {
          const fieldErrors = Object.entries(data.error)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(", ")}`)
            .join("; ");
          toast.error(fieldErrors || "Failed to add category.");
        } else {
          toast.error(data.error || "Failed to add category.");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add category. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-2xl rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6">
              <div className="flex items-center gap-3">
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
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
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
                          <Label className="text-sm font-medium text-foreground/80">
                            Icon <span className="text-primary">*</span>
                          </Label>
                          <div className="w-12">
                            <IconPicker value={iconKey} onChange={setIconKey} />
                          </div>
                          {!iconKey && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">Select an icon</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Color Palette Picker */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Color</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="group flex items-center gap-3 p-2 pr-4 rounded-xl border-2 border-muted/50 bg-white/50 dark:bg-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                          >
                            <div 
                              className="w-9 h-9 rounded-lg shadow-inner ring-2 ring-white/50 dark:ring-white/10 transition-transform"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                              Click to change
                            </span>
                          </motion.button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-muted/30 shadow-2xl rounded-2xl"
                          align="start"
                          sideOffset={8}
                        >
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Choose a color
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {COLOR_PALETTE.map((paletteColor) => (
                                <motion.button
                                  key={paletteColor}
                                  type="button"
                                  whileHover={{ scale: 1.15, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setColor(paletteColor)}
                                  className={`relative w-8 h-8 rounded-lg shadow-md transition-all duration-150 ${
                                    color === paletteColor 
                                      ? "ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-gray-900" 
                                      : "hover:shadow-lg"
                                  }`}
                                  style={{ backgroundColor: paletteColor }}
                                >
                                  <AnimatePresence>
                                    {color === paletteColor && (
                                      <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center"
                                      >
                                        <Check className="w-4 h-4 text-white drop-shadow-md" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
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

                    {/* Balance Configuration */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-4">
                        <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-medium text-sm">Balance Configuration</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                          <div>
                            <Label className="text-sm cursor-pointer">Balance Required?</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Enable to track entitlement balances for this category</p>
                          </div>
                          <Switch checked={balanceRequired} onChange={setBalanceRequired} />
                        </div>
                        
                        <AnimatePresence>
                          {balanceRequired && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-3 overflow-hidden"
                            >
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-foreground/80">Default Balance (days)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.25"
                                  placeholder="e.g., 10"
                                  value={defaultBalance}
                                  onChange={(e) => setDefaultBalance(e.target.value)}
                                  className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                                />
                                <p className="text-xs text-muted-foreground">Default number of days allocated to employees (in 0.25 day increments)</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-foreground/80">Balance Refresh Period</Label>
                                <Select
                                  value={balanceRefreshMonths}
                                  onValueChange={setBalanceRefreshMonths}
                                >
                                  <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="12">Every 12 months (Annual)</SelectItem>
                                    <SelectItem value="6">Every 6 months</SelectItem>
                                    <SelectItem value="3">Every 3 months (Quarterly)</SelectItem>
                                    <SelectItem value="1">Every month</SelectItem>
                                    <SelectItem value="0">Never (One-time allocation)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">How often the balance resets to the default</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button 
                      onClick={handleSubmit} 
                      disabled={loading || !name || !iconKey} 
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
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
