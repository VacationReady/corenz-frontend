"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PencilIcon, BriefcaseIcon, UmbrellaIcon, Sparkles, Palette, Settings, Shield, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconPicker } from "@/components/IconPicker";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

interface EventCategory {
  id: string;
  name: string;
  categoryType: 'TIME_OFF' | 'WORKING_EVENT';
  requiresApproval: boolean;
  adminOnly: boolean;
  isActive: boolean;
  systemDefined: boolean;
  color?: string | null;
  iconKey?: string | null;
}

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category: EventCategory | null;
}

export default function EditCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  category,
}: EditCategoryModalProps) {
  const [name, setName] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [color, setColor] = useState("#3b82f6");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [iconKey, setIconKey] = useState<string | null>(null);

  // Populate form when category changes
  useEffect(() => {
    if (category) {
      setName(category.name);
      setRequiresApproval(category.requiresApproval);
      setAdminOnly(category.adminOnly);
      setColor(category.color || "#3b82f6");
      setIsActive(category.isActive);
      setIconKey(category.iconKey || null);
    }
  }, [category]);

  const handleSubmit = async () => {
    if (!category || !name) {
      alert("Please enter a name.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/event-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          requiresApproval,
          adminOnly,
          color,
          isActive,
          iconKey,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || "Failed to update category.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update category.");
    } finally {
      setLoading(false);
    }
  };

  if (!category) return null;

  const isSystemDefined = category.systemDefined;

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-2xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <PencilIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Edit Event Category
                </h2>
                <p className="text-sm text-muted-foreground">
                  Update {category.name}
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-8 pb-8 max-h-[65vh] overflow-y-auto space-y-6">
            {/* Category Type Display (read-only) */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">
                Category Type
              </Label>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-muted/50">
                <div className={`p-3 rounded-xl ${category.categoryType === "TIME_OFF" ? "bg-primary/20" : "bg-violet-500/20"}`}>
                  {category.categoryType === "TIME_OFF" ? (
                    <UmbrellaIcon className="w-5 h-5 text-primary" />
                  ) : (
                    <BriefcaseIcon className="w-5 h-5 text-violet-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold">
                    {category.categoryType === "TIME_OFF" ? "Time Off" : "Working Event"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {category.categoryType === "TIME_OFF" 
                      ? "Leave, vacation, sick days" 
                      : "Training, meetings, activities"}
                  </p>
                </div>
              </div>
            </div>

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
                    disabled={isSystemDefined}
                    className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all disabled:opacity-50"
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
                {isSystemDefined && (
                  <span className="ml-auto text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    System-defined (limited editing)
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                  <Label className="text-sm cursor-pointer">Requires Approval</Label>
                  <Switch 
                    checked={requiresApproval} 
                    onChange={setRequiresApproval}
                    disabled={isSystemDefined}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                  <Label className="text-sm cursor-pointer">Admin Only</Label>
                  <Switch 
                    checked={adminOnly} 
                    onChange={setAdminOnly}
                    disabled={isSystemDefined}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                  <Label className="text-sm cursor-pointer">Active</Label>
                  <Switch 
                    checked={isActive} 
                    onChange={setIsActive}
                    disabled={isSystemDefined}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !name} 
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-primary hover:from-blue-500/90 hover:to-primary/90 text-white font-semibold shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

