'use client';

import { FormField } from './types';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';

export function FieldEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (updated: FormField) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Label</label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Placeholder</label>
        <Input
          value={field.placeholder || ''}
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={field.required}
          onCheckedChange={(v) => onChange({ ...field, required: Boolean(v) })}
        />
        <span>Required</span>
      </div>
      {['select', 'radio'].includes(field.type) && (
        <div>
          <label className="block text-sm font-medium mb-1">Options</label>
          <Input
            placeholder="Comma-separated options"
            value={field.options?.join(',') || ''}
            onChange={(e) =>
              onChange({ ...field, options: e.target.value.split(',').map((o) => o.trim()) })
            }
          />
        </div>
      )}
    </div>
  );
}
