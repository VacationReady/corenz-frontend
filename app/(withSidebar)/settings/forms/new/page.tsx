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
    { label: 'Create New Screen', isCurrentPage: true }
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
        toast.success("Screen created successfully!");
        router.push("/settings/forms");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create screen");
      }
    } catch {
      toast.error("Failed to create screen");
    }
  };

  return (
    <PageShell
      title="Create New Screen"
      description="Design a custom data screen, table, or survey in three easy steps"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      <FormBuilderWizard onSave={handleSave} />
    </PageShell>
  );
}

