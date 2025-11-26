"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  AlertCircle,
  GripVertical,
  FileText,
  UploadCloud,
  FileEdit,
  Info,
  Wrench,
  KeySquare,
  CalendarClock,
  UserRoundPlus,
  ShieldCheck,
  Wallet,
  HeartPulse,
  Target,
  Smile,
  Workflow,
  ArrowDown,
  Play,
  Star,
  Users,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_TYPE_CONFIG } from "./EnhancedStepPalette";

// Step icons mapping
const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "acknowledge-document": FileText,
  "upload-document": UploadCloud,
  "collect-document": UploadCloud,
  "fill-form": FileEdit,
  "instructions": Info,
  "training-assignment": ShieldCheck,
  "equipment-checklist": Wrench,
  "system-access": KeySquare,
  "manager-checkin": CalendarClock,
  "buddy-introduction": UserRoundPlus,
  "compliance-training": ShieldCheck,
  "payroll-setup": Wallet,
  "benefits-enrollment": HeartPulse,
  "probation-goals": Target,
  "welcome-survey": Smile,
  "journey-automation": Workflow,
};

// Step colors mapping
const STEP_COLORS: Record<string, string> = {
  "acknowledge-document": "from-blue-500 to-indigo-600",
  "upload-document": "from-emerald-500 to-teal-600",
  "collect-document": "from-cyan-500 to-blue-600",
  "fill-form": "from-purple-500 to-violet-600",
  "instructions": "from-amber-500 to-orange-600",
  "training-assignment": "from-rose-500 to-pink-600",
  "equipment-checklist": "from-slate-500 to-gray-600",
  "system-access": "from-indigo-500 to-blue-600",
  "manager-checkin": "from-teal-500 to-cyan-600",
  "buddy-introduction": "from-green-500 to-emerald-600",
  "compliance-training": "from-red-500 to-rose-600",
  "payroll-setup": "from-yellow-500 to-amber-600",
  "benefits-enrollment": "from-pink-500 to-rose-600",
  "probation-goals": "from-violet-500 to-purple-600",
  "welcome-survey": "from-orange-500 to-red-600",
  "journey-automation": "from-blue-600 to-indigo-700",
};

// Estimate time in minutes for each step type
const ESTIMATED_TIMES: Record<string, number> = {
  "acknowledge-document": 3,
  "upload-document": 4,
  "collect-document": 2,
  "fill-form": 10,
  "instructions": 2,
  "training-assignment": 30,
  "equipment-checklist": 5,
  "system-access": 5,
  "manager-checkin": 3,
  "buddy-introduction": 3,
  "compliance-training": 45,
  "payroll-setup": 8,
  "benefits-enrollment": 15,
  "probation-goals": 10,
  "welcome-survey": 5,
  "journey-automation": 0,
};

interface JourneyTimelineProps {
  steps: any[];
  selectedIndex: number | null;
  onSelectStep: (index: number) => void;
  onReorderSteps?: (steps: any[]) => void;
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "Automatic";
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `~${hours}h`;
  return `~${hours}h ${mins}m`;
}

export function JourneyTimeline({
  steps,
  selectedIndex,
  onSelectStep,
  onReorderSteps,
}: JourneyTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate total estimated time
  const totalTime = useMemo(() => {
    return steps.reduce((total, step) => {
      return total + (ESTIMATED_TIMES[step.type] || 5);
    }, 0);
  }, [steps]);

  // Group steps by category for summary
  const stepCategories = useMemo(() => {
    const categories: Record<string, number> = {};
    steps.forEach((step) => {
      const config = STEP_TYPE_CONFIG[step.type];
      const category = config?.category || "other";
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }, [steps]);

  // Check for validation issues
  const validationIssues = useMemo(() => {
    const issues: { index: number; message: string }[] = [];
    steps.forEach((step, index) => {
      if (!step.title?.trim()) {
        issues.push({ index, message: `Step ${index + 1} needs a title` });
      }
    });
    return issues;
  }, [steps]);

  const handleReorder = (newOrder: any[]) => {
    if (onReorderSteps) {
      onReorderSteps(newOrder);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          {/* Header */}
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Journey Timeline
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {steps.length} steps
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(totalTime)}
                    </span>
                    {validationIssues.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {validationIssues.length} issue{validationIssues.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Category badges */}
                <div className="hidden sm:flex items-center gap-1">
                  {Object.entries(stepCategories).slice(0, 3).map(([category, count]) => (
                    <Badge key={category} variant="secondary" className="text-[10px] capitalize">
                      {category.replace("-", " ")}: {count}
                    </Badge>
                  ))}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Timeline Content */}
          <CollapsibleContent>
            <div className="p-4">
              {steps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No steps yet. Add steps to see the timeline.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />

                  {/* Steps */}
                  <Reorder.Group
                    axis="y"
                    values={steps}
                    onReorder={handleReorder}
                    className="space-y-0"
                  >
                    {steps.map((step, index) => {
                      const Icon = STEP_ICONS[step.type] || FileText;
                      const color = STEP_COLORS[step.type] || "from-gray-500 to-gray-600";
                      const config = STEP_TYPE_CONFIG[step.type];
                      const isSelected = selectedIndex === index;
                      const hasTitle = step.title?.trim();
                      const estimatedTime = ESTIMATED_TIMES[step.type] || 5;
                      const isNzRecommended = config?.isNzRecommended;

                      return (
                        <Reorder.Item
                          key={step.key}
                          value={step}
                          onDragStart={() => setIsDragging(true)}
                          onDragEnd={() => setIsDragging(false)}
                          className="relative"
                        >
                          <motion.div
                            className={cn(
                              "flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-all ml-2",
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                              isDragging && "cursor-grabbing"
                            )}
                            onClick={() => onSelectStep(index)}
                            whileHover={{ x: 4 }}
                            layout
                          >
                            {/* Timeline node */}
                            <div className="relative flex-none">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center ring-4 ring-white dark:ring-slate-800",
                                  color
                                )}
                              >
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              {/* Step number */}
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">
                                  {index + 1}
                                </span>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4
                                  className={cn(
                                    "font-medium text-sm truncate",
                                    hasTitle
                                      ? "text-slate-900 dark:text-white"
                                      : "text-slate-400 dark:text-slate-500 italic"
                                  )}
                                >
                                  {hasTitle ? step.title : "Untitled step"}
                                </h4>
                                {isNzRecommended && (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[9px] px-1 py-0">
                                    <Star className="w-2 h-2 mr-0.5" />
                                    NZ
                                  </Badge>
                                )}
                                {!hasTitle && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">This step needs a title</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="capitalize">
                                  {step.type.replace(/-/g, " ")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(estimatedTime)}
                                </span>
                              </div>
                            </div>

                            {/* Drag handle */}
                            {onReorderSteps && (
                              <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                              </div>
                            )}
                          </motion.div>

                          {/* Connector arrow */}
                          {index < steps.length - 1 && (
                            <div className="flex items-center justify-center py-1 ml-6">
                              <ArrowDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                            </div>
                          )}
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>

                  {/* Completion indicator */}
                  <div className="flex items-start gap-4 p-3 ml-2 mt-2">
                    <div className="relative flex-none">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center ring-4 ring-white dark:ring-slate-800">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                        Onboarding Complete
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Employee is fully onboarded after completing all steps
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary footer */}
              {steps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Employee journey overview</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                        {steps.filter((s) => s.title?.trim()).length} configured
                      </span>
                      {validationIssues.length > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {validationIssues.length} need attention
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}

export default JourneyTimeline;

