"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Sparkles,
  GripVertical,
  ChevronDown,
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
  Star,
  Zap,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

// Step type definitions with enhanced metadata
export const STEP_TYPE_CONFIG: Record<string, {
  category: string;
  isNzRecommended: boolean;
  whenToUse: string;
  employeeSees: string;
  estimatedTime: string;
}> = {
  "acknowledge-document": {
    category: "documents",
    isNzRecommended: true,
    whenToUse: "When employees need to read and confirm they understand a policy, contract, or legal document.",
    employeeSees: "A document viewer with a checkbox to confirm acknowledgement.",
    estimatedTime: "2-5 min",
  },
  "upload-document": {
    category: "documents",
    isNzRecommended: true,
    whenToUse: "When you need employees to provide copies of ID, certificates, or other documents.",
    employeeSees: "A file upload area with clear instructions on accepted formats.",
    estimatedTime: "3-5 min",
  },
  "collect-document": {
    category: "documents",
    isNzRecommended: false,
    whenToUse: "When managers need to collect physical documents and mark them as received.",
    employeeSees: "A status indicator showing whether the document has been collected.",
    estimatedTime: "1-2 min",
  },
  "fill-form": {
    category: "forms",
    isNzRecommended: false,
    whenToUse: "When you need to collect specific information through a custom form.",
    employeeSees: "An interactive form with fields to complete.",
    estimatedTime: "5-15 min",
  },
  "payroll-setup": {
    category: "forms",
    isNzRecommended: true,
    whenToUse: "Essential for NZ: Collect IRD numbers, tax codes, bank details, and KiwiSaver preferences.",
    employeeSees: "A secure form for entering sensitive payroll and tax information.",
    estimatedTime: "5-10 min",
  },
  "instructions": {
    category: "communication",
    isNzRecommended: false,
    whenToUse: "To welcome new hires or provide important information without requiring action.",
    employeeSees: "A welcome message or instruction card with a continue button.",
    estimatedTime: "1-2 min",
  },
  "training-assignment": {
    category: "training",
    isNzRecommended: true,
    whenToUse: "To assign required learning modules that employees must complete.",
    employeeSees: "A checklist of training modules with links and completion tracking.",
    estimatedTime: "Variable",
  },
  "compliance-training": {
    category: "training",
    isNzRecommended: true,
    whenToUse: "For mandatory compliance training like Health & Safety under HSWA 2015.",
    employeeSees: "Compliance course checklist with progress indicators.",
    estimatedTime: "30-60 min",
  },
  "equipment-checklist": {
    category: "setup",
    isNzRecommended: false,
    whenToUse: "To track equipment and assets issued to the new hire.",
    employeeSees: "A checklist of equipment items with confirmation checkboxes.",
    estimatedTime: "5-10 min",
  },
  "system-access": {
    category: "setup",
    isNzRecommended: false,
    whenToUse: "To provision and track system access and credentials.",
    employeeSees: "A list of systems with access status and any credentials.",
    estimatedTime: "5-10 min",
  },
  "manager-checkin": {
    category: "people",
    isNzRecommended: false,
    whenToUse: "To schedule and track regular check-ins during probation period.",
    employeeSees: "A timeline of scheduled check-ins with dates and agenda.",
    estimatedTime: "2-5 min",
  },
  "buddy-introduction": {
    category: "people",
    isNzRecommended: false,
    whenToUse: "To facilitate introduction to an assigned onboarding buddy.",
    employeeSees: "Buddy contact information and introduction notes.",
    estimatedTime: "2-5 min",
  },
  "benefits-enrollment": {
    category: "forms",
    isNzRecommended: false,
    whenToUse: "To guide employees through benefit selections and enrollments.",
    employeeSees: "Links to benefit portals with enrollment guidance.",
    estimatedTime: "10-20 min",
  },
  "probation-goals": {
    category: "people",
    isNzRecommended: false,
    whenToUse: "To set and track goals for the probation period.",
    employeeSees: "A list of goals and milestones for the probation period.",
    estimatedTime: "10-15 min",
  },
  "welcome-survey": {
    category: "forms",
    isNzRecommended: false,
    whenToUse: "To gather feedback on the onboarding experience.",
    employeeSees: "A survey form to provide feedback.",
    estimatedTime: "5-10 min",
  },
  "journey-automation": {
    category: "advanced",
    isNzRecommended: false,
    whenToUse: "To trigger automated workflows based on step completion.",
    employeeSees: "Progress indicators for automated processes.",
    estimatedTime: "Automatic",
  },
};

// Category definitions
const CATEGORIES = [
  {
    id: "nz-compliance",
    name: "NZ Compliance",
    description: "Essential for New Zealand employers",
    icon: ShieldCheck,
    color: "from-emerald-500 to-teal-600",
    isHighlighted: true,
  },
  {
    id: "documents",
    name: "Documents",
    description: "Collect and acknowledge documents",
    icon: FileText,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "forms",
    name: "Forms & Data",
    description: "Collect information from employees",
    icon: FileEdit,
    color: "from-purple-500 to-violet-600",
  },
  {
    id: "training",
    name: "Training",
    description: "Assign learning and compliance courses",
    icon: ShieldCheck,
    color: "from-rose-500 to-pink-600",
  },
  {
    id: "setup",
    name: "Setup & Equipment",
    description: "Provision equipment and access",
    icon: Wrench,
    color: "from-slate-500 to-gray-600",
  },
  {
    id: "people",
    name: "People & Check-ins",
    description: "Connect with managers and buddies",
    icon: UserRoundPlus,
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "communication",
    name: "Communication",
    description: "Welcome messages and instructions",
    icon: Info,
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Automation and workflows",
    icon: Workflow,
    color: "from-indigo-600 to-blue-700",
  },
];

interface EnhancedStepPaletteProps {
  stepTypes: StepType[];
  onAddStep: (type: string) => void;
}

export function EnhancedStepPalette({ stepTypes, onAddStep }: EnhancedStepPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["nz-compliance", "documents"])
  );

  // Filter step types based on search
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return stepTypes;
    const query = searchQuery.toLowerCase();
    return stepTypes.filter(
      (type) =>
        type.label.toLowerCase().includes(query) ||
        type.description.toLowerCase().includes(query) ||
        STEP_TYPE_CONFIG[type.value]?.whenToUse.toLowerCase().includes(query)
    );
  }, [stepTypes, searchQuery]);

  // Group step types by category
  const categorizedSteps = useMemo(() => {
    const result: Record<string, StepType[]> = {};

    // Initialize all categories
    CATEGORIES.forEach((cat) => {
      result[cat.id] = [];
    });

    // Special handling for NZ Compliance category - show NZ recommended steps
    const nzSteps = filteredTypes.filter(
      (type) => STEP_TYPE_CONFIG[type.value]?.isNzRecommended
    );
    result["nz-compliance"] = nzSteps;

    // Categorize remaining steps
    filteredTypes.forEach((type) => {
      const config = STEP_TYPE_CONFIG[type.value];
      if (config && config.category !== "nz-compliance") {
        if (!result[config.category]) {
          result[config.category] = [];
        }
        // Avoid duplicates from NZ compliance
        if (!nzSteps.includes(type) || config.category !== "documents") {
          result[config.category].push(type);
        } else if (!result[config.category].some((t) => t.value === type.value)) {
          result[config.category].push(type);
        }
      }
    });

    return result;
  }, [filteredTypes]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const totalResults = filteredTypes.length;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
        {/* Header */}
        <div className="flex-none px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Step Library</h3>
              <p className="text-xs text-muted-foreground">Drag or click to add steps</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search steps..."
              className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-400 focus:ring-indigo-400/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          {/* Search Results Count */}
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              Found {totalResults} step{totalResults !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Step List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTypes.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No steps match "{searchQuery}"
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            </div>
          ) : searchQuery ? (
            // Flat list when searching
            <div className="p-3 space-y-2">
              {filteredTypes.map((type, index) => (
                <DraggableStepItem
                  key={type.value}
                  type={type}
                  index={index}
                  onAdd={() => onAddStep(type.value)}
                  showCategory
                />
              ))}
            </div>
          ) : (
            // Categorized view
            <div className="py-2">
              {CATEGORIES.map((category) => {
                const steps = categorizedSteps[category.id] || [];
                if (steps.length === 0) return null;

                const isExpanded = expandedCategories.has(category.id);
                const CategoryIcon = category.icon;

                return (
                  <Collapsible
                    key={category.id}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(category.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors",
                          category.isHighlighted && "bg-emerald-50/50 dark:bg-emerald-900/10"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                            category.color
                          )}
                        >
                          <CategoryIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                              {category.name}
                            </span>
                            {category.isHighlighted && (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1.5 py-0">
                                <Star className="w-2.5 h-2.5 mr-0.5" />
                                Recommended
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              ({steps.length})
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-slate-400 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="px-3 pb-2 space-y-1.5"
                        >
                          {steps.map((type, index) => (
                            <DraggableStepItem
                              key={type.value}
                              type={type}
                              index={index}
                              onAdd={() => onAddStep(type.value)}
                            />
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Tip: Hover over steps to see what employees will experience</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function DraggableStepItem({
  type,
  index,
  onAdd,
  showCategory = false,
}: {
  type: StepType;
  index: number;
  onAdd: () => void;
  showCategory?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `step-type-${type.value}`,
    data: { source: "step-palette", type: type.value, label: type.label },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = type.icon;
  const config = STEP_TYPE_CONFIG[type.value];
  const isNzRecommended = config?.isNzRecommended;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          ref={setNodeRef}
          style={style}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
          {...attributes}
          {...listeners}
          onClick={onAdd}
          className={cn(
            "group relative flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing",
            "bg-white dark:bg-slate-800 border",
            isNzRecommended
              ? "border-emerald-200 dark:border-emerald-800/50"
              : "border-slate-200 dark:border-slate-700",
            "hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:shadow-indigo-500/10",
            "transition-all duration-200",
            isDragging && "shadow-xl shadow-indigo-500/20 border-indigo-400 ring-2 ring-indigo-400/50"
          )}
        >
          {/* Drag Handle */}
          <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>

          {/* Icon */}
          <div
            className={cn(
              "flex-none w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
              type.color
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                {type.label}
              </p>
              {isNzRecommended && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1 py-0 flex-none">
                  NZ
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {type.description}
            </p>
            {showCategory && config && (
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5 capitalize">
                {config.category.replace("-", " ")}
              </p>
            )}
          </div>

          {/* Add indicator */}
          <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">+</span>
            </div>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs p-0 overflow-hidden" sideOffset={8}>
        <StepTypeTooltip type={type} config={config} />
      </TooltipContent>
    </Tooltip>
  );
}

function StepTypeTooltip({
  type,
  config,
}: {
  type: StepType;
  config?: (typeof STEP_TYPE_CONFIG)[string];
}) {
  const Icon = type.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden w-72">
      {/* Header */}
      <div className={cn("px-4 py-3 bg-gradient-to-r", type.color)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white">{type.label}</h4>
            {config?.isNzRecommended && (
              <Badge className="bg-white/20 text-white text-[10px] mt-1">
                <Star className="w-2.5 h-2.5 mr-0.5" />
                Recommended for NZ
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            When to use
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {config?.whenToUse || type.description}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            What employees see
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {config?.employeeSees || "An interactive step to complete."}
          </p>
        </div>

        {config?.estimatedTime && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <Badge variant="secondary" className="text-xs">
              ⏱ Est. {config.estimatedTime}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedStepPalette;
