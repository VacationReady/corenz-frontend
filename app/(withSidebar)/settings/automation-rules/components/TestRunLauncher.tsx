"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, PlayCircle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestRunLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: {
    id?: string;
    name: string;
    description?: string;
    isActive: boolean;
    triggerType: string;
    triggerConfig: any;
    workflowDefinition?: any;
    conditions?: any[];
    actions?: any[];
  };
  onStartTest: (config: {
    skipDelays: boolean;
    inputOverrides?: any;
  }) => void;
  employeesOptions?: { value: string; label: string }[];
  formsOptions?: { value: string; label: string }[];
}

export const TestRunLauncher: React.FC<TestRunLauncherProps> = ({
  open,
  onOpenChange,
  rule,
  onStartTest,
  employeesOptions = [],
  formsOptions = [],
}) => {
  const [skipDelays, setSkipDelays] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [customPayload, setCustomPayload] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!rule) return null;

  const handleStartTest = () => {
    const inputOverrides: any = {};

    if (selectedEmployee) {
      inputOverrides.employeeId = selectedEmployee;
    }

    if (selectedForm) {
      inputOverrides.formId = selectedForm;
    }

    if (customPayload) {
      try {
        const parsed = JSON.parse(customPayload);
        Object.assign(inputOverrides, parsed);
      } catch (e) {
        // Invalid JSON - ignore
      }
    }

    onStartTest({
      skipDelays,
      inputOverrides: Object.keys(inputOverrides).length > 0 ? inputOverrides : undefined,
    });
  };

  const getTriggerDescription = () => {
    switch (rule.triggerType) {
      case "DOCUMENT_EXPIRING":
        return `Document expiring within ${rule.triggerConfig?.daysBefore || 30} days`;
      case "FORM_SUBMITTED":
        return `When form is submitted`;
      case "ONBOARDING_STEP_COMPLETED":
        return `When onboarding step is completed`;
      case "EMPLOYEE_CREATED":
        return `When new employee is created`;
      case "MANUAL":
        return `Manual trigger`;
      default:
        return rule.triggerType;
    }
  };

  const needsEmployeeSelection = ["EMPLOYEE_CREATED", "MANUAL"].includes(
    rule.triggerType
  );
  const needsFormSelection = rule.triggerType === "FORM_SUBMITTED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Run Test</DialogTitle>
              <DialogDescription>
                Configure and execute a dry-run test of this automation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rule Summary */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{rule.name}</h4>
                  {rule.isActive && (
                    <Badge variant="secondary">
                      Active
                    </Badge>
                  )}
                </div>
                {rule.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {rule.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Trigger:</span>
                  <span className="text-muted-foreground">
                    {getTriggerDescription()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          {rule.isActive && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  Test Mode - No Real Changes
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  This is a simulation. No actual notifications will be sent, no
                  tasks will be created, and no data will be modified.
                </p>
              </div>
            </div>
          )}

          {/* Test Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="skip-delays" className="text-sm font-medium">
                  Skip Delays
                </Label>
                <p className="text-xs text-muted-foreground">
                  Run immediately without waiting for configured delays
                </p>
              </div>
              <Switch
                id="skip-delays"
                checked={skipDelays}
                onCheckedChange={setSkipDelays}
              />
            </div>

            {/* Context Selection */}
            {needsEmployeeSelection && employeesOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="employee-select" className="text-sm font-medium">
                  Test Employee (Optional)
                </Label>
                <Select
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                >
                  <SelectTrigger id="employee-select">
                    <SelectValue placeholder="Select an employee to test with" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesOptions.map((emp) => (
                      <SelectItem key={emp.value} value={emp.value}>
                        {emp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Test with a specific employee's data
                </p>
              </div>
            )}

            {needsFormSelection && formsOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="form-select" className="text-sm font-medium">
                  Test Form
                </Label>
                <Select value={selectedForm} onValueChange={setSelectedForm}>
                  <SelectTrigger id="form-select">
                    <SelectValue placeholder="Select a form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formsOptions.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Advanced Options */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAdvanced ? "Hide" : "Show"} Advanced Options
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="custom-payload" className="text-sm font-medium">
                    Custom Trigger Data (JSON)
                  </Label>
                  <Textarea
                    id="custom-payload"
                    value={customPayload}
                    onChange={(e) => setCustomPayload(e.target.value)}
                    placeholder='{"customField": "value"}'
                    className="font-mono text-sm"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Override trigger data with custom JSON payload
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-medium mb-1">What happens during a test?</p>
              <ul className="text-xs space-y-1 text-blue-800">
                <li>• Workflow logic is executed step-by-step</li>
                <li>• All outputs are captured and displayed</li>
                <li>• No real notifications are sent</li>
                <li>• No database changes are made</li>
                <li>• You can see exactly what would happen</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStartTest}>
            <PlayCircle className="w-4 h-4 mr-2" />
            Run Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
