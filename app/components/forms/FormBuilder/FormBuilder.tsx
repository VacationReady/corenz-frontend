'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { v4 as uuidv4 } from 'uuid';
import { FieldPalette } from './FieldPalette';
import { FormCanvas } from './FormCanvas';
import { FieldEditor } from './FieldEditor';
import { FormPreview } from './FormPreview';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { FormField } from './types';

interface FormBuilderProps {
  onSave: (data: { name: string; description?: string; schema: FormField[] }) => void;
}

export default function FormBuilder({ onSave }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id === 'canvas') {
      const newField: FormField = {
        id: uuidv4(),
        type: String(event.active.id),
        label: 'Untitled Field',
        required: false,
      };
      setFields((prev) => [...prev, newField]);
    }
  };

  const saveForm = () => {
    if (!fields.length) return toast.error('Add at least one field');
    onSave({
      name: 'New Form',
      description: 'Generated from FormBuilder',
      schema: fields,
    });
  };

    if (res.ok) toast.success('Form saved successfully!');
    else toast.error('Error saving form');
  };

  return (
  <div className="flex flex-col gap-4">
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FieldPalette />
        <FormCanvas fields={fields} setFields={setFields} setSelectedField={setSelectedField} />
        <div>
          {selectedField ? (
            <FieldEditor
              field={selectedField}
              onChange={(updated) =>
                setFields((prev) =>
                  prev.map((f) => (f.id === updated.id ? updated : f))
                )
              }
            />
          ) : (
            <p className="text-gray-500">Select a field to edit</p>
          )}
        </div>
        <FormPreview fields={fields} />
      </div>
    </DndContext>
    <Button onClick={saveForm} className="self-end">Save Form</Button>
  </div>
);

        {/* Field Editor */}
        <div className="col-span-1 border p-4 rounded-lg">
          {selectedField ? (
            <FieldEditor
              field={selectedField}
              onChange={(updated) =>
                setFields((prev) =>
                  prev.map((f) => (f.id === updated.id ? updated : f))
                )
              }
            />
          ) : (
            <p className="text-gray-500">Select a field to edit</p>
          )}
        </div>
      </div>
    </DndContext>
  );
}
