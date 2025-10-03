"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import FormBuilder from "@/components/forms/FormBuilder/FormBuilder";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { AnyFormSchema } from "@/api/forms/[id]/types";

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<{
    id: string;
    name: string;
    slug?: string;
    description?: string;
    formType: "SURVEY" | "FORM" | "TABLE" | "DATA_SCREEN";
    schema: AnyFormSchema;
    visibleToRoles?: string[];
    visibleToDepartments?: string[];
    visibleToJobRoles?: string[];
    transactionalEnabled?: boolean;
  } | null>(null);

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const res = await fetch(`/api/forms/${surveyId}`);
        if (res.ok) {
          const data = await res.json();
          
          // Ensure this is a survey
          if (data.formType !== "SURVEY") {
            toast.error("This is not a survey");
            router.push("/settings/surveys");
            return;
          }
          
          setSurvey(data);
        } else {
          toast.error("Failed to load survey");
          router.push("/settings/surveys");
        }
      } catch (error) {
        toast.error("Failed to load survey");
        router.push("/settings/surveys");
      } finally {
        setLoading(false);
      }
    };

    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId, router]);

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
    try {
      // Force formType to SURVEY
      const surveyData = { ...data, formType: "SURVEY" as const };
      
      const res = await fetch(`/api/forms/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyData),
      });

      if (res.ok) {
        toast.success("Survey updated successfully");
        router.push("/settings/surveys");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update survey");
      }
    } catch (error) {
      toast.error("Failed to update survey");
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Edit Survey"
        description="Loading survey data..."
        icon={<FileText className="w-6 h-6" />}
        breadcrumbs={breadcrumbConfigs.forms}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    );
  }

  if (!survey) {
    return null;
  }

  return (
    <PageShell
      title={`Edit Survey: ${survey.name}`}
      description="Update survey configuration and fields"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={breadcrumbConfigs.forms}
    >
      <FormBuilder onSave={handleSave} initialData={survey} />
    </PageShell>
  );
}

