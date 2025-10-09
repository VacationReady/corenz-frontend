"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FileText, ArrowLeft, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TemplateBuilderStep } from "@/components/performance/wizard/TemplateBuilderStep";
import { AudienceFilterStep } from "@/components/performance/wizard/AudienceFilterStep";
import { ReviewerAssignmentStep } from "@/components/performance/wizard/ReviewerAssignmentStep";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TemplateEditPageProps {
  params: { id: string };
}

export default function TemplateEditPage({ params }: TemplateEditPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<any>(null);

  const canManageTemplates =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";

  useEffect(() => {
    if (session && !canManageTemplates) {
      toast.error("You don't have permission to edit templates");
      router.push("/performance/templates");
      return;
    }
    loadTemplate();
  }, [params.id, session, canManageTemplates]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/performance/templates/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
      } else {
        toast.error("Template not found");
        router.push("/performance/templates");
      }
    } catch (error) {
      console.error("Failed to load template:", error);
      toast.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template.name?.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (!template.sections || template.sections.length === 0) {
      toast.error("Please add at least one section");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/performance/templates/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        toast.success("Template updated successfully!");
        router.push(`/performance/templates/${params.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update template");
      }
    } catch (error) {
      console.error("Failed to update template:", error);
      toast.error("Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Edit Template"
        description="Loading template..."
        icon={<FileText className="h-6 w-6" />}
      >
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" showText text="Loading template..." />
        </div>
      </PageShell>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <PageShell
      title={`Edit: ${template.name}`}
      description="Modify template settings and structure"
      icon={<FileText className="h-6 w-6" />}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/performance/templates/${params.id}`)}
            disabled={saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Tabbed Editor */}
        <Tabs defaultValue="builder" className="space-y-4">
          <TabsList>
            <TabsTrigger value="builder">Template Builder</TabsTrigger>
            <TabsTrigger value="audience">Target Audience</TabsTrigger>
            <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            <TemplateBuilderStep
              templateType={template.type}
              name={template.name}
              description={template.description || ""}
              sections={template.sections || []}
              onChange={(updates) => {
                setTemplate((prev: any) => ({ ...prev, ...updates }));
              }}
            />
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <AudienceFilterStep
              filters={template.audienceFilters || {}}
              onChange={(filters) => {
                setTemplate((prev: any) => ({ ...prev, audienceFilters: filters }));
              }}
            />
          </TabsContent>

          <TabsContent value="reviewers" className="space-y-4">
            <ReviewerAssignmentStep
              templateType={template.type}
              assignments={template.reviewerAssignments || []}
              onChange={(assignments) => {
                setTemplate((prev: any) => ({ ...prev, reviewerAssignments: assignments }));
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Save Button (Bottom) */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Don't forget to save your changes before leaving
              </p>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
