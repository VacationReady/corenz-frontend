"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Send,
  CheckSquare,
  GitBranch,
  Repeat,
  Filter,
  Zap,
  AlertCircle,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestStepLog {
  stepId: string;
  nodeId: string;
  nodeType: "trigger" | "condition" | "action" | "delay" | "branch" | "loop";
  status: "pending" | "running" | "success" | "failed" | "skipped";
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number;
  details?: any;
  error?: string;
  message?: string;
}

interface TestRunResult {
  sessionId: string;
  status: "pending" | "running" | "completed" | "failed";
  steps: TestStepLog[];
  outputs: {
    notifications: any[];
    tasks: any[];
    webhooks: any[];
    fieldUpdates: any[];
  };
  summary?: {
    totalSteps: number;
    successSteps: number;
    failedSteps: number;
    duration: number;
    triggeredAt: Date;
    completedAt?: Date;
  };
  error?: string;
}

interface TestExecutionViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  ruleId?: string;
  ruleName?: string;
  onReRun?: () => void;
  onHighlightNode?: (nodeId: string) => void;
}

export const TestExecutionViewer: React.FC<TestExecutionViewerProps> = ({
  open,
  onOpenChange,
  sessionId,
  ruleId,
  ruleName,
  onReRun,
  onHighlightNode,
}) => {
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [expandedOutputs, setExpandedOutputs] = useState<Record<string, boolean>>({});
  const [showLogs, setShowLogs] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!open || !sessionId || !ruleId) {
      // Cleanup
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Connect to SSE stream
    const streamUrl = `/api/automation-rules/${ruleId}/test/stream?session=${sessionId}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Convert date strings back to Date objects
        if (data.steps) {
          data.steps = data.steps.map((step: any) => ({
            ...step,
            startedAt: step.startedAt ? new Date(step.startedAt) : undefined,
            finishedAt: step.finishedAt ? new Date(step.finishedAt) : undefined,
          }));
        }
        if (data.summary) {
          data.summary.triggeredAt = new Date(data.summary.triggeredAt);
          if (data.summary.completedAt) {
            data.summary.completedAt = new Date(data.summary.completedAt);
          }
        }
        
        setResult(data);

        // Highlight current running node
        if (onHighlightNode) {
          const runningStep = data.steps.find((s: TestStepLog) => s.status === "running");
          if (runningStep) {
            onHighlightNode(runningStep.nodeId);
          }
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      eventSource.close();
      
      // Fallback to polling
      startPolling();
    };

    eventSourceRef.current = eventSource;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [open, sessionId, ruleId, onHighlightNode]);

  const startPolling = () => {
    if (!sessionId || !ruleId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/automation-rules/${ruleId}/test/status?session=${sessionId}`
        );
        if (res.ok) {
          const data = await res.json();
          
          // Convert date strings
          if (data.steps) {
            data.steps = data.steps.map((step: any) => ({
              ...step,
              startedAt: step.startedAt ? new Date(step.startedAt) : undefined,
              finishedAt: step.finishedAt ? new Date(step.finishedAt) : undefined,
            }));
          }
          if (data.summary) {
            data.summary.triggeredAt = new Date(data.summary.triggeredAt);
            if (data.summary.completedAt) {
              data.summary.completedAt = new Date(data.summary.completedAt);
            }
          }
          
          setResult(data);

          // Stop polling when done
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case "trigger":
        return <Zap className="w-4 h-4" />;
      case "condition":
        return <Filter className="w-4 h-4" />;
      case "action":
        return <PlayCircle className="w-4 h-4" />;
      case "delay":
        return <Clock className="w-4 h-4" />;
      case "branch":
        return <GitBranch className="w-4 h-4" />;
      case "loop":
        return <Repeat className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case "skipped":
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-green-200 bg-green-50";
      case "failed":
        return "border-red-200 bg-red-50";
      case "running":
        return "border-blue-200 bg-blue-50";
      case "skipped":
        return "border-gray-200 bg-gray-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  const downloadResults = () => {
    if (!result) return;

    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `test-run-${result.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!result) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const progressPercentage =
    result.steps.length > 0
      ? ((result.steps.filter((s) => s.status !== "pending" && s.status !== "running")
          .length /
          result.steps.length) *
        100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {getStatusIcon(result.status)}
                Test Execution
                {result.status === "running" && (
                  <Badge variant="secondary">
                    In Progress
                  </Badge>
                )}
                {result.status === "completed" && (
                  <Badge variant="secondary">
                    Completed
                  </Badge>
                )}
                {result.status === "failed" && (
                  <Badge variant="destructive">Failed</Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {ruleName ? `Testing "${ruleName}"` : "Workflow test in progress"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadResults}
                disabled={result.status === "running"}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              {onReRun && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReRun}
                  disabled={result.status === "running"}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Re-run
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {result.status === "running" && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Summary Cards */}
          {result.summary && (
            <div className="grid grid-cols-4 gap-3">
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {result.summary.totalSteps}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total Steps
                  </p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {result.summary.successSteps}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Successful
                  </p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {result.summary.failedSteps}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Failed
                  </p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">
                    {(result.summary.duration / 1000).toFixed(2)}s
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error Banner */}
          {result.error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Test Failed</p>
                    <p className="text-sm text-red-800 mt-1">{result.error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Execution Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Execution Timeline</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showLogs ? "Hide" : "Show"} Details
              </Button>
            </div>

            <div className="space-y-2">
              {result.steps.map((step, index) => (
                <Card
                  key={step.stepId}
                  className={cn(
                    "transition-all",
                    getStatusColor(step.status),
                    step.status === "running" && "ring-2 ring-blue-400"
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        step.status === "success" && "bg-green-100 text-green-600",
                        step.status === "failed" && "bg-red-100 text-red-600",
                        step.status === "running" && "bg-blue-100 text-blue-600",
                        step.status === "pending" && "bg-gray-100 text-gray-600"
                      )}>
                        {getNodeIcon(step.nodeType)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            Step {index + 1}
                          </span>
                          <Badge variant="outline">
                            {step.nodeType}
                          </Badge>
                          {step.duration !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {step.duration}ms
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-medium">
                          {step.message || `${step.nodeType} node`}
                        </p>

                        {step.error && (
                          <p className="text-sm text-red-600 mt-1">
                            Error: {step.error}
                          </p>
                        )}

                        {showLogs && step.details && (
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(step.details, null, 2)}
                          </pre>
                        )}
                      </div>

                      {getStatusIcon(step.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Outputs */}
          {(result.outputs.notifications.length > 0 ||
            result.outputs.tasks.length > 0 ||
            result.outputs.webhooks.length > 0 ||
            result.outputs.fieldUpdates.length > 0) && (
            <div className="space-y-4">
              <h4 className="font-medium">Simulated Outputs</h4>

              {/* Notifications */}
              {result.outputs.notifications.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Send className="w-4 h-4 text-blue-600" />
                      <h5 className="font-medium">
                        Notifications ({result.outputs.notifications.length})
                      </h5>
                      <Badge variant="secondary">
                        Simulated
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {result.outputs.notifications.map((notif: any) => (
                        <div
                          key={notif.id}
                          className="p-3 bg-gray-50 rounded border text-sm"
                        >
                          <div className="font-medium">{notif.subject}</div>
                          <div className="text-muted-foreground text-xs mt-1">
                            To: {notif.recipientType} via {notif.channel}
                          </div>
                          <div className="text-muted-foreground mt-2">
                            {notif.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tasks */}
              {result.outputs.tasks.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="w-4 h-4 text-green-600" />
                      <h5 className="font-medium">
                        Tasks ({result.outputs.tasks.length})
                      </h5>
                      <Badge variant="secondary">
                        Simulated
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {result.outputs.tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="p-3 bg-gray-50 rounded border text-sm"
                        >
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <div className="text-muted-foreground text-xs mt-1">
                              {task.description}
                            </div>
                          )}
                          <div className="text-muted-foreground text-xs mt-2">
                            Assigned to: {task.assignedTo}
                            {task.dueDate && ` • Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Webhooks */}
              {result.outputs.webhooks.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch className="w-4 h-4 text-purple-600" />
                      <h5 className="font-medium">
                        Webhooks ({result.outputs.webhooks.length})
                      </h5>
                      <Badge variant="secondary">
                        Simulated
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {result.outputs.webhooks.map((webhook: any) => (
                        <div
                          key={webhook.id}
                          className="p-3 bg-gray-50 rounded border text-sm font-mono"
                        >
                          <div>
                            {webhook.method} {webhook.url}
                          </div>
                          <pre className="text-xs mt-2 text-muted-foreground">
                            {JSON.stringify(webhook.payload, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Field Updates */}
              {result.outputs.fieldUpdates.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <h5 className="font-medium">
                        Field Updates ({result.outputs.fieldUpdates.length})
                      </h5>
                      <Badge variant="secondary">
                        Simulated
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {result.outputs.fieldUpdates.map((update: any) => (
                        <div
                          key={update.id}
                          className="p-3 bg-gray-50 rounded border text-sm"
                        >
                          <div className="font-medium">{update.field}</div>
                          <div className="text-muted-foreground text-xs mt-1">
                            {update.oldValue} → {update.newValue}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {result.summary && (
              <span className="text-sm text-muted-foreground">
                Started {result.summary.triggeredAt.toLocaleTimeString()}
                {result.summary.completedAt &&
                  ` • Completed ${result.summary.completedAt.toLocaleTimeString()}`}
              </span>
            )}
          </div>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

