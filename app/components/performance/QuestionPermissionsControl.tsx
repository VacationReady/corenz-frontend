"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ReviewerRole, REVIEWER_ROLE_INFO } from "@/types/performance-templates";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Shield, 
  CheckCircle2, 
  Circle,
  Info
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface QuestionPermissionsControlProps {
  visibleToRoles?: ReviewerRole[];
  requiredFromRoles?: ReviewerRole[];
  hideFromEmployee?: boolean;
  availableRoles: ReviewerRole[];
  onChange: (permissions: {
    visibleToRoles: ReviewerRole[];
    requiredFromRoles: ReviewerRole[];
    hideFromEmployee: boolean;
  }) => void;
}

export function QuestionPermissionsControl({
  visibleToRoles = [],
  requiredFromRoles = [],
  hideFromEmployee = false,
  availableRoles,
  onChange,
}: QuestionPermissionsControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleVisibleRole = (role: ReviewerRole) => {
    const newVisible = visibleToRoles.includes(role)
      ? visibleToRoles.filter((r) => r !== role)
      : [...visibleToRoles, role];
    
    // If removing from visible, also remove from required
    const newRequired = newVisible.includes(role)
      ? requiredFromRoles
      : requiredFromRoles.filter((r) => r !== role);

    onChange({
      visibleToRoles: newVisible,
      requiredFromRoles: newRequired,
      hideFromEmployee,
    });
  };

  const toggleRequiredRole = (role: ReviewerRole) => {
    // Can only require if already visible
    if (!visibleToRoles.includes(role)) {
      return;
    }

    const newRequired = requiredFromRoles.includes(role)
      ? requiredFromRoles.filter((r) => r !== role)
      : [...requiredFromRoles, role];

    onChange({
      visibleToRoles,
      requiredFromRoles: newRequired,
      hideFromEmployee,
    });
  };

  const toggleHideFromEmployee = (checked: boolean) => {
    onChange({
      visibleToRoles,
      requiredFromRoles,
      hideFromEmployee: checked,
    });
  };

  const setAllRoles = () => {
    onChange({
      visibleToRoles: availableRoles,
      requiredFromRoles: availableRoles,
      hideFromEmployee,
    });
  };

  const clearAllRoles = () => {
    onChange({
      visibleToRoles: [],
      requiredFromRoles: [],
      hideFromEmployee: false,
    });
  };

  const getStatusSummary = () => {
    if (hideFromEmployee) {
      return (
        <Badge variant="destructive" className="text-xs">
          <EyeOff className="mr-1 h-3 w-3" />
          Hidden from Employee
        </Badge>
      );
    }
    
    if (requiredFromRoles.length === 0 && visibleToRoles.length === 0) {
      return (
        <Badge variant="outline" className="text-xs">
          <Eye className="mr-1 h-3 w-3" />
          Visible to All
        </Badge>
      );
    }

    if (requiredFromRoles.length > 0) {
      return (
        <Badge variant="default" className="text-xs">
          <Shield className="mr-1 h-3 w-3" />
          {requiredFromRoles.length} Required
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-xs">
        <Eye className="mr-1 h-3 w-3" />
        {visibleToRoles.length} Visible
      </Badge>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
        >
          <Shield className="h-3.5 w-3.5" />
          Permissions
          {getStatusSummary()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-semibold text-sm mb-1">Question Permissions</h4>
            <p className="text-xs text-muted-foreground">
              Control who can see and answer this question
            </p>
          </div>

          <Separator />

          {/* Hide from Employee Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-start gap-2">
              <EyeOff className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <Label htmlFor="hide-employee" className="text-sm font-medium cursor-pointer">
                  Hide from Employee
                </Label>
                <p className="text-xs text-muted-foreground">
                  Employee won't see this question at all
                </p>
              </div>
            </div>
            <Switch
              id="hide-employee"
              checked={hideFromEmployee}
              onCheckedChange={toggleHideFromEmployee}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={setAllRoles}
              className="flex-1 text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllRoles}
              className="flex-1 text-xs"
            >
              Clear All
            </Button>
          </div>

          <Separator />

          {/* Role Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Click once to make <strong>visible</strong>, twice to make <strong>required</strong>
              </p>
            </div>

            {availableRoles.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No reviewer roles configured in this template</p>
                <p className="mt-1">Go to the Reviewers step to add roles</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {availableRoles.map((role) => {
                  const roleInfo = REVIEWER_ROLE_INFO[role];
                  const isVisible = visibleToRoles.includes(role);
                  const isRequired = requiredFromRoles.includes(role);

                  return (
                    <button
                      key={role}
                      onClick={() => {
                        if (!isVisible) {
                          toggleVisibleRole(role);
                        } else if (!isRequired) {
                          toggleRequiredRole(role);
                        } else {
                          toggleRequiredRole(role);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-md border transition-all ${
                        isRequired
                          ? "bg-primary/10 border-primary hover:bg-primary/15"
                          : isVisible
                          ? "bg-muted border-muted-foreground/30 hover:bg-muted/80"
                          : "bg-background border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isRequired ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : isVisible ? (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                        <div className="text-left">
                          <div className="text-sm font-medium">{roleInfo.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {roleInfo.description}
                          </div>
                        </div>
                      </div>
                      <div>
                        {isRequired && (
                          <Badge variant="default" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {isVisible && !isRequired && (
                          <Badge variant="outline" className="text-xs">
                            Visible
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Circle className="h-3 w-3" />
                <span>Not visible</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>Read-only</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Must answer</span>
              </div>
              <div className="flex items-center gap-1.5 text-destructive">
                <EyeOff className="h-3 w-3" />
                <span>Hidden</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

