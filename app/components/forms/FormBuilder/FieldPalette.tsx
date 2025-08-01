'use client';

import { useDraggable } from '@dnd-kit/core';

const FIELD_TYPES = [
  { type: 'text', label: 'Text' },
  { type: 'textarea', label: 'Textarea' },
  { type: 'email', label: 'Email' },
  { type: 'phone', label: 'Phone' },
  { type: 'date', label: 'Date' },
  { type: 'select', label: 'Dropdown' },
  { type: 'radio', label: 'Radio' },
  { type: 'checkbox', label: 'Checkbox' },
];

export function FieldPalette() {
  return (
    <div>
      <h3 className="font-semibold mb-3">Field Types</h3>
      <div className="flex flex-col gap-2">
        {FIELD_TYPES.map((field) => (
          <DraggableField key={field.type} id={field.type} label={field.label} />
        ))}
      </div>
    </div>
  );
}

function DraggableField({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="cursor-grab border rounded p-2 hover:bg-gray-50"
    >
      {label}
    </div>
  );
}
