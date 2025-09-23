"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Info, Lightbulb, AlertCircle, Video, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface SmartTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  example?: string;
  videoUrl?: string;
  learnMoreUrl?: string;
  tips?: string[];
  warning?: string;
  variant?: "info" | "help" | "warning" | "tip";
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  showIcon?: boolean;
  interactive?: boolean;
}

const variantIcons = {
  info: Info,
  help: HelpCircle,
  warning: AlertCircle,
  tip: Lightbulb,
};

export function SmartTooltip({
  children,
  title,
  description,
  example,
  videoUrl,
  learnMoreUrl,
  tips,
  warning,
  variant = "help",
  side = "top",
  align = "center",
  className,
  showIcon = true,
  interactive = false,
}: SmartTooltipProps) {
  const Icon = variantIcons[variant];
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 cursor-help",
              className
            )}
            onMouseEnter={() => !interactive && setIsOpen(true)}
            onMouseLeave={() => !interactive && setIsOpen(false)}
            onClick={() => interactive && setIsOpen(!isOpen)}
          >
            {children}
            {showIcon && (
              <Icon
                className={cn(
                  "h-4 w-4 opacity-50 hover:opacity-100 transition-opacity",
                  variant === "warning" && "text-orange-500",
                  variant === "tip" && "text-blue-500"
                )}
              />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn(
            "max-w-sm p-4 space-y-3",
            interactive && "pointer-events-auto"
          )}
          onPointerDownOutside={() => interactive && setIsOpen(false)}
        >
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">{title}</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* Example */}
          {example && (
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs font-medium mb-1">Example:</p>
              <p className="text-xs text-muted-foreground">{example}</p>
            </div>
          )}

          {/* Tips */}
          {tips && tips.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Pro Tips:
              </p>
              <ul className="space-y-1">
                {tips.map((tip, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning */}
          {warning && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md p-2">
              <p className="text-xs text-orange-700 dark:text-orange-400 flex items-start gap-1">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          {(videoUrl || learnMoreUrl) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {videoUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => window.open(videoUrl, "_blank")}
                >
                  <Video className="h-3 w-3 mr-1" />
                  Watch Video
                </Button>
              )}
              {learnMoreUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => window.open(learnMoreUrl, "_blank")}
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Learn More
                </Button>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Preset configurations for common use cases
export const tooltipPresets = {
  workingPattern: {
    title: "Working Patterns",
    description: "Define standard work schedules for your organization. This affects leave calculations and availability tracking.",
    example: "Mon-Fri 9-5 with 1-hour lunch break",
    tips: [
      "Create multiple patterns for different departments",
      "Patterns can rotate weekly or monthly",
      "Affects holiday entitlement calculations"
    ],
  },
  leavePolicy: {
    title: "Leave Policies",
    description: "Set rules for how leave is earned, requested, and approved. Controls accrual rates and eligibility.",
    example: "20 days annual leave, accruing 1.67 days per month",
    tips: [
      "Different policies can apply to different employee groups",
      "Consider probation periods and part-time workers",
      "Service length can affect entitlements"
    ],
    warning: "Changes to active policies affect all assigned employees immediately",
  },
  approvalWorkflow: {
    title: "Approval Workflows",
    description: "Configure who needs to approve requests and in what order. Supports multi-stage approvals.",
    example: "Manager → HR → Director for requests over 10 days",
    tips: [
      "Use conditional logic based on request type or duration",
      "Set up auto-approval for certain scenarios",
      "Configure escalation if approvers don't respond"
    ],
  },
  automation: {
    title: "Automation Rules",
    description: "Create triggers and actions to automate repetitive HR tasks. Reduces manual work and ensures consistency.",
    example: "Send reminder email 30 days before document expires",
    tips: [
      "Test rules with dry-run before activating",
      "Start simple and add complexity gradually",
      "Monitor automation logs regularly"
    ],
    videoUrl: "/help/automation-setup",
  },
};

// Quick helper component for inline help
export function QuickHelp({
  preset,
  children,
  ...props
}: {
  preset: keyof typeof tooltipPresets;
  children?: React.ReactNode;
} & Partial<SmartTooltipProps>) {
  const config = tooltipPresets[preset];
  return (
    <SmartTooltip {...config} {...props}>
      {children || <span />}
    </SmartTooltip>
  );
}
