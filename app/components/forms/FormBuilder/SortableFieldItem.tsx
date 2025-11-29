"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Pencil, Trash2, Copy, Eye, EyeOff, Asterisk, Type, Hash, Calendar, Mail, CheckSquare, ListChecks, ToggleLeft, AlignLeft } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { FormField } from "@/api/forms/[id]/types";
import { cn } from "@/lib/utils";

interface SortableFieldItemProps {
  field: FormField;
  selectedField: FormField | null;
  onSelectField: (field: FormField) => void;
  onDeleteField: (fieldId: string) => void;
  onUpdateField?: (updated: FormField) => void;
  onDuplicateField?: (field: FormField) => void;
}

// Get icon based on field type
function getFieldIcon(type: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    text: Type,
    textarea: AlignLeft,
    number: Hash,
    email: Mail,
    date: Calendar,
    checkbox: CheckSquare,
    select: ListChecks,
    switch: ToggleLeft,
  };
  return icons[type] || Type;
}

// Get color based on field type
function getFieldColor(type: string) {
  const colors: Record<string, string> = {
    text: "from-blue-500 to-indigo-600",
    textarea: "from-blue-500 to-indigo-600",
    number: "from-amber-500 to-orange-600",
    email: "from-blue-500 to-indigo-600",
    phone: "from-blue-500 to-indigo-600",
    date: "from-emerald-500 to-teal-600",
    time: "from-emerald-500 to-teal-600",
    checkbox: "from-emerald-500 to-teal-600",
    radio: "from-emerald-500 to-teal-600",
    select: "from-emerald-500 to-teal-600",
    switch: "from-amber-500 to-orange-600",
    file: "from-rose-500 to-pink-600",
    signature: "from-rose-500 to-pink-600",
    sectionHeader: "from-violet-500 to-purple-600",
    description: "from-violet-500 to-purple-600",
    divider: "from-violet-500 to-purple-600",
    computed: "from-slate-500 to-gray-600",
    readOnly: "from-slate-500 to-gray-600",
  };
  return colors[type] || "from-gray-500 to-gray-600";
}

export function SortableFieldItem({
  field,
  selectedField,
  onSelectField,
  onDeleteField,
  onUpdateField,
  onDuplicateField,
}: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  const isSelected = selectedField?.id === field.id;
  const Icon = getFieldIcon(field.type);
  const colorClass = getFieldColor(field.type);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteField(field.id);
  };

  const toggleRequired = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUpdateField?.({ ...field, required: !field.required });
  };

  const toggleHidden = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUpdateField?.({ ...field, hidden: !field.hidden });
  };

  const duplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDuplicateField?.(field);
  };

  const handleFieldClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".action-buttons")) {
      return;
    }
    onSelectField(field);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      tabIndex={0}
      onClick={handleFieldClick}
      whileHover={{ scale: isSelected ? 1 : 1.01 }}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl p-4 transition-all duration-200",
        "bg-white border-2",
        isSelected
          ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
          : "border-gray-100 hover:border-gray-200 hover:shadow-md",
        isDragging && "z-50 shadow-xl"
      )}
    >
      {/* Drag Handle */}
      <div
        className={cn(
          "p-1.5 rounded-lg transition-colors cursor-grab active:cursor-grabbing",
          isSelected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Field Icon */}
      <div className={cn(
        "p-2 rounded-xl bg-gradient-to-br text-white shadow-sm",
        colorClass
      )}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Field Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-semibold text-sm truncate",
            !field.label && "text-gray-400 italic"
          )}>
            {field.label || "Click to add label"}
          </span>
          {field.required && (
            <span className="text-rose-500 text-lg leading-none">*</span>
          )}
        </div>
        {(field.hidden || field.logic?.visibleWhen) && (
          <div className="flex items-center gap-2 mt-1">
            {field.hidden && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> hidden
              </span>
            )}
            {field.logic?.visibleWhen && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                conditional
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={cn(
        "action-buttons flex items-center gap-1 transition-opacity",
        "opacity-0 group-hover:opacity-100",
        isSelected && "opacity-100"
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              type="button" 
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                field.required 
                  ? "bg-rose-100 text-rose-600 hover:bg-rose-200" 
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              )}
              onClick={toggleRequired}
            >
              <Asterisk className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle Required</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              type="button" 
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                field.hidden 
                  ? "bg-gray-200 text-gray-600" 
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              )}
              onClick={toggleHidden}
            >
              {field.hidden ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle Visibility</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onSelectField(field);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Edit Field</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              type="button" 
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" 
              onClick={duplicate}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Duplicate</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete Field</TooltipContent>
        </Tooltip>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          layoutId="field-selection"
          className="absolute -inset-0.5 rounded-xl border-2 border-primary pointer-events-none"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.div>
  );
}
