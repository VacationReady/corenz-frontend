"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Trash2,
  Settings2,
  Check,
  AlertCircle,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetadataPanel, getMetadataConfig } from "./MetadataPanel";

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
  onUpdate: (data: any) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  stepType?: StepType;
}

export function EnhancedStepCard({
  step,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  stepType,
}: EnhancedStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(isSelected);

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
  const hasDescription = step.description?.trim();
  const metadataConfig = getMetadataConfig(step.type);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative rounded-2xl border bg-white dark:bg-slate-800 transition-all duration-200",
        isSelected
          ? "border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/20 shadow-lg shadow-indigo-500/10"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md",
        isDragging && "opacity-50 shadow-2xl scale-[1.02] z-50"
      )}
    >
      {/* Header */}
      <div 
        onClick={onSelect}
        className={cn(
          "flex items-center gap-3 p-4 cursor-pointer",
          isExpanded && "border-b border-slate-100 dark:border-slate-700"
        )}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-none cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <GripVertical className="w-5 h-5 text-slate-400" />
        </div>

        {/* Step Number Badge */}
        <div className="flex-none w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
            {index + 1}
          </span>
        </div>

        {/* Step Icon */}
        <div className={cn(
          "flex-none w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
          stepType?.color || "from-gray-500 to-gray-600"
        )}>
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-semibold truncate",
              hasTitle ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
            )}>
              {hasTitle ? step.title : "Untitled step"}
            </h4>
            {!hasTitle && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                <AlertCircle className="w-3 h-3 mr-1" />
                Needs title
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {stepType?.label}
            {hasDescription && ` • ${step.description}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-none flex items-center gap-1">
          {/* Status indicator */}
          {hasTitle && (
            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onRemove}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="p-4 space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Step Title *</Label>
                <Input
                  value={step.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  placeholder="Enter a descriptive title..."
                  className={cn(
                    "transition-all",
                    !hasTitle && "border-amber-300 focus:border-amber-400 focus:ring-amber-400/20"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <Input
                  value={step.description}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="Optional description..."
                />
              </div>
            </div>

            {/* Type-specific fields */}
            {step.type === "acknowledge-document" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Document to Acknowledge</Label>
                <DocumentDropdown
                  value={step.documentId}
                  onChange={(docId) => onUpdate({ documentId: docId })}
                />
              </div>
            )}

            {step.type === "upload-document" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Document Type</Label>
                <select
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  value={step.uploadType || ""}
                  onChange={(e) => onUpdate({ uploadType: e.target.value })}
                >
                  <option value="">Select type...</option>
                  <option value="passport">Passport</option>
                  <option value="right-to-work">Right to Work</option>
                  <option value="driver-licence">Driver Licence</option>
                  <option value="training-certificate">Training Certificate</option>
                  <option value="other">Other/Custom</option>
                </select>
              </div>
            )}

            {step.type === "fill-form" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Form to Complete</Label>
                <FormDropdown
                  value={step.formId}
                  onChange={(formId) => onUpdate({ formId })}
                />
              </div>
            )}

            {/* Metadata Panel */}
            {metadataConfig && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <MetadataPanel
                  stepType={step.type}
                  value={step.metadata}
                  onChange={(metadata) => onUpdate({ metadata })}
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Selection indicator line */}
      {isSelected && (
        <motion.div
          layoutId="selection-indicator"
          className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"
        />
      )}
    </motion.div>
  );
}

// Document Dropdown Component
function DocumentDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [docs, setDocs] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/documents/list")
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []));
  }, []);

  return (
    <select
      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select a document...</option>
      {docs.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name} ({d.category})
        </option>
      ))}
    </select>
  );
}

// Form Dropdown Component
function FormDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [forms, setForms] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then((data) => setForms(Array.isArray(data) ? data : []));
  }, []);

  return (
    <select
      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select a form...</option>
      {forms.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
}

export default EnhancedStepCard;


