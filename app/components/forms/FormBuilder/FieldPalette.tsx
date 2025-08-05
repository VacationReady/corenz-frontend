'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const FIELD_TYPES = [
  { type: 'text', label: 'Text', hint: 'Single-line text input' },
  { type: 'textarea', label: 'Textarea', hint: 'Multi-line text input' },
  { type: 'email', label: 'Email', hint: 'Email address field' },
  { type: 'phone', label: 'Phone', hint: 'Phone number input' },
  { type: 'date', label: 'Date', hint: 'Date picker' },
  { type: 'select', label: 'Dropdown', hint: 'Single-choice dropdown list' },
  { type: 'radio', label: 'Radio', hint: 'Single-choice radio buttons' },
  { type: 'checkbox', label: 'Checkbox', hint: 'Multi-choice checkboxes' },
  { type: 'file', label: 'File Upload', hint: 'File attachment field' }, // ✅ Restored file upload
];

export function FieldPalette() {
  return (
    <TooltipProvider>
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-3 text-lg">Field Types</h3>
        <div className="flex flex-col gap-2">
          {FIELD_TYPES.map((field) => (
            <DraggableField key={field.type} id={field.type} label={field.label} hint={field.hint} />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function DraggableField({ id, label, hint }: { id: string; label: string; hint: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={style}
          className={`border rounded-md p-2 text-sm bg-white hover:bg-gray-50 select-none shadow-sm hover:shadow transition-shadow ${
            isDragging ? 'ring-2 ring-blue-400' : ''
          }`}
        >
          {label}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{hint}</TooltipContent>
    </Tooltip>
  );
}
