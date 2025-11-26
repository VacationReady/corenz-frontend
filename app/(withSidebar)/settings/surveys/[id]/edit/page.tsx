"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import FormBuilderWizard from "@/components/forms/FormBuilder/FormBuilderWizard";
import { motion } from "framer-motion";
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
        toast.success("Survey updated successfully!");
        router.push("/settings/surveys");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update survey");
      }
    } catch (error) {
      toast.error("Failed to update survey");
    }
  };

  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Surveys', href: '/settings/surveys' },
    { label: survey?.name || 'Edit Survey', isCurrentPage: true }
  ];

  if (loading) {
    return (
      <PageShell
        title="Edit Survey"
        description="Loading survey data..."
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

  if (!survey) {
    return null;
  }

  return (
    <PageShell
      title={`Edit: ${survey.name}`}
      description="Update your survey questions, preview, and audience settings"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      <FormBuilderWizard 
        onSave={handleSave} 
        initialData={survey}
        lockedFormType="SURVEY"
        cancelUrl="/settings/surveys"
      />
    </PageShell>
  );
}
