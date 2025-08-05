'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import Checkbox from '@/components/ui/Checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { uploadToSupabase } from '@/lib/supabase';

interface DynamicFormRendererProps {
  formId: string;
  employeeId?: string;
  onSubmitSuccess?: (data: any) => void;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export function DynamicFormRenderer({ formId, employeeId, onSubmitSuccess }: DynamicFormRendererProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await fetch(`/api/forms/${formId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFields(data.schema || []);
      } catch {
        toast.error('Failed to load form');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [formId]);

  // Dynamic Zod schema
  const buildValidationSchema = () => {
    const shape: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === 'checkbox') {
        shape[f.id] = f.required
          ? z.array(z.string()).min(1, `${f.label} is required`)
          : z.array(z.string()).optional();
      } else if (f.type === 'file') {
        shape[f.id] = f.required
          ? z.any().refine((files) => files?.length > 0, `${f.label} is required`)
          : z.any().optional();
      } else {
        shape[f.id] = f.required ? z.string().min(1, `${f.label} is required`) : z.string().optional();
      }
    });
    return z.object(shape);
  };

  const formSchema = buildValidationSchema();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(formSchema) });

  // Submit handler
  const submitForm = async (data: Record<string, any>) => {
    try {
      const processedData = { ...data };
      for (const field of fields) {
        if (field.type === 'file' && data[field.id] && data[field.id].length > 0) {
          const file = data[field.id][0];
          try {
            const uploadResult = await uploadToSupabase(file);
            processedData[field.id] = {
              url: uploadResult.url,
              path: uploadResult.path,
              name: file.name,
              size: file.size,
              type: file.type
            };
          } catch {
            toast.error(`Failed to upload ${field.label}`);
            return;
          }
        }
      }
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, data: processedData }),
      });
      if (res.ok) {
        toast.success('Form submitted successfully');
        onSubmitSuccess?.(processedData);
      } else {
        toast.error('Failed to submit form');
      }
    } catch {
      toast.error('Failed to submit form');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-6 w-6 mr-2 animate-spin" /> Loading form...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      {fields.map((field) => (
        <div key={field.id} className="flex flex-col gap-2">
          <label className="font-medium text-sm text-gray-700">
            {field.label || 'Untitled Field'}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(field, register)}
          {errors[field.id] && (
            <p className="text-red-500 text-xs mt-1">{errors[field.id]?.message as string}</p>
          )}
        </div>
      ))}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
          </>
        ) : (
          'Submit'
        )}
      </Button>
    </form>
  );
}

function renderField(field: FormField, register: any) {
  const baseInput =
    'border rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition';

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'date':
      return <Input type={field.type} placeholder={field.placeholder} {...register(field.id)} />;
    case 'textarea':
      return <Textarea placeholder={field.placeholder} className="min-h-[80px]" {...register(field.id)} />;
    case 'select':
      return (
        <select className={baseInput} defaultValue="" {...register(field.id)}>
          <option value="" disabled>
            {field.placeholder || 'Select an option'}
          </option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case 'radio':
      return (
        <div className="flex flex-wrap gap-4">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" value={opt} {...register(field.id)} className="accent-blue-500 focus:ring-blue-400" />
              {opt}
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex flex-col gap-2">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox id={`${field.id}-${i}`} {...register(field.id)} /> {opt}
            </label>
          ))}
        </div>
      );
    case 'file':
      return (
        <input
          type="file"
          {...register(field.id)}
          className={`${baseInput} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
        />
      );
    default:
      return null;
  }
}
