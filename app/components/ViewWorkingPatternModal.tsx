"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Eye, Calendar, Clock, Sun, Sunrise, Sunset } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface WorkingPatternDay {
  id: string;
  day: string;
  type: string;
  hoursPerDay?: number | null;
}

interface WorkingPatternWeek {
  id: string;
  weekNumber: number;
  days: WorkingPatternDay[];
}

interface WorkingPattern {
  id: string;
  name: string;
  description?: string | null;
  patternType?: string;
  contractedHoursPerWeek?: number | null;
  weeks: WorkingPatternWeek[];
}

interface ViewWorkingPatternModalProps {
  pattern: WorkingPattern | null;
}

const dayOrder = ["Mon", "Monday", "Tue", "Tuesday", "Wed", "Wednesday", "Thu", "Thursday", "Fri", "Friday", "Sat", "Saturday", "Sun", "Sunday"];
const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getShortDay(day: string): string {
  const map: Record<string, string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
    Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
  };
  return map[day] || day;
}

function getDayIndex(day: string): number {
  const short = getShortDay(day);
  return shortDays.indexOf(short);
}

function getDayTypeIcon(type: string) {
  switch (type) {
    case "FULL_DAY":
      return <Sun className="h-4 w-4" />;
    case "HALF_DAY_AM":
      return <Sunrise className="h-4 w-4" />;
    case "HALF_DAY_PM":
      return <Sunset className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getDayTypeLabel(type: string): string {
  switch (type) {
    case "FULL_DAY":
      return "Full Day";
    case "HALF_DAY_AM":
      return "Morning";
    case "HALF_DAY_PM":
      return "Afternoon";
    default:
      return type.replace(/_/g, " ");
  }
}

function getDayTypeColor(type: string): string {
  switch (type) {
    case "FULL_DAY":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "HALF_DAY_AM":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "HALF_DAY_PM":
      return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function getPatternTypeBadge(type?: string) {
  switch (type) {
    case "SHIFT_BASED":
      return { color: "bg-purple-500/20 text-purple-300 border-purple-500/30", label: "Shift-Based" };
    case "FLEXIBLE":
      return { color: "bg-orange-500/20 text-orange-300 border-orange-500/30", label: "Flexible" };
    case "COMPRESSED":
      return { color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", label: "Compressed" };
    default:
      return { color: "bg-slate-500/20 text-slate-300 border-slate-500/30", label: "Standard" };
  }
}

export default function ViewWorkingPatternModal({ pattern }: ViewWorkingPatternModalProps) {
  const [open, setOpen] = useState(false);

  if (!pattern) {
    return null;
  }

  const typeBadge = getPatternTypeBadge(pattern.patternType);

  // Calculate total hours per week for standard patterns
  const calculateWeeklyHours = (week: WorkingPatternWeek): number => {
    return week.days.reduce((total, day) => {
      if (day.type === "FULL_DAY") {
        return total + (day.hoursPerDay || 8);
      } else if (day.type === "HALF_DAY_AM" || day.type === "HALF_DAY_PM") {
        return total + (day.hoursPerDay ? day.hoursPerDay / 2 : 4);
      }
      return total;
    }, 0);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        icon={<Eye className="h-4 w-4" />}
      >
        View Pattern
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-white/10">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-violet-500/10 to-pink-500/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>

          <div className="relative z-10">
            <DialogHeader className="pb-4 border-b border-white/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">
                    {pattern.name}
                  </DialogTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 border",
                      typeBadge.color
                    )}>
                      {typeBadge.label}
                    </span>
                    {pattern.contractedHoursPerWeek && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 bg-white/5 text-white/70 border border-white/10">
                        <Clock className="h-3 w-3" />
                        {pattern.contractedHoursPerWeek}h/week
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {/* Description */}
              {pattern.description && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-sm text-white/70 leading-relaxed">
                    {pattern.description}
                  </p>
                </div>
              )}

              {/* Shift-Based Pattern Info */}
              {pattern.patternType === "SHIFT_BASED" ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Flexible Scheduling</h3>
                      <p className="text-xs text-white/50">Shifts created manually</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/70">
                    This is a flexible shift-based pattern with <span className="font-semibold text-purple-300">{pattern.contractedHoursPerWeek || 0} contracted hours</span> per week. 
                    Work schedules are determined by individual shift assignments rather than a fixed weekly pattern.
                  </p>
                </motion.div>
              ) : (
                /* Standard Pattern Weeks */
                <AnimatePresence mode="wait">
                  {pattern.weeks.map((week, weekIndex) => {
                    const sortedDays = [...week.days].sort((a, b) => getDayIndex(a.day) - getDayIndex(b.day));
                    const weeklyHours = calculateWeeklyHours(week);
                    
                    return (
                      <motion.div
                        key={week.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: weekIndex * 0.1 }}
                        className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                      >
                        {/* Week Header */}
                        <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-xs font-bold text-white">
                              {week.weekNumber}
                            </span>
                            <span className="font-medium text-white">
                              Week {week.weekNumber}
                            </span>
                          </div>
                          <span className="text-xs text-white/50 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {weeklyHours}h total
                          </span>
                        </div>

                        {/* Days Grid */}
                        <div className="p-4">
                          <div className="grid grid-cols-7 gap-1 mb-3">
                            {shortDays.map((day) => (
                              <div key={day} className="text-center text-[10px] font-medium text-white/40 uppercase tracking-wider">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {shortDays.map((shortDay) => {
                              const dayData = sortedDays.find(d => getShortDay(d.day) === shortDay);
                              const isWorkDay = !!dayData;
                              
                              return (
                                <motion.div
                                  key={shortDay}
                                  whileHover={isWorkDay ? { scale: 1.05 } : {}}
                                  className={cn(
                                    "aspect-square rounded-lg flex flex-col items-center justify-center transition-all duration-200",
                                    isWorkDay
                                      ? cn("border", getDayTypeColor(dayData.type))
                                      : "bg-white/[0.02] border border-white/5"
                                  )}
                                >
                                  {isWorkDay ? (
                                    <>
                                      {getDayTypeIcon(dayData.type)}
                                      <span className="text-[9px] mt-0.5 font-medium opacity-80">
                                        {dayData.type === "FULL_DAY" ? "Full" : dayData.type === "HALF_DAY_AM" ? "AM" : "PM"}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-white/20 text-xs">—</span>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>

                          {/* Day Details */}
                          {sortedDays.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {sortedDays.map((day) => (
                                <div
                                  key={day.id}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg border",
                                    getDayTypeColor(day.type)
                                  )}
                                >
                                  {getDayTypeIcon(day.type)}
                                  <span className="font-medium text-sm flex-1">
                                    {day.day}
                                  </span>
                                  <span className="text-xs opacity-80">
                                    {getDayTypeLabel(day.type)}
                                    {day.hoursPerDay && ` · ${day.hoursPerDay}h`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}

              {/* Empty State */}
              {pattern.patternType !== "SHIFT_BASED" && pattern.weeks.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No working days configured</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

