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
      className={`min-h-[70vh] p-4 border-dashed rounded ${
        isOver ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      {fields.length === 0 && <p className="text-gray-400">Drag fields here</p>}
      {fields.map((field) => (
        <div
          key={field.id}
          className="border p-2 rounded mb-2 cursor-pointer hover:bg-gray-50"
          onClick={() => onSelectField(field)}
        >
          {field.label} ({field.type})
        </div>
      ))}
    </div>
  );
}
