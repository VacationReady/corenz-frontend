"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationItem {
  key: string;
  label: string;
  status: "valid" | "error" | "warning" | "info";
  message?: string;
  section?: "trigger" | "conditions" | "actions" | "general";
}

interface ValidationChecklistProps {
  validationErrors: Record<string, string>;
  validationHints: string[];
  formData: {
    name?: string;
    triggerType?: string;
    conditions?: any[];
    actions?: any[];
  };
  className?: string;
  onFocusSection?: (section: string) => void;
  compact?: boolean;
}

export const ValidationChecklist: React.FC<ValidationChecklistProps> = ({
  validationErrors,
  validationHints,
  formData,
  className,
  onFocusSection,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(!compact);

  // Calculate validation items
  const getValidationItems = (): ValidationItem[] => {
    const items: ValidationItem[] = [];

    // Name validation
    if (formData.name?.trim()) {
      items.push({
        key: "name",
        label: "Rule name",
        status: "valid",
        section: "general",
      });
    } else if (validationErrors.name) {
      items.push({
        key: "name",
        label: "Rule name",
        status: "error",
        message: validationErrors.name,
        section: "general",
      });
    }

    // Trigger validation
    if (formData.triggerType) {
      const triggerErrors = Object.entries(validationErrors)
        .filter(([key]) => key.startsWith("triggerConfig"))
        .map(([_, error]) => error);
      
      if (triggerErrors.length > 0) {
        items.push({
          key: "trigger",
          label: "Trigger configuration",
          status: "error",
          message: triggerErrors[0],
          section: "trigger",
        });
      } else {
        items.push({
          key: "trigger",
          label: "Trigger configured",
          status: "valid",
          section: "trigger",
        });
      }
    } else if (validationErrors.triggerType) {
      items.push({
        key: "trigger",
        label: "Trigger",
        status: "error",
        message: validationErrors.triggerType,
        section: "trigger",
      });
    }

    // Conditions validation (optional)
    if (formData.conditions && formData.conditions.length > 0) {
      const hasIncompleteConditions = formData.conditions.some((c: any) => !c.type);
      if (hasIncompleteConditions) {
        items.push({
          key: "conditions",
          label: "Conditions",
          status: "warning",
          message: "Some conditions are incomplete",
          section: "conditions",
        });
      } else {
        items.push({
          key: "conditions",
          label: `${formData.conditions.length} condition(s)`,
          status: "valid",
          section: "conditions",
        });
      }
    }

    // Actions validation
    if (formData.actions && formData.actions.length > 0) {
      const actionErrors = Object.entries(validationErrors)
        .filter(([key]) => key.startsWith("actions"))
        .map(([_, error]) => error);
      
      if (actionErrors.length > 0) {
        items.push({
          key: "actions",
          label: "Actions",
          status: "error",
          message: actionErrors[0],
          section: "actions",
        });
      } else {
        const hasIncompleteActions = formData.actions.some((a: any) => !a.type);
        if (hasIncompleteActions) {
          items.push({
            key: "actions",
            label: "Actions",
            status: "warning",
            message: "Some actions are incomplete",
            section: "actions",
          });
        } else {
          items.push({
            key: "actions",
            label: `${formData.actions.length} action(s)`,
            status: "valid",
            section: "actions",
          });
        }
      }
    } else if (validationErrors.actions) {
      items.push({
        key: "actions",
        label: "Actions",
        status: "error",
        message: validationErrors.actions,
        section: "actions",
      });
    }

    return items;
  };

  const validationItems = getValidationItems();
  const errorCount = validationItems.filter(item => item.status === "error").length;
  const warningCount = validationItems.filter(item => item.status === "warning").length;
  const validCount = validationItems.filter(item => item.status === "valid").length;
  const totalRequired = validationItems.length;
  const completionPercentage = totalRequired > 0 
    ? Math.round((validCount / totalRequired) * 100)
    : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case "info":
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getOverallStatus = () => {
    if (errorCount > 0) return "error";
    if (warningCount > 0) return "warning";
    if (validCount === totalRequired) return "valid";
    return "incomplete";
  };

  const overallStatus = getOverallStatus();

  if (compact && !isExpanded) {
    return (
      <Card 
        className={cn(
          "cursor-pointer hover:shadow-sm transition-all",
          overallStatus === "error" && "border-red-300",
          overallStatus === "warning" && "border-amber-300",
          overallStatus === "valid" && "border-green-300",
          className
        )}
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(overallStatus)}
              <span className="text-sm font-medium">
                Validation: {completionPercentage}% complete
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-white", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4" />
            Validation Checklist
          </CardTitle>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {validCount} of {totalRequired} complete
            </span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Status Summary */}
        <div className="flex items-center gap-2 mt-3">
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-800">
              {warningCount} warning{warningCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {validCount === totalRequired && (
            <Badge className="text-xs bg-green-100 text-green-800">
              Ready to save
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        <div className="space-y-2">
          {validationItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                "flex items-start gap-2 p-2 rounded-md transition-colors",
                item.status === "error" && "bg-red-50 hover:bg-red-100",
                item.status === "warning" && "bg-amber-50 hover:bg-amber-100",
                item.status === "valid" && "bg-green-50 hover:bg-green-100",
                item.status === "info" && "bg-blue-50 hover:bg-blue-100",
                onFocusSection && "cursor-pointer"
              )}
              onClick={() => {
                if (onFocusSection && item.section) {
                  onFocusSection(item.section);
                }
              }}
            >
              {getStatusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                {item.message && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Hints Section */}
        {validationHints.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-900 mb-1">Tips</p>
                <ul className="space-y-0.5">
                  {validationHints.slice(0, 3).map((hint, idx) => (
                    <li key={idx} className="text-xs text-blue-800">
                      • {hint}
                    </li>
                  ))}
                </ul>
                {validationHints.length > 3 && (
                  <p className="text-xs text-blue-700 mt-1">
                    And {validationHints.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
