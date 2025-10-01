"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  Filter,
  PlayCircle,
  Clock,
  GitBranch,
  Repeat,
  ArrowDown,
  Check,
  Plus,
  Eye,
  Settings,
  ChevronRight,
  Users,
  TrendingUp,
  AlertCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowTemplate } from "@/lib/workflows/workflowLibrary";
import dynamic from "next/dynamic";

// Dynamically import ReactFlow to avoid SSR issues
const ReactFlow = dynamic(
  () => import("reactflow").then(mod => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading workflow visualization...</p>
      </div>
    ),
  }
);

interface WorkflowPreviewDialogProps {
  workflow: WorkflowTemplate;
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export function WorkflowPreviewDialog({
  workflow,
  isOpen,
  onClose,
  onInstall,
}: WorkflowPreviewDialogProps) {
  const [selectedTab, setSelectedTab] = useState("overview");

  const getNodeIcon = (type: string) => {
    const icons: Record<string, any> = {
      trigger: Zap,
      condition: Filter,
      action: PlayCircle,
      delay: Clock,
      branch: GitBranch,
      loop: Repeat,
    };
    const Icon = icons[type] || PlayCircle;
    return <Icon className="w-4 h-4" />;
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      trigger: "text-blue-500 bg-blue-50 border-blue-200",
      condition: "text-amber-500 bg-amber-50 border-amber-200",
      action: "text-green-500 bg-green-50 border-green-200",
      delay: "text-purple-500 bg-purple-50 border-purple-200",
      branch: "text-pink-500 bg-pink-50 border-pink-200",
      loop: "text-sky-500 bg-sky-50 border-sky-200",
    };
    return colors[type] || "text-gray-500 bg-gray-50 border-gray-200";
  };

  const renderWorkflowStep = (node: any, index: number) => {
    const IconEl = getNodeIcon(node.type);
    const colorClass = getNodeColor(node.type);
    
    return (
      <div key={node.id} className="relative">
        {index > 0 && (
          <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gray-300" />
        )}
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg border flex-shrink-0",
            colorClass
          )}>
            {IconEl}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              {node.data?.label || node.type?.charAt(0).toUpperCase() + node.type?.slice(1)}
            </h4>
            {node.data?.config && (
              <div className="mt-1 space-y-1">
                {node.data.config.triggerType && (
                  <p className="text-xs text-muted-foreground">
                    Trigger: {node.data.config.triggerType.replace(/_/g, ' ').toLowerCase()}
                  </p>
                )}
                {node.data.config.conditionType && (
                  <p className="text-xs text-muted-foreground">
                    Check: {node.data.config.conditionType.replace(/_/g, ' ').toLowerCase()}
                  </p>
                )}
                {node.data.config.actionType && (
                  <p className="text-xs text-muted-foreground">
                    Action: {node.data.config.actionType.replace(/_/g, ' ').toLowerCase()}
                  </p>
                )}
                {node.data.config.days && (
                  <p className="text-xs text-muted-foreground">
                    Wait: {node.data.config.days} days
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Calculate workflow statistics
  const workflowStats = {
    nodes: workflow.nodes.length,
    triggers: workflow.nodes.filter(n => n.type === 'trigger').length,
    conditions: workflow.nodes.filter(n => n.type === 'condition').length,
    actions: workflow.nodes.filter(n => n.type === 'action').length,
    complexity: workflow.nodes.length > 10 ? 'High' : workflow.nodes.length > 5 ? 'Medium' : 'Low',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{workflow.icon}</span>
              <div>
                <DialogTitle className="text-xl">{workflow.name}</DialogTitle>
                <DialogDescription className="mt-1">
                  {workflow.description}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {workflow.isPopular && (
                <Badge variant="secondary" className="bg-yellow-100">
                  Popular
                </Badge>
              )}
              {workflow.isPremium && (
                <Badge variant="secondary" className="bg-purple-100">
                  Premium
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workflow">Workflow Steps</TabsTrigger>
            <TabsTrigger value="visualization">Visual Flow</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="overview" className="space-y-6 p-4">
              {/* Category and Tags */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span>{workflow.category.icon}</span>
                  <span className="font-medium">{workflow.category.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workflow.tags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Key Benefits
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {workflow.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              {workflow.requirements && workflow.requirements.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Requirements
                  </h3>
                  <ul className="space-y-2">
                    {workflow.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Steps</p>
                  <p className="text-lg font-semibold">{workflowStats.nodes}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Actions</p>
                  <p className="text-lg font-semibold">{workflowStats.actions}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Complexity</p>
                  <p className="text-lg font-semibold">{workflowStats.complexity}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Time Saved</p>
                  <p className="text-lg font-semibold">{workflow.estimatedTime || 'N/A'}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="workflow" className="p-4">
              <div className="space-y-4">
                {workflow.nodes.map((node, index) => renderWorkflowStep(node, index))}
              </div>
            </TabsContent>

            <TabsContent value="visualization" className="p-4">
              <div className="h-96 border rounded-lg bg-gradient-to-br from-slate-50 to-white">
                <ReactFlow
                  nodes={workflow.nodes}
                  edges={workflow.edges}
                  fitView
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnScroll={false}
                  panOnScroll={false}
                  preventScrolling={false}
                />
              </div>
            </TabsContent>

            <TabsContent value="details" className="p-4 space-y-6">
              {/* Configuration */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configuration Options
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-muted rounded">
                    <span className="text-sm">Retry on Failure</span>
                    <Badge variant={workflow.config.retryOnFailure ? "default" : "secondary"}>
                      {workflow.config.retryOnFailure ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  {workflow.config.maxRetries && (
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded">
                      <span className="text-sm">Max Retries</span>
                      <Badge variant="outline">{workflow.config.maxRetries}</Badge>
                    </div>
                  )}
                  {workflow.config.alertOnFailure && (
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded">
                      <span className="text-sm">Alert on Failure</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                  )}
                  {workflow.config.requiresApproval && (
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded">
                      <span className="text-sm">Requires Approval</span>
                      <Badge variant="default">Yes</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Customizable Fields */}
              {workflow.config.customizable && workflow.config.customizable.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Customizable Fields
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {workflow.config.customizable.map(field => (
                      <Badge key={field} variant="outline">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Trigger Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  Trigger Details
                </h3>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">
                    This workflow starts when:{" "}
                    <span className="font-medium">
                      {workflow.nodes.find(n => n.type === 'trigger')?.data?.config?.triggerType?.replace(/_/g, ' ').toLowerCase() || 'Manual trigger'}
                    </span>
                  </p>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onInstall}>
            <Plus className="w-4 h-4 mr-2" />
            Add to My Workflows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
