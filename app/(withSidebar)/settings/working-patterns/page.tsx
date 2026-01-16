"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, Edit, Eye, Trash2, Clock, Calendar, Briefcase, Copy, ClipboardPaste, Plus, X, ChevronRight, Sparkles, CheckCircle2, Info, Timer, Coffee, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";
import { calculateDayHours, formatHoursDisplay } from "@/lib/working-pattern-utils";

// Collapsible Section Component for form organization
const FormSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  accentColor = "primary",
  badge,
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: "primary" | "emerald" | "violet" | "amber" | "rose" | "blue";
  badge?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const iconColors = {
    primary: "text-primary",
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    blue: "text-blue-600 dark:text-blue-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColors[accentColor]}`} />
          <span className="font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="pt-3 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Type for day configuration - supports both simple types and TIMED with time details
interface DayConfig {
  type: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
}

// Type for week configuration  
interface WeekConfig {
  weekNumber: number;
  days: Record<string, DayConfig>;
}

export default function WorkingPatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<any>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [patternType, setPatternType] = useState<string>("STANDARD");
  const [contractedHoursPerWeek, setContractedHoursPerWeek] = useState<string>("");
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState<number>(30);
  const [weeks, setWeeks] = useState<WeekConfig[]>([{ weekNumber: 1, days: {} }]);

  const [typeFilter, setTypeFilter] = useState<
    "all" | "STANDARD" | "SHIFT_BASED" | "FLEXIBLE"
  >("all");

  const [viewPattern, setViewPattern] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  // Copy/Paste week clipboard (in-memory only)
  const clipboardRef = useRef<Record<string, DayConfig> | null>(null);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayTypes = [
    { label: "Full Day", value: "FULL_DAY" },
    { label: "Half Day AM", value: "HALF_DAY_AM" },
    { label: "Half Day PM", value: "HALF_DAY_PM" },
    { label: "Timed", value: "TIMED" },
  ];

  const formatDayLabel = (raw: string) => {
    if (!raw) return "";
    const lower = raw.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const formatTypeLabel = (raw: string) => {
    if (!raw) return "";
    return raw
      .toLowerCase()
      .split("_")
      .map((part) => {
        if (part === "am" || part === "pm") return part.toUpperCase();
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  };

  const fetchPatterns = async () => {
    try {
      const res = await fetch("/api/working-patterns");
      const data = await res.json();
      // Ensure data is always an array
      setPatterns(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Failed to fetch patterns:", error);
      setPatterns([]);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const filteredPatterns = useMemo(
    () =>
      typeFilter === "all"
        ? patterns
        : patterns.filter(
            (pattern) => pattern.patternType === typeFilter,
          ),
    [patterns, typeFilter],
  );

  const handleCheckboxChange = (
    weekIndex: number,
    day: string,
    checked: boolean,
  ) => {
    setWeeks((prev) => {
      const updated = [...prev];
      const daysObj = { ...updated[weekIndex].days };
      if (checked) {
        daysObj[day] = { type: "FULL_DAY" };
      } else {
        delete daysObj[day];
      }
      updated[weekIndex].days = daysObj;
      return updated;
    });
  };

  const handleTypeChange = (weekIndex: number, day: string, type: string) => {
    setWeeks((prev) => {
      const updated = [...prev];
      const existing = updated[weekIndex].days[day] || {};
      if (type === "TIMED") {
        // Initialize with default times when switching to TIMED
        updated[weekIndex].days[day] = {
          ...existing,
          type,
          startTime: existing.startTime || "09:00",
          endTime: existing.endTime || "17:00",
          breakMinutes: existing.breakMinutes ?? defaultBreakMinutes,
        };
      } else {
        // For non-TIMED types, just keep the type
        updated[weekIndex].days[day] = { type };
      }
      return updated;
    });
  };

  const handleTimeChange = (
    weekIndex: number,
    day: string,
    field: "startTime" | "endTime" | "breakMinutes",
    value: string | number
  ) => {
    setWeeks((prev) => {
      const updated = [...prev];
      const dayConfig = updated[weekIndex].days[day];
      if (dayConfig) {
        updated[weekIndex].days[day] = {
          ...dayConfig,
          [field]: value,
        };
      }
      return updated;
    });
  };

  // Calculate hours for a TIMED day
  const getCalculatedHours = (dayConfig: DayConfig): number | null => {
    if (dayConfig.type !== "TIMED" || !dayConfig.startTime || !dayConfig.endTime) {
      return null;
    }
    return calculateDayHours(dayConfig.startTime, dayConfig.endTime, dayConfig.breakMinutes ?? 0);
  };

  const handleCopyWeek = (weekIndex: number) => {
    // Deep clone the days object
    clipboardRef.current = JSON.parse(JSON.stringify(weeks[weekIndex].days));
    toast.success(`Copied week ${weeks[weekIndex].weekNumber}`);
  };

  const handlePasteWeek = (weekIndex: number) => {
    if (!clipboardRef.current) {
      toast.error("Nothing copied");
      return;
    }
    setWeeks((prev) => {
      const updated = [...prev];
      updated[weekIndex] = {
        ...updated[weekIndex],
        days: JSON.parse(JSON.stringify(clipboardRef.current)),
      };
      return updated;
    });
    toast.success(`Pasted to week ${weeks[weekIndex].weekNumber}`);
  };

  const calendarPreview = useMemo(() => {
    // Build compact matrix preview of selected weeks/days with hours for TIMED
    return weeks.map((week) => days.map((d) => {
      const dayConfig = week.days[d];
      if (!dayConfig) return null;
      if (dayConfig.type === "TIMED" && dayConfig.startTime && dayConfig.endTime) {
        const hours = calculateDayHours(dayConfig.startTime, dayConfig.endTime, dayConfig.breakMinutes ?? 0);
        return `${formatHoursDisplay(hours)}`;
      }
      return dayConfig.type;
    }));
  }, [weeks]);

  const addWeek = () => {
    setWeeks((prev) => [...prev, { weekNumber: prev.length + 1, days: {} }]);
  };

  const removeWeek = (weekIndex: number) => {
    setWeeks((prev) => {
      const updated = prev.filter((_, idx) => idx !== weekIndex);
      return updated.map((w, idx) => ({ ...w, weekNumber: idx + 1 }));
    });
  };

  const handleSubmit = async () => {
    // Validation based on pattern type
    if (!name) {
      toast.error("Name is required");
      return;
    }
    
    if (patternType === "SHIFT_BASED") {
      if (!contractedHoursPerWeek || parseFloat(contractedHoursPerWeek) <= 0) {
        toast.error("Contracted hours per week is required for shift-based patterns");
        return;
      }
    } else {
      if (weeks.every((w) => Object.keys(w.days).length === 0)) {
        toast.error("At least one working day in any week is required");
        return;
      }
      
      // Validate TIMED days have proper times
      for (const week of weeks) {
        for (const [day, config] of Object.entries(week.days)) {
          if (config.type === "TIMED") {
            if (!config.startTime || !config.endTime) {
              toast.error(`${day} is set to Timed but missing start or end time`);
              return;
            }
          }
        }
      }
    }

    // Build weeks payload with full day configuration
    const weeksPayload = patternType === "SHIFT_BASED" ? [] : weeks.map((week) => ({
      weekNumber: week.weekNumber,
      days: Object.entries(week.days).map(([day, config]) => ({
        day,
        type: config.type,
        startTime: config.type === "TIMED" ? config.startTime : undefined,
        endTime: config.type === "TIMED" ? config.endTime : undefined,
        breakMinutes: config.type === "TIMED" ? (config.breakMinutes ?? defaultBreakMinutes) : undefined,
      })),
    }));

    const url =
      editMode && currentPattern
        ? `/api/working-patterns/${currentPattern.id}`
        : "/api/working-patterns";

    const method = editMode ? "PATCH" : "POST";

    const payload: any = { 
      name, 
      description, 
      weeks: weeksPayload,
      patternType,
      defaultBreakMinutes,
    };
    
    if (patternType === "SHIFT_BASED" && contractedHoursPerWeek) {
      payload.contractedHoursPerWeek = parseFloat(contractedHoursPerWeek);
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowSuccess(true);
      setName("");
      setDescription("");
      setPatternType("STANDARD");
      setContractedHoursPerWeek("");
      setDefaultBreakMinutes(30);
      setWeeks([{ weekNumber: 1, days: {} }]);
      setOpen(false);
      setEditMode(false);
      setCurrentPattern(null);
      fetchPatterns();
    } else {
      const errorData = await res.json();
      toast.error(
        errorData.message ||
          `Error ${editMode ? "updating" : "creating"} working pattern`,
      );
    }
  };

  const handleEdit = (pattern: any) => {
    setEditMode(true);
    setCurrentPattern(pattern);
    setName(pattern.name);
    setDescription(pattern.description || "");
    setPatternType(pattern.patternType || "STANDARD");
    setContractedHoursPerWeek(pattern.contractedHoursPerWeek ? pattern.contractedHoursPerWeek.toString() : "");
    setDefaultBreakMinutes(pattern.defaultBreakMinutes ?? 30);
    
    const toShortDay = (name: string) => {
      if (!name) return name;
      // Normalize to lowercase for comparison to handle all formats (Mon, Monday, MONDAY)
      const normalized = name.toLowerCase();
      const map: Record<string, string> = {
        monday: "Mon",
        tuesday: "Tue",
        wednesday: "Wed",
        thursday: "Thu",
        friday: "Fri",
        saturday: "Sat",
        sunday: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
        sun: "Sun",
      };
      return map[normalized] || name;
    };

    const loadedWeeks: WeekConfig[] = pattern.weeks?.length > 0 ? pattern.weeks.map((week: any) => {
      const daysObj: Record<string, DayConfig> = {};
      week.days.forEach((d: any) => {
        const key = toShortDay(d.day);
        // Load full day configuration including time fields for TIMED
        daysObj[key] = {
          type: d.type,
          startTime: d.startTime || undefined,
          endTime: d.endTime || undefined,
          breakMinutes: d.breakMinutes ?? 0,
        };
      });
      return { weekNumber: week.weekNumber, days: daysObj };
    }) : [{ weekNumber: 1, days: {} }];
    setWeeks(loadedWeeks);
    setOpen(true);
  };

  const setActionPending = useCallback((id: string, action: string) => {
    setPendingActions((prev) => ({ ...prev, [id]: action }));
  }, []);

  const clearActionPending = useCallback((id: string) => {
    setPendingActions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleArchive = async (id: string) => {
    setActionPending(id, "archive");
    try {
      const res = await fetch(`/api/working-patterns/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Pattern archived");
        fetchPatterns();
      } else {
        toast.error("Error archiving pattern");
      }
    } finally {
      clearActionPending(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this pattern? This cannot be undone.",
      )
    )
      return;
    setActionPending(id, "delete");
    try {
      const res = await fetch(`/api/working-patterns/${id}?permanent=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Pattern permanently deleted");
        fetchPatterns();
      } else {
        toast.error("Error deleting pattern");
      }
    } finally {
      clearActionPending(id);
    }
  };

  return (
    <PageShell
      title="Working Patterns"
      breadcrumbs={breadcrumbConfigs.settingsSection("Working Patterns")}
      showHomeIcon={false}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/60">
            Type
          </span>
          <Select
            value={typeFilter}
            onValueChange={(
              value: "all" | "STANDARD" | "SHIFT_BASED" | "FLEXIBLE",
            ) => setTypeFilter(value)}
          >
            <SelectTrigger className="w-[180px] bg-background/60 border-white/20">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="STANDARD">Standard</SelectItem>
              <SelectItem value="SHIFT_BASED">Shift-based</SelectItem>
              <SelectItem value="FLEXIBLE">Flexible</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex space-x-2">
          <Link href="/settings/working-patterns/archived">
            <Button variant="ghost">View Archived</Button>
          </Link>
          <Dialog
            open={open}
            onOpenChange={(val) => {
              setOpen(val);
              if (!val) {
                setEditMode(false);
                setCurrentPattern(null);
                setName("");
                setDescription("");
                setPatternType("STANDARD");
                setContractedHoursPerWeek("");
                setDefaultBreakMinutes(30);
                setWeeks([{ weekNumber: 1, days: {} }]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>{editMode ? "Editing Pattern" : "Add Pattern"}</Button>
            </DialogTrigger>
            <DialogContent 
              rawContent 
              size="full" 
              className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
              aria-describedby={undefined}
            >
              {/* Visually hidden title for accessibility */}
              <DialogTitle className="sr-only">
                {editMode ? "Edit Working Pattern" : "Create Working Pattern"}
              </DialogTitle>
              {/* Header */}
              <div className="px-8 pt-8 pb-6 flex-shrink-0 border-b border-muted/20">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {editMode ? "Edit Working Pattern" : "Create Working Pattern"}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground ml-14">
                      {editMode 
                        ? "Update the working schedule configuration" 
                        : "Define a new work schedule for employees"
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="px-8 py-6 flex-1 overflow-y-auto space-y-6">
                {/* Basic Info Section */}
                <FormSection title="Basic Information" icon={Briefcase} accentColor="primary">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">
                        Pattern Name <span className="text-primary">*</span>
                      </Label>
                      <Input
                        placeholder="e.g., Standard Full-Time"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">Pattern Type</Label>
                      <Select
                        value={patternType}
                        onValueChange={(value) => {
                          setPatternType(value);
                          if (value === "SHIFT_BASED") {
                            setWeeks([{ weekNumber: 1, days: {} }]);
                          }
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                          <SelectValue placeholder="Select pattern type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STANDARD">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              Standard - Fixed recurring schedule
                            </div>
                          </SelectItem>
                          <SelectItem value="SHIFT_BASED">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-violet-500" />
                              Shift-Based - Flexible hours
                            </div>
                          </SelectItem>
                          <SelectItem value="FLEXIBLE">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              Flexible - Variable schedule
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">Description</Label>
                    <Textarea
                      placeholder="Optional description of this working pattern..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[80px] rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all resize-none"
                    />
                  </div>

                  {/* Pattern Type Info Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-xl border flex items-start gap-3",
                      patternType === "STANDARD" && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/50",
                      patternType === "SHIFT_BASED" && "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200/50 dark:border-violet-800/50",
                      patternType === "FLEXIBLE" && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50"
                    )}
                  >
                    <Info className={cn(
                      "w-5 h-5 flex-shrink-0 mt-0.5",
                      patternType === "STANDARD" && "text-emerald-600 dark:text-emerald-400",
                      patternType === "SHIFT_BASED" && "text-violet-600 dark:text-violet-400",
                      patternType === "FLEXIBLE" && "text-amber-600 dark:text-amber-400"
                    )} />
                    <div>
                      {patternType === "STANDARD" && (
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">
                          <span className="font-medium">Standard patterns</span> are ideal for employees with fixed, recurring work schedules (e.g., Mon-Fri, 9am-5pm). Define specific days and hours that repeat each week.
                        </p>
                      )}
                      {patternType === "SHIFT_BASED" && (
                        <p className="text-sm text-violet-800 dark:text-violet-200">
                          <span className="font-medium">Shift-based patterns</span> suit gig workers, zero-hour contracts, or employees with flexible schedules. Define total contracted hours, then create shifts manually.
                        </p>
                      )}
                      {patternType === "FLEXIBLE" && (
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <span className="font-medium">Flexible patterns</span> work for employees with variable schedules that change frequently. Hours and days can be adjusted as needed.
                        </p>
                      )}
                    </div>
                  </motion.div>
                </FormSection>

                {/* Settings Section */}
                <FormSection 
                  title={patternType === "SHIFT_BASED" ? "Contracted Hours" : "Break Settings"} 
                  icon={Coffee} 
                  accentColor="amber"
                >
                  {patternType === "SHIFT_BASED" ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">
                        Contracted Hours per Week <span className="text-primary">*</span>
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="e.g., 20"
                          value={contractedHoursPerWeek}
                          onChange={(e) => setContractedHoursPerWeek(e.target.value)}
                          className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all max-w-[200px]"
                        />
                        <span className="text-sm text-muted-foreground">hours/week</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total contracted hours per week. Shifts will be created manually to meet this requirement.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">
                        Default Break Duration
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          step="5"
                          placeholder="30"
                          value={defaultBreakMinutes}
                          onChange={(e) => setDefaultBreakMinutes(parseInt(e.target.value) || 0)}
                          className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all max-w-[150px]"
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Default break deduction for Timed days. Can be overridden per day.
                      </p>
                    </div>
                  )}
                </FormSection>

                {/* Weekly Schedule Section */}
                {patternType !== "SHIFT_BASED" && (
                  <FormSection 
                    title="Weekly Schedule" 
                    icon={Calendar} 
                    accentColor="blue"
                    badge={
                      <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {weeks.length} week{weeks.length > 1 ? "s" : ""}
                      </span>
                    }
                  >
                    <AnimatePresence mode="popLayout">
                      {weeks.map((week, weekIndex) => {
                        const selectedDaysCount = Object.keys(week.days).length;
                        const totalHours = Object.values(week.days).reduce((acc, config) => {
                          const hours = getCalculatedHours(config);
                          return acc + (hours || (config.type === "FULL_DAY" ? 8 : config.type.includes("HALF") ? 4 : 0));
                        }, 0);

                        return (
                          <motion.div
                            key={weekIndex}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="relative rounded-2xl border border-muted/30 bg-gradient-to-br from-white/80 to-slate-50/50 dark:from-slate-800/50 dark:to-slate-900/50 overflow-hidden"
                          >
                            {/* Week Header */}
                            <div className="px-5 py-4 border-b border-muted/20 bg-gradient-to-r from-blue-50/50 via-transparent to-violet-50/50 dark:from-blue-950/20 dark:to-violet-950/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25">
                                    {week.weekNumber}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-foreground">Week {week.weekNumber}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {selectedDaysCount} day{selectedDaysCount !== 1 ? "s" : ""} selected
                                      {totalHours > 0 && ` • ~${formatHoursDisplay(totalHours)}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopyWeek(weekIndex)}
                                    className="h-8 px-3 text-xs rounded-lg"
                                  >
                                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                                    Copy
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handlePasteWeek(weekIndex)}
                                    disabled={!clipboardRef.current}
                                    className="h-8 px-3 text-xs rounded-lg"
                                  >
                                    <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" />
                                    Paste
                                  </Button>
                                  {weeks.length > 1 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeWeek(weekIndex)}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Days Grid */}
                            <div className="p-5">
                              <div className="grid grid-cols-7 gap-3">
                                {days.map((day) => {
                                  const dayConfig = week.days[day];
                                  const isSelected = day in week.days;
                                  const isTimed = dayConfig?.type === "TIMED";
                                  const calculatedHours = dayConfig ? getCalculatedHours(dayConfig) : null;

                                  return (
                                    <motion.div 
                                      key={day}
                                      layout
                                      className="flex flex-col"
                                    >
                                      {/* Day Toggle Button */}
                                      <button
                                        type="button"
                                        onClick={() => handleCheckboxChange(weekIndex, day, !isSelected)}
                                        className={cn(
                                          "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200",
                                          isSelected 
                                            ? "border-primary bg-primary/10 shadow-md shadow-primary/10" 
                                            : "border-muted/30 bg-white/50 dark:bg-white/5 hover:border-primary/30 hover:bg-primary/5"
                                        )}
                                      >
                                        {isSelected && (
                                          <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                          </motion.div>
                                        )}
                                        <span className={cn(
                                          "text-sm font-semibold",
                                          isSelected ? "text-primary" : "text-foreground/70"
                                        )}>
                                          {day}
                                        </span>
                                        {isSelected && calculatedHours !== null && (
                                          <span className="text-xs text-primary/80 mt-0.5">
                                            {formatHoursDisplay(calculatedHours)}
                                          </span>
                                        )}
                                        {isSelected && !isTimed && dayConfig && (
                                          <span className="text-[10px] text-muted-foreground mt-0.5">
                                            {dayConfig.type === "FULL_DAY" ? "Full" : dayConfig.type.includes("AM") ? "AM" : "PM"}
                                          </span>
                                        )}
                                      </button>

                                      {/* Day Configuration */}
                                      <AnimatePresence>
                                        {isSelected && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-2 space-y-2"
                                          >
                                            <Select
                                              value={dayConfig?.type || "FULL_DAY"}
                                              onValueChange={(value) => handleTypeChange(weekIndex, day, value)}
                                            >
                                              <SelectTrigger className="h-8 text-xs rounded-lg border-muted/40 bg-white/80 dark:bg-white/5">
                                                <SelectValue placeholder="Type" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {dayTypes.map((type) => (
                                                  <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>

                                            {/* Timed Configuration */}
                                            {isTimed && (
                                              <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 border border-blue-200/50 dark:border-blue-800/50 space-y-2.5"
                                              >
                                                <div className="flex items-center gap-1.5 mb-2">
                                                  <Timer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Schedule</span>
                                                </div>
                                                <div className="space-y-2">
                                                  <Input
                                                    type="time"
                                                    value={dayConfig?.startTime || "09:00"}
                                                    onChange={(e) => handleTimeChange(weekIndex, day, "startTime", e.target.value)}
                                                    className="h-8 text-xs rounded-lg border-blue-200/50 dark:border-blue-800/50 bg-white/80 dark:bg-white/5 focus:border-blue-400"
                                                  />
                                                  <Input
                                                    type="time"
                                                    value={dayConfig?.endTime || "17:00"}
                                                    onChange={(e) => handleTimeChange(weekIndex, day, "endTime", e.target.value)}
                                                    className="h-8 text-xs rounded-lg border-blue-200/50 dark:border-blue-800/50 bg-white/80 dark:bg-white/5 focus:border-blue-400"
                                                  />
                                                </div>
                                                <div className="flex items-center gap-1.5 pt-1 border-t border-blue-200/30 dark:border-blue-800/30">
                                                  <Coffee className="w-3 h-3 text-amber-600" />
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    step="5"
                                                    value={dayConfig?.breakMinutes ?? defaultBreakMinutes}
                                                    onChange={(e) => handleTimeChange(weekIndex, day, "breakMinutes", parseInt(e.target.value) || 0)}
                                                    className="h-6 w-12 text-xs px-1.5 rounded border-amber-200/50 dark:border-amber-800/50 bg-white/80 dark:bg-white/5"
                                                  />
                                                  <span className="text-[10px] text-muted-foreground">min</span>
                                                </div>
                                                {calculatedHours !== null && (
                                                  <div className="flex items-center justify-center pt-1">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                                      = {formatHoursDisplay(calculatedHours)}
                                                    </span>
                                                  </div>
                                                )}
                                              </motion.div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Add Week Button */}
                    <motion.button
                      type="button"
                      onClick={addWeek}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-4 rounded-xl border-2 border-dashed border-muted/40 hover:border-primary/40 bg-white/30 dark:bg-white/5 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Add Another Week</span>
                    </motion.button>

                    {/* Calendar Preview */}
                    {weeks.some(w => Object.keys(w.days).length > 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50 border border-muted/30"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">Schedule Preview</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-muted/30">
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Week</th>
                                {days.map((d) => (
                                  <th key={d} className="px-2 py-2 text-center font-semibold text-muted-foreground">{d}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {calendarPreview.map((weekRow, idx) => (
                                <tr key={idx} className="border-b border-muted/20 last:border-b-0">
                                  <td className="px-3 py-2 font-medium text-foreground">{idx + 1}</td>
                                  {weekRow.map((val, j) => (
                                    <td key={j} className="px-2 py-2 text-center">
                                      {val ? (
                                        <span className={cn(
                                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                                          val.includes("h") 
                                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                            : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                                        )}>
                                          {val.replace(/_/g, " ")}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/40">—</span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </FormSection>
                )}

                {/* Shift-Based Info */}
                {patternType === "SHIFT_BASED" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200/50 dark:border-violet-800/50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-violet-500/20">
                        <Clock className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-violet-900 dark:text-violet-100 mb-1">
                          Shift-Based Schedule
                        </h4>
                        <p className="text-sm text-violet-800/80 dark:text-violet-200/80 mb-3">
                          This pattern type doesn't require fixed weekly schedules. Instead, shifts will be created manually through the rota/scheduling system.
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-violet-700 dark:text-violet-300">Contracted:</span>
                          <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300 font-semibold">
                            {contractedHoursPerWeek || "0"} hours/week
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-muted/20 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {patternType !== "SHIFT_BASED" && weeks.some(w => Object.keys(w.days).length > 0) && (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {weeks.reduce((acc, w) => acc + Object.keys(w.days).length, 0)} working day{weeks.reduce((acc, w) => acc + Object.keys(w.days).length, 0) !== 1 ? "s" : ""} configured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setOpen(false)}
                      className="h-11 px-5 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {editMode ? "Save Changes" : "Create Pattern"}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!viewPattern} onOpenChange={() => setViewPattern(null)}>
        <DialogContent>
          {viewPattern && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{viewPattern.name}</h2>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={cn(
                  "text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1",
                  viewPattern.patternType === "SHIFT_BASED" 
                    ? "bg-purple-500/20 text-purple-700 dark:text-purple-300" 
                    : viewPattern.patternType === "FLEXIBLE"
                    ? "bg-orange-500/20 text-orange-700 dark:text-orange-300"
                    : "bg-foreground/10"
                )}>
                  {viewPattern.patternType === "SHIFT_BASED" ? "Shift-Based" : viewPattern.patternType === "FLEXIBLE" ? "Flexible" : "Standard"}
                </span>
                {viewPattern.patternType === "SHIFT_BASED" && viewPattern.contractedHoursPerWeek && (
                  <span className="text-xs font-semibold uppercase tracking-wider rounded-full bg-foreground/10 px-3 py-1">
                    {viewPattern.contractedHoursPerWeek}h/week
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {viewPattern.description || "No description"}
              </p>
              {viewPattern.patternType === "SHIFT_BASED" ? (
                <div className="border rounded p-4 bg-purple-50 dark:bg-purple-950/20">
                  <p className="text-sm text-foreground/80">
                    This is a flexible shift-based pattern with {viewPattern.contractedHoursPerWeek || 0} contracted hours per week. Shifts must be created manually for this pattern.
                  </p>
                </div>
              ) : (
                viewPattern.weeks.map((week: any) => (
                  <div key={week.id} className="border rounded p-2">
                    <h3 className="font-medium mb-1">Week {week.weekNumber}</h3>
                    <ul className="text-sm list-disc list-inside">
                      {week.days.map((d: any) => (
                        <li key={d.id}>
                          {d.day} - {d.type === "TIMED" ? (
                            <span className="text-blue-600">
                              {d.startTime} - {d.endTime}
                              {d.breakMinutes > 0 && ` (${d.breakMinutes}min break)`}
                              {d.hoursPerDay && ` = ${formatHoursDisplay(d.hoursPerDay)}`}
                            </span>
                          ) : (
                            d.type.replace(/_/g, " ")
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        <AnimatePresence initial={false}>
          {filteredPatterns.map((pattern) => {
            const patternDays = pattern.weeks?.flatMap((w: any) => w.days) || [];
            const preview = patternDays
              .slice(0, 3)
              .map((d: any) => {
                const dayLabel = formatDayLabel(d.day);
                if (d.type === "TIMED" && d.hoursPerDay) {
                  return `${dayLabel} (${formatHoursDisplay(d.hoursPerDay)})`;
                }
                const typeLabel = formatTypeLabel(d.type);
                return typeLabel ? `${dayLabel} (${typeLabel})` : dayLabel;
              })
              .join(", ");
            const weekLengthLabel = `${pattern.weeks.length} week${pattern.weeks.length === 1 ? "" : "s"}`;
            
            return (
              <motion.article
                key={pattern.id}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24, scale: 0.95 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative group"
              >
                <GlassSurface
                  intensity="strong"
                  variant="panel"
                  size="lg"
                  gradient
                  hoverable
                  className="relative flex flex-col gap-6 overflow-hidden border border-white/15 bg-white/10 p-6 pr-6 text-foreground backdrop-blur-xl transition-shadow hover:shadow-[0_28px_60px_-30px_rgba(15,23,42,0.65)] md:pr-60"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_45%,rgba(15,23,42,0.15)_100%)]" aria-hidden="true" />
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-foreground md:text-xl">
                        {pattern.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-foreground/60">
                        <span className={cn(
                          "rounded-full px-3 py-1",
                          pattern.patternType === "SHIFT_BASED" 
                            ? "bg-purple-500/20 text-purple-700 dark:text-purple-300" 
                            : pattern.patternType === "FLEXIBLE"
                            ? "bg-orange-500/20 text-orange-700 dark:text-orange-300"
                            : "bg-foreground/10"
                        )}>
                          {pattern.patternType === "SHIFT_BASED" ? "Shift-Based" : pattern.patternType === "FLEXIBLE" ? "Flexible" : "Standard"}
                        </span>
                        {pattern.patternType === "SHIFT_BASED" && pattern.contractedHoursPerWeek && (
                          <span className="rounded-full bg-foreground/10 px-3 py-1">
                            {pattern.contractedHoursPerWeek}h/week
                          </span>
                        )}
                        {pattern.patternType !== "SHIFT_BASED" && (
                          <>
                            <span className="rounded-full bg-foreground/10 px-3 py-1">
                              {weekLengthLabel}
                            </span>
                            <span className="rounded-full bg-foreground/10 px-3 py-1">
                              {patternDays.length} day{patternDays.length === 1 ? "" : "s"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className={cn("text-sm leading-relaxed", pattern.description ? "text-foreground/80" : "italic text-foreground/60")}>
                      {pattern.description || "No description provided."}
                    </p>
                    {pattern.patternType === "SHIFT_BASED" ? (
                      <div className="text-sm text-foreground/80">
                        <span className="font-medium text-foreground">Type:</span> Flexible scheduling with {pattern.contractedHoursPerWeek || 0}h contracted per week
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/80">
                        {preview}
                        {patternDays.length > 3 ? ` (+${patternDays.length - 3} more)` : ""}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-y-4 right-4 flex translate-x-12 flex-col items-stretch gap-2 rounded-2xl bg-background/75 px-3 py-3 text-sm shadow-depth-2 backdrop-blur-xl opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => setViewPattern(pattern)}
                      className="w-full justify-start"
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => handleEdit(pattern)}
                      className="w-full justify-start"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Archive className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => handleArchive(pattern.id)}
                      loading={pendingActions[pattern.id] === "archive"}
                      loadingText="Archiving"
                      className="w-full justify-start"
                    >
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => handleDelete(pattern.id)}
                      loading={pendingActions[pattern.id] === "delete"}
                      loadingText="Deleting"
                      className="w-full justify-start"
                    >
                      Delete
                    </Button>
                  </div>
                </GlassSurface>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName="Working Pattern"
      />
    </PageShell>
  );
}

