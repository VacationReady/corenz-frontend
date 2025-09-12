"use client";

<<<<<<< HEAD
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Users,
  Calendar,
  Settings,
  Trash2,
  MoreVertical,
  Copy,
  Eye,
  Download,
  Upload,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
=======
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '@/components/ui/PageShell'
import { breadcrumbConfigs } from '@/components/ui/Breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Users, Calendar, Settings, Trash2, MoreVertical, Copy, Eye, Download, Upload, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec

interface Form {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  visibleToRoles?: string[];
  createdAt: string;
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "draft">("all");
  const [audience, setAudience] = useState<"all" | "hasRoles" | "noRoles">(
    "all",
  );
  const [recentOnly, setRecentOnly] = useState(false);
  const [previewForm, setPreviewForm] = useState<Form | null>(null);

  useEffect(() => {
    fetch("/api/forms")
      .then((res) => res.json())
      .then((data) => {
        setForms(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load forms");
        setLoading(false);
      });
  }, []);

  const filteredForms = useMemo(() => {
    return forms
      .filter(
        (f) =>
          !query ||
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          (f.description || "").toLowerCase().includes(query.toLowerCase()),
      )
      .filter((f) =>
        status === "all"
          ? true
          : status === "active"
            ? f.isActive
            : !f.isActive,
      )
      .filter((f) =>
        audience === "all"
          ? true
          : audience === "hasRoles"
            ? f.visibleToRoles && f.visibleToRoles.length > 0
            : !(f.visibleToRoles && f.visibleToRoles.length > 0),
      )
      .filter(
        (f) =>
          !recentOnly ||
          (Date.now() - new Date(f.createdAt).getTime()) /
            (1000 * 60 * 60 * 24) <=
            30,
      );
  }, [forms, query, status, audience, recentOnly]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleLabels = (roles?: string[]) => {
    if (!roles || roles.length === 0) return "No roles";
    return roles
      .map((role) => role.charAt(0) + role.slice(1).toLowerCase())
      .join(", ");
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${formName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("Form deleted successfully");
        setForms(forms.filter((f) => f.id !== formId));
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete form");
      }
    } catch (error) {
      toast.error("Failed to delete form");
      console.error("Delete error:", error);
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Forms & Surveys"
        description="Manage and create forms"
        breadcrumbs={breadcrumbConfigs.settingsSection('Forms & Surveys')}
        showHomeIcon={false}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Forms & Surveys"
      description="Manage and create forms"
      breadcrumbs={breadcrumbConfigs.settingsSection('Forms & Surveys')}
      showHomeIcon={false}
    >
      {/* Search & Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Search by name or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="border rounded px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
        <select
          className="border rounded px-3 py-2"
          value={audience}
          onChange={(e) => setAudience(e.target.value as any)}
        >
          <option value="all">Audience: All</option>
          <option value="hasRoles">Audience: Has Roles</option>
          <option value="noRoles">Audience: No Roles</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recentOnly}
            onChange={(e) => setRecentOnly(e.target.checked)}
          />
          Recent (last 30 days)
        </label>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          {forms.length} form{forms.length !== 1 ? "s" : ""} total
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/settings/forms/exit-interview">
              Exit Interview Forms
            </Link>
          </Button>
          <Button asChild>
            <Link href="/settings/forms/new">
              <Plus className="mr-2 h-4 w-4" />
              New Form
            </Link>
          </Button>
        </div>
      </div>

      {forms.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first form to get started
            </p>
            <Button asChild>
              <Link href="/settings/forms/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{f.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.isActive ? "default" : "secondary"}>
                      {f.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenu
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      }
                      align="right"
                    >
                      <DropdownMenuItem onClick={() => setPreviewForm(f)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/forms/${f.id}/clone`,
                              { method: "POST" },
                            );
                            if (!res.ok) throw new Error("Failed to duplicate");
                            const cloned = await res.json();
                            setForms([cloned, ...forms]);
                            toast.success("Form duplicated");
                          } catch (e) {
                            toast.error("Failed to duplicate");
                          }
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/forms/${f.id}/export`,
                            );
                            if (!res.ok) throw new Error("Failed to export");
                            const data = await res.json();
                            const blob = new Blob(
                              [JSON.stringify(data, null, 2)],
                              { type: "application/json" },
                            );
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${(f as any).slug || f.name}.json`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          } catch (e) {
                            toast.error("Failed to export");
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteForm(f.id, f.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Form
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {f.description || "No description provided"}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="h-3 w-3" />
                    <span>Visible to: {getRoleLabels(f.visibleToRoles)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>Created: {formatDate(f.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Link href={`/settings/forms/${f.id}/edit`}>Edit</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/settings/forms/${f.id}/analytics`}>
                      Analytics
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Import JSON */}
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const json = JSON.parse(text);
                const res = await fetch("/api/forms/import", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(json),
                });
                if (!res.ok) throw new Error("Import failed");
                const created = await res.json();
                setForms([created, ...forms]);
                toast.success("Form imported");
              } catch (e) {
                toast.error("Failed to import");
              }
            };
            input.click();
          }}
        >
          <Upload className="h-4 w-4 mr-2" /> Import JSON
        </Button>
      </div>

      {/* Preview Modal */}
      {previewForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setPreviewForm(null)}
        >
          <div
            className="bg-white rounded shadow max-w-2xl w-full p-4 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">
                {previewForm.name} – Schema Preview
              </h3>
              <Button variant="ghost" onClick={() => setPreviewForm(null)}>
                Close
              </Button>
            </div>
            <pre className="text-xs overflow-auto max-h-[60vh] bg-gray-50 p-3 rounded">
              {JSON.stringify(
                (forms.find((x) => x.id === previewForm.id) as any)?.schema ??
                  {},
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      )}
    </PageShell>
  );
}
