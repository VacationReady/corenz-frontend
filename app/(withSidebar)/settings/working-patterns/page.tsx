"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, Edit, Eye, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";

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
  const [weeks, setWeeks] = useState<any[]>([{ weekNumber: 1, days: {} }]);

  const [viewPattern, setViewPattern] = useState<any>(null);
  // Copy/Paste week clipboard (in-memory only)
  const clipboardRef = useRef<Record<string, string> | null>(null);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayTypes = [
    { label: "Full Day", value: "FULL_DAY" },
    { label: "Half Day AM", value: "HALF_DAY_AM" },
    { label: "Half Day PM", value: "HALF_DAY_PM" },
  ];

  const fetchPatterns = async () => {
    const res = await fetch("/api/working-patterns");
    const data = await res.json();
    setPatterns(data);
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleCheckboxChange = (
    weekIndex: number,
    day: string,
    checked: boolean,
  ) => {
    setWeeks((prev) => {
      const updated = [...prev];
      const daysObj = { ...updated[weekIndex].days };
      if (checked) {
        daysObj[day] = "FULL_DAY";
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
    }

    const weeksPayload = patternType === "SHIFT_BASED" ? [] : weeks.map((week) => ({
      weekNumber: week.weekNumber,
      days: Object.entries(week.days).map(([day, type]) => ({ day, type })),
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
      toast.success(`Working pattern ${editMode ? "updated" : "created"}`);
      setName("");
      setDescription("");
      setPatternType("STANDARD");
      setContractedHoursPerWeek("");
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

    const loadedWeeks = pattern.weeks?.length > 0 ? pattern.weeks.map((week: any) => {
      const daysObj: Record<string, string> = {};
      week.days.forEach((d: any) => {
        const key = toShortDay(d.day);
        daysObj[key] = d.type;
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
      breadcrumbs={breadcrumbConfigs.settingsSection('Working Patterns')}
      showHomeIcon={false}
    >
      <div className="flex justify-between items-center mb-4">
        <div />
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
                setWeeks([{ weekNumber: 1, days: {} }]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>{editMode ? "Editing Pattern" : "Add Pattern"}</Button>
            </DialogTrigger>
            <DialogContent>
              <div className="max-h-[80vh] overflow-y-auto space-y-4 p-2">
                <DialogHeader>
                  <DialogTitle>
                    {editMode
                      ? "Edit Working Pattern"
                      : "Create Working Pattern"}
                  </DialogTitle>
                </DialogHeader>
                <Input
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                
                {/* Pattern Type Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pattern Type</label>
                  <Select
                    value={patternType}
                    onValueChange={(value) => {
                      setPatternType(value);
                      // Reset weeks when switching to SHIFT_BASED
                      if (value === "SHIFT_BASED") {
                        setWeeks([{ weekNumber: 1, days: {} }]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pattern type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">
                        Standard - Fixed recurring schedule
                      </SelectItem>
                      <SelectItem value="SHIFT_BASED">
                        Shift-Based - Flexible hours, manual scheduling
                      </SelectItem>
                      <SelectItem value="FLEXIBLE">
                        Flexible - Variable schedule
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {patternType === "STANDARD" && (
                    <p className="text-xs text-muted-foreground">
                      For employees with fixed, recurring work schedules (e.g., Mon-Fri, 9am-5pm)
                    </p>
                  )}
                  {patternType === "SHIFT_BASED" && (
                    <p className="text-xs text-muted-foreground">
                      For gig workers, zero-hour contracts, or employees with flexible schedules. Define total contracted hours, then create shifts manually.
                    </p>
                  )}
                  {patternType === "FLEXIBLE" && (
                    <p className="text-xs text-muted-foreground">
                      For employees with variable schedules that change frequently
                    </p>
                  )}
                </div>

                {/* Contracted Hours (only for SHIFT_BASED) */}
                {patternType === "SHIFT_BASED" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contracted Hours per Week</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g., 20"
                      value={contractedHoursPerWeek}
                      onChange={(e) => setContractedHoursPerWeek(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Total contracted hours per week. Shifts will be created manually to meet this requirement.
                    </p>
                  </div>
                )}

                {/* Only show weeks configuration for non-SHIFT_BASED patterns */}
                {patternType !== "SHIFT_BASED" && weeks.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="border p-2 rounded bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Week {week.weekNumber}</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyWeek(weekIndex)}
                        >
                          Copy week
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePasteWeek(weekIndex)}
                          disabled={!clipboardRef.current}
                        >
                          Paste to week
                        </Button>
                        {weeks.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeWeek(weekIndex)}
                          >
                            Remove Week
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {days.map((day) => (
                        <div key={day} className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`week-${weekIndex}-day-${day}`}
                              checked={day in week.days}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(
                                  weekIndex,
                                  day,
                                  Boolean(checked),
                                )
                              }
                            />
                            <label
                              htmlFor={`week-${weekIndex}-day-${day}`}
                              className="text-sm"
                            >
                              {day}
                            </label>
                          </div>
                          {day in week.days && (
                            <Select
                              value={week.days[day]}
                              onValueChange={(value) =>
                                handleTypeChange(weekIndex, day, value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayTypes.map((type) => (
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                  >
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {patternType !== "SHIFT_BASED" && (
                  <Button variant="ghost" onClick={addWeek} className="w-full">
                    + Add Week
                  </Button>
                )}
                <Button onClick={handleSubmit} className="w-full mt-2">
                  {editMode ? "Save Changes" : "Create"}
                </Button>
                {/* Read-only calendar preview - only for non-SHIFT_BASED patterns */}
                {patternType !== "SHIFT_BASED" && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Calendar Preview</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border">
                        <thead>
                          <tr>
                            <th className="border px-2 py-1 text-left">Week</th>
                            {days.map((d) => (
                              <th
                                key={d}
                                className="border px-2 py-1 text-center"
                              >
                                {d}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {calendarPreview.map((weekRow, idx) => (
                            <tr key={idx}>
                              <td className="border px-2 py-1">{idx + 1}</td>
                              {weekRow.map((val, j) => (
                                <td
                                  key={j}
                                  className="border px-2 py-1 text-center"
                                >
                                  {val ? val.replace(/_/g, " ") : ""}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
                          {d.day} ({d.type.replace(/_/g, " ")})
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
          {patterns.map((pattern) => {
            const days = pattern.weeks?.flatMap((w: any) => w.days) || [];
            const preview = days
              .slice(0, 3)
              .map((d: any) => `${d.day} (${d.type.replace(/_/g, " ")})`)
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
                              {days.length} day{days.length === 1 ? "" : "s"}
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
                        <span className="font-medium text-foreground">Preview:</span> {preview}
                        {days.length > 3 ? ` (+${days.length - 3} more)` : ""}
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
    </PageShell>
  );
}

