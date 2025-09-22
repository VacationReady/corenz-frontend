"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  AlertTriangle,
  CheckCircle2,
  Zap,
  Filter,
  PlayCircle,
  TestTube,
  Rocket,
  Shield,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreflightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    name: string;
    triggerType: string;
    conditions?: any[];
    actions: any[];
    isActive: boolean;
  };
  postSaveRunTest: boolean;
  onPostSaveRunTestChange: (value: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  getTriggerTypeInfo?: (type: string) => any;
}

export const PreflightDialog: React.FC<PreflightDialogProps> = ({
  open,
  onOpenChange,
  formData,
  postSaveRunTest,
  onPostSaveRunTestChange,
  onConfirm,
  onCancel,
  getTriggerTypeInfo,
}) => {
  const triggerInfo = getTriggerTypeInfo ? getTriggerTypeInfo(formData.triggerType) : null;

  const getImpactLevel = () => {
    const actionCount = formData.actions?.length || 0;
    const hasNotifications = formData.actions?.some((a: any) => a.type === "send_notification");
    const hasDataUpdates = formData.actions?.some((a: any) => a.type === "update_field");
    
    if (hasDataUpdates || actionCount > 3) return "high";
    if (hasNotifications || actionCount > 1) return "medium";
    return "low";
  };

  const impactLevel = getImpactLevel();
  const impactConfig = {
    high: {
      color: "text-red-600 bg-red-100 border-red-200",
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "High Impact",
      description: "This rule will make significant changes. Test thoroughly before activating.",
    },
    medium: {
      color: "text-amber-600 bg-amber-100 border-amber-200",
      icon: <Info className="w-4 h-4" />,
      label: "Medium Impact",
      description: "This rule will send notifications or create tasks. Review carefully.",
    },
    low: {
      color: "text-green-600 bg-green-100 border-green-200",
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: "Low Impact",
      description: "This rule has minimal impact. Safe to activate.",
    },
  }[impactLevel];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Ready to Activate?</DialogTitle>
              <DialogDescription>
                Review your automation before it goes live
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rule Summary */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-600" />
                Rule Summary
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Name</p>
                  <p className="text-sm text-gray-900">{formData.name || "Untitled Rule"}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-xs font-medium text-gray-600">Trigger</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {triggerInfo?.name || formData.triggerType || "Not set"}
                    </p>
                  </div>
                  
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Filter className="w-3.5 h-3.5 text-amber-600" />
                      <p className="text-xs font-medium text-gray-600">Conditions</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formData.conditions?.length || 0}
                    </p>
                  </div>
                  
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <PlayCircle className="w-3.5 h-3.5 text-green-600" />
                      <p className="text-xs font-medium text-gray-600">Actions</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formData.actions?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact Assessment */}
          <Card className={cn("border", impactConfig.color)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", impactConfig.color)}>
                  {impactConfig.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium flex items-center gap-2">
                    Impact Assessment
                    <Badge className={cn("text-xs", impactConfig.color)}>
                      {impactConfig.label}
                    </Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {impactConfig.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Recommendations</h4>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Switch
                checked={postSaveRunTest}
                onChange={onPostSaveRunTestChange}
              />
              <Label className="flex-1 cursor-pointer" onClick={() => onPostSaveRunTestChange(!postSaveRunTest)}>
                <div className="flex items-start gap-2">
                  <TestTube className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Run test after saving
                    </p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Simulate the rule execution to verify it works as expected
                    </p>
                  </div>
                </div>
              </Label>
            </div>

            {formData.isActive && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      Activating immediately
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      This rule will start running automatically after saving. 
                      {impactLevel === "high" && " Consider testing first before activation."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checklist */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Pre-flight Checklist</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Rule has a descriptive name</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {formData.triggerType ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-gray-700">Trigger is configured</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {formData.actions?.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-gray-700">At least one action is defined</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {postSaveRunTest || !formData.isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="text-gray-700">
                    {postSaveRunTest ? "Will test before activation" : 
                     !formData.isActive ? "Rule will be saved as inactive" :
                     "Consider running a test"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Back to Editor
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={onConfirm}
              className={cn(
                "min-w-[120px]",
                formData.isActive && !postSaveRunTest && impactLevel === "high" 
                  ? "bg-red-600 hover:bg-red-700" 
                  : ""
              )}
            >
              {postSaveRunTest ? (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Save & Test
                </>
              ) : formData.isActive ? (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Activate Now
                </>
              ) : (
                "Save Draft"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
