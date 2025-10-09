"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  User,
  UserCheck,
  Users,
  ArrowUp,
  TrendingUp,
  Building,
  Plus,
  Trash2,
  Info,
  Lightbulb,
} from "lucide-react";
import {
  TemplateType,
  ReviewerRole,
  ReviewerAssignment,
  TEMPLATE_TYPE_INFO,
  REVIEWER_ROLE_INFO,
} from "@/types/performance-templates";

interface ReviewerAssignmentStepProps {
  templateType: TemplateType;
  assignments: ReviewerAssignment[];
  onChange: (assignments: ReviewerAssignment[]) => void;
}

const ICON_MAP: Record<string, any> = {
  User,
  UserCheck,
  Users,
  ArrowUp,
  TrendingUp,
  Building,
};

export function ReviewerAssignmentStep({
  templateType,
  assignments,
  onChange,
}: ReviewerAssignmentStepProps) {
  const [showTips, setShowTips] = useState(true);

  const defaultReviewers = TEMPLATE_TYPE_INFO[templateType]?.defaultReviewers || [];

  // Initialize with defaults if empty
  if (assignments.length === 0 && defaultReviewers.length > 0) {
    const defaultAssignments: ReviewerAssignment[] = defaultReviewers.map((role, index) => ({
      role,
      dueOffsetDays: index === 0 ? 0 : 7,
      isRequired: role === "SELF" || role === "MANAGER",
    }));
    onChange(defaultAssignments);
  }

  const addReviewer = (role: ReviewerRole) => {
    const newAssignment: ReviewerAssignment = {
      role,
      dueOffsetDays: 7,
      isRequired: false,
    };
    onChange([...assignments, newAssignment]);
  };

  const removeReviewer = (index: number) => {
    onChange(assignments.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, updates: Partial<ReviewerAssignment>) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], ...updates };
    onChange(newAssignments);
  };

  const availableRoles = Object.keys(REVIEWER_ROLE_INFO).filter(
    (role) => !assignments.some((a) => a.role === role)
  ) as ReviewerRole[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Reviewers</CardTitle>
          <CardDescription>
            Define who will provide feedback and when reviews are due relative to the cycle start.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Banner */}
          {showTips && (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Reviewer Configuration Tips</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  • <strong>Due offset days</strong> determine when each review is due (e.g., self review due immediately, manager review due 7 days later)
                </p>
                <p className="text-sm">
                  • <strong>Required reviews</strong> must be completed for the cycle to be marked as complete
                </p>
                <p className="text-sm">
                  • For <strong>360° reviews</strong>, consider peer and direct report feedback with min/max reviewers
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTips(false)}
                  className="mt-2"
                >
                  Got it
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Current Assignments */}
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No reviewers configured yet</p>
                <p className="text-xs mt-1">Add reviewers to define your feedback flow</p>
              </div>
            ) : (
              assignments.map((assignment, index) => {
                const roleInfo = REVIEWER_ROLE_INFO[assignment.role];
                const Icon = ICON_MAP[roleInfo.icon];

                return (
                  <Card key={index} className="border-2">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{roleInfo.label}</h4>
                                {assignment.isRequired && (
                                  <Badge variant="destructive" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {roleInfo.description}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReviewer(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Configuration */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label className="text-xs font-medium mb-2">
                              Due Offset (Days)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={assignment.dueOffsetDays || 0}
                              onChange={(e) =>
                                updateAssignment(index, {
                                  dueOffsetDays: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Days after cycle starts
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`required-${index}`}
                              checked={assignment.isRequired || false}
                              onChange={(e) =>
                                updateAssignment(index, {
                                  isRequired: e.target.checked,
                                })
                              }
                              className="rounded"
                            />
                            <Label htmlFor={`required-${index}`} className="text-sm">
                              Required for completion
                            </Label>
                          </div>
                        </div>

                        {/* Peer/Direct Report specific fields */}
                        {(assignment.role === "PEER" ||
                          assignment.role === "DIRECT_REPORT") && (
                          <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                            <div>
                              <Label className="text-xs font-medium mb-2">
                                Min Reviewers
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                value={assignment.minReviewers || 0}
                                onChange={(e) =>
                                  updateAssignment(index, {
                                    minReviewers: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium mb-2">
                                Max Reviewers
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                value={assignment.maxReviewers || 0}
                                onChange={(e) =>
                                  updateAssignment(index, {
                                    maxReviewers: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Tip */}
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs">
                            <strong>{roleInfo.tipTitle}:</strong> {roleInfo.tipContent}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Add Reviewer */}
          {availableRoles.length > 0 && (
            <div className="pt-4 border-t">
              <Label className="text-sm font-semibold mb-3 block">
                Add More Reviewers
              </Label>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {availableRoles.map((role) => {
                  const roleInfo = REVIEWER_ROLE_INFO[role];
                  const Icon = ICON_MAP[roleInfo.icon];

                  return (
                    <button
                      key={role}
                      onClick={() => addReviewer(role)}
                      className="p-3 text-left rounded-lg border border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{roleInfo.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Preview */}
      {assignments.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Review Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignments
                .sort((a, b) => (a.dueOffsetDays || 0) - (b.dueOffsetDays || 0))
                .map((assignment, index) => {
                  const roleInfo = REVIEWER_ROLE_INFO[assignment.role];
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="text-sm font-medium text-primary min-w-[60px]">
                        Day {assignment.dueOffsetDays || 0}
                      </div>
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{roleInfo.label}</span>
                        {assignment.isRequired && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
