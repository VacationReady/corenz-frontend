"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Plus, Edit, Copy, Trash2, ArrowRight } from "lucide-react";
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
import { Badge } from "@/components/ui/Badge";

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

export function OnboardingTemplatesTab() {
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
        isActive: !template.isActive,
        lastKnownUpdatedAt: template.updatedAt,
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
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Onboarding Templates</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage templates used in employee creation workflow
            </p>
          </div>
          <Button 
            onClick={() => { 
              setEditingTemplate(null); 
              setIsEditorOpen(true); 
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {/* Integration Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Employee Creation Integration</h3>
              <p className="text-sm text-blue-700 mt-1">
                These templates are used in the "Add Employee" workflow. When creating a new employee, 
                you select an onboarding template which automatically creates their onboarding journey.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading templates...</div>
          </div>
        ) : templates.length === 0 ? (
          <Card className="text-center p-8">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-2">No onboarding templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first template to streamline employee onboarding
              </p>
              <Button onClick={() => { setEditingTemplate(null); setIsEditorOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Template
              </Button>
            </div>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {template.departments?.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium">Depts:</span>{" "}
                            {template.departments.map(d => d.name).join(", ")}
                          </div>
                        )}
                        {template.jobRoles?.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium">Roles:</span>{" "}
                            {template.jobRoles.map(r => r.name).join(", ")}
                          </div>
                        )}
                        {(!template.departments?.length && !template.jobRoles?.length) && (
                          <span className="text-sm text-muted-foreground">All employees</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.steps?.length || 0} steps
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={template.isActive ? "default" : "secondary"}
                        className={template.isActive ? "bg-green-100 text-green-800" : ""}
                      >
                        {template.isActive ? "Active" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(template)}
                        >
                          {template.isActive ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(template)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl w-[min(95vw,1200px)] p-0">
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
  );
}
