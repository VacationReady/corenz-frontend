"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  Clock,
  User,
  MoreHorizontal,
  Lock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit,
  Copy,
  Trash2,
  Settings,
  BarChart3,
  MessageSquare,
  FileText,
  Mail,
  GraduationCap,
  UserCheck,
  Calendar,
  Target,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExperienceBlock {
  id: string;
  name: string;
  description?: string;
  blockType: string;
  order: number;
  estimatedDuration?: number;
  slaHours?: number;
  responsibleRole?: string;
}

interface BlockAnalytics {
  blockId: string;
  engagement: number;
  completions: number;
  satisfaction: number | null;
  feedbackCount: number;
}

interface ExperienceBlockNodeData {
  block: ExperienceBlock;
  phase: any;
  journey: any;
  analytics?: BlockAnalytics;
  onUpdate: (block: ExperienceBlock) => void;
  onDelete?: (blockId: string) => void;
  onEdit?: (block: ExperienceBlock) => void;
}

const BLOCK_TYPE_CONFIG = {
  TASK: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    bgColor: "bg-blue-50",
  },
  FORM: {
    icon: <FileText className="w-4 h-4" />,
    color: "bg-green-100 text-green-800 border-green-200",
    bgColor: "bg-green-50",
  },
  COMMUNICATION: {
    icon: <Mail className="w-4 h-4" />,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    bgColor: "bg-purple-50",
  },
  TRAINING: {
    icon: <GraduationCap className="w-4 h-4" />,
    color: "bg-orange-100 text-orange-800 border-orange-200",
    bgColor: "bg-orange-50",
  },
  APPROVAL: {
    icon: <UserCheck className="w-4 h-4" />,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    bgColor: "bg-yellow-50",
  },
  AUTOMATION: {
    icon: <Settings className="w-4 h-4" />,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    bgColor: "bg-gray-50",
  },
  MILESTONE: {
    icon: <Target className="w-4 h-4" />,
    color: "bg-red-100 text-red-800 border-red-200",
    bgColor: "bg-red-50",
  },
  SURVEY: {
    icon: <BarChart3 className="w-4 h-4" />,
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    bgColor: "bg-indigo-50",
  },
  DOCUMENT: {
    icon: <FileText className="w-4 h-4" />,
    color: "bg-teal-100 text-teal-800 border-teal-200",
    bgColor: "bg-teal-50",
  },
  MEETING: {
    icon: <Calendar className="w-4 h-4" />,
    color: "bg-pink-100 text-pink-800 border-pink-200",
    bgColor: "bg-pink-50",
  },
};

export const ExperienceBlockNode = memo(({ data, selected }: NodeProps<ExperienceBlockNodeData>) => {
  const { block, phase, journey, analytics, onUpdate, onDelete, onEdit } = data;
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  const config = BLOCK_TYPE_CONFIG[block.blockType as keyof typeof BLOCK_TYPE_CONFIG] || BLOCK_TYPE_CONFIG.TASK;
  
  // Use real analytics data when available, otherwise show defaults
  const hasAnalytics = !!analytics;
  const engagementScore = analytics?.engagement ?? 0;
  const completionRate = hasAnalytics && analytics.completions > 0 ? analytics.engagement : 0;
  const avgTimeToComplete = block.estimatedDuration;
  const feedbackCount = analytics?.feedbackCount ?? 0;
  
  const getEngagementTrend = () => {
    // Show neutral when no data, otherwise calculate based on engagement threshold
    if (!hasAnalytics || engagementScore === 0) {
      return <Minus className="w-3 h-3 text-gray-400" />;
    }
    return engagementScore >= 70 ? (
      <TrendingUp className="w-3 h-3 text-green-600" />
    ) : (
      <TrendingDown className="w-3 h-3 text-red-600" />
    );
  };

  const getSentimentIndicator = () => {
    if (!hasAnalytics || engagementScore === 0) return "bg-gray-300";
    if (engagementScore >= 80) return "bg-green-500";
    if (engagementScore >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleEdit = useCallback(() => {
    // Open edit drawer/dialog - call parent handler if provided
    if (onEdit) {
      onEdit(block);
    } else {
      // Fallback: emit custom event for parent components to handle
      const event = new CustomEvent("openBlockConfig", { 
        detail: { block, phase, journey },
        bubbles: true 
      });
      document.dispatchEvent(event);
    }
  }, [block, phase, journey, onEdit]);

  const handleDuplicate = useCallback(async () => {
    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/journeys/${journey.id}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId: phase.id,
          name: `${block.name} (Copy)`,
          description: block.description,
          blockType: block.blockType,
          order: block.order + 1,
          estimatedDuration: block.estimatedDuration,
          slaHours: block.slaHours,
          responsibleRole: block.responsibleRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to duplicate block");
      }

      const newBlock = await response.json();
      toast.success("Block duplicated successfully");
      
      // Notify parent to refresh the journey data
      onUpdate(newBlock);
    } catch (error) {
      console.error("Error duplicating block:", error);
      toast.error(error instanceof Error ? error.message : "Failed to duplicate block");
    } finally {
      setIsDuplicating(false);
    }
  }, [block, phase.id, journey.id, onUpdate]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/journeys/blocks/${block.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete block");
      }

      toast.success("Block deleted successfully");
      setShowDeleteDialog(false);
      
      // Notify parent to remove the block from the canvas
      if (onDelete) {
        onDelete(block.id);
      }
    } catch (error) {
      console.error("Error deleting block:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete block");
    } finally {
      setIsDeleting(false);
    }
  }, [block.id, onDelete]);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative group transition-all duration-200",
          selected && "ring-2 ring-primary ring-offset-2"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 border-2 border-white bg-primary"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 border-white bg-primary"
        />

        {/* Main Card */}
        <Card className={cn(
          "w-64 shadow-md transition-all duration-200 border-2",
          selected ? "border-primary shadow-lg" : "border-gray-200",
          isHovered && "shadow-lg scale-105"
        )}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={cn("p-1.5 rounded-md", config.bgColor)}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{block.name}</h3>
                  <Badge variant="outline" className={cn("text-xs mt-1", config.color)}>
                    {block.blockType.toLowerCase()}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Governance Lock */}
                {Math.random() > 0.8 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="w-3 h-3 text-amber-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Governance lock active</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* More Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Block
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
                      {isDuplicating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      {isDuplicating ? "Duplicating..." : "Duplicate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Lock className="w-4 h-4 mr-2" />
                      Add Lock
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Add Comment
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)} 
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Description */}
            {block.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {block.description}
              </p>
            )}

            {/* Metadata */}
            <div className="space-y-2 mb-3">
              {block.estimatedDuration && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{block.estimatedDuration}h estimated</span>
                </div>
              )}
              
              {block.responsibleRole && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{block.responsibleRole}</span>
                </div>
              )}

              {block.slaHours && (
                <div className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-700">SLA: {block.slaHours}h</span>
                </div>
              )}
            </div>

            {/* Engagement Metrics */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", getSentimentIndicator())} />
                  <span className="text-muted-foreground">Engagement</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {hasAnalytics ? `${engagementScore}%` : "—"}
                  </span>
                  {getEngagementTrend()}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completions</span>
                <span className="font-medium">
                  {hasAnalytics ? analytics.completions : "—"}
                </span>
              </div>

              {avgTimeToComplete && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Est. Time</span>
                  <span className="font-medium">{avgTimeToComplete}h</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <BarChart3 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Analytics</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MessageSquare className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Feedback</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Settings className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Hover Overlay for Additional Info */}
        {isHovered && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-white border rounded-lg shadow-lg p-2 text-xs min-w-48">
              <div className="font-medium mb-1">Block Performance</div>
              <div className="space-y-1 text-muted-foreground">
                {hasAnalytics ? (
                  <>
                    <div>• {analytics.completions} completions</div>
                    <div>• {feedbackCount} feedback comments</div>
                    {analytics.satisfaction !== null && (
                      <div>• {analytics.satisfaction}/10 satisfaction</div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-400 italic">No analytics data yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Experience Block</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{block.name}&quot;? This action cannot be undone.
                {hasAnalytics && analytics.completions > 0 && (
                  <span className="block mt-2 text-amber-600">
                    This block has {analytics.completions} completions recorded.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
});
