'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
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
  const [activeDragField, setActiveDragField] = useState<FormField | null>(null);

  // Handle drag from palette to canvas
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragField(null);
    if (event.over?.id === 'canvas') {
      const newField: FormField = {
        id: uuidv4(),
        type: String(event.active.id),
        label: 'Untitled Field',
        required: false,
      };
      setFields((prev) => [...prev, newField]);
      toast.success(`Added ${newField.type} field`);
    }
  };

  // Save form schema to parent handler
  const saveForm = () => {
    if (!fields.length) return toast.error('Add at least one field before saving');
    const unnamed = fields.some((f) => !f.label.trim());
    if (unnamed) return toast.error('All fields must have labels');

    onSave({
      name: 'New Form',
      description: 'Generated from FormBuilder',
      schema: fields,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <DndContext onDragEnd={handleDragEnd} onDragStart={(e) => setActiveDragField({ id: 'temp', type: String(e.active.id), label: e.active.id, required: false })}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Field Palette */}
          <FieldPalette />

          {/* Canvas */}
          <FormCanvas
            fields={fields}
            setFields={setFields}
            onSelectField={(field) => setSelectedField(field)}
          />

          {/* Field Editor */}
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
              <p className="text-gray-500 italic mt-4">Select a field to edit its properties</p>
            )}
          </div>

          {/* Live Preview */}
          <FormPreview fields={fields} />
        </div>

        {/* Drag Overlay Preview */}
        <DragOverlay>
          {activeDragField ? (
            <div className="p-2 px-3 bg-white border rounded shadow text-sm font-medium">
              {activeDragField.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Save Button */}
      <Button onClick={saveForm} className="self-end mt-4">
        Save Form
      </Button>
    </div>
  );
}
