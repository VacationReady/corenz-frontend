"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import FormBuilderWizard from "@/components/forms/FormBuilder/FormBuilderWizard";
import { toast } from "sonner";
import { AnyFormSchema } from "@/api/forms/[id]/types";

interface FormData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  schema: AnyFormSchema;
  isActive: boolean;
  formType?: "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN";
  visibleToRoles?: string[];
  visibleToDepartments?: string[];
  visibleToJobRoles?: string[];
  autoSave?: boolean;
}

export default function EditFormPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params?.id ? String(params.id) : "";

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);

  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Screen Designer', href: '/settings/forms' },
    { label: formData ? `Edit: ${formData.name}` : 'Edit Form', isCurrentPage: true }
  ];

  useEffect(() => {
    if (!formId) return;

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
    formType: "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN";
    schema: AnyFormSchema;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
    autoSave?: boolean;
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
        toast.success("Form updated successfully!");
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
        <div className="glass-premium rounded-3xl p-12 text-center shadow-premium">
          <p className="text-muted-foreground">The form ID is missing or invalid.</p>
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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
          />
        </div>
      </PageShell>
    );
  }

  if (!formData) {
    return (
      <PageShell
        title="Form Not Found"
        description="The requested form could not be found"
        breadcrumbs={{ items: breadcrumbItems }}
        showHomeIcon={false}
      >
        <div className="glass-premium rounded-3xl p-12 text-center shadow-premium">
          <p className="text-muted-foreground">
            Form not found or you don&apos;t have permission to edit it.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Edit: ${formData.name}`}
      description="Modify your form in three easy steps"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      <FormBuilderWizard
        onSave={handleSave}
        initialData={{
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          formType: formData.formType,
          schema: formData.schema,
          visibleToRoles: formData.visibleToRoles,
          visibleToDepartments: formData.visibleToDepartments,
          visibleToJobRoles: formData.visibleToJobRoles,
          autoSave: formData.autoSave,
        }}
      />
    </PageShell>
  );
}
