"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Zap,
  Filter,
  PlayCircle,
  TestTube,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  FileText,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      return <FileText className="w-3.5 h-3.5" />;
    case "FORM_SUBMITTED":
      return <FileText className="w-3.5 h-3.5" />;
    case "ONBOARDING_STEP_COMPLETED":
      return <User className="w-3.5 h-3.5" />;
    case "EMPLOYEE_CREATED":
      return <User className="w-3.5 h-3.5" />;
    default:
      return <Zap className="w-3.5 h-3.5" />;
  }
};

const getTriggerName = (triggerType: string) => {
  const triggerNames: Record<string, string> = {
    DOCUMENT_EXPIRING: "Document Expiring",
    FORM_SUBMITTED: "Form Submitted",
    ONBOARDING_STEP_COMPLETED: "Onboarding Step",
    EMPLOYEE_CREATED: "Employee Created",
  };
  return triggerNames[triggerType] || triggerType;
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

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-50 border-r">
        <div className="p-4 border-b bg-white">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-white rounded-lg border"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Automation Rules</h2>
            <p className="text-xs text-muted-foreground">
              {activeCount} active, {inactiveCount} inactive
            </p>
          </div>
          <Button size="sm" onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant={filterStatus === "all" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={() => setFilterStatus("all")}
            >
              All ({rules.length})
            </Button>
            <Button
              variant={filterStatus === "active" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={() => setFilterStatus("active")}
            >
              Active ({activeCount})
            </Button>
            <Button
              variant={filterStatus === "inactive" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={() => setFilterStatus("inactive")}
            >
              Inactive ({inactiveCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredRules.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery || filterStatus !== "all" ? (
              <>
                <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No rules found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
              </>
            ) : (
              <>
                <Zap className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No automation rules yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first rule to get started
                </p>
                <Button size="sm" className="mt-4" onClick={onCreateNew}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create Rule
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRules.map((rule) => (
              <Card
                key={rule.id}
                className={cn(
                  "cursor-pointer hover:shadow-sm transition-all",
                  selectedRuleId === rule.id && "ring-2 ring-primary ring-offset-1"
                )}
                onClick={() => onSelectRule(rule)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium truncate">
                          {rule.name}
                        </h3>
                        {rule.isActive ? (
                          <Badge className="h-5 px-1.5 text-xs bg-green-100 text-green-700">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {rule.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onEditRule(rule);
                        }}>
                          <Edit className="w-3.5 h-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onRunTest(rule);
                        }}>
                          <TestTube className="w-3.5 h-3.5 mr-2" />
                          Test
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(rule.id!, !rule.isActive);
                        }}>
                          {rule.isActive ? (
                            <>
                              <Pause className="w-3.5 h-3.5 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        {onDuplicateRule && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateRule(rule);
                          }}>
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this rule?")) {
                              onDeleteRule(rule.id!);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {getTriggerIcon(rule.triggerType)}
                      <span>{getTriggerName(rule.triggerType)}</span>
                    </div>
                    {rule.conditions && rule.conditions.length > 0 && (
                      <>
                        <ChevronRight className="w-3 h-3" />
                        <div className="flex items-center gap-1">
                          <Filter className="w-3 h-3" />
                          <span>{rule.conditions.length}</span>
                        </div>
                      </>
                    )}
                    <ChevronRight className="w-3 h-3" />
                    <div className="flex items-center gap-1">
                      <PlayCircle className="w-3 h-3" />
                      <span>{rule.actions.length}</span>
                    </div>
                  </div>

                  {/* Metadata */}
                  {(rule.lastRun || rule.runCount !== undefined) && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t text-xs text-muted-foreground">
                      {rule.lastRun && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Last run: {new Date(rule.lastRun).toLocaleDateString()}</span>
                        </div>
                      )}
                      {rule.runCount !== undefined && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{rule.runCount} runs</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-t bg-white">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{rules.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold text-green-600">{activeCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Runs Today</p>
            <p className="text-lg font-semibold text-blue-600">
              {rules.reduce((sum, r) => sum + (r.runCount || 0), 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
