"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Bug } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import BugSubmissionModal from "./BugSubmissionModal";

/**
 * FloatingBugButton Component
 * 
 * A floating chat-style button fixed to the bottom-right corner
 * that opens the bug submission modal when clicked.
 * Only renders when:
 * 1. User is authenticated (has a session with companyId)
 * 2. BUG_REPORTING feature is enabled for the tenant
 */
export default function FloatingBugButton() {
  const { data: session, status } = useSession();
  const { isFeatureEnabled, isLoading } = useFeatureToggles();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Don't render if not authenticated or no companyId (not in a tenant context)
  const companyId = (session as any)?.user?.companyId;
  if (status !== "authenticated" || !companyId) {
    return null;
  }

  // Don't render if feature is disabled
  if (!isLoading && !isFeatureEnabled(FEATURE_KEYS.BUG_REPORTING)) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Tooltip */}
        <div
          className={`
            absolute bottom-full right-0 mb-2 px-3 py-1.5 
            bg-foreground text-background text-sm font-medium 
            rounded-lg shadow-lg whitespace-nowrap
            transition-all duration-200 ease-out
            ${isHovered && !isModalOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}
          `}
        >
          Report a Bug
          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-foreground" />
        </div>

        {/* Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            group relative flex items-center justify-center
            h-14 w-14 rounded-full
            bg-gradient-to-br from-red-500 to-red-600
            text-white shadow-lg
            hover:from-red-600 hover:to-red-700
            hover:shadow-xl hover:scale-105
            active:scale-95
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          `}
          aria-label="Report a Bug"
        >
          <Bug className="h-6 w-6" />
          
          {/* Pulse animation ring */}
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
        </button>
      </div>

      {/* Bug Submission Modal */}
      <BugSubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Modal handles success toast
        }}
      />
    </>
  );
}
