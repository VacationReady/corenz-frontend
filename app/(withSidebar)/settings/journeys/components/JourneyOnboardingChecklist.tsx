"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  Route,
  Target,
  Users,
  Play,
  BarChart3,
  X,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface JourneyOnboardingChecklistProps {
  onDismiss?: () => void;
  onCreateJourney?: () => void;
  onViewTemplates?: () => void;
  onViewAnalytics?: () => void;
  hasJourneys?: boolean;
  hasPublishedJourneys?: boolean;
  hasInstances?: boolean;
}

export const JourneyOnboardingChecklist: React.FC<JourneyOnboardingChecklistProps> = ({
  onDismiss,
  onCreateJourney,
  onViewTemplates,
  onViewAnalytics,
  hasJourneys = false,
  hasPublishedJourneys = false,
  hasInstances = false,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const checklistItems: ChecklistItem[] = [
    {
      id: "create-first-journey",
      title: "Create your first journey template",
      description: "Design an employee lifecycle program with AI-powered guidance",
      icon: <Route className="w-5 h-5" />,
      completed: hasJourneys,
      action: onCreateJourney
        ? {
            label: "Create Journey",
            onClick: onCreateJourney,
          }
        : undefined,
    },
    {
      id: "define-milestones",
      title: "Define success metrics",
      description: "Set target completion rates and satisfaction scores",
      icon: <Target className="w-5 h-5" />,
      completed: hasJourneys && hasPublishedJourneys,
      action: hasJourneys && !hasPublishedJourneys
        ? {
            label: "View Journeys",
            onClick: () => {},
          }
        : undefined,
    },
    {
      id: "publish-journey",
      title: "Publish and activate",
      description: "Make your journey live for employees to start experiencing",
      icon: <Play className="w-5 h-5" />,
      completed: hasPublishedJourneys,
      action:
        hasJourneys && !hasPublishedJourneys
          ? {
              label: "Review Drafts",
              onClick: () => {},
            }
          : undefined,
    },
    {
      id: "assign-employees",
      title: "Assign to employees",
      description: "Roll out your journey to target employee groups",
      icon: <Users className="w-5 h-5" />,
      completed: hasInstances,
      action:
        hasPublishedJourneys && !hasInstances
          ? {
              label: "Assign Journey",
              onClick: () => {},
            }
          : undefined,
    },
    {
      id: "track-progress",
      title: "Monitor and optimise",
      description: "Track metrics and improve based on insights",
      icon: <BarChart3 className="w-5 h-5" />,
      completed: hasInstances,
      action:
        hasInstances && onViewAnalytics
          ? {
              label: "View Analytics",
              onClick: onViewAnalytics,
            }
          : undefined,
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  if (isDismissed) {
    return null;
  }

  // Show full checklist if not complete, otherwise show compact completion card
  const isComplete = completedCount === totalCount;

  if (isComplete) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 mb-1">
                  🎉 You're all set up!
                </h3>
                <p className="text-sm text-green-800">
                  Your journey system is configured and running. Keep optimising for better
                  outcomes.
                </p>
              </div>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  setIsDismissed(true);
                  onDismiss();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Get Started with Journeys</CardTitle>
              <CardDescription className="mt-1">
                Set up your employee lifecycle programs in 5 steps
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                setIsDismissed(true);
                onDismiss();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {completedCount} of {totalCount} completed
            </span>
            <span className="font-medium text-blue-900">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2 bg-blue-100" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {checklistItems.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-all",
                item.completed
                  ? "bg-green-100/50 border border-green-200"
                  : "bg-white border border-blue-200 hover:border-blue-300"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4
                      className={cn(
                        "text-sm font-medium",
                        item.completed ? "text-green-900" : "text-gray-900"
                      )}
                    >
                      {item.title}
                    </h4>
                    <p
                      className={cn(
                        "text-xs mt-0.5",
                        item.completed ? "text-green-700" : "text-gray-600"
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                  {item.action && !item.completed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={item.action.onClick}
                    >
                      {item.action.label}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-900 mb-1">Pro Tip</p>
              <p className="text-xs text-blue-800">
                {completedCount === 0 &&
                  "Start with a simple onboarding journey. You can always add complexity later."}
                {completedCount > 0 &&
                  completedCount < 3 &&
                  "Use AI guidance to optimise your journey phases and experience blocks."}
                {completedCount >= 3 &&
                  !isComplete &&
                  "Monitor key metrics like completion rate and time-to-complete to identify bottlenecks."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
