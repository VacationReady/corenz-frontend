'use client';

import { FormField } from './types';
import { Input } from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/textarea'; 
import { AlertCircle } from 'lucide-react';

export function FieldEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (updated: FormField) => void;
}) {
  const labelInvalid = !field.label.trim();

  return (
    <div className="flex flex-col gap-6 p-4 bg-white rounded-md border shadow-sm">
      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label <span className="text-red-500">*</span>
        </label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Enter field label"
          className={labelInvalid ? 'border-red-500 focus:ring-red-500' : ''}
        />
        {labelInvalid && (
          <div className="flex items-center gap-2 text-xs text-red-500 mt-1">
            <AlertCircle className="h-4 w-4" />
            Label is required
          </div>
        )}
      </div>

      {/* Placeholder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
        <Input
          value={field.placeholder || ''}
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
          placeholder="e.g. Enter your name"
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id={`required-${field.id}`}
          checked={field.required}
          onCheckedChange={(v) => onChange({ ...field, required: Boolean(v) })}
        />
        <label htmlFor={`required-${field.id}`} className="text-sm cursor-pointer select-none">
          Required field
        </label>
      </div>

      {/* Options Input for select/radio */}
      {['select', 'radio'].includes(field.type) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
          <Textarea
            placeholder="One option per line (e.g. Red↵Blue↵Green)"
            value={field.options?.join('\n') || ''}
            onChange={(e) =>
              onChange({
                ...field,
                options: e.target.value
                  .split('\n')
                  .map((o) => o.trim())
                  .filter(Boolean),
              })
            }
            className="min-h-[100px]"
          />
        </div>
      )}
    </div>
  );
}
