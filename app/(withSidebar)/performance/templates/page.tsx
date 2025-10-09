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
  Plus,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Users,
  MapPin,
  Briefcase,
  MessageSquare,
  UserCheck,
  Calendar,
  Award,
  Target,
  GitBranch,
  RefreshCw,
  Layers,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { TEMPLATE_TYPE_INFO } from "@/types/performance-templates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ICON_MAP: Record<string, any> = {
  MessageSquare,
  UserCheck,
  Calendar,
  Award,
  Target,
  GitBranch,
  RefreshCw,
  Layers,
  Settings,
};

interface Template {
  id: string;
  name: string;
  description?: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  tags: string[];
  audienceFilters?: {
    locations?: string[];
    departments?: string[];
    jobRoles?: string[];
  };
  reviewerAssignments?: any[];
  Creator?: {
    firstName: string;
    lastName: string;
  };
  sections?: any[];
  createdAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  const canManageTemplates =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/performance/templates?includeSections=false");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await fetch(`/api/performance/templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Template deleted");
        loadTemplates();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete template");
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleClone = async (template: Template) => {
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

  const filteredTemplates = templates.filter((t) => {
    if (filterType === "all") return true;
    return t.type === filterType;
  });

  const templateTypes = Array.from(new Set(templates.map((t) => t.type)));

  if (loading) {
    return (
      <PageShell
        title="Performance Templates"
        description="Manage performance review templates"
        icon={<FileText className="h-6 w-6" />}
      >
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" showText text="Loading templates..." />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Performance Templates"
      description="Manage performance review templates"
      icon={<FileText className="h-6 w-6" />}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              All ({templates.length})
            </Button>
            {templateTypes.map((type) => {
              const count = templates.filter((t) => t.type === type).length;
              return (
                <Button
                  key={type}
                  variant={filterType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {TEMPLATE_TYPE_INFO[type as keyof typeof TEMPLATE_TYPE_INFO]?.label || type} ({count})
                </Button>
              );
            })}
          </div>

          {canManageTemplates && (
            <Button onClick={() => router.push("/performance/templates/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          )}
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filterType === "all"
                  ? "Create your first template to get started"
                  : "No templates of this type yet"}
              </p>
              {canManageTemplates && (
                <Button onClick={() => router.push("/performance/templates/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => {
              const typeInfo = TEMPLATE_TYPE_INFO[template.type as keyof typeof TEMPLATE_TYPE_INFO];
              const Icon = typeInfo ? ICON_MAP[typeInfo.icon] : FileText;

              const audienceCount =
                (template.audienceFilters?.locations?.length || 0) +
                (template.audienceFilters?.departments?.length || 0) +
                (template.audienceFilters?.jobRoles?.length || 0);

              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {template.name}
                          </CardTitle>
                          {typeInfo && (
                            <p className="text-xs text-muted-foreground">
                              {typeInfo.label}
                            </p>
                          )}
                        </div>
                      </div>

                      {canManageTemplates && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/performance/templates/${template.id}`)
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/performance/templates/${template.id}/edit`)
                              }
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleClone(template)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Clone
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(template.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                      {!template.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      {template.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="pt-3 border-t space-y-2">
                      {audienceCount > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>
                            {audienceCount} audience filter
                            {audienceCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {template.reviewerAssignments &&
                        template.reviewerAssignments.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <UserCheck className="h-3 w-3" />
                            <span>
                              {template.reviewerAssignments.length} reviewer type
                              {template.reviewerAssignments.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      {template.Creator && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            By {template.Creator.firstName} {template.Creator.lastName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          router.push(`/performance/templates/${template.id}`)
                        }
                      >
                        View Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
