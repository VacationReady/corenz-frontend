"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Save,
  Star,
  Trash2,
  Plus,
  ChevronDown,
  User,
  Users,
  Building2,
  Check,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { FilterGroup } from "@/lib/reportFilters";

/**
 * Filter Preset Types
 */
export interface FilterPreset {
  id: number;
  name: string;
  description?: string;
  filterGroup: FilterGroup;
  scope: "personal" | "team" | "company";
  category?: string;
  isDefault: boolean;
  createdAt: string;
  createdBy?: {
    email: string;
    name?: string;
  };
}

interface FilterPresetSelectorProps {
  /** Current filter group to save */
  currentFilterGroup: FilterGroup;
  /** Called when a preset is selected */
  onSelectPreset: (preset: FilterPreset) => void;
  /** Optional category filter */
  category?: string;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

const SCOPE_CONFIG = {
  personal: {
    icon: User,
    label: "Personal",
    description: "Only visible to you",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  team: {
    icon: Users,
    label: "Team",
    description: "Visible to your team",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  company: {
    icon: Building2,
    label: "Company",
    description: "Visible to everyone",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
};

export function FilterPresetSelector({
  currentFilterGroup,
  onSelectPreset,
  category,
  compact = false,
  className,
}: FilterPresetSelectorProps) {
  const { toast } = useToast();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Save form state
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [presetScope, setPresetScope] = useState<"personal" | "team" | "company">("personal");
  const [isDefault, setIsDefault] = useState(false);

  // Fetch presets
  const fetchPresets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      
      const res = await fetch(`/api/reports/filter-presets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch presets");
      
      const data = await res.json();
      setPresets(data.data || []);
    } catch (error) {
      console.error("Failed to fetch filter presets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // Save preset
  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your filter preset.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/reports/filter-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim(),
          description: presetDescription.trim() || undefined,
          filterGroup: currentFilterGroup,
          scope: presetScope,
          category,
          isDefault,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save preset");
      }

      toast({
        title: "Preset saved",
        description: `"${presetName}" has been saved successfully.`,
      });

      // Reset form and close dialog
      setPresetName("");
      setPresetDescription("");
      setPresetScope("personal");
      setIsDefault(false);
      setShowSaveDialog(false);

      // Refresh presets
      await fetchPresets();
    } catch (error) {
      toast({
        title: "Failed to save preset",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete preset
  const handleDeletePreset = async (preset: FilterPreset) => {
    try {
      const res = await fetch(`/api/reports/filter-presets/${preset.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete preset");
      }

      toast({
        title: "Preset deleted",
        description: `"${preset.name}" has been deleted.`,
      });

      await fetchPresets();
    } catch (error) {
      toast({
        title: "Failed to delete preset",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Check if current filter has any rules
  const hasFilters = currentFilterGroup.children && currentFilterGroup.children.length > 0;

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-8", className)}>
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Presets
            <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              Loading presets...
            </div>
          ) : presets.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No saved presets yet
            </div>
          ) : (
            <>
              {presets.map((preset) => {
                const scopeConfig = SCOPE_CONFIG[preset.scope];
                const ScopeIcon = scopeConfig.icon;
                
                return (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => onSelectPreset(preset)}
                    className="flex items-center gap-2"
                  >
                    <ScopeIcon className={cn("w-4 h-4", scopeConfig.color)} />
                    <span className="flex-1 truncate">{preset.name}</span>
                    {preset.isDefault && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasFilters}
          >
            <Save className="w-4 h-4 mr-2" />
            Save current filters...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter Presets</span>
            {presets.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {presets.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasFilters}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Save
          </Button>
        </div>

        {/* Presets List */}
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
            Loading presets...
          </div>
        ) : presets.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No saved presets
            <p className="text-xs mt-1">Save your current filters as a preset</p>
          </div>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => {
              const scopeConfig = SCOPE_CONFIG[preset.scope];
              const ScopeIcon = scopeConfig.icon;
              
              return (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/30 hover:bg-muted/50 transition-all cursor-pointer"
                  onClick={() => onSelectPreset(preset)}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    scopeConfig.bgColor
                  )}>
                    <ScopeIcon className={cn("w-4 h-4", scopeConfig.color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{preset.name}</span>
                      {preset.isDefault && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    {preset.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {preset.description}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filters as a reusable preset.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="preset-name">Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Active Employees Only"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (optional)</Label>
              <Textarea
                id="preset-description"
                placeholder="Describe what this filter does..."
                value={presetDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPresetDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(SCOPE_CONFIG) as [keyof typeof SCOPE_CONFIG, typeof SCOPE_CONFIG[keyof typeof SCOPE_CONFIG]][]).map(([scope, config]) => {
                  const ScopeIcon = config.icon;
                  const isSelected = presetScope === scope;
                  
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setPresetScope(scope)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <ScopeIcon className={cn("w-5 h-5", config.color)} />
                      <span className="text-xs font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {SCOPE_CONFIG[presetScope].description}
              </p>
            </div>

            {/* Default */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <button
                type="button"
                onClick={() => setIsDefault(!isDefault)}
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  isDefault
                    ? "border-primary bg-primary text-white"
                    : "border-muted-foreground/30 bg-background"
                )}
              >
                {isDefault && <Check className="w-3 h-3" />}
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium">Set as default</p>
                <p className="text-xs text-muted-foreground">
                  Apply this preset automatically when viewing reports
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreset}
              disabled={isSaving || !presetName.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FilterPresetSelector;

