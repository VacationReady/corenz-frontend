// app/settings/onboarding/page.tsx
'use client';

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Plus, Edit, Copy, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import OnboardingTemplateEditor from "@/components/onboarding/OnboardingTemplateEditor";

export default function OnboardingSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await fetch('/api/onboarding/templates');
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDuplicate = async (template: any) => {
    const res = await fetch('/api/onboarding/templates/duplicate', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id })
    });
    if (res.ok) fetchTemplates();
  };

  const handleDelete = async (template: any) => {
    if (!confirm("Delete this onboarding template?")) return;
    const res = await fetch(`/api/onboarding/templates/${template.id}`, { method: "DELETE" });
    if (res.ok) fetchTemplates();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Onboarding Templates</h1>
        <Button onClick={() => { setEditingTemplate(null); setIsEditorOpen(true); }}>
          <Plus className="w-5 h-5 mr-1" /> New Template
        </Button>
      </div>

      {loading ? (
        <div>Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card className="text-center p-8">No onboarding templates yet. Click <b>New Template</b> to get started.</Card>
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
                    ? t.departments.map((d: any) => d.name).join(", ")
                    : t.jobRoles?.length
                    ? t.jobRoles.map((j: any) => j.name).join(", ")
                    : "All"}
                </TableCell>
                <TableCell>{t.steps?.length || 0}</TableCell>
                <TableCell>
                  <span className={t.status === "ACTIVE" ? "text-green-600" : "text-gray-400"}>
                    {t.status === "ACTIVE" ? "Active" : "Draft"}
                  </span>
                </TableCell>
                <TableCell>
                  <Button size="md" variant="ghost" onClick={() => handleEdit(t)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="md" variant="ghost" onClick={() => handleDuplicate(t)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="md" variant="ghost" onClick={() => handleDelete(t)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal for create/edit */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
  <DialogContent className="max-w-3xl p-0">
    <OnboardingTemplateEditor
      template={editingTemplate}
      onSaved={() => { setIsEditorOpen(false); fetchTemplates(); }}
      onCancel={() => setIsEditorOpen(false)}
    />
  </DialogContent>
</Dialog>
    </div>
  );
}
