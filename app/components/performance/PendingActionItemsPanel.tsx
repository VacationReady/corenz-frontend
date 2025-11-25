"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { formatLondonDate } from "@/lib/time";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionItemWithSource } from "@/hooks/usePerformanceData";
import { actionItemIconConfig } from "@/lib/action-item-icons";

interface PendingActionItemsPanelProps {
  actionItems: ActionItemWithSource[];
  onRefresh: () => void;
  isEmployeeContext?: boolean;
}

const priorityColors = {
  LOW: "bg-gray-200 text-gray-700",
  MEDIUM: "bg-blue-200 text-blue-700",
  HIGH: "bg-orange-200 text-orange-700",
  CRITICAL: "bg-red-200 text-red-700",
};

const statusIcons = {
  TODO: <Clock className="h-4 w-4 text-gray-500" />,
  IN_PROGRESS: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

export function PendingActionItemsPanel({ 
  actionItems, 
  onRefresh,
  isEmployeeContext = false,
}: PendingActionItemsPanelProps) {
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleMarkComplete = async (itemId: string) => {
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    
    try {
      const response = await fetch(`/api/performance/meetings/action-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update action item");
      }

      toast.success("Action item marked as complete");
      onRefresh();
    } catch (error) {
      console.error("Error updating action item:", error);
      toast.error("Failed to update action item");
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (actionItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Action Items</CardTitle>
          <CardDescription>No pending action items at the moment</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
          <p className="text-sm text-muted-foreground">
            All action items are complete! Great work.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Action Items</CardTitle>
        <CardDescription>
          {actionItems.length} action item{actionItems.length === 1 ? '' : 's'} from recent meetings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actionItems.map((item) => {
            const isUpdating = updatingItems.has(item.id);
            const overdue = isOverdue(item.dueDate);
            
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  overdue && "border-orange-300 bg-orange-50/50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Meeting action item icon */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${actionItemIconConfig.meeting_action_item.bgColor} flex items-center justify-center relative`}>
                    <MessageSquare className={`w-4 h-4 ${actionItemIconConfig.meeting_action_item.iconColor}`} />
                    {overdue && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusIcons[item.status as keyof typeof statusIcons]}
                      <span className="font-medium">{item.title}</span>
                      <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
                        {item.priority}
                      </Badge>
                      {overdue && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        From: <span className="font-medium">{item.sourceMeetingTitle}</span>
                      </span>
                      {!isEmployeeContext && (
                        <span>
                          Assigned to: <span className="font-medium">
                            {item.Assignee.firstName} {item.Assignee.lastName}
                          </span>
                        </span>
                      )}
                      {item.dueDate && (
                        <span className={cn(overdue && "text-orange-700 font-medium")}>
                          Due: {formatLondonDate(item.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkComplete(item.id)}
                      disabled={isUpdating || item.status === "COMPLETED"}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      <span className="ml-2">Complete</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`/performance/meetings/${item.sourceMeetingId}`, '_blank')}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
