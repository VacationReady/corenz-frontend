"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { CheckCircle, ArrowLeft, Clock, Shield, Lock, Eye, Building, Globe } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { SurveyCompletionSuccessAnimation } from "@/components/animations";

interface Survey {
  id: string;
  name: string;
  description?: string;
  deadline?: string;
  anonymizationLevel?: "public" | "department" | "location" | "full";
  Form: {
    id: string;
    name: string;
    schema: any;
  };
}

interface SurveyCompletePageProps {
  params: Promise<{ id: string }>;
}

export default function SurveyCompletePage({ params }: SurveyCompletePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionItemId = searchParams?.get("actionItemId");
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [surveyId, setSurveyId] = useState<string>("");
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [questionCount, setQuestionCount] = useState<number | undefined>();

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const resolvedParams = await params;
        setSurveyId(resolvedParams.id);
        
        const response = await fetch(`/api/surveys/${resolvedParams.id}`);
        if (response.ok) {
          const data = await response.json();
          setSurvey(data);
        } else {
          toast.error("Survey not found");
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Failed to load survey:", error);
        toast.error("Failed to load survey");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [params, router]);

  const handleSubmit = async (formData: any) => {
    if (!survey) return;

    setSubmitting(true);
    try {
      // Submit survey response
      const response = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          responseData: formData,
          actionItemId: actionItemId,
        }),
      });

      if (response.ok) {
        // Count questions answered
        const answeredCount = Object.keys(formData || {}).filter(
          (key) => formData[key] !== undefined && formData[key] !== ""
        ).length;
        setQuestionCount(answeredCount);
        
        // Show success animation first
        setShowSuccessAnimation(true);
        
        // Mark action item as completed if provided
        if (actionItemId) {
          try {
            await fetch('/api/action-items', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: actionItemId, status: 'COMPLETED' }),
            });
          } catch (error) {
            console.error("Failed to update action item:", error);
          }
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit survey");
      }
    } catch (error) {
      console.error("Error submitting survey:", error);
      toast.error("Failed to submit survey");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Loading Survey..."
        description="Please wait while we load the survey"
        icon={<Clock className="w-6 h-6" />}
      >
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading survey...</p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!survey) {
    return (
      <PageShell
        title="Survey Not Found"
        description="The requested survey could not be found"
        icon={<ArrowLeft className="w-6 h-6" />}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">Survey not found or no longer available.</p>
            <Button onClick={() => router.push("/dashboard")} variant="primary">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <>
      {/* Success Animation */}
      <SurveyCompletionSuccessAnimation
        isOpen={showSuccessAnimation}
        onClose={() => {
          setShowSuccessAnimation(false);
          router.push("/dashboard");
        }}
        surveyName={survey.name}
        questionCount={questionCount}
      />

      <PageShell
        title={survey.name}
        description={survey.description || "Complete this survey"}
        icon={<CheckCircle className="w-6 h-6" />}
        action={
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Survey Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{survey.name}</CardTitle>
                  {survey.description && (
                    <CardDescription>{survey.description}</CardDescription>
                  )}
                  {survey.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Due: {new Date(survey.deadline).toLocaleDateString("en-NZ", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Privacy Notice */}
              {survey.anonymizationLevel && survey.anonymizationLevel !== "public" && (
                <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">
                          {survey.anonymizationLevel === "full" && "This survey is fully anonymous"}
                          {survey.anonymizationLevel === "department" && "This survey is anonymous by department"}
                          {survey.anonymizationLevel === "location" && "This survey is anonymous by location"}
                        </h4>
                        <Badge className="bg-slate-700 text-white text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Protected
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {survey.anonymizationLevel === "full" && 
                          "Your identity is completely protected. Management will not be able to see who submitted which response."
                        }
                        {survey.anonymizationLevel === "department" && 
                          "Your name is protected, but your department may be visible in aggregated reports (only when 3+ responses per department)."
                        }
                        {survey.anonymizationLevel === "location" && 
                          "Your name is protected, but your location may be visible in aggregated reports (only when 3+ responses per location)."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {survey.anonymizationLevel === "public" && (
                <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-900">This is a public survey</h4>
                      <p className="text-sm text-emerald-700 mt-1">
                        Your response will be visible to management with your name attached.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Survey Form */}
          <Card>
            <CardContent className="p-6">
              <FormRenderer
                schema={survey.Form.schema}
                onSubmit={handleSubmit}
                submitLabel="Submit Survey"
                submitting={submitting}
              />
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </>
  );
}
