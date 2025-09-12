// app/settings/onboarding/page.tsx
"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Plus, Edit, Copy, Trash2, UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import OnboardingTemplateEditor from "@/components/onboarding/OnboardingTemplateEditor";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";

type Template = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  departments: { id: string; name: string }[];
  jobRoles: { id: string; name: string }[];
  steps: any[];
  updatedAt?: string;
  updatedBy?: { id: string; name?: string; email?: string } | null;
};

export default function OnboardingSettingsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await fetch("/api/onboarding/templates");
    if (!res.ok) {
      toast("Failed to fetch templates");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDuplicate = async (template: Template) => {
    const res = await fetch("/api/onboarding/templates/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id }),
    });
    if (res.ok) {
      toast("Template duplicated");
      fetchTemplates();
    } else {
      toast("Failed to duplicate template");
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm("Delete this onboarding template?")) return;
    const res = await fetch("/api/onboarding/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id }),
    });
    if (res.ok) {
      toast("Template deleted");
      fetchTemplates();
    } else {
      toast("Failed to delete template");
    }
  };

  const handleToggleStatus = async (template: Template) => {
    const res = await fetch("/api/onboarding/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: template.id,
        name: template.name,
        description: template.description,
        departments: template.departments.map((d) => d.id),
        jobRoles: template.jobRoles.map((j) => j.id),
        isActive: !template.isActive, // ✅ Toggle status
      }),
    });

    if (res.ok) {
      toast(template.isActive ? "Template unpublished" : "Template published");
      fetchTemplates();
    } else {
      toast("Failed to update template status");
    }
  };

  return (
<<<<<<< HEAD
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Onboarding Templates</h1>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setIsEditorOpen(true);
          }}
        >
=======
    <PageShell
      title="Onboarding Templates"
      breadcrumbs={breadcrumbConfigs.settingsSection('Onboarding')}
      action={
        <Button onClick={() => { setEditingTemplate(null); setIsEditorOpen(true); }}>
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec
          <Plus className="w-5 h-5 mr-1" /> New Template
        </Button>
      }
      showHomeIcon={false}
    >
      <div className="max-w-5xl mx-auto">
      {loading ? (
        <div>Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card className="text-center p-8">
          No onboarding templates yet. Click <b>New Template</b> to get started.
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-semibold">{t.name}</TableCell>
                <TableCell>
                  {t.departments?.length
                    ? t.departments.map((d) => d.name).join(", ")
                    : t.jobRoles?.length
                      ? t.jobRoles.map((j) => j.name).join(", ")
                      : "All"}
                </TableCell>
                <TableCell>{t.steps?.length || 0}</TableCell>
                <TableCell>
                  <span
                    className={
                      t.isActive
                        ? "text-green-600 font-medium"
                        : "text-gray-400"
                    }
                  >
                    {t.isActive ? "Active" : "Draft"}
                  </span>
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleStatus(t)}
                  >
                    {t.isActive ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => handleEdit(t)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => handleDuplicate(t)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => handleDelete(t)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl p-0">
          <OnboardingTemplateEditor
            template={editingTemplate}
            onSaved={() => {
              setIsEditorOpen(false);
              fetchTemplates();
            }}
            onCancel={() => setIsEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
      </div>
    </PageShell>
  );
}
