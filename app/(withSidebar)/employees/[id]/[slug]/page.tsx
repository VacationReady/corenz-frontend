'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { DynamicFormRenderer } from '@/components/forms/DynamicFormRenderer';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Form {
  id: string;
  name: string;
  slug: string;
  description?: string;
  schema: any[];
}

export default function EmployeeFormPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employeeId = params.id as string;
  const slug = params.slug as string;

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await fetch(`/api/forms/by-slug/${slug}`);
        if (res.ok) {
          const formData = await res.json();
          setForm(formData);
        } else if (res.status === 404) {
          setError('Form not found');
        } else {
          setError('Failed to load form');
        }
      } catch (error) {
        setError('Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [slug]);

  const handleFormSubmit = (data: any) => {
    toast.success('Form submitted successfully');
    router.push(`/employees/${employeeId}/overview`);
  };

  if (loading) {
    return (
      <PageShell title="Loading..." description="Loading form...">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    );
  }

  if (error || !form) {
    return (
      <PageShell title="Error" description="Form not found">
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">{error || 'Form not found'}</p>
          <Button
            onClick={() => router.push(`/employees/${employeeId}/overview`)}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employee
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell 
      title={form.name} 
      description={form.description || 'Complete this form'}
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => router.push(`/employees/${employeeId}/overview`)}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employee
          </Button>
        </div>
        
        <DynamicFormRenderer
          formId={form.id}
          employeeId={employeeId}
          onSubmitSuccess={handleFormSubmit}
        />
      </div>
    </PageShell>
  );
}
