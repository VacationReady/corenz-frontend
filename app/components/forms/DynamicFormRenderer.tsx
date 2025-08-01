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

interface DynamicFormRendererProps {
  formId: string;
  employeeId?: string; // Optional if session context handles this
  onSubmitSuccess?: () => void;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export function DynamicFormRenderer({ formId, onSubmitSuccess }: DynamicFormRendererProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch form schema
  useEffect(() => {
    const fetchForm = async () => {
      const res = await fetch(`/api/forms/${formId}`);
      if (!res.ok) {
        toast.error('Failed to load form');
        return;
      }
      const data = await res.json();
      setFields(data.schema || []);
      setLoading(false);
    };
    fetchForm();
  }, [formId]);

  // Build Zod schema dynamically based on form fields
  const buildValidationSchema = () => {
    const shape: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.required) {
        shape[f.id] = z.string().min(1, `${f.label} is required`);
      } else {
        shape[f.id] = z.string().optional();
      }
    });
    return z.object(shape);
  };

  const formSchema = buildValidationSchema();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
  });

  // Handle submission
  const submitForm = async (data: Record<string, any>) => {
    const res = await fetch(`/api/forms/${formId}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    if (res.ok) {
      toast.success('Form submitted successfully');
      onSubmitSuccess?.();
    } else {
      toast.error('Failed to submit form');
    }
  };

  if (loading) return <p>Loading form...</p>;

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-6">
      {fields.map((field) => (
        <div key={field.id} className="flex flex-col gap-2">
          <label className="font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          {renderField(field, register)}
          {errors[field.id] && (
            <p className="text-red-500 text-sm">{errors[field.id]?.message as string}</p>
          )}
        </div>
      ))}
      <Button type="submit" className="w-full">Submit</Button>
    </form>
  );
}

function renderField(field: FormField, register: any) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'date':
      return <Input type={field.type} placeholder={field.placeholder} {...register(field.id)} />;
    case 'textarea':
      return <Textarea placeholder={field.placeholder} {...register(field.id)} />;
    case 'select':
      return (
        <select className="border rounded p-2" {...register(field.id)}>
          <option value="">Select an option</option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case 'radio':
      return (
        <div className="flex gap-4">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-1">
              <input type="radio" value={opt} {...register(field.id)} /> {opt}
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex flex-col gap-2">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-1">
              <Checkbox id={`${field.id}-${i}`} {...register(field.id)} /> {opt}
            </label>
          ))}
        </div>
      );
    default:
      return null;
  }
}
