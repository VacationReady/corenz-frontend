'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlusCircle } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FormField } from '@/api/forms/[id]/types'
import { SortableFieldItem } from './SortableFieldItem';

export function FormCanvas({
  fields,
  onSelectField,
  setFields,
  selectedField,
}: {
  fields: FormField[];
  onSelectField: (field: FormField | null) => void;
  setFields: React.Dispatch<React.SetStateAction<FormField[]>>;
  selectedField: FormField | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'canvas' });

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      const remainingFields = fields.filter((f) => f.id !== fieldId);
      onSelectField(remainingFields[0] || null);
    }
  };

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        className={`min-h-[400px] border-2 border-dashed rounded-lg p-4 transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <h3 className="text-lg font-semibold mb-3">Form Fields</h3>

        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-400 py-12">
            <PlusCircle className="h-8 w-8 mb-2 opacity-60" />
            <p className="italic text-sm">Drag fields here from the palette</p>
          </div>
        ) : (
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  selectedField={selectedField}
                  onSelectField={onSelectField}
                  onDeleteField={handleDeleteField}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </TooltipProvider>
  );
}
