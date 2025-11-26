"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  ListTodo,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionItemWithSource } from "@/hooks/usePerformanceData";
import { actionItemIconConfig } from "@/lib/action-item-icons";

interface PendingActionItemsPanelProps {
  actionItems: ActionItemWithSource[];
  onRefresh: () => void;
  isEmployeeContext?: boolean;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIUM: "bg-sky-100 text-sky-700 border-sky-200",
  HIGH: "bg-amber-100 text-amber-700 border-amber-200",
  CRITICAL: "bg-rose-100 text-rose-700 border-rose-200",
};

const statusConfig = {
  TODO: { 
    icon: <Clock className="h-4 w-4" />,
    color: "text-slate-500",
    bg: "bg-slate-100"
  },
  IN_PROGRESS: { 
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-blue-500",
    bg: "bg-blue-100"
  },
  COMPLETED: { 
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-500",
    bg: "bg-emerald-100"
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2 }
  }
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
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Pending Action Items</CardTitle>
              <CardDescription>All caught up!</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
            className="p-4 rounded-full bg-emerald-100 mb-4"
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-semibold text-slate-900 mb-2">All tasks complete!</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              You're all caught up. No pending action items from your recent meetings.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 flex items-center gap-1 text-xs text-emerald-600 font-medium"
          >
            <Sparkles className="h-3 w-3" />
            Great work staying on top of things!
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  const overdueCount = actionItems.filter(item => isOverdue(item.dueDate)).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className={cn(
        "transition-colors",
        overdueCount > 0 
          ? "bg-gradient-to-br from-amber-50/50 to-orange-50/50" 
          : "bg-gradient-to-br from-violet-50/50 to-purple-50/50"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl",
              overdueCount > 0 ? "bg-amber-100 text-amber-600" : "bg-violet-100 text-violet-600"
            )}>
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Pending Action Items
                <Badge variant="secondary" className="text-xs">
                  {actionItems.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                {overdueCount > 0 ? (
                  <span className="text-amber-700">
                    {overdueCount} overdue item{overdueCount !== 1 ? 's' : ''} require attention
                  </span>
                ) : (
                  `${actionItems.length} item${actionItems.length !== 1 ? 's' : ''} from recent meetings`
                )}
              </CardDescription>
            </div>
          </div>
          {overdueCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueCount} overdue
            </motion.div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {actionItems.map((item) => {
              const isUpdating = updatingItems.has(item.id);
              const overdue = isOverdue(item.dueDate);
              const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.TODO;
              
              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  exit="exit"
                  layout
                  className={cn(
                    "rounded-xl border p-4 transition-all hover:shadow-md",
                    overdue 
                      ? "border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/30" 
                      : "hover:border-violet-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center relative",
                      overdue ? "bg-amber-100" : actionItemIconConfig.meeting_action_item.bgColor
                    )}>
                      <MessageSquare className={cn(
                        "w-5 h-5",
                        overdue ? "text-amber-600" : actionItemIconConfig.meeting_action_item.iconColor
                      )} />
                      {overdue && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white"
                        />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={cn("p-1 rounded-md", status.bg)}>
                            <span className={status.color}>{status.icon}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={cn("text-xs", priorityColors[item.priority as keyof typeof priorityColors])}>
                            {item.priority}
                          </Badge>
                          {overdue && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {item.sourceMeetingTitle}
                        </span>
                        {!isEmployeeContext && item.Assignee && (
                          <span className="flex items-center gap-1">
                            Assigned to: <span className="font-medium text-slate-700">
                              {item.Assignee.firstName} {item.Assignee.lastName}
                            </span>
                          </span>
                        )}
                        {item.dueDate && (
                          <span className={cn(
                            "flex items-center gap-1",
                            overdue && "text-amber-700 font-medium"
                          )}>
                            <CalendarClock className="h-3 w-3" />
                            Due {formatLondonDate(item.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => window.open(`/performance/meetings/${item.sourceMeetingId}`, '_blank')}
                    >
                      View Meeting
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMarkComplete(item.id)}
                      disabled={isUpdating || item.status === "COMPLETED"}
                      className={cn(
                        "text-xs",
                        item.status !== "COMPLETED" && "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1.5" />
                          Mark Complete
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </CardContent>
    </Card>
  );
}
