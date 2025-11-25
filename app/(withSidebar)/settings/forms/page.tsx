"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { 
  Plus, 
  Users, 
  Calendar, 
  Settings, 
  Trash2, 
  Copy, 
  Eye, 
  Download, 
  Upload, 
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
  MoreVertical,
  BarChart3,
  Search,
  X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Form {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  isActive: boolean;
  visibleToRoles?: string[];
  visibleToDepartments?: string[];
  visibleToJobRoles?: string[];
  createdAt: string;
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "draft">("all");
  const [audience, setAudience] = useState<"all" | "hasRoles" | "noRoles">("all");
  const [recentOnly, setRecentOnly] = useState(false);
  const [previewForm, setPreviewForm] = useState<Form | null>(null);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [jobRoles, setJobRoles] = useState<Record<string, string>>({});
  const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [formsRes, deptRes, rolesRes] = await Promise.all([
          fetch("/api/forms?type=FORM,TABLE,DATA_SCREEN"),
          fetch("/api/departments"),
          fetch("/api/job-roles"),
        ]);

        if (formsRes.ok) {
          const data = await formsRes.json();
          setForms(Array.isArray(data) ? data : []);
        }

        if (deptRes.ok) {
          const deptData = await deptRes.json();
          const deptMap: Record<string, string> = {};
          if (Array.isArray(deptData)) {
            deptData.forEach((dept: any) => {
              deptMap[dept.id] = dept.name;
            });
          }
          setDepartments(deptMap);
        }

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          const rolesMap: Record<string, string> = {};
          if (Array.isArray(rolesData)) {
            rolesData.forEach((role: any) => {
              rolesMap[role.id] = role.name;
            });
          }
          setJobRoles(rolesMap);
        }
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredForms = useMemo(() => {
    return forms
      .filter(
        (f) =>
          !query ||
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          (f.description || "").toLowerCase().includes(query.toLowerCase()),
      )
      .filter((f) => {
        const name = (f.name || "").toLowerCase();
        const slug = (f.slug || "").toLowerCase();
        if (name.includes("bank details") || slug.includes("bank-details")) return false;
        if (name.includes("contact information") || slug.includes("contact-info")) return false;
        return true;
      })
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
    return new Date(dateString).toLocaleDateString("en-NZ", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getRoleLabels = (roles?: string[]) => {
    if (!roles || roles.length === 0) return "All roles";
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 25 }
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Screen Designer"
        description="Build and manage custom forms and data screens"
        breadcrumbs={breadcrumbConfigs.settingsSection('Screen Designer')}
        showHomeIcon={false}
      >
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Screen Designer"
      description="Build and manage custom forms and data screens"
      breadcrumbs={breadcrumbConfigs.settingsSection('Screen Designer')}
      showHomeIcon={false}
    >
      {/* Enhanced Toolbar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-premium rounded-2xl p-4 mb-6 shadow-premium"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-11 h-11 glass-subtle border-white/20 focus:border-primary/50 rounded-xl"
                placeholder="Search forms..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            
            <select
              className="h-11 px-4 rounded-xl glass-subtle border border-white/20 text-sm font-medium focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            
            <select
              className="h-11 px-4 rounded-xl glass-subtle border border-white/20 text-sm font-medium focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
              value={audience}
              onChange={(e) => setAudience(e.target.value as any)}
            >
              <option value="all">All Audiences</option>
              <option value="hasRoles">Has Restrictions</option>
              <option value="noRoles">No Restrictions</option>
            </select>
            
            <label className="flex items-center gap-2 h-11 px-4 rounded-xl glass-subtle border border-white/20 text-sm font-medium cursor-pointer hover:bg-white/50 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50"
                checked={recentOnly}
                onChange={(e) => setRecentOnly(e.target.checked)}
              />
              Last 30 days
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground font-medium">
              {filteredForms.length} form{filteredForms.length !== 1 ? "s" : ""}
            </div>
            <Button asChild className="bg-gradient-to-r from-primary to-[hsl(var(--sunset-2))] hover:from-primary/90 hover:to-[hsl(var(--sunset-2))]/90 shadow-lg h-11 px-6 rounded-xl">
              <Link href="/settings/forms/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Form</span>
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {forms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-premium rounded-3xl text-center p-12 shadow-premium"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
            <Layers className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-3">No forms yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first custom form to collect data from employees, build surveys, or design data entry screens.
          </p>
          <Button asChild className="bg-gradient-to-r from-primary to-[hsl(var(--sunset-2))] hover:from-primary/90 hover:to-[hsl(var(--sunset-2))]/90 shadow-lg h-12 px-8 rounded-xl">
            <Link href="/settings/forms/new" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Create Your First Form
            </Link>
          </Button>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          <AnimatePresence>
            {filteredForms.map((f, index) => (
              <motion.div
                key={f.id}
                variants={cardVariants}
                layout
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="glass-premium rounded-2xl overflow-hidden shadow-premium hover:shadow-depth-4 transition-all duration-300 group h-full flex flex-col">
                  {/* Card Header */}
                  <div className="p-5 pb-4 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg",
                          f.isActive 
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20" 
                            : "bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-400/20"
                        )}>
                          <Layers className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-1">{f.name}</h3>
                          <span className="text-xs text-muted-foreground font-mono">{f.slug}</span>
                        </div>
                      </div>
                      <Badge 
                        variant={f.isActive ? "default" : "secondary"}
                        className={cn(
                          "text-xs font-medium",
                          f.isActive && "bg-emerald-100 text-emerald-700 border-emerald-200"
                        )}
                      >
                        {f.isActive ? "Active" : "Draft"}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                      {f.description || "No description provided"}
                    </p>

                    {/* Meta Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span className="truncate">{getRoleLabels(f.visibleToRoles)}</span>
                      </div>
                      {f.visibleToDepartments && f.visibleToDepartments.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Settings className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {f.visibleToDepartments.length} department{f.visibleToDepartments.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Created {formatDate(f.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="border-t border-white/20 p-4 bg-white/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-9 px-4 rounded-lg glass-subtle border-white/20 hover:border-primary/30 hover:bg-primary/5"
                        >
                          <Link href={`/settings/forms/${f.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                        <Button 
                          asChild 
                          size="sm" 
                          variant="ghost"
                          className="h-9 px-3 rounded-lg hover:bg-white/50"
                        >
                          <Link href={`/settings/forms/${f.id}/analytics`}>
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                      
                      {/* More Actions Dropdown */}
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 rounded-lg hover:bg-white/50"
                          onClick={() => setActiveCardMenu(activeCardMenu === f.id ? null : f.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        
                        <AnimatePresence>
                          {activeCardMenu === f.id && (
                            <>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveCardMenu(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                className="absolute right-0 bottom-full mb-2 w-48 glass-premium rounded-xl shadow-depth-3 py-2 z-50"
                              >
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-white/50 transition-colors"
                                  onClick={() => {
                                    setPreviewForm(f);
                                    setActiveCardMenu(null);
                                  }}
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                  Preview Schema
                                </button>
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-white/50 transition-colors"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/forms/${f.id}/clone`, { method: "POST" });
                                      if (!res.ok) throw new Error("Failed to duplicate");
                                      const cloned = await res.json();
                                      setForms([cloned, ...forms]);
                                      toast.success("Form duplicated");
                                    } catch (e) {
                                      toast.error("Failed to duplicate");
                                    }
                                    setActiveCardMenu(null);
                                  }}
                                >
                                  <Copy className="h-4 w-4 text-muted-foreground" />
                                  Duplicate
                                </button>
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-white/50 transition-colors"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/forms/${f.id}/export`);
                                      if (!res.ok) throw new Error("Failed to export");
                                      const data = await res.json();
                                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
                                    setActiveCardMenu(null);
                                  }}
                                >
                                  <Download className="h-4 w-4 text-muted-foreground" />
                                  Export JSON
                                </button>
                                <div className="border-t border-white/20 my-2" />
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                                  onClick={() => {
                                    handleDeleteForm(f.id, f.name);
                                    setActiveCardMenu(null);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Form
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Import JSON Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <Button
          variant="outline"
          className="glass-subtle border-white/20 hover:border-primary/30 hover:bg-primary/5 rounded-xl h-11"
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
                toast.success("Form imported successfully");
              } catch (e) {
                toast.error("Failed to import form");
              }
            };
            input.click();
          }}
        >
          <Upload className="h-4 w-4 mr-2" /> Import Form from JSON
        </Button>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewForm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-premium rounded-3xl shadow-depth-5 max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {previewForm.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">Schema Preview</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setPreviewForm(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-xl overflow-auto">
                  {JSON.stringify(
                    (forms.find((x) => x.id === previewForm.id) as any)?.schema ?? {},
                    null,
                    2,
                  )}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
