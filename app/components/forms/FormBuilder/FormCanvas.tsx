'use client';

import { useDroppable } from '@dnd-kit/core';
import { FormField } from './types';
import { PlusCircle, GripVertical, Pencil } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

export function FormCanvas({
  fields,
  onSelectField,
  setFields,
}: {
  fields: FormField[];
  onSelectField: (field: FormField) => void;
  setFields: React.Dispatch<React.SetStateAction<FormField[]>>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'canvas' });

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        className={`min-h-[70vh] p-4 border-2 border-dashed rounded-lg transition-colors shadow-sm ${
          isOver ? 'border-blue-400 bg-blue-50/60' : 'border-gray-300 bg-white'
        }`}
      >
        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
            <PlusCircle className="h-10 w-10 mb-3 opacity-60" />
            <p className="italic text-center text-lg">
              Drag fields here to start building your form
            </p>
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field) => (
            <Tooltip key={field.id}>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  className="group flex items-center justify-between border p-3 rounded-md bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  onClick={() => onSelectField(field)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{field.label || 'Untitled Field'}</span>
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
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>Reorder</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                Click to edit this field’s settings
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
