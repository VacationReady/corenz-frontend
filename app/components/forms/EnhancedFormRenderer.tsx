'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { FormField, TableColumn } from '@/api/forms/[formId]/types';

interface EnhancedFormRendererProps {
  formId: string;
  employeeId: string;
  onDataChange?: (data: any) => void;
}

interface FormData {
  form: {
    id: string;
    name: string;
    formType: 'SUBMISSION' | 'DATA_SCREEN';
    schema: FormField[];
  };
  data: Record<string, any>;
  lastUpdated: string | null;
}

export function EnhancedFormRenderer({ formId, employeeId, onDataChange }: EnhancedFormRendererProps) {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset } = useForm();

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const res = await fetch(`/api/forms/${formId}/data?employeeId=${employeeId}`);
        if (res.ok) {
          const data = await res.json();
          setFormData(data);

          if (data.data) {
            Object.keys(data.data).forEach(key => {
              setValue(key, data.data[key]);
            });
          }
        } else {
          setError('Failed to load form data');
        }
      } catch {
        setError('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, [formId, employeeId, setValue]);

  const saveData = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, data }),
      });

      if (res.ok) {
        toast.success('Data saved successfully');
        onDataChange?.(data);

        const updatedRes = await fetch(`/api/forms/${formId}/data?employeeId=${employeeId}`);
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          setFormData(updatedData);
        }
      } else {
        toast.error('Failed to save data');
      }
    } catch {
      toast.error('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const submitForm = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, data }),
      });

      if (res.ok) {
        toast.success('Form submitted successfully');
        reset();
        onDataChange?.(data);
      } else {
        toast.error('Failed to submit form');
      }
    } catch {
      toast.error('Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (rawData: Record<string, any>) => {
    const data = { ...rawData };

    for (const field of formData!.form.schema) {
      if (field.type === 'file') {
        const file = rawData[field.id]?.[0];
        if (file) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('name', file.name);
          uploadFormData.append('employeeId', employeeId);
          uploadFormData.append('category', formData!.form.name);
          uploadFormData.append('canViewAdmin', 'true');
          uploadFormData.append('canViewManager', 'true');
          uploadFormData.append('canViewEmployee', 'true');
          uploadFormData.append('requiresAck', 'false');

          try {
            const uploadRes = await fetch('/api/documents/upload-employee', {
              method: 'POST',
              body: uploadFormData,
            });

            const uploadResult = await uploadRes.json();
            if (uploadRes.ok && uploadResult.document) {
              data[field.id] = uploadResult.document;
            } else {
              toast.error(`Failed to upload file for ${field.label}`);
              return;
            }
          } catch {
            toast.error(`Upload error: ${field.label}`);
            return;
          }
        } else {
          data[field.id] = null;
        }
      }
    }

    if (formData?.form.formType === 'DATA_SCREEN') {
      saveData(data);
    } else {
      submitForm(data);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading form...</span>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || 'Form not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold">{formData.form.name}</h2>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            formData.form.formType === 'DATA_SCREEN' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {formData.form.formType === 'DATA_SCREEN' ? 'Data Screen' : 'Submission Form'}
          </span>
          {formData.lastUpdated && (
            <span>Last updated: {new Date(formData.lastUpdated).toLocaleString()}</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {formData.form.schema.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field, register, watch, setValue)}
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : formData.form.formType === 'DATA_SCREEN' ? (
              <Save className="h-4 w-4" />
            ) : null}
            {saving 
              ? 'Saving...' 
              : formData.form.formType === 'DATA_SCREEN' 
                ? 'Save Data' 
                : 'Submit Form'
            }
          </Button>
        </div>
      </form>
    </div>
  );
}
function renderField(field: FormField, register: any, watch: any, setValue: any) {
  const baseInput = 'border rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition';

  switch (field.type) {
    case 'file':
      return (
        <input
          type="file"
          className="border rounded px-3 py-2 w-full text-sm"
          {...register(field.id, { required: field.required })}
        />
      );

    case 'text':
    case 'email':
    case 'phone':
    case 'date':
      return <Input type={field.type} placeholder={field.placeholder} {...register(field.id, { required: field.required })} />;

    case 'number':
      return <Input type="number" placeholder={field.placeholder} {...register(field.id, { required: field.required })} />;

    case 'textarea':
      return <Textarea placeholder={field.placeholder} className="min-h-[80px]" {...register(field.id, { required: field.required })} />;

    case 'select':
      return (
        <select className={baseInput} {...register(field.id, { required: field.required })}>
          <option value="">{field.placeholder || 'Select an option'}</option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'list':
      return <ListField field={field} register={register} watch={watch} setValue={setValue} />;

    case 'table':
      return <TableField field={field} register={register} watch={watch} setValue={setValue} />;

    default:
      return <Input placeholder={field.placeholder} {...register(field.id, { required: field.required })} />;
  }
}

function ListField({ field, register, watch, setValue }: any) {
  const currentValue = watch(field.id) || [];

  const addEntry = () => {
    setValue(field.id, [...currentValue, '']);
  };

  const removeEntry = (index: number) => {
    const newValue = currentValue.filter((_: any, i: number) => i !== index);
    setValue(field.id, newValue);
  };

  const updateEntry = (index: number, value: string) => {
    const newValue = [...currentValue];
    newValue[index] = value;
    setValue(field.id, newValue);
  };

  return (
    <div className="space-y-2">
      {currentValue.map((entry: string, index: number) => (
        <div key={index} className="flex gap-2">
          <Input
            value={entry}
            onChange={(e) => updateEntry(index, e.target.value)}
            placeholder={`${field.label} ${index + 1}`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeEntry(index)}
            className="px-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addEntry}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add {field.label}
      </Button>
    </div>
  );
}

function TableField({ field, register, watch, setValue }: any) {
  const currentValue = watch(field.id) || [];

  const addRow = () => {
    const newRow: Record<string, any> = {};
    field.tableColumns?.forEach((col: TableColumn) => {
      newRow[col.id] = '';
    });
    setValue(field.id, [...currentValue, newRow]);
  };

  const removeRow = (index: number) => {
    const newValue = currentValue.filter((_: any, i: number) => i !== index);
    setValue(field.id, newValue);
  };

  const updateCell = (rowIndex: number, columnId: string, value: any) => {
    const newValue = [...currentValue];
    newValue[rowIndex] = { ...newValue[rowIndex], [columnId]: value };
    setValue(field.id, newValue);
  };

  if (!field.tableColumns || field.tableColumns.length === 0) {
    return <div className="text-gray-500 italic">No table columns configured</div>;
  }

  return (
    <div className="space-y-4">
      {currentValue.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {field.tableColumns.map((col: TableColumn) => (
                  <th key={col.id} className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                    {col.label}
                    {col.required && <span className="text-red-500 ml-1">*</span>}
                  </th>
                ))}
                <th className="px-4 py-2 w-16 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {currentValue.map((row: any, rowIndex: number) => (
                <tr key={rowIndex} className="border-b">
                  {field.tableColumns.map((col: TableColumn) => (
                    <td key={col.id} className="px-4 py-2">
                      {col.type === 'select' ? (
                        <select
                          value={row[col.id] || ''}
                          onChange={(e) => updateCell(rowIndex, col.id, e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select...</option>
                          {col.options?.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={col.type}
                          value={row[col.id] || ''}
                          onChange={(e) => updateCell(rowIndex, col.id, e.target.value)}
                          className="w-full text-sm"
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeRow(rowIndex)}
                      className="px-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Row
      </Button>
    </div>
  );
}
