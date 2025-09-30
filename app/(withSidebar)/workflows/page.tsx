"use client";

import { useState, useMemo } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Search,
  Filter,
  Sparkles,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
  Eye,
  Edit,
  Check,
  Star,
  Zap,
  Users,
  ChevronDown,
  ChevronUp,
  Workflow,
  PlayCircle,
  Download,
  Upload,
  Grid3x3,
  List,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import workflowLibrary from "@/lib/workflows/workflowLibrary";
import { WorkflowTemplate } from "@/lib/workflows/workflowLibrary";
import { WorkflowCustomizationDialog } from "./components/WorkflowCustomizationDialog";
import { WorkflowPreviewDialog } from "./components/WorkflowPreviewDialog";
import { motion } from "framer-motion";

interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  executionsToday: number;
  timeSaved: string;
}

export default function WorkflowLibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [customizeWorkflow, setCustomizeWorkflow] = useState<WorkflowTemplate | null>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<WorkflowTemplate | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [installedWorkflows, setInstalledWorkflows] = useState<Set<string>>(new Set());

  // Mock stats - would come from API
  const stats: WorkflowStats = {
    totalWorkflows: workflowLibrary.templates.length,
    activeWorkflows: installedWorkflows.size,
    executionsToday: 127,
    timeSaved: "32.5 hrs",
  };

  // Filter workflows based on search and category
  const filteredWorkflows = useMemo(() => {
    let workflows = [...workflowLibrary.templates];

    // Filter by category
    if (selectedCategory !== "all") {
      workflows = workflows.filter(w => w.category.id === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      workflows = workflows.filter(w =>
        w.name.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query) ||
        w.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return workflows;
  }, [selectedCategory, searchQuery]);

  // Get popular workflows
  const popularWorkflows = useMemo(() => 
    workflowLibrary.getPopular(5),
    []
  );

  const toggleCardExpansion = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleInstallWorkflow = async (workflow: WorkflowTemplate, customizations?: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/automation-rules/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: workflow.id,
          customizations,
        }),
      });

      if (response.ok) {
        setInstalledWorkflows(prev => new Set(prev).add(workflow.id));
        toast.success(`${workflow.name} has been added to your workflows`);
        setCustomizeWorkflow(null);
      } else {
        throw new Error("Failed to install workflow");
      }
    } catch (error) {
      toast.error("Failed to install workflow");
    } finally {
      setLoading(false);
    }
  };

  const renderWorkflowCard = (workflow: WorkflowTemplate) => {
    const isExpanded = expandedCards.has(workflow.id);
    const isInstalled = installedWorkflows.has(workflow.id);

    return (
      <motion.div
        key={workflow.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className={cn(
            "group hover:shadow-lg transition-all duration-200",
            isInstalled && "border-green-500",
            workflow.isPremium && "border-purple-500",
            isExpanded && "row-span-2"
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{workflow.icon}</span>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                </div>
                <CardDescription className="line-clamp-2">
                  {workflow.description}
                </CardDescription>
              </div>
              {isInstalled && (
                <Badge variant="success" className="ml-2">
                  <Check className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {workflow.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {workflow.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{workflow.tags.length - 3}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Quick Stats */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                {workflow.estimatedTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Saves {workflow.estimatedTime}</span>
                  </div>
                )}
                {workflow.isPopular && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>Popular</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Benefits */}
                <div>
                  <h4 className="font-medium mb-2">Benefits</h4>
                  <ul className="text-sm space-y-1">
                    {workflow.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirements */}
                {workflow.requirements && (
                  <div>
                    <h4 className="font-medium mb-2">Requirements</h4>
                    <ul className="text-sm space-y-1">
                      {workflow.requirements.map((req, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Workflow Preview */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Workflow Steps</span>
                    <Badge variant="outline" className="text-xs">
                      {workflow.nodes.length} nodes
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-blue-500" />
                      <span>Trigger</span>
                    </div>
                    <ArrowRight className="w-3 h-3" />
                    <div className="flex items-center gap-1">
                      <Filter className="w-3 h-3 text-amber-500" />
                      <span>Conditions</span>
                    </div>
                    <ArrowRight className="w-3 h-3" />
                    <div className="flex items-center gap-1">
                      <PlayCircle className="w-3 h-3 text-green-500" />
                      <span>Actions</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewWorkflow(workflow)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCardExpansion(workflow.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      More
                    </>
                  )}
                </Button>
              </div>

              {isInstalled ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Navigate to automation rules to edit
                    window.location.href = `/settings/automation-rules?edit=${workflow.id}`;
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setCustomizeWorkflow(workflow)}
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <PageShell
      title="Workflow Library"
      description="Pre-built, customizable HR workflows to automate your processes"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/settings/automation-rules?mode=create"}
          >
            <Upload className="w-4 h-4 mr-2" />
            Build Custom
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
        </div>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
                <p className="text-2xl font-bold">{stats.totalWorkflows}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-2xl font-bold">{stats.activeWorkflows}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Executions Today</p>
                <p className="text-2xl font-bold">{stats.executionsToday}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <PlayCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">{stats.timeSaved}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {workflowLibrary.categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Popular Workflows Banner */}
      {selectedCategory === "all" && !searchQuery && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Popular Workflows</h3>
              </div>
              <Badge variant="secondary">Most Used</Badge>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {popularWorkflows.map(workflow => (
                <button
                  key={workflow.id}
                  onClick={() => setPreviewWorkflow(workflow)}
                  className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{workflow.icon}</span>
                    <Star className="w-3 h-3 text-yellow-500" />
                  </div>
                  <p className="text-sm font-medium line-clamp-1">{workflow.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{workflow.estimatedTime} saved</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="grid grid-cols-9 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          {workflowLibrary.categories.slice(0, 8).map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              <span className="mr-1">{category.icon}</span>
              <span className="hidden lg:inline">{category.name.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Workflow Grid/List */}
      <div className={cn(
        viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-4"
      )}>
        {filteredWorkflows.length > 0 ? (
          filteredWorkflows.map(workflow => renderWorkflowCard(workflow))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Workflow className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No workflows found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Customization Dialog */}
      {customizeWorkflow && (
        <WorkflowCustomizationDialog
          workflow={customizeWorkflow}
          isOpen={!!customizeWorkflow}
          onClose={() => setCustomizeWorkflow(null)}
          onConfirm={(customizations) => handleInstallWorkflow(customizeWorkflow, customizations)}
        />
      )}

      {/* Preview Dialog */}
      {previewWorkflow && (
        <WorkflowPreviewDialog
          workflow={previewWorkflow}
          isOpen={!!previewWorkflow}
          onClose={() => setPreviewWorkflow(null)}
          onInstall={() => {
            setPreviewWorkflow(null);
            setCustomizeWorkflow(previewWorkflow);
          }}
        />
      )}
    </PageShell>
  );
}
