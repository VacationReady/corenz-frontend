"use client";

import React, { useState } from "react";
import { Bug } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import BugSubmissionModal from "./BugSubmissionModal";

interface ReportBugButtonProps {
  className?: string;
}

/**
 * ReportBugButton Component
 * 
 * A subtle icon button that opens the bug submission modal.
 * Only renders when the BUG_REPORTING feature is enabled for the tenant.
 * 
 * Requirements: 1.2, 2.1
 */
export default function ReportBugButton({ className }: ReportBugButtonProps) {
  const { isFeatureEnabled, isLoading } = useFeatureToggles();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't render if feature is disabled or still loading
  if (isLoading) {
    return null;
  }

  if (!isFeatureEnabled(FEATURE_KEYS.BUG_REPORTING)) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`
              glass-subtle relative h-10 w-10 rounded-xl p-0 
              flex items-center justify-center 
              text-muted-foreground hover:text-foreground 
              hover-glass transition-glass
              ${className || ""}
            `}
            aria-label="Report a Bug"
          >
            <Bug className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Report a Bug</p>
        </TooltipContent>
      </Tooltip>

      <BugSubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Modal handles success toast
        }}
      />
    </TooltipProvider>
  );
}
