'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { FormField } from './types';

interface SortableFieldItemProps {
  field: FormField;
  selectedField: FormField | null;
  onSelectField: (field: FormField) => void;
  onDeleteField: (fieldId: string) => void;
}

export function SortableFieldItem({
  field,
  selectedField,
  onSelectField,
  onDeleteField,
}: SortableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      tabIndex={0}
      onClick={() => onSelectField(field)}
      className={`group flex items-center justify-between border p-3 rounded-md cursor-pointer transition ${
        selectedField?.id === field.id
          ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400'
          : 'bg-white hover:bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex flex-col">
        <span className="font-medium">
          {field.label || <span className="text-gray-400 italic">Click to add label</span>}
        </span>
        <span className="text-xs text-gray-500">
          {field.type} {field.required && '• Required'}
        </span>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <Tooltip>
          <TooltipTrigger asChild>
            <Pencil className="h-4 w-4 text-gray-400 cursor-pointer" />
          </TooltipTrigger>
          <TooltipContent>Edit Field</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
          </TooltipTrigger>
          <TooltipContent>Reorder</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Trash2
              className="h-4 w-4 text-red-500 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteField(field.id);
              }}
            />
          </TooltipTrigger>
          <TooltipContent>Delete Field</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
