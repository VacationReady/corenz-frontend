"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Copy, Eye, EyeOff, Asterisk } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { FormField } from "@/api/forms/[id]/types";

interface SortableFieldItemProps {
  field: FormField;
  selectedField: FormField | null;
  onSelectField: (field: FormField) => void;
  onDeleteField: (fieldId: string) => void;
  onUpdateField?: (updated: FormField) => void;
  onDuplicateField?: (field: FormField) => void;
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
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
  };

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
    // Don't select field if clicking on action buttons
    if ((e.target as HTMLElement).closest(".action-buttons")) {
      return;
    }
    onSelectField(field);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      tabIndex={0}
      onClick={handleFieldClick}
      className={`group flex items-center justify-between border p-3 rounded-md cursor-pointer transition ${
        selectedField?.id === field.id
          ? "bg-blue-50 border-blue-400 ring-2 ring-blue-400"
          : "bg-white hover:bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex flex-col">
        <span className="font-medium">
          {field.label || (
            <span className="text-gray-400 italic">Click to add label</span>
          )}
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{field.type}</span>
          {field.required && <span className="px-1 rounded bg-red-50 text-red-600">required</span>}
          {field.hidden && <span className="px-1 rounded bg-gray-100 text-gray-600">hidden</span>}
          {field.logic?.visibleWhen && (
            <span className="px-1 rounded bg-blue-50 text-blue-700">logic</span>
          )}
          {field.width && <span className="px-1 rounded bg-emerald-50 text-emerald-700">{field.width}</span>}
        </div>
      </div>

      <div className="action-buttons flex items-center gap-2 transition">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="p-1 hover:bg-gray-100 rounded" onClick={toggleRequired}>
              <Asterisk className={`h-4 w-4 ${field.required ? "text-red-500" : "text-gray-400"}`} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle Required</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="p-1 hover:bg-gray-100 rounded" onClick={toggleHidden}>
              {field.hidden ? (
                <EyeOff className="h-4 w-4 text-gray-500" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle Visibility</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="p-1 hover:bg-gray-100 rounded"
              onClick={(e) => {
                e.stopPropagation();
                onSelectField(field);
              }}
            >
              <Pencil className="h-4 w-4 text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Edit Field</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="p-1 hover:bg-gray-100 rounded" onClick={duplicate}>
              <Copy className="h-4 w-4 text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Duplicate</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="p-1 hover:bg-gray-100 rounded cursor-move"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Reorder</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="p-1 hover:bg-red-100 rounded"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete Field</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
