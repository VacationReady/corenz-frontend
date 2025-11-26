"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  Star,
  Layers,
  UserCheck,
  Calendar,
  Shield,
  Eye,
  LayoutTemplate,
  ChevronRight,
  Building,
  Tag,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { TEMPLATE_TYPE_INFO, REVIEWER_ROLE_INFO } from "@/types/performance-templates";
import { cn } from "@/lib/utils";

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
};

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
        icon={<LayoutTemplate className="h-6 w-6" />}
      >
        <div className="flex flex-col items-center justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mb-6"
          />
          <p className="text-muted-foreground font-medium">Loading template...</p>
        </div>
      </PageShell>
    );
  }

  if (!template) {
    return null;
  }

  const typeInfo = TEMPLATE_TYPE_INFO[template.type as keyof typeof TEMPLATE_TYPE_INFO];
  const totalQuestions = template.sections?.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0) || 0;

  return (
    <PageShell
      title={template.name}
      description={typeInfo?.label || template.type}
      icon={<LayoutTemplate className="h-6 w-6" />}
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header Actions */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => router.push("/performance/templates")}
            className="rounded-xl hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>

          {canManageTemplates && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleClone}
                className="rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/performance/templates/${templateId}/edit`)}
                className="rounded-xl hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button 
                variant="danger" 
                onClick={handleDelete}
                className="rounded-xl"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </motion.div>

        {/* Template Hero Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                      <LayoutTemplate className="h-6 w-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{template.name}</h1>
                      <p className="text-white/80 text-sm">{typeInfo?.label || template.type}</p>
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-white/90 max-w-xl">{template.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.isDefault && (
                    <Badge className="bg-amber-400 text-amber-900 hover:bg-amber-400">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                  <Badge 
                    className={cn(
                      template.isActive 
                        ? "bg-emerald-400 text-emerald-900 hover:bg-emerald-400" 
                        : "bg-white/20 text-white hover:bg-white/20"
                    )}
                  >
                    {template.isActive ? "Active" : "Draft"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <CardContent className="p-0">
              <div className="grid grid-cols-4 divide-x divide-slate-100">
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{template.sections?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Sections</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{totalQuestions}</p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{template.reviewerAssignments?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Reviewers</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">v{template.version || 1}</p>
                  <p className="text-xs text-muted-foreground">Version</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Basic Info */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-500" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Template Type</span>
                    <span className="font-medium">{typeInfo?.label || template.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Visibility</span>
                    <Badge variant="outline">{template.visibility || "Company"}</Badge>
                  </div>
                  {template.Creator && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created By</span>
                      <span className="font-medium">
                        {template.Creator.firstName} {template.Creator.lastName}
                      </span>
                    </div>
                  )}
                </div>

                {template.tags && template.tags.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {template.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Audience Filters */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-500" />
                  Target Audience
                </CardTitle>
                <CardDescription>Who this template applies to</CardDescription>
              </CardHeader>
              <CardContent>
                {template.audienceFilters &&
                  (template.audienceFilters.locations?.length > 0 ||
                    template.audienceFilters.departments?.length > 0 ||
                    template.audienceFilters.jobRoles?.length > 0) ? (
                  <div className="space-y-4">
                    {template.audienceFilters.departments?.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-violet-100">
                          <Building className="h-4 w-4 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Departments</p>
                          <p className="text-xs text-muted-foreground">
                            {template.audienceFilters.departments.length} selected
                          </p>
                        </div>
                      </div>
                    )}
                    {template.audienceFilters.locations?.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Locations</p>
                          <p className="text-xs text-muted-foreground">
                            {template.audienceFilters.locations.length} selected
                          </p>
                        </div>
                      </div>
                    )}
                    {template.audienceFilters.jobRoles?.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-100">
                          <Briefcase className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Job Roles</p>
                          <p className="text-xs text-muted-foreground">
                            {template.audienceFilters.jobRoles.length} selected
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="p-3 rounded-full bg-slate-100 mb-3">
                      <Users className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Available to all employees
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Reviewers */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                  Reviewer Configuration
                </CardTitle>
                <CardDescription>Who provides feedback</CardDescription>
              </CardHeader>
              <CardContent>
                {template.reviewerAssignments && template.reviewerAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {template.reviewerAssignments.map((assignment: any, index: number) => {
                      const roleInfo = REVIEWER_ROLE_INFO[assignment.role as keyof typeof REVIEWER_ROLE_INFO];
                      return (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <UserCheck className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{roleInfo?.label || assignment.role}</p>
                              <p className="text-xs text-muted-foreground">{roleInfo?.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-slate-700">Day {assignment.dueOffsetDays || 0}</p>
                            {assignment.isRequired && (
                              <Badge variant="outline" className="text-[10px] mt-1 bg-rose-50 text-rose-700 border-rose-200">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="p-3 rounded-full bg-slate-100 mb-3">
                      <UserCheck className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No reviewers configured
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sections and Questions */}
        {template.sections && template.sections.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-500" />
                      Template Structure
                    </CardTitle>
                    <CardDescription>
                      {template.sections.length} section{template.sections.length !== 1 ? 's' : ''} with {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  {canManageTemplates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/performance/templates/${templateId}/edit`)}
                      className="rounded-xl"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Structure
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.sections.map((section: any, sectionIndex: number) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sectionIndex * 0.1 }}
                  >
                    <Card className="border-2 border-dashed border-slate-200 hover:border-violet-200 transition-colors">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm">
                              {sectionIndex + 1}
                            </div>
                            <div>
                              <CardTitle className="text-base">{section.title}</CardTitle>
                              {section.description && (
                                <CardDescription className="mt-1">{section.description}</CardDescription>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {section.isRequired && (
                              <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                                Required
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {section.questions?.length || 0} questions
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {section.questions?.map((question: any, qIndex: number) => (
                            <motion.div 
                              key={question.id} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: qIndex * 0.05 }}
                              className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-violet-200 hover:shadow-sm transition-all"
                            >
                              <div className={cn(
                                "mt-0.5 p-1.5 rounded-lg",
                                question.isRequired ? "bg-violet-100" : "bg-slate-100"
                              )}>
                                {question.isRequired ? (
                                  <CheckCircle className="h-4 w-4 text-violet-600" />
                                ) : (
                                  <Circle className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900">{question.question}</p>
                                {question.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {question.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    {question.type}
                                  </Badge>
                                  {question.isRequired && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Required
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageShell>
  );
}
