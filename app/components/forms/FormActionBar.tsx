"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useFormContext, FieldErrors } from "react-hook-form";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormActionBarProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

function countErrors(errors: FieldErrors<any>): number {
  const iterate = (value: any): number => {
    if (!value) return 0;
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + iterate(item), 0);
    }
    if (typeof value === "object") {
      if ("message" in value && value.message) {
        return 1;
      }
      return Object.values(value).reduce((sum, item) => sum + iterate(item), 0);
    }
    return 0;
  };
  return iterate(errors);
}

export function FormActionBar({
  children,
  className,
  containerClassName,
}: FormActionBarProps) {
  const { formState } = useFormContext();
  const errorCount = useMemo(() => countErrors(formState.errors), [formState.errors]);
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [expandedWhileKeyboardVisible, setExpandedWhileKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) {
      const fallbackResize = () => {
        if (window.innerWidth > 768) {
          setIsKeyboardOpen(false);
          return;
        }
        const screenHeight = window.screen?.height || window.innerHeight;
        const diff = screenHeight - window.innerHeight;
        setIsKeyboardOpen(diff > 160);
      };
      fallbackResize();
      window.addEventListener("resize", fallbackResize);
      return () => window.removeEventListener("resize", fallbackResize);
    }
    const handleViewportChange = () => {
      if (window.innerWidth > 768) {
        setIsKeyboardOpen(false);
        return;
      }
      const diff = window.innerHeight - viewport.height;
      setIsKeyboardOpen(diff > 120);
    };
    viewport.addEventListener("resize", handleViewportChange);
    viewport.addEventListener("scroll", handleViewportChange);
    handleViewportChange();
    return () => {
      viewport.removeEventListener("resize", handleViewportChange);
      viewport.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!isKeyboardOpen) {
      setExpandedWhileKeyboardVisible(false);
    }
  }, [isKeyboardOpen]);

  const shouldCollapse = isMobile && isKeyboardOpen;
  const isCollapsed = shouldCollapse && !expandedWhileKeyboardVisible;

  const status = useMemo(() => {
    if (errorCount > 0) {
      return {
        tone: "error",
        icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
        text: `${errorCount} ${errorCount === 1 ? "issue" : "issues"} to review`,
        summary: `${errorCount} ${errorCount === 1 ? "issue" : "issues"}`,
        textClass: "text-destructive",
      } as const;
    }
    if (formState.isDirty) {
      return {
        tone: "dirty",
        icon: <Clock className="h-4 w-4" aria-hidden="true" />,
        text: "You have unsaved changes",
        summary: "Unsaved",
        textClass: "text-amber-600",
      } as const;
    }
    return {
      tone: "clean",
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
      text: "All changes saved",
      summary: "Saved",
      textClass: "text-muted-foreground",
    } as const;
  }, [errorCount, formState.isDirty]);

  const safeAreaStyle = {
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
  } as const;

  return (
    <div className="pointer-events-none">
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 px-3 sm:px-6",
          containerClassName,
        )}
      >
        <div
          style={safeAreaStyle}
          className={cn(
            "mx-auto w-full max-w-5xl transition-transform duration-300 pointer-events-auto",
            isCollapsed ? "translate-y-[calc(100%-3.25rem)]" : "translate-y-0",
          )}
        >
          <div
            className={cn(
              "rounded-t-2xl border border-border/80 bg-content-panel/95 shadow-lg supports-[backdrop-filter]:backdrop-blur-lg",
              className,
            )}
          >
            {shouldCollapse && isCollapsed ? (
              <button
                type="button"
                onClick={() => setExpandedWhileKeyboardVisible(true)}
                className="flex w-full items-center justify-between gap-3 rounded-t-2xl px-4 py-3 text-sm font-medium text-foreground"
              >
                <span className="flex items-center gap-2">
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  Show actions
                </span>
                <span className={cn("flex items-center gap-2 text-xs", status.textClass)}>
                  {status.icon}
                  <span>{status.summary}</span>
                </span>
              </button>
            ) : (
              <>
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      role="status"
                      aria-live="polite"
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium",
                        status.textClass,
                      )}
                    >
                      {status.icon}
                      <span>{status.text}</span>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 text-sm">
                      {children}
                    </div>
                  </div>
                </div>
                {shouldCollapse && (
                  <button
                    type="button"
                    onClick={() => setExpandedWhileKeyboardVisible(false)}
                    className="flex w-full items-center justify-center gap-2 border-t border-border/70 bg-content-panel/90 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    Hide actions
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
