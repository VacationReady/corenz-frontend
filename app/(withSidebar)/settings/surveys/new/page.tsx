"use client";

import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import FormBuilderWizard from "@/components/forms/FormBuilder/FormBuilderWizard";
import { toast } from "sonner";
import { AnyFormSchema } from "@/api/forms/[id]/types";

export default function NewSurveyPage() {
  const router = useRouter();

  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Surveys', href: '/settings/surveys' },
    { label: 'Create New Survey', isCurrentPage: true }
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
  }) => {
    // Force formType to SURVEY
    const surveyData = { ...data, formType: "SURVEY" as const };
    
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyData),
      });

      if (res.ok) {
        toast.success("Survey created successfully!");
        router.push("/settings/surveys");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to create survey");
      }
    } catch {
      toast.error("Failed to create survey");
    }
  };

  return (
    <PageShell
      title="Create New Survey"
      description="Design a survey in three easy steps: build questions, preview, and set your audience"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      <FormBuilderWizard 
        onSave={handleSave}
        lockedFormType="SURVEY"
        cancelUrl="/settings/surveys"
        initialData={{
          name: "",
          formType: "SURVEY",
          schema: { version: 2, sections: [] } as AnyFormSchema,
        }}
      />
    </PageShell>
  );
}
