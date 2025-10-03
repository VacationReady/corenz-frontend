"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Plus, FileText, Settings, Trash2, MoreVertical, Eye, Filter, Info } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface Survey {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadSurveys = async () => {
      try {
        // Fetch only SURVEY type forms
        const res = await fetch("/api/forms?type=SURVEY");
        if (res.ok) {
          const data = await res.json();
          setSurveys(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        toast.error("Failed to load surveys");
      } finally {
        setLoading(false);
      }
    };

    loadSurveys();
  }, []);

  const filteredSurveys = surveys.filter(
    (s) =>
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(query.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) return;

    try {
      const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Survey deleted");
        setSurveys((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error("Failed to delete survey");
      }
    } catch {
      toast.error("Failed to delete survey");
    }
  };

  return (
    <PageShell
      title="Surveys"
      description="Create and manage one-time surveys for distribution through action items"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={breadcrumbConfigs.forms}
      action={
        <Button asChild variant="primary">
          <Link href="/settings/surveys/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Survey
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium">
                About Surveys
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Surveys are one-time forms distributed through action items. They're perfect for gathering
                feedback, conducting polls, or collecting data from specific groups of employees.
              </p>
            </div>
          </Card>
        </Card>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Input
              type="search"
              placeholder="Search surveys..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredSurveys.length} {filteredSurveys.length === 1 ? "survey" : "surveys"}
          </Badge>
        </div>

        {/* Surveys List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading surveys...
          </div>
        ) : filteredSurveys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {query ? "No surveys found" : "No surveys yet"}
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md">
                {query
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first survey to gather feedback from employees"}
              </p>
              {!query && (
                <Button asChild variant="primary">
                  <Link href="/settings/surveys/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Survey
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSurveys.map((survey) => (
              <Card key={survey.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{survey.name}</CardTitle>
                      {survey.description && (
                        <CardDescription className="text-xs mt-1 line-clamp-2">
                          {survey.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/settings/surveys/${survey.id}/edit`}>
                            <Settings className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/settings/surveys/${survey.id}/preview`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(survey.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant={survey.isActive ? "default" : "outline"}>
                      {survey.isActive ? "Active" : "Draft"}
                    </Badge>
                    <span className="text-gray-500">
                      {new Date(survey.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Link href={`/settings/surveys/${survey.id}/edit`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Survey
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

