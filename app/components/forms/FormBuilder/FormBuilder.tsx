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
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4 h-[80vh]">
        {/* Palette */}
        <div className="col-span-1 border p-4 rounded-lg">
          <FieldPalette />
        </div>

        {/* Canvas */}
        <div className="col-span-2 border p-4 rounded-lg" id="canvas">
          <FormCanvas
            fields={fields}
            onSelectField={setSelectedField}
            setFields={setFields}
          />
          <Button className="mt-4 w-full" onClick={saveForm}>
            Save Form
          </Button>
        </div>

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
