"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Sparkles, 
  LayoutTemplate,
  Layers,
  Users,
  UserCheck,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateBuilderStep } from "@/components/performance/wizard/TemplateBuilderStep";
import { AudienceFilterStep } from "@/components/performance/wizard/AudienceFilterStep";
import { ReviewerAssignmentStep } from "@/components/performance/wizard/ReviewerAssignmentStep";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";

interface TemplateEditPageProps {
  params: Promise<{ id: string }>;
}

export default function TemplateEditPage({ params }: TemplateEditPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [templateId, setTemplateId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("builder");
  const [showSuccess, setShowSuccess] = useState(false);

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
    if (!templateId) return;
    if (session && !canManageTemplates) {
      toast.error("You don't have permission to edit templates");
      router.push("/performance/templates");
      return;
    }
    loadTemplate();
  }, [templateId, session, canManageTemplates]);

  const loadTemplate = async () => {
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
      const response = await fetch(`/api/performance/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          router.push(`/performance/templates/${templateId}`);
        }, 1500);
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

  // Calculate progress indicators
  const hasName = template?.name?.trim().length > 0;
  const hasSections = template?.sections?.length > 0;
  const hasQuestions = template?.sections?.some((s: any) => s.questions?.length > 0);

  if (loading) {
    return (
      <PageShell
        title="Edit Template"
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

  return (
    <PageShell
      title={`Edit: ${template.name}`}
      description="Modify template settings and structure"
      icon={<LayoutTemplate className="h-6 w-6" />}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Actions */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="outline"
            onClick={() => router.push(`/performance/templates/${templateId}`)}
            disabled={saving}
            className="rounded-xl hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {/* Progress Indicators */}
            <div className="hidden md:flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                hasName ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}>
                {hasName ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                Name
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                hasSections ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}>
                {hasSections ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                Sections
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                hasQuestions ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}>
                {hasQuestions ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                Questions
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving || !hasName || !hasSections}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg rounded-xl"
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
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
        </motion.div>

        {/* Tabbed Editor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="pb-0 bg-gradient-to-r from-slate-50 to-slate-100/50">
                <TabsList className="grid w-full grid-cols-3 bg-white/80 p-1 rounded-xl shadow-sm">
                  <TabsTrigger 
                    value="builder" 
                    className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Template Builder
                  </TabsTrigger>
                  <TabsTrigger 
                    value="audience"
                    className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Target Audience
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviewers"
                    className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Reviewers
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <AnimatePresence mode="wait">
                <TabsContent value="builder" className="p-6 space-y-4 mt-0">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <TemplateBuilderStep
                      templateType={template.type}
                      name={template.name}
                      description={template.description || ""}
                      sections={template.sections || []}
                      onChange={(updates) => {
                        setTemplate((prev: any) => ({ ...prev, ...updates }));
                      }}
                    />
                  </motion.div>
                </TabsContent>

                <TabsContent value="audience" className="p-6 space-y-4 mt-0">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <AudienceFilterStep
                      filters={template.audienceFilters || {}}
                      onChange={(filters) => {
                        setTemplate((prev: any) => ({ ...prev, audienceFilters: filters }));
                      }}
                    />
                  </motion.div>
                </TabsContent>

                <TabsContent value="reviewers" className="p-6 space-y-4 mt-0">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <ReviewerAssignmentStep
                      templateType={template.type}
                      assignments={template.reviewerAssignments || []}
                      onChange={(assignments) => {
                        setTemplate((prev: any) => ({ ...prev, reviewerAssignments: assignments }));
                      }}
                    />
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Card>
          </Tabs>
        </motion.div>

        {/* Save Button (Bottom) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    Ready to save your changes?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Make sure you've configured all sections and questions before saving
                  </p>
                </div>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !hasName || !hasSections}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg rounded-xl"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
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
        </motion.div>
      </div>

      {/* Success Animation */}
      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName="Template"
      />
    </PageShell>
  );
}
