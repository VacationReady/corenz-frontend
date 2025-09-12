"use client";

import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import FormBuilder from "@/components/forms/FormBuilder/FormBuilder";
import { toast } from "sonner";

export default function NewFormPage() {
  const router = useRouter();

  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Forms & Surveys', href: '/settings/forms' },
    { label: 'Create Form', isCurrentPage: true }
  ]

  const handleSave = async (data: {
    name: string;
    slug: string;
    description?: string;
    formType: "SUBMISSION" | "DATA_SCREEN";
    schema: any;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
  }) => {
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Form created");
      router.push("/settings/forms");
    } else {
      const error = await res.json();
      toast.error(error.error || "Failed to save form");
    }
  };

  return (
    <PageShell
      title="Create Form"
      description="Build a new form using the builder"
<<<<<<< HEAD
=======
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec
    >
      <FormBuilder onSave={handleSave} />
    </PageShell>
  );
}
