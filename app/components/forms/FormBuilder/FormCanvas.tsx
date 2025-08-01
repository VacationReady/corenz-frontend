'use client';

import { useDroppable } from '@dnd-kit/core';
import { FormField } from './types';

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
    <div
      ref={setNodeRef}
      className={`min-h-[70vh] p-4 border-2 border-dashed rounded transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'
      }`}
    >
      {fields.length === 0 && (
        <p className="text-gray-400 italic text-center mt-16">Drag fields here to start building</p>
      )}

      {fields.map((field) => (
        <div
          key={field.id}
          tabIndex={0}
          className="border p-2 rounded mb-2 cursor-pointer hover:bg-gray-50 focus:outline focus:outline-blue-400"
          onClick={() => onSelectField(field)}
        >
          <span className="font-medium">{field.label}</span> <span className="text-sm text-gray-500">({field.type})</span>
        </div>
      ))}
    </div>
  );
}
