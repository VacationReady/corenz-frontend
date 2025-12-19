"use client";

import React from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GripVertical,
  Check,
  AlertCircle,
  FileText,
  HelpCircle,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_TYPE_CONFIG } from "./EnhancedStepPalette";

interface StepType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

interface EnhancedStepCardProps {
  step: any;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  stepType?: StepType;
}

// Validation helpers
function getStepValidationStatus(step: any): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Title is required
  if (!step.title?.trim()) {
    errors.push("Step needs a title");
  }

  // Type-specific validation
  switch (step.type) {
    case "acknowledge-document":
      if (!step.documentId) {
        warnings.push("No document selected");
      }
      break;
    case "upload-document":
      if (!step.uploadType) {
        warnings.push("Document type not specified");
      }
      break;
    case "fill-form":
      if (!step.formId && (!step.formFields || step.formFields.length === 0)) {
        warnings.push("No form selected");
      }
      break;
    case "payroll-setup":
      const fields = step.metadata?.fields || [];
      const hasIrdField = fields.some(
        (f: any) => f.fieldType === "irdNumber" || f.id?.toLowerCase().includes("ird")
      );
      if (!hasIrdField) {
        warnings.push("Consider adding IRD number field for NZ compliance");
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

export function EnhancedStepCard({
  step,
  index,
  isSelected,
  onSelect,
  stepType,
}: EnhancedStepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.key,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = stepType?.icon || FileText;
  const hasTitle = step.title?.trim();
  const validation = getStepValidationStatus(step);
  const config = STEP_TYPE_CONFIG[step.type];
  const isNzRecommended = config?.isNzRecommended;

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={onSelect}
        className={cn(
          "group relative rounded-xl border bg-white dark:bg-slate-800 transition-all duration-200 cursor-pointer",
          isSelected
            ? "border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/20 shadow-lg shadow-indigo-500/10"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md",
          isDragging && "opacity-50 shadow-2xl scale-[1.02] z-50",
          !validation.isValid && !isSelected && "border-amber-300 dark:border-amber-700"
        )}
      >
        {/* Selection indicator line */}
        {isSelected && (
          <motion.div
            layoutId="selection-indicator"
            className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"
          />
        )}

        {/* Compact Card Content */}
        <div className="flex items-center gap-3 p-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex-none cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>

          {/* Step Number Badge */}
          <div className="flex-none w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {index + 1}
            </span>
          </div>

          {/* Step Icon */}
          <div
            className={cn(
              "flex-none w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm",
              stepType?.color || "from-gray-500 to-gray-600"
            )}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
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
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1 py-0 flex-none">
                  <Star className="w-2 h-2 mr-0.5" />
                  NZ
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {stepType?.label}
            </p>
          </div>

          {/* Status Indicators */}
          <div className="flex-none flex items-center gap-1.5">
            {!validation.isValid && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{validation.errors[0]}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {validation.isValid && validation.warnings.length > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{validation.warnings[0]}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {validation.isValid && validation.warnings.length === 0 && hasTitle && (
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}

export default EnhancedStepCard;
