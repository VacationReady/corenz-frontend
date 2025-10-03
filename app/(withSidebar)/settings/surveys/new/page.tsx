"use client";

import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import FormBuilder from "@/components/forms/FormBuilder/FormBuilder";
import { FileText } from "lucide-react";
import { toast } from "sonner";

export default function NewSurveyPage() {
  const router = useRouter();

  const handleSave = async (data: {
    name: string;
    slug: string;
    description?: string;
    formType: "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN";
    schema: any;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
  }) => {
    // Force formType to SURVEY
    const surveyData = { ...data, formType: "SURVEY" as const };
    
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(surveyData),
    });

    if (res.ok) {
      const created = await res.json();
      toast.success("Survey created successfully");
      router.push(`/settings/surveys`);
    } else {
      const errorData = await res.json().catch(() => ({}));
      toast.error(errorData.error || "Failed to create survey");
    }
  };

  return (
    <PageShell
      title="Create Survey"
      description="Build a one-time survey for distribution through action items"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={breadcrumbConfigs.forms}
    >
      <FormBuilder 
        onSave={handleSave} 
        initialData={{
          name: "",
          formType: "SURVEY",
          schema: [],
        }}
      />
    </PageShell>
  );
}

