"use client";

import React from "react";
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
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  PlayCircle,
  Clock,
  Send,
  FileText,
  User,
  Calendar,
  ArrowRight,
  TestTube,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DryRunResult {
  matchingEmployees?: number;
  actionsToRun?: number;
  estimatedRuntime?: number;
  preview?: Array<{
    action: string;
    description: string;
    type?: string;
    recipients?: string[];
    status?: "success" | "warning" | "error";
  }>;
  errors?: string[];
  warnings?: string[];
  affectedEmployees?: Array<{
    id: string;
    name: string;
    email: string;
    department?: string;
  }>;
}

interface DryRunResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: DryRunResult | null;
  ruleName?: string;
  onRunActual?: () => void;
  onEditRule?: () => void;
}

export const DryRunResultsDialog: React.FC<DryRunResultsDialogProps> = ({
  open,
  onOpenChange,
  results,
  ruleName,
  onRunActual,
  onEditRule,
}) => {
  if (!results) return null;

  const hasErrors = results.errors && results.errors.length > 0;
  const hasWarnings = results.warnings && results.warnings.length > 0;

  const getActionIcon = (actionType?: string) => {
    switch (actionType) {
      case "send_notification":
        return <Send className="w-4 h-4" />;
      case "create_task":
        return <CheckCircle2 className="w-4 h-4" />;
      case "update_field":
        return <FileText className="w-4 h-4" />;
      case "start_onboarding":
        return <User className="w-4 h-4" />;
      default:
        return <PlayCircle className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5 text-blue-600" />
                Dry Run Test Results
              </DialogTitle>
              <DialogDescription className="mt-1">
                {ruleName ? `Testing "${ruleName}"` : "See what would happen if this rule ran right now"}
              </DialogDescription>
            </div>
            {!hasErrors && onRunActual && (
              <Button size="sm" onClick={onRunActual}>
                Run for Real
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-700">
                      {results.matchingEmployees || 0}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      Matching Employees
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-700">
                      {results.actionsToRun || 0}
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-1">
                      Actions to Execute
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <PlayCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-orange-700">
                      {results.estimatedRuntime || 0}s
                    </p>
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      Est. Runtime
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Errors and Warnings */}
          {(hasErrors || hasWarnings) && (
            <div className="space-y-3">
              {hasErrors && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-900 mb-2">Errors Found</h4>
                        <ul className="space-y-1">
                          {results.errors!.map((error, idx) => (
                            <li key={idx} className="text-sm text-red-800">
                              • {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {hasWarnings && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-amber-900 mb-2">Warnings</h4>
                        <ul className="space-y-1">
                          {results.warnings!.map((warning, idx) => (
                            <li key={idx} className="text-sm text-amber-800">
                              • {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action Timeline */}
          {results.preview && results.preview.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                Action Timeline
              </h4>
              <div className="relative space-y-3 ml-2">
                {/* Vertical line */}
                <div className="absolute left-5 top-8 bottom-3 w-0.5 bg-gray-200"></div>
                
                {results.preview.map((item, index) => {
                  const isLast = index === results.preview!.length - 1;
                  const statusColor = item.status === "error" ? "red" : 
                                     item.status === "warning" ? "amber" : 
                                     "green";
                  
                  return (
                    <div key={index} className="relative flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center z-10",
                        `bg-${statusColor}-100`
                      )}>
                        {getActionIcon(item.type)}
                      </div>
                      
                      <Card className="flex-1 border hover:shadow-sm transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{item.action}</p>
                                {item.status && (
                                  <Badge
                                    variant={item.status === "success" ? "default" : "destructive"}
                                    className="text-xs h-5"
                                  >
                                    {item.status}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </p>
                              {item.recipients && item.recipients.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Users className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">
                                    To: {item.recipients.slice(0, 3).join(", ")}
                                    {item.recipients.length > 3 && ` +${item.recipients.length - 3} more`}
                                  </p>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Step {index + 1}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {!isLast && (
                        <ArrowRight className="absolute left-[18px] -bottom-3 w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Affected Employees Sample */}
          {results.affectedEmployees && results.affectedEmployees.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                Sample Affected Employees
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {results.affectedEmployees.slice(0, 6).map((employee) => (
                  <Card key={employee.id} className="border hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{employee.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                          {employee.department && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {employee.department}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {results.affectedEmployees.length > 6 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  And {results.affectedEmployees.length - 6} more employees...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Test Failed
              </Badge>
            ) : hasWarnings ? (
              <Badge variant="secondary" className="flex items-center gap-1 bg-amber-100 text-amber-800">
                <AlertCircle className="w-3 h-3" />
                Test Passed with Warnings
              </Badge>
            ) : (
              <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3" />
                Test Passed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onEditRule && (
              <Button variant="outline" onClick={onEditRule}>
                Back to Editor
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!hasErrors && onRunActual && (
              <Button onClick={onRunActual}>
                Execute Rule Now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
