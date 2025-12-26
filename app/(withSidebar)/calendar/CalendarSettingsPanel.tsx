"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Eye, Users, Building2, Globe, Shield, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type CalendarEmployeeScope = "OWN" | "DEPARTMENT" | "COMPANY";

interface CalendarVisibilitySettings {
  calendarEmployeeScope: CalendarEmployeeScope;
}

const EMPLOYEE_SCOPE_OPTIONS: { value: CalendarEmployeeScope; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "OWN", label: "Own leave only", description: "See only your own leave requests", icon: <Eye className="h-4 w-4" /> },
  { value: "DEPARTMENT", label: "Department", description: "See your department's leave", icon: <Building2 className="h-4 w-4" /> },
  { value: "COMPANY", label: "Company-wide", description: "See all company leave", icon: <Globe className="h-4 w-4" /> },
];

interface CalendarSettingsPanelProps {
  isAdmin: boolean;
  onSettingsChange?: () => void;
}

export function CalendarSettingsPanel({ isAdmin, onSettingsChange }: CalendarSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CalendarVisibilitySettings>({
    calendarEmployeeScope: "DEPARTMENT",
  });
  const [originalSettings, setOriginalSettings] = useState<CalendarVisibilitySettings | null>(null);

  useEffect(() => {
    if (isOpen && !originalSettings) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/calendar-visibility");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          calendarEmployeeScope: data.calendarEmployeeScope || "DEPARTMENT",
        });
        setOriginalSettings({
          calendarEmployeeScope: data.calendarEmployeeScope || "DEPARTMENT",
        });
      }
    } catch (error) {
      console.error("Failed to fetch calendar visibility settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/settings/calendar-visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setOriginalSettings({ ...settings });
      toast.success("Calendar visibility settings saved");
      onSettingsChange?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = originalSettings && (
    settings.calendarEmployeeScope !== originalSettings.calendarEmployeeScope
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-lg h-7 gap-1.5 transition-all text-xs",
          isOpen && "bg-primary/10 border-primary/30"
        )}
      >
        <Settings className={cn("h-3.5 w-3.5", isOpen && "text-primary")} />
        <span className="hidden sm:inline">Visibility</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute right-0 top-full mt-2 z-50 w-[340px]"
          >
            <Card className="border-border/50 shadow-xl shadow-black/10 overflow-hidden bg-background/95 backdrop-blur-md">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Eye className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Calendar Visibility</h3>
                    <p className="text-[10px] text-muted-foreground">Configure who sees what on the calendar</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-6 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Employee Visibility */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <label className="text-xs font-medium">Calendar Visibility</label>
                    </div>
                    <Select
                      value={settings.calendarEmployeeScope}
                      onValueChange={(value: CalendarEmployeeScope) =>
                        setSettings((prev) => ({ ...prev, calendarEmployeeScope: value }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYEE_SCOPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-xs">
                            <div className="flex items-center gap-2">
                              {option.icon}
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-[10px] text-muted-foreground">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Managers always see their direct reports in addition to this setting.</p>
                  </div>

                  {/* Sickness Privacy Notice */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 cursor-help">
                          <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="text-[10px] text-amber-800 dark:text-amber-200">
                            <span className="font-medium">Sickness privacy is always enforced:</span>
                            <span className="text-amber-700 dark:text-amber-300"> Employees see only their own sick leave. Managers see sick leave for direct reports only.</span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                        <p className="font-medium mb-1">Sickness Privacy Rules (Non-configurable)</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Employees can only see their own sick leave</li>
                          <li>• Managers can see sick leave for their direct reports</li>
                          <li>• Admins can see all sick leave across the company</li>
                        </ul>
                        <p className="mt-2 text-muted-foreground">These rules protect employee health information and cannot be changed.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2 border-t border-border/30">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={!hasChanges || saving}
                      className="h-8 text-xs"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
