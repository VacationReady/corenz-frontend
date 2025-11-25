"use client";

import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import FormBuilderWizard from "@/components/forms/FormBuilder/FormBuilderWizard";
import { toast } from "sonner";
import { AnyFormSchema } from "@/api/forms/[id]/types";

export default function NewFormPage() {
  const router = useRouter();

  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Screen Designer', href: '/settings/forms' },
    { label: 'Create New Form', isCurrentPage: true }
  ];

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
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          isActive: true,
        }),
      });

      if (res.ok) {
        toast.success("Form created successfully!");
        router.push("/settings/forms");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create form");
      }
    } catch {
      toast.error("Failed to create form");
    }
  };

  return (
    <PageShell
      title="Create New Form"
      description="Design a custom form in three easy steps"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      <FormBuilderWizard onSave={handleSave} />
    </PageShell>
  );
}

