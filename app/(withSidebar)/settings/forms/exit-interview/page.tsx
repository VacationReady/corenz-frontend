"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    offboardings: number;
    submissions: number;
  };
}

export default function ExitInterviewFormsPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/exit-interview-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        throw new Error("Failed to fetch templates");
      }
    } catch (error) {
      toast.error("Failed to load exit interview form templates");
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (
    templateId: string,
    templateName: string,
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/exit-interview-templates/${templateId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        toast.success("Template deleted successfully");
        setTemplates(templates.filter((t) => t.id !== templateId));
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete template");
      }
    } catch (error) {
      toast.error("Failed to delete template");
      console.error("Delete error:", error);
    }
  };

  const handleToggleActive = async (
    templateId: string,
    currentStatus: boolean,
  ) => {
    try {
      const response = await fetch(
        `/api/exit-interview-templates/${templateId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !currentStatus,
          }),
        },
      );

      if (response.ok) {
        toast.success(
          `Template ${currentStatus ? "deactivated" : "activated"} successfully`,
        );
        setTemplates(
          templates.map((t) =>
            t.id === templateId ? { ...t, isActive: !currentStatus } : t,
          ),
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update template");
      }
    } catch (error) {
      toast.error("Failed to update template");
      console.error("Toggle error:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <PageShell
        title="Exit Interview Forms"
        description="Manage exit interview form templates"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Exit Interview Forms"
      description="Manage exit interview form templates"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          {templates.length} template{templates.length !== 1 ? "s" : ""} total
        </div>
        <Button asChild>
          <Link href="/settings/forms/exit-interview/new">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No exit interview form templates yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first template to get started
            </p>
            <Button asChild>
              <Link href="/settings/forms/exit-interview/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      <Badge
                        variant={template.isActive ? "default" : "secondary"}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {template.description && (
                      <p className="text-gray-600 mb-3">
                        {template.description}
                      </p>
                    )}

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>Created: {formatDate(template.createdAt)}</span>
                      <span>Updated: {formatDate(template.updatedAt)}</span>
                      <span>
                        {template._count.offboardings} offboarding
                        {template._count.offboardings !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {template._count.submissions} submission
                        {template._count.submissions !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    }
                    align="right"
                  >
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          `/settings/forms/exit-interview/${template.id}`,
                          "_blank",
                        )
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          `/settings/forms/exit-interview/${template.id}/edit`,
                          "_blank",
                        )
                      }
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleToggleActive(template.id, template.isActive)
                      }
                    >
                      {template.isActive ? (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleDeleteTemplate(template.id, template.name)
                      }
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
