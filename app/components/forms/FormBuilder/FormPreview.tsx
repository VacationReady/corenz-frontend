'use client';

import { FormField } from './types';

export function FormPreview({ fields }: { fields: FormField[] }) {
  return (
    <div className="border p-4 rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">Preview</h3>
      {fields.length === 0 ? (
        <p className="text-gray-400 text-sm">No fields yet</p>
      ) : (
        <form className="space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderPreviewField(field)}
            </div>
          ))}
        </form>
      )}
    </div>
  );
}

function renderPreviewField(field: FormField) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'date':
      return <input type={field.type} className="border p-2 rounded w-full" placeholder={field.placeholder} />;
    case 'textarea':
      return <textarea className="border p-2 rounded w-full" placeholder={field.placeholder} />;
    case 'select':
      return (
        <select className="border p-2 rounded w-full">
          {field.options?.map((opt, i) => <option key={i}>{opt}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="flex gap-4">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-1">
              <input type="radio" name={field.id} /> {opt}
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex flex-col gap-2">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-1">
              <input type="checkbox" /> {opt}
            </label>
          ))}
        </div>
      );
    default:
      return null;
  }
}