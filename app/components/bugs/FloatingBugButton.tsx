"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bug, Plus, List } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import BugSubmissionModal from "./BugSubmissionModal";

/**
 * FloatingBugButton Component
 * 
 * A floating chat-style button fixed to the bottom-right corner
 * that shows a menu with options to:
 * 1. Report a new bug
 * 2. View existing bug reports
 * 
 * Only renders when:
 * 1. User is authenticated (has a session with companyId)
 * 2. BUG_REPORTING feature is enabled for the tenant
 */
export default function FloatingBugButton() {
  const { data: session, status } = useSession();
  const { isFeatureEnabled, isLoading } = useFeatureToggles();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside - must be before any conditional returns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Don't render if not authenticated or no companyId (not in a tenant context)
  const companyId = (session as any)?.user?.companyId;
  if (status !== "authenticated" || !companyId) {
    return null;
  }

  // Don't render if feature is disabled
  if (!isLoading && !isFeatureEnabled(FEATURE_KEYS.BUG_REPORTING)) {
    return null;
  }

  const handleReportBug = () => {
    setIsMenuOpen(false);
    setIsModalOpen(true);
  };

  const handleViewBugs = () => {
    setIsMenuOpen(false);
    router.push("/bugs");
  };

  return (
    <>
      {/* Floating Button Container */}
      <div className="fixed bottom-6 right-6 z-50" ref={menuRef}>
        {/* Tooltip - only show when not menu open */}
        <div
          className={`
            absolute bottom-full right-0 mb-2 px-3 py-1.5 
            bg-foreground text-background text-sm font-medium 
            rounded-lg shadow-lg whitespace-nowrap
            transition-all duration-200 ease-out
            ${isHovered && !isMenuOpen && !isModalOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}
          `}
        >
          Bug Reports
          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-foreground" />
        </div>

        {/* Popup Menu */}
        <div
          className={`
            absolute bottom-full right-0 mb-3 
            bg-background border border-border rounded-xl shadow-xl
            overflow-hidden min-w-[200px]
            transition-all duration-200 ease-out origin-bottom-right
            ${isMenuOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
          `}
        >
          <div className="p-1">
            <button
              type="button"
              onClick={handleReportBug}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 text-red-500" />
              Report a Bug
            </button>
            <button
              type="button"
              onClick={handleViewBugs}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <List className="h-4 w-4 text-blue-500" />
              View My Bug Reports
            </button>
          </div>
        </div>

        {/* Main Button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
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
            ${isMenuOpen ? "from-red-600 to-red-700 scale-105" : ""}
          `}
          aria-label="Bug Reports Menu"
          aria-expanded={isMenuOpen}
        >
          <Bug className="h-6 w-6" />
          
          {/* Pulse animation ring - only when menu is closed */}
          {!isMenuOpen && (
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
          )}
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
