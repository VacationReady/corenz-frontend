"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import FormBuilder from "@/components/forms/FormBuilder/FormBuilder";
import { toast } from "sonner";
import { FormField } from "@/api/forms/[id]/types";

interface FormData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  schema: FormField[];
  isActive: boolean;
  visibleToRoles?: string[];
  visibleToDepartments?: string[];
  visibleToJobRoles?: string[];
}

export default function EditFormPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params?.id ? String(params.id) : "";

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);

  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Forms & Surveys', href: '/settings/forms' },
    { label: formData ? `Edit: ${formData.name}` : 'Edit Form', isCurrentPage: true }
  ]

  useEffect(() => {
    if (!formId) return; // ✅ Prevent fetch if formId is missing

    const fetchForm = async () => {
      try {
        const res = await fetch(`/api/forms/${formId}`);
        if (!res.ok) {
          toast.error("Form not found");
          router.push("/settings/forms");
          return;
        }
        const data = await res.json();
        setFormData(data);
      } catch {
        toast.error("Failed to load form");
        router.push("/settings/forms");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId, router]);

  const handleSave = async (data: {
    name: string;
    slug: string;
    description?: string;
    formType?: "SUBMISSION" | "DATA_SCREEN";
    schema: FormField[];
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
  }) => {
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          isActive: formData?.isActive ?? true,
        }),
      });

      if (res.ok) {
        toast.success("Form updated successfully");
        router.push("/settings/forms");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update form");
      }
    } catch {
      toast.error("Failed to update form");
    }
  };

  if (!formId) {
    return (
      <PageShell
        title="Invalid Form"
        description="Missing or invalid form ID"
        breadcrumbs={{ items: breadcrumbItems }}
        showHomeIcon={false}
      >
        <div className="text-center py-8">
          <p className="text-gray-500">The form ID is missing or invalid.</p>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell
        title="Edit Form"
        description="Loading form data..."
        breadcrumbs={{ items: breadcrumbItems }}
        showHomeIcon={false}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    );
  }

  if (!formData) {
    return (
      <PageShell
        title="Form Not Found"
        description="The requested form could not be found"
<<<<<<< HEAD
=======
        breadcrumbs={{ items: breadcrumbItems }}
        showHomeIcon={false}
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec
      >
        <div className="text-center py-8">
          <p className="text-gray-500">
            Form not found or you don't have permission to edit it.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Edit: ${formData.name}`}
      description="Modify the form using the builder below"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      <FormBuilder
        onSave={handleSave}
        initialData={{
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          schema: formData.schema,
          visibleToRoles: formData.visibleToRoles,
          visibleToDepartments: formData.visibleToDepartments,
          visibleToJobRoles: formData.visibleToJobRoles,
        }}
      />
    </PageShell>
  );
}
