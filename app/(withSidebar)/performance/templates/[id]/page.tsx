"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  FileText,
  Edit,
  Copy,
  Trash2,
  Users,
  MapPin,
  Briefcase,
  ArrowLeft,
  CheckCircle,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { TEMPLATE_TYPE_INFO, REVIEWER_ROLE_INFO } from "@/types/performance-templates";

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const canManageTemplates =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";

  useEffect(() => {
    params.then((resolvedParams) => {
      setTemplateId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/performance/templates/${templateId}`);
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    if (!templateId) return;

    try {
      const response = await fetch(`/api/performance/templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Template deleted");
        router.push("/performance/templates");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete template");
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleClone = async () => {
    try {
      const response = await fetch("/api/performance/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...template,
          name: `${template.name} (Copy)`,
          isDefault: false,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          Creator: undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Template cloned");
        router.push(`/performance/templates/${data.template.id}/edit`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to clone template");
      }
    } catch (error) {
      console.error("Failed to clone template:", error);
      toast.error("Failed to clone template");
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Template Details"
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

  const typeInfo = TEMPLATE_TYPE_INFO[template.type as keyof typeof TEMPLATE_TYPE_INFO];

  return (
    <PageShell
      title={template.name}
      description={typeInfo?.label || template.type}
      icon={<FileText className="h-6 w-6" />}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push("/performance/templates")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>

          {canManageTemplates && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClone}>
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/performance/templates/${templateId}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Template Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description || "No description"}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {template.isDefault && <Badge variant="secondary">Default</Badge>}
                <Badge variant={template.isActive ? "default" : "outline"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-1">Template Type</p>
                <p className="text-sm text-muted-foreground">{typeInfo?.label || template.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Version</p>
                <p className="text-sm text-muted-foreground">v{template.version || 1}</p>
              </div>
              {template.Creator && (
                <div>
                  <p className="text-sm font-medium mb-1">Created By</p>
                  <p className="text-sm text-muted-foreground">
                    {template.Creator.firstName} {template.Creator.lastName}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Visibility</p>
                <p className="text-sm text-muted-foreground">{template.visibility || "Company"}</p>
              </div>
            </div>

            {template.tags && template.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audience Filters */}
        {template.audienceFilters &&
          (template.audienceFilters.locations?.length > 0 ||
            template.audienceFilters.departments?.length > 0 ||
            template.audienceFilters.jobRoles?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>This template applies to specific groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.audienceFilters.departments?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Departments</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.audienceFilters.departments.length} department(s) selected
                    </p>
                  </div>
                )}
                {template.audienceFilters.locations?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Locations</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.audienceFilters.locations.length} location(s) selected
                    </p>
                  </div>
                )}
                {template.audienceFilters.jobRoles?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Job Roles</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.audienceFilters.jobRoles.length} role(s) selected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Reviewer Assignments */}
        {template.reviewerAssignments && template.reviewerAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reviewer Configuration</CardTitle>
              <CardDescription>Who provides feedback and when</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {template.reviewerAssignments.map((assignment: any, index: number) => {
                  const roleInfo = REVIEWER_ROLE_INFO[assignment.role as keyof typeof REVIEWER_ROLE_INFO];
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{roleInfo?.label || assignment.role}</p>
                        <p className="text-xs text-muted-foreground">{roleInfo?.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Day {assignment.dueOffsetDays || 0}</p>
                        {assignment.isRequired && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sections and Questions */}
        {template.sections && template.sections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Template Structure</CardTitle>
              <CardDescription>
                {template.sections.length} section(s) with{" "}
                {template.sections.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0)}{" "}
                question(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.sections.map((section: any) => (
                <Card key={section.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{section.title}</CardTitle>
                        {section.description && (
                          <CardDescription>{section.description}</CardDescription>
                        )}
                      </div>
                      {section.isRequired && <Badge variant="destructive">Required</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {section.questions?.map((question: any, qIndex: number) => (
                        <div key={question.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                          {question.isRequired ? (
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{question.question}</p>
                            {question.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {question.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {question.type}
                              </Badge>
                              {question.isRequired && (
                                <span className="text-xs text-muted-foreground">Required</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
