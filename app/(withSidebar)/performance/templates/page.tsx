"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  FileText,
  Plus,
  Edit,
  Copy,
  Trash2,
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
  Search,
  Sparkles,
  X,
  MoreVertical,
  Eye,
  ChevronRight,
  Zap,
  LayoutTemplate,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { TEMPLATE_TYPE_INFO } from "@/types/performance-templates";
import { cn } from "@/lib/utils";

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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
};

export default function TemplatesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);

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

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesType = filterType === "all" || t.type === filterType;
      const matchesSearch = !searchQuery || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [templates, filterType, searchQuery]);

  const templateTypes = useMemo(() => {
    return Array.from(new Set(templates.map((t) => t.type)));
  }, [templates]);

  const templatesByType = useMemo(() => {
    const grouped: Record<string, number> = { all: templates.length };
    templates.forEach(t => {
      grouped[t.type] = (grouped[t.type] || 0) + 1;
    });
    return grouped;
  }, [templates]);

  if (loading) {
    return (
      <PageShell
        title="Performance Templates"
        description="Manage performance review templates"
        icon={<LayoutTemplate className="h-6 w-6" />}
      >
        <div className="flex flex-col items-center justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mb-6"
          />
          <p className="text-muted-foreground font-medium">Loading templates...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Performance Templates"
      description="Create and manage templates for reviews, check-ins, and feedback"
      icon={<LayoutTemplate className="h-6 w-6" />}
    >
      <div className="space-y-6">
        {/* Spotlight Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 border border-violet-200/60"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-violet-500 via-purple-500 to-fuchsia-500" />
          <div className="flex flex-col gap-4 p-4 pl-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                  <Sparkles className="h-3 w-3" /> Template Library
                </div>
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Design powerful performance experiences
              </h2>
              <p className="text-xs text-slate-600 max-w-lg">
                Build templates for 1-2-1s, annual reviews, 360° feedback, and more. Add sections, questions, and configure who provides feedback.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {templateTypes.slice(0, 4).map((type) => {
                  const typeInfo = TEMPLATE_TYPE_INFO[type as keyof typeof TEMPLATE_TYPE_INFO];
                  return (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-slate-200 px-2.5 py-1 text-xs text-slate-700 shadow-sm"
                    >
                      <span className="font-medium">{typeInfo?.label || type}</span>
                    </span>
                  );
                })}
                {templateTypes.length > 4 && (
                  <span className="text-xs text-slate-500">+{templateTypes.length - 4} more</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 md:flex-col md:items-end lg:flex-row">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Templates</p>
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-2xl font-bold text-slate-900">{templates.length}</span>
                  <span className="text-xs text-slate-500">available</span>
                </div>
              </div>
              {canManageTemplates && (
                <Button 
                  onClick={() => router.push("/performance/templates/new")}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg text-xs h-9"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create Template
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-premium rounded-2xl p-4 shadow-lg"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search and Type Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-11 h-11 glass-subtle border-white/20 focus:border-primary/50 rounded-xl"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
                className={cn(
                  "h-9 rounded-xl text-xs",
                  filterType === "all" && "bg-primary shadow-md"
                )}
              >
                All ({templatesByType.all})
              </Button>
              {templateTypes.map((type) => {
                const typeInfo = TEMPLATE_TYPE_INFO[type as keyof typeof TEMPLATE_TYPE_INFO];
                const count = templatesByType[type] || 0;
                return (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "h-9 rounded-xl text-xs",
                      filterType === type && "bg-primary shadow-md"
                    )}
                  >
                    {typeInfo?.label || type} ({count})
                  </Button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Templates Grid */}
        <AnimatePresence mode="wait">
          {filteredTemplates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-premium rounded-3xl text-center p-12 shadow-lg"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
                <LayoutTemplate className="h-12 w-12 text-violet-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">
                {searchQuery || filterType !== "all" ? "No templates found" : "No templates yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchQuery || filterType !== "all"
                  ? "Try adjusting your filters or search query"
                  : "Create your first performance template to get started with reviews and check-ins."}
              </p>
              {canManageTemplates && !searchQuery && filterType === "all" && (
                <Button 
                  onClick={() => router.push("/performance/templates/new")}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg h-12 px-8 rounded-xl"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create Your First Template
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {filteredTemplates.map((template) => {
                const typeInfo = TEMPLATE_TYPE_INFO[template.type as keyof typeof TEMPLATE_TYPE_INFO];
                const Icon = typeInfo ? ICON_MAP[typeInfo.icon] : FileText;

                const audienceCount =
                  (template.audienceFilters?.locations?.length || 0) +
                  (template.audienceFilters?.departments?.length || 0) +
                  (template.audienceFilters?.jobRoles?.length || 0);

                return (
                  <motion.div
                    key={template.id}
                    variants={cardVariants}
                    layout
                  >
                    <Card className="glass-premium rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group h-full flex flex-col border-white/20">
                      {/* Card Header */}
                      <div className="p-5 pb-4 flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center shadow-lg",
                              template.isActive 
                                ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/20" 
                                : "bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-slate-400/20"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 line-clamp-1">{template.name}</h3>
                              {typeInfo && (
                                <p className="text-xs text-muted-foreground">{typeInfo.label}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {template.isDefault && (
                              <Badge 
                                variant="secondary" 
                                className="text-[10px] bg-amber-100 text-amber-700 border-amber-200"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                            <Badge 
                              variant={template.isActive ? "default" : "outline"}
                              className={cn(
                                "text-[10px]",
                                template.isActive && "bg-emerald-100 text-emerald-700 border-emerald-200"
                              )}
                            >
                              {template.isActive ? "Active" : "Draft"}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                          {template.description || "No description provided"}
                        </p>

                        {/* Tags */}
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {template.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5">
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          {audienceCount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5 text-violet-500" />
                              <span>
                                {audienceCount} audience filter{audienceCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                          {template.reviewerAssignments && template.reviewerAssignments.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <UserCheck className="h-3.5 w-3.5 text-sky-500" />
                              <span>
                                {template.reviewerAssignments.length} reviewer type{template.reviewerAssignments.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                          {template.Creator && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="text-slate-500">
                                By {template.Creator.firstName} {template.Creator.lastName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9 rounded-lg hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
                            onClick={() => router.push(`/performance/templates/${template.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            View
                          </Button>
                          
                          {canManageTemplates && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-lg hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700"
                                onClick={() => router.push(`/performance/templates/${template.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {/* More Actions Dropdown */}
                              <div className="relative">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 w-9 p-0 rounded-lg hover:bg-slate-100"
                                  onClick={() => setActiveCardMenu(activeCardMenu === template.id ? null : template.id)}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                                
                                <AnimatePresence>
                                  {activeCardMenu === template.id && (
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
                                        className="absolute right-0 bottom-full mb-2 w-48 glass-premium rounded-xl shadow-xl py-2 z-50 border border-white/20"
                                      >
                                        <button
                                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50 transition-colors"
                                          onClick={() => {
                                            router.push(`/performance/templates/${template.id}`);
                                            setActiveCardMenu(null);
                                          }}
                                        >
                                          <Eye className="h-4 w-4 text-violet-500" />
                                          View Details
                                        </button>
                                        <button
                                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 transition-colors"
                                          onClick={() => {
                                            router.push(`/performance/templates/${template.id}/edit`);
                                            setActiveCardMenu(null);
                                          }}
                                        >
                                          <Edit className="h-4 w-4 text-sky-500" />
                                          Edit Template
                                        </button>
                                        <button
                                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 transition-colors"
                                          onClick={() => {
                                            handleClone(template);
                                            setActiveCardMenu(null);
                                          }}
                                        >
                                          <Copy className="h-4 w-4 text-emerald-500" />
                                          Clone Template
                                        </button>
                                        <div className="border-t border-slate-100 my-2" />
                                        <button
                                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                                          onClick={() => {
                                            handleDelete(template.id);
                                            setActiveCardMenu(null);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete Template
                                        </button>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats */}
        {templates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-700 font-medium">Total</p>
                    <p className="text-2xl font-bold text-violet-900">{templates.length}</p>
                  </div>
                  <LayoutTemplate className="h-8 w-8 text-violet-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">Active</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {templates.filter(t => t.isActive).length}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 font-medium">Default</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {templates.filter(t => t.isDefault).length}
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-sky-700 font-medium">Types</p>
                    <p className="text-2xl font-bold text-sky-900">{templateTypes.length}</p>
                  </div>
                  <Layers className="h-8 w-8 text-sky-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
