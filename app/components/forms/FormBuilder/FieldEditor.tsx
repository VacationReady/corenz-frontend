'use client';

import { useState, useEffect } from 'react';
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
  const [localOptions, setLocalOptions] = useState(field.options?.join('\n') || '');
  const labelInvalid = !field.label?.trim();

  useEffect(() => {
    setLocalOptions(field.options?.join('\n') || '');
  }, [field.options]);

  const handleOptionsChange = (value: string) => {
    setLocalOptions(value);
    onChange({
      ...field,
      options: value
        .split('\n')
        .map((opt) => opt.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 bg-white rounded-md border shadow-sm">
      {/* Header */}
      <div className="border-b pb-2 mb-2">
        <h3 className="font-semibold text-lg">Edit Field</h3>
        <p className="text-sm text-gray-600">Type: {field.type}</p>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label <span className="text-red-500">*</span>
        </label>
        <div className="mb-2 text-xs text-gray-500">
          Current value: "{field.label}" (length: {field.label?.length || 0})
        </div>
        <Input
          value={field.label || ''}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Enter field label"
          className={labelInvalid ? 'border-red-500 focus:ring-red-500' : ''}
          autoFocus={!field.label}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Placeholder
        </label>
        <Input
          value={field.placeholder || ''}
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
          placeholder="e.g. Enter your name"
        />
      </div>

      {/* Options Input for select/radio/checkbox */}
      {(field.type === 'select' ||
        field.type === 'radio' ||
        field.type === 'checkbox') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Options
          </label>
          <Textarea
            value={localOptions}
            onChange={(e) => handleOptionsChange(e.target.value)}
            placeholder="One option per line"
            className="min-h-[80px]"
          />
        </div>
      )}

      {/* Required Toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id={`required-${field.id}`}
          checked={field.required}
          onCheckedChange={(v) => onChange({ ...field, required: Boolean(v) })}
        />
        <label
          htmlFor={`required-${field.id}`}
          className="text-sm cursor-pointer select-none"
        >
          Required field
        </label>
      </div>
    </div>
  );
}
