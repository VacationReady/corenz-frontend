"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Plus,
  Search,
  Zap,
  PlayCircle,
  TestTube,
  Play,
  Pause,
  Edit,
  Trash2,
  ChevronRight,
  Clock,
  User,
  FileText,
  Sparkles,
  TrendingUp,
  MoreVertical,
  Copy,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AutomationRule {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: any;
  conditions?: any[];
  actions: any[];
  createdAt?: string;
  updatedAt?: string;
  lastRun?: string;
  runCount?: number;
}

interface AutomationRuleListProps {
  rules: AutomationRule[];
  selectedRuleId?: string;
  loading: boolean;
  onCreateNew: () => void;
  onSelectRule: (rule: AutomationRule) => void;
  onEditRule: (rule: AutomationRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleStatus: (ruleId: string, isActive: boolean) => void;
  onRunTest: (rule: AutomationRule) => void;
  onDuplicateRule?: (rule: AutomationRule) => void;
}

const getTriggerIcon = (triggerType: string) => {
  switch (triggerType) {
    case "DOCUMENT_EXPIRING":
      return <FileText className="w-4 h-4" />;
    case "FORM_SUBMITTED":
      return <FileText className="w-4 h-4" />;
    case "ONBOARDING_STEP_COMPLETED":
      return <User className="w-4 h-4" />;
    case "EMPLOYEE_CREATED":
      return <User className="w-4 h-4" />;
    default:
      return <Zap className="w-4 h-4" />;
  }
};

const getTriggerName = (triggerType: string) => {
  const triggerNames: Record<string, string> = {
    DOCUMENT_EXPIRING: "Document Expiring",
    FORM_SUBMITTED: "Form Submitted",
    ONBOARDING_STEP_COMPLETED: "Onboarding Step",
    EMPLOYEE_CREATED: "Employee Created",
    SCHEDULED: "Scheduled",
    WEBHOOK: "Webhook",
  };
  return triggerNames[triggerType] || triggerType?.replace(/_/g, " ") || "Manual";
};

const getTriggerColor = (triggerType: string) => {
  switch (triggerType) {
    case "DOCUMENT_EXPIRING":
      return "from-amber-500 to-orange-500";
    case "FORM_SUBMITTED":
      return "from-blue-500 to-indigo-500";
    case "ONBOARDING_STEP_COMPLETED":
      return "from-emerald-500 to-teal-500";
    case "EMPLOYEE_CREATED":
      return "from-violet-500 to-purple-500";
    case "SCHEDULED":
      return "from-rose-500 to-pink-500";
    default:
      return "from-slate-500 to-slate-600";
  }
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

export const AutomationRuleList: React.FC<AutomationRuleListProps> = ({
  rules,
  selectedRuleId,
  loading,
  onCreateNew,
  onSelectRule,
  onEditRule,
  onDeleteRule,
  onToggleStatus,
  onRunTest,
  onDuplicateRule,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && rule.isActive) ||
      (filterStatus === "inactive" && !rule.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = rules.filter(r => r.isActive).length;
  const inactiveCount = rules.filter(r => !r.isActive).length;
  const totalRuns = rules.reduce((sum, r) => sum + (r.runCount || 0), 0);

  if (loading) {
    return (
      <div className="h-full bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Loading skeleton */}
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200/60 rounded-2xl w-1/3" />
            <div className="h-10 bg-slate-200/60 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-slate-200/40 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50/80 via-white to-blue-50/30 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              My Workflows
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and monitor your automation workflows
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={onCreateNew}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{rules.length}</p>
                <p className="text-xs text-muted-foreground">Total Workflows</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalRuns}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white/80 backdrop-blur-sm border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "h-11 px-4 rounded-xl transition-all",
                  filterStatus === status
                    ? "bg-slate-900 text-white shadow-lg"
                    : "bg-white/80 border-slate-200/60 hover:bg-slate-50"
                )}
              >
                {status === "all" && `All (${rules.length})`}
                {status === "active" && `Active (${activeCount})`}
                {status === "inactive" && `Inactive (${inactiveCount})`}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Rules Grid */}
        <AnimatePresence mode="wait">
          {filteredRules.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/60 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center"
            >
              {searchQuery || filterStatus !== "all" ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No workflows found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Create your first workflow
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Automate repetitive HR tasks and save hours of manual work with powerful no-code workflows.
                  </p>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      size="lg" 
                      onClick={onCreateNew}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 h-12 px-8"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Workflow
                    </Button>
                  </motion.div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredRules.map((rule) => (
                <motion.div
                  key={rule.id}
                  variants={itemVariants}
                  layout
                  layoutId={rule.id}
                >
                  <WorkflowCard
                    rule={rule}
                    isSelected={selectedRuleId === rule.id}
                    onSelect={() => onSelectRule(rule)}
                    onEdit={() => onEditRule(rule)}
                    onDelete={() => onDeleteRule(rule.id!)}
                    onToggleStatus={() => onToggleStatus(rule.id!, !rule.isActive)}
                    onTest={() => onRunTest(rule)}
                    onDuplicate={onDuplicateRule ? () => onDuplicateRule(rule) : undefined}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Beautiful workflow card component
interface WorkflowCardProps {
  rule: AutomationRule;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onTest: () => void;
  onDuplicate?: () => void;
}

function WorkflowCard({
  rule,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleStatus,
  onTest,
  onDuplicate,
}: WorkflowCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "bg-white/80 backdrop-blur-sm border-slate-200/60 hover:border-slate-300",
        "hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1",
        "rounded-2xl",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 shadow-xl shadow-blue-100"
      )}
      onClick={onSelect}
    >
      {/* Gradient accent bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
        getTriggerColor(rule.triggerType)
      )} />
      
      <CardContent className="p-5 pt-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg flex-shrink-0 transition-transform group-hover:scale-110",
              getTriggerColor(rule.triggerType)
            )}>
              {getTriggerIcon(rule.triggerType)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {rule.name}
              </h3>
              {rule.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {rule.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => onEdit()}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Workflow
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onTest()}>
                <TestTube className="w-4 h-4 mr-2" />
                Test Run
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onToggleStatus()}>
                {rule.isActive ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onSelect={() => onDuplicate()}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={() => { 
                  if (confirm("Are you sure you want to delete this workflow?")) {
                    onDelete(); 
                  }
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status badge and trigger info */}
        <div className="flex items-center gap-2 mb-4">
          <Badge 
            className={cn(
              "text-xs font-medium px-2.5 py-0.5 rounded-full",
              rule.isActive 
                ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                : "bg-slate-100 text-slate-600 border-slate-200"
            )}
          >
            {rule.isActive ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            ) : "Inactive"}
          </Badge>
          <Badge variant="outline" className="text-xs bg-white/50">
            {getTriggerName(rule.triggerType)}
          </Badge>
        </div>

        {/* Workflow flow indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 bg-slate-50/80 rounded-lg px-3 py-2">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-500" />
            Trigger
          </span>
          <ChevronRight className="w-3 h-3" />
          {rule.conditions && rule.conditions.length > 0 && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-medium">
                  {rule.conditions.length}
                </span>
                Conditions
              </span>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
            {rule.actions.length} Action{rule.actions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Stats row */}
        {(rule.lastRun || rule.runCount !== undefined) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-slate-100">
            {rule.lastRun && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(rule.lastRun).toLocaleDateString()}
              </span>
            )}
            {rule.runCount !== undefined && (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {rule.runCount} runs
              </span>
            )}
          </div>
        )}
      </CardContent>

      {/* Quick actions on hover */}
      <div className="absolute bottom-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-3 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          View
        </Button>
        <Button
          size="sm"
          className="h-8 px-3 rounded-lg bg-slate-900 text-white shadow-lg"
          onClick={(e) => { e.stopPropagation(); onTest(); }}
        >
          <TestTube className="w-3.5 h-3.5 mr-1.5" />
          Test
        </Button>
      </div>
    </Card>
  );
}
