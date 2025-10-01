"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import KebabMenu from "@/components/ui/KebabMenu";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { cn } from "@/lib/utils";

export default function WorkingPatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weeks, setWeeks] = useState<any[]>([{ weekNumber: 1, days: {} }]);

  const [viewPattern, setViewPattern] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<StepId>("details");
  // Copy/Paste week clipboard (in-memory only)
  const clipboardRef = useRef<Record<string, string> | null>(null);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayTypes = [
    { label: "Full day", value: "FULL_DAY" },
    { label: "Half day AM", value: "HALF_DAY_AM" },
    { label: "Half day PM", value: "HALF_DAY_PM" },
  ];

  type StepId = "details" | "grid" | "preview";
  const steps: { id: StepId; title: string; description: string }[] = [
    {
      id: "details",
      title: "Details",
      description: "Name the pattern and describe how it should be used.",
    },
    {
      id: "grid",
      title: "Weekly grid",
      description: "Flip days on to configure the cadence and types.",
    },
    {
      id: "preview",
      title: "Preview",
      description: "Review the mosaic calendar before saving.",
    },
  ];

  const dayTypeStyles: Record<
    string,
    { card: string; chip: string; accent: string }
  > = {
    FULL_DAY: {
      card: "from-sky-500/20 via-sky-400/10 to-sky-500/5 border-sky-500/40 text-sky-900 dark:text-sky-50",
      chip: "bg-sky-500/90 text-white",
      accent: "text-sky-500",
    },
    HALF_DAY_AM: {
      card: "from-amber-500/25 via-amber-400/10 to-amber-500/5 border-amber-500/40 text-amber-900 dark:text-amber-50",
      chip: "bg-amber-500/90 text-white",
      accent: "text-amber-500",
    },
    HALF_DAY_PM: {
      card: "from-violet-500/25 via-violet-400/10 to-violet-500/5 border-violet-500/40 text-violet-900 dark:text-violet-50",
      chip: "bg-violet-500/90 text-white",
      accent: "text-violet-500",
    },
  };

  const dayTypeLabels: Record<string, string> = {
    FULL_DAY: "Full day",
    HALF_DAY_AM: "Half day (AM)",
    HALF_DAY_PM: "Half day (PM)",
  };

  const fetchPatterns = async () => {
    const res = await fetch("/api/working-patterns");
    const data = await res.json();
    setPatterns(data);
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleDayToggle = (weekIndex: number, day: string) => {
    setWeeks((prev) => {
      const updated = [...prev];
      const daysObj = { ...updated[weekIndex].days };
      if (day in daysObj) {
        delete daysObj[day];
      } else {
        daysObj[day] = "FULL_DAY";
      }
      updated[weekIndex].days = daysObj;
      return updated;
    });
  };

  const handleTypeChange = (weekIndex: number, day: string, type: string) => {
    setWeeks((prev) => {
      const updated = [...prev];
      updated[weekIndex].days[day] = type;
      return updated;
    });
  };

  const handleCopyWeek = (weekIndex: number) => {
    clipboardRef.current = { ...weeks[weekIndex].days };
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
        days: { ...clipboardRef.current },
      };
      return updated;
    });
    toast.success(`Pasted to week ${weeks[weekIndex].weekNumber}`);
  };

  const calendarPreview = useMemo(() => {
    // Build compact matrix preview of selected weeks/days
    return weeks.map((week) => days.map((d) => week.days[d] || null));
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
    if (!name || weeks.every((w) => Object.keys(w.days).length === 0)) {
      toast.error("Name and at least one working day in any week are required");
      return;
    }

    const weeksPayload = weeks.map((week) => ({
      weekNumber: week.weekNumber,
      days: Object.entries(week.days).map(([day, type]) => ({ day, type })),
    }));

    const url =
      editMode && currentPattern
        ? `/api/working-patterns/${currentPattern.id}`
        : "/api/working-patterns";

    const method = editMode ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, weeks: weeksPayload }),
    });

    if (res.ok) {
      toast.success(`Working pattern ${editMode ? "updated" : "created"}`);
      setName("");
      setDescription("");
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
    const toShortDay = (name: string) => {
      const map: Record<string, string> = {
        Monday: "Mon",
        Tuesday: "Tue",
        Wednesday: "Wed",
        Thursday: "Thu",
        Friday: "Fri",
        Saturday: "Sat",
        Sunday: "Sun",
      };
      if (!name) return name;
      if (name.length <= 3) return name;
      return map[name] || name;
    };

    const loadedWeeks = pattern.weeks.map((week: any) => {
      const daysObj: Record<string, string> = {};
      week.days.forEach((d: any) => {
        const key = toShortDay(d.day);
        daysObj[key] = d.type;
      });
      return { weekNumber: week.weekNumber, days: daysObj };
    });
    setWeeks(loadedWeeks);
    setOpen(true);
  };

  useEffect(() => {
    if (open) {
      setActiveTab("details");
    }
  }, [open]);

  const activeIndex = steps.findIndex((s) => s.id === activeTab);

  const handleArchive = async (id: string) => {
    const res = await fetch(`/api/working-patterns/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Pattern archived");
      fetchPatterns();
    } else {
      toast.error("Error archiving pattern");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this pattern? This cannot be undone.",
      )
    )
      return;
    const res = await fetch(`/api/working-patterns/${id}?permanent=true`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Pattern permanently deleted");
      fetchPatterns();
    } else {
      toast.error("Error deleting pattern");
    }
  };

  return (
    <PageShell
      title="Working Patterns"
      breadcrumbs={breadcrumbConfigs.settingsSection('Working Patterns')}
      showHomeIcon={false}
    >
      <div className="flex justify-between items-center mb-4">
        <div />
        <div className="flex space-x-2">
          <Link href="/settings/working-patterns/archived">
            <Button variant="ghost">View Archived</Button>
          </Link>
          <Sheet
            open={open}
            onOpenChange={(val) => {
              setOpen(val);
              if (!val) {
                setEditMode(false);
                setCurrentPattern(null);
                setWeeks([{ weekNumber: 1, days: {} }]);
              }
            }}
          >
            <SheetTrigger asChild>
              <Button>{editMode ? "Editing Pattern" : "Add Pattern"}</Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex h-full w-full max-w-4xl flex-col overflow-hidden border-l border-border/40 p-0"
            >
              <SheetHeader className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-8 pb-6 pt-12 text-left text-white shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.2)]">
                <div className="absolute inset-0 opacity-20">
                  <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.6),transparent_55%)]" />
                </div>
                <div className="relative space-y-4">
                  <SheetTitle className="text-2xl font-semibold tracking-tight text-white">
                    {editMode ? "Edit working pattern" : "Create a working pattern"}
                  </SheetTitle>
                  <p className="max-w-xl text-sm text-white/80">
                    Guide managers through a structured flow to capture day-level cadences and preview how your pattern rolls out.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-stretch gap-4">
                      {steps.map((step, index) => {
                        const isActive = step.id === activeTab;
                        const isComplete = index < activeIndex;
                        return (
                          <motion.button
                            key={step.id}
                            type="button"
                            onClick={() => setActiveTab(step.id)}
                            className={cn(
                              "relative flex-1 rounded-2xl border border-white/25 px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-primary/40",
                              isActive
                                ? "bg-white/90 text-primary shadow-lg shadow-primary/20"
                                : "bg-white/10 text-white/80 hover:bg-white/20",
                            )}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-wider text-white/70">
                                  Step {index + 1}
                                </p>
                                <p
                                  className={cn(
                                    "text-sm font-semibold",
                                    isActive ? "text-primary" : "text-white",
                                  )}
                                >
                                  {step.title}
                                </p>
                              </div>
                              <motion.span
                                layout
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-full border",
                                  isActive
                                    ? "border-primary bg-primary text-white"
                                    : isComplete
                                      ? "border-white/70 bg-white/40 text-white"
                                      : "border-white/40 text-white/70",
                                )}
                                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                              >
                                {index + 1}
                              </motion.span>
                            </div>
                            <p className="mt-2 text-xs text-white/70">
                              {step.description}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="h-1 rounded-full bg-white/20">
                      <motion.div
                        className="h-full rounded-full bg-white"
                        initial={false}
                        animate={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 20 }}
                      />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as StepId)}
                className="flex h-full flex-1 flex-col"
              >
                <TabsList className="sr-only">
                  {steps.map((step) => (
                    <TabsTrigger key={step.id} value={step.id}>
                      {step.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="relative flex flex-1 flex-col overflow-hidden">
                  <AnimatePresence mode="wait">
                    {steps.map((step) =>
                      step.id === activeTab ? (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="flex-1 overflow-y-auto px-8 pb-32 pt-6"
                        >
                          <TabsContent
                            value={step.id}
                            className="m-0 flex h-full flex-col gap-6"
                          >
                            {step.id === "details" && (
                              <div className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">
                                      Pattern name
                                    </label>
                                    <Input
                                      placeholder="e.g. Customer Support Rotations"
                                      value={name}
                                      onChange={(e) => setName(e.target.value)}
                                      className="h-12 rounded-2xl border border-border/60 bg-background/80 shadow-inner"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">
                                      Description
                                    </label>
                                    <Input
                                      placeholder="Where does this pattern apply?"
                                      value={description}
                                      onChange={(e) => setDescription(e.target.value)}
                                      className="h-12 rounded-2xl border border-border/60 bg-background/80 shadow-inner"
                                    />
                                  </div>
                                </div>
                                <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-6 text-sm text-muted-foreground">
                                  Give the pattern a helpful description so teams understand when to use it. You can configure weeks and preview outcomes in the next steps.
                                </div>
                              </div>
                            )}

                            {step.id === "grid" && (
                              <div className="space-y-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <h3 className="text-lg font-semibold">Weekly cadence</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Flip cards to toggle days and choose the type for each configured day.
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={addWeek}
                                    className="rounded-full border-dashed"
                                  >
                                    + Add week
                                  </Button>
                                </div>
                                <div className="space-y-6">
                                  {weeks.map((week, weekIndex) => (
                                    <div
                                      key={weekIndex}
                                      className="rounded-3xl border border-border/50 bg-background/80 p-6 shadow-sm"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
                                        <div>
                                          <h4 className="text-base font-semibold">Week {week.weekNumber}</h4>
                                          <p className="text-sm text-muted-foreground">
                                            {Object.keys(week.days).length || 0} day(s) configured
                                          </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleCopyWeek(weekIndex)}
                                            className="rounded-full"
                                          >
                                            Copy
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handlePasteWeek(weekIndex)}
                                            disabled={!clipboardRef.current}
                                            className="rounded-full"
                                          >
                                            Paste
                                          </Button>
                                          {weeks.length > 1 && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => removeWeek(weekIndex)}
                                              className="rounded-full text-destructive hover:bg-destructive/10"
                                            >
                                              Remove
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {days.map((day) => {
                                          const isConfigured = day in week.days;
                                          const type = week.days[day];
                                          const visuals = type ? dayTypeStyles[type] : undefined;

                                          return (
                                            <motion.button
                                              key={day}
                                              type="button"
                                              onClick={() => handleDayToggle(weekIndex, day)}
                                              className={cn(
                                                "group relative flex h-36 flex-col justify-between rounded-2xl border p-4 text-left transition",
                                                isConfigured
                                                  ? cn(
                                                      "bg-gradient-to-br shadow-lg shadow-black/5",
                                                      visuals?.card,
                                                    )
                                                  : "border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground hover:bg-muted/60",
                                              )}
                                              whileHover={{ translateY: -2 }}
                                              layout
                                            >
                                              <div className="flex items-center justify-between gap-3">
                                                <div>
                                                  <p className="text-sm font-semibold uppercase tracking-wide">
                                                    {day}
                                                  </p>
                                                  <AnimatePresence mode="wait">
                                                    {isConfigured ? (
                                                      <motion.span
                                                        key="configured"
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -8 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="text-xs font-medium text-foreground/80"
                                                      >
                                                        {dayTypeLabels[type] || "Configured"}
                                                      </motion.span>
                                                    ) : (
                                                      <motion.span
                                                        key="off"
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -8 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="text-xs text-muted-foreground"
                                                      >
                                                        Tap to enable
                                                      </motion.span>
                                                    )}
                                                  </AnimatePresence>
                                                </div>
                                                <motion.div
                                                  layout
                                                  className={cn(
                                                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                                                    isConfigured
                                                      ? cn(
                                                          "bg-white/80 text-foreground",
                                                          visuals?.accent,
                                                        )
                                                      : "border-muted-foreground/30 text-muted-foreground",
                                                  )}
                                                >
                                                  {isConfigured ? "On" : "Off"}
                                                </motion.div>
                                              </div>
                                              <AnimatePresence mode="wait">
                                                {isConfigured && (
                                                  <motion.div
                                                    key="select"
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 12 }}
                                                    transition={{ duration: 0.2 }}
                                                  >
                                                    <Select
                                                      value={type}
                                                      onValueChange={(value) => handleTypeChange(weekIndex, day, value)}
                                                    >
                                                      <SelectTrigger
                                                        className="mt-3 w-full rounded-xl border border-white/40 bg-white/30 text-sm font-medium text-foreground/90 backdrop-blur"
                                                        onClick={(event) => event.stopPropagation()}
                                                      >
                                                        <SelectValue placeholder="Select type" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {dayTypes.map((dayType) => (
                                                          <SelectItem key={dayType.value} value={dayType.value}>
                                                            {dayType.label}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>
                                            </motion.button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {step.id === "preview" && (
                              <TooltipProvider delayDuration={150}>
                                <div className="space-y-6">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-lg font-semibold">Calendar mosaic</h3>
                                      <p className="text-sm text-muted-foreground">
                                        Hover tiles to see exact coverage and cadence.
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                                      {dayTypes.map((type) => (
                                        <motion.span
                                          key={type.value}
                                          className={cn(
                                            "inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium",
                                            dayTypeStyles[type.value]?.chip,
                                          )}
                                          layout
                                        >
                                          <span className="h-2 w-2 rounded-full bg-white/80" />
                                          {type.label}
                                        </motion.span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-7 gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {days.map((day) => (
                                        <span key={day} className="text-center">
                                          {day}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      {calendarPreview.map((weekRow, weekIndex) => (
                                        <div key={weekIndex} className="grid grid-cols-7 gap-3">
                                          {weekRow.map((value, dayIndex) => {
                                            const dayLabel = days[dayIndex];
                                            const visuals = value ? dayTypeStyles[value] : undefined;
                                            const displayLabel = value ? dayTypeLabels[value] : "Off";

                                            return (
                                              <Tooltip key={`${weekIndex}-${dayIndex}`}>
                                                <TooltipTrigger asChild>
                                                  <motion.div
                                                    className={cn(
                                                      "relative flex aspect-[4/3] flex-col justify-between rounded-2xl border p-3 text-xs shadow-sm",
                                                      value
                                                        ? cn(
                                                            "bg-gradient-to-br font-medium text-foreground",
                                                            visuals?.card,
                                                          )
                                                        : "border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground",
                                                    )}
                                                    whileHover={{ translateY: -3 }}
                                                    layout
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <span className="font-semibold uppercase tracking-wide">
                                                        {dayLabel}
                                                      </span>
                                                      <span className="text-[10px] font-medium text-muted-foreground/70">
                                                        Week {weekIndex + 1}
                                                      </span>
                                                    </div>
                                                    <AnimatePresence mode="wait">
                                                      {value ? (
                                                        <motion.span
                                                          key="chip"
                                                          initial={{ opacity: 0, scale: 0.8 }}
                                                          animate={{ opacity: 1, scale: 1 }}
                                                          exit={{ opacity: 0, scale: 0.9 }}
                                                          transition={{ duration: 0.2 }}
                                                          className={cn(
                                                            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold",
                                                            visuals?.chip,
                                                          )}
                                                        >
                                                          {displayLabel}
                                                        </motion.span>
                                                      ) : (
                                                        <motion.span
                                                          key="empty"
                                                          initial={{ opacity: 0 }}
                                                          animate={{ opacity: 1 }}
                                                          exit={{ opacity: 0 }}
                                                          className="font-medium text-muted-foreground"
                                                        >
                                                          Off
                                                        </motion.span>
                                                      )}
                                                    </AnimatePresence>
                                                  </motion.div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  Week {weekIndex + 1} · {dayLabel}: {displayLabel}
                                                </TooltipContent>
                                              </Tooltip>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </TooltipProvider>
                            )}
                          </TabsContent>
                        </motion.div>
                      ) : null,
                    )}
                  </AnimatePresence>
                </div>
                <div className="sticky bottom-0 border-t border-border/60 bg-background/90 px-8 py-4 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setOpen(false)}
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeIndex > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setActiveTab(steps[Math.max(0, activeIndex - 1)].id);
                          }}
                          className="rounded-full"
                        >
                          Back
                        </Button>
                      )}
                      {activeIndex === steps.length - 1 ? (
                        <Button
                          onClick={handleSubmit}
                          className="rounded-full"
                        >
                          {editMode ? "Save changes" : "Create pattern"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setActiveTab(steps[Math.min(steps.length - 1, activeIndex + 1)].id);
                          }}
                          className="rounded-full"
                        >
                          Next
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Tabs>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Dialog open={!!viewPattern} onOpenChange={() => setViewPattern(null)}>
        <DialogContent>
          {viewPattern && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{viewPattern.name}</h2>
              <p className="text-sm text-gray-600">
                {viewPattern.description || "No description"}
              </p>
              {viewPattern.weeks.map((week: any) => (
                <div key={week.id} className="border rounded p-2">
                  <h3 className="font-medium mb-1">Week {week.weekNumber}</h3>
                  <ul className="text-sm list-disc list-inside">
                    {week.days.map((d: any) => (
                      <li key={d.id}>
                        {d.day} ({d.type.replace(/_/g, " ")})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {patterns.map((pattern) => {
          const days = pattern.weeks?.flatMap((w: any) => w.days) || [];
          const preview = days
            .slice(0, 3)
            .map((d: any) => `${d.day} (${d.type.replace(/_/g, " ")})`)
            .join(", ");
          const configuredDays = days.length;
          const configuredWeeks = pattern.weeks?.length || 0;
          const uniqueDayTypes = new Set(days.map((d: any) => d.type)).size;
          return (
            <Card
              key={pattern.id}
              variant="gradient"
              size="lg"
              className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background"
            >
              <div className="absolute right-6 top-6">
                <GlassSurface
                  intensity="strong"
                  variant="elevated"
                  size="sm"
                  className="flex items-center justify-center rounded-full border border-white/20 bg-background/60 p-2 backdrop-blur"
                >
                  <KebabMenu
                    options={[
                      { label: "View", action: () => setViewPattern(pattern) },
                      { label: "Edit", action: () => handleEdit(pattern) },
                      { label: "Archive", action: () => handleArchive(pattern.id) },
                      { label: "Delete", action: () => handleDelete(pattern.id) },
                    ]}
                  />
                </GlassSurface>
              </div>
              <CardContent className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    {pattern.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {pattern.description || "No description"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 font-medium text-foreground/80 shadow-sm">
                    {configuredWeeks} week{configuredWeeks === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 font-medium text-foreground/80 shadow-sm">
                    {configuredDays} configured day{configuredDays === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 font-medium text-foreground/80 shadow-sm">
                    {uniqueDayTypes} day type{uniqueDayTypes === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/20 bg-background/60 p-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground/80">Snapshot</div>
                  <p className="mt-2 leading-relaxed">
                    {preview || "No configured days yet"}
                    {days.length > 3 ? ` (+${days.length - 3} more)` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
