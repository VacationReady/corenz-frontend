"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  ArrowRight, 
  Rocket, 
  CheckCircle,
  Clock,
  Users,
  MoreHorizontal,
  Eye,
  Play,
  Sparkles,
  Layers,
  Search,
  Filter,
  SortAsc,
  LayoutGrid,
  List,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OnboardingBuilderEnhanced } from "@/components/onboarding/builder/OnboardingBuilderEnhanced";
import { OnboardingSimulator } from "@/components/onboarding/builder/OnboardingSimulator";

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
  const [simulatingTemplate, setSimulatingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await fetch("/api/onboarding/templates");
    if (!res.ok) {
      toast.error("Failed to fetch templates");
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
      toast.success("Template duplicated");
      fetchTemplates();
    } else {
      toast.error("Failed to duplicate template");
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
      toast.success("Template deleted");
      fetchTemplates();
    } else {
      toast.error("Failed to delete template");
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
      toast.success(template.isActive ? "Template unpublished" : "Template published");
      fetchTemplates();
    } else {
      toast.error("Failed to update template status");
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTemplates = filteredTemplates.filter((t) => t.isActive);
  const draftTemplates = filteredTemplates.filter((t) => !t.isActive);

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/20 min-h-0">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-none border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl"
      >
        <div className="px-6 py-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25"
              >
                <Rocket className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Onboarding Templates
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Create amazing first-day experiences for your new hires
                </p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={() => { 
                  setEditingTemplate(null); 
                  setIsEditorOpen(true); 
                }}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
              >
                <Plus className="w-4 h-4" />
                New Template
              </Button>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {activeTemplates.length}
                    </p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Active Templates</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {draftTemplates.length}
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Draft Templates</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {templates.reduce((acc, t) => acc + (t.steps?.length || 0), 0)}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Total Steps</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-6 pb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center max-w-md">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 mb-6"
              >
                <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {searchQuery ? "No templates found" : "No onboarding templates yet"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Create your first template to give new hires an amazing start"}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => { setEditingTemplate(null); setIsEditorOpen(true); }}
                  className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Create First Template
                </Button>
              )}
            </div>
          </motion.div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={index}
                  onEdit={() => handleEdit(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  onDelete={() => handleDelete(template)}
                  onToggleStatus={() => handleToggleStatus(template)}
                  onSimulate={() => setSimulatingTemplate(template)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template, index) => (
                <TemplateListItem
                  key={template.id}
                  template={template}
                  index={index}
                  onEdit={() => handleEdit(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  onDelete={() => handleDelete(template)}
                  onToggleStatus={() => handleToggleStatus(template)}
                  onSimulate={() => setSimulatingTemplate(template)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden">
          <OnboardingBuilderEnhanced
            template={editingTemplate}
            onSaved={() => {
              setIsEditorOpen(false);
              fetchTemplates();
            }}
            onCancel={() => setIsEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Simulator */}
      {simulatingTemplate && (
        <OnboardingSimulator
          isOpen={true}
          onClose={() => setSimulatingTemplate(null)}
          steps={simulatingTemplate.steps?.map((step: any) => ({
            key: step.id || step.key || crypto.randomUUID(),
            type: step.type?.toLowerCase().replace(/_/g, "-") || step.type,
            title: step.label || step.title || "",
            description: step.instruction || step.description || "",
            metadata: step.metadata,
          })) || []}
          templateName={simulatingTemplate.name}
        />
      )}
    </div>
  );
}

function TemplateCard({
  template,
  index,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onSimulate,
}: {
  template: Template;
  index: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onSimulate: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700">
        {/* Header Gradient */}
        <div className={cn(
          "h-2 bg-gradient-to-r",
          template.isActive 
            ? "from-emerald-500 to-teal-500" 
            : "from-amber-500 to-orange-500"
        )} />
        
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                  {template.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.description || "No description"}
              </p>
            </div>
            <Badge 
              variant={template.isActive ? "default" : "secondary"}
              className={cn(
                template.isActive 
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" 
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              )}
            >
              {template.isActive ? "Active" : "Draft"}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>{template.steps?.length || 0} steps</span>
            </div>
            {(template.departments?.length > 0 || template.jobRoles?.length > 0) && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>
                  {template.departments?.length || 0} dept, {template.jobRoles?.length || 0} roles
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSimulate}
              className="flex-1 gap-1.5 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:border-indigo-700"
              disabled={!template.steps?.length}
            >
              <Play className="w-3.5 h-3.5 text-indigo-600" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="flex-1 gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onToggleStatus}>
                  {template.isActive ? "Unpublish" : "Publish"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TemplateListItem({
  template,
  index,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onSimulate,
}: {
  template: Template;
  index: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onSimulate: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="group overflow-hidden hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700">
        <CardContent className="p-4 flex items-center gap-4">
          {/* Status indicator */}
          <div className={cn(
            "w-1 h-12 rounded-full",
            template.isActive ? "bg-emerald-500" : "bg-amber-500"
          )} />

          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Rocket className="w-5 h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {template.name}
              </h3>
              <Badge 
                variant={template.isActive ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  template.isActive 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" 
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                )}
              >
                {template.isActive ? "Active" : "Draft"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {template.steps?.length || 0} steps
              {template.description && ` • ${template.description}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSimulate}
              disabled={!template.steps?.length}
              className="gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              <Play className="w-4 h-4" />
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="gap-1.5"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onToggleStatus}>
                  {template.isActive ? "Unpublish" : "Publish"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
