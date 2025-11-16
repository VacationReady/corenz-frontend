"use client";

import React from "react";
import clsx from "clsx";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { BreadcrumbConfig } from "@/types/breadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

interface PageShellProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbConfig | null; // Added for breadcrumb support
  showHomeIcon?: boolean;
}

export function PageShell({
  title,
  description,
  icon,
  children,
  className,
  action,
  breadcrumbs,
  showHomeIcon = true,
}: PageShellProps) {
  const autoBreadcrumbs = useBreadcrumbs();
  const resolvedBreadcrumbs = breadcrumbs ?? autoBreadcrumbs;

  return (
    <div className={clsx("w-full min-h-screen bg-content-panel", className)}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10">
        <div
          className={clsx(
            "relative overflow-hidden rounded-b-3xl border border-white/40 bg-gradient-to-r from-primary/10 via-sky-100/40 to-transparent shadow-xl backdrop-blur-sm",
            "dark:border-slate-800/80 dark:from-primary/30 dark:via-slate-900/80",
            "before:pointer-events-none before:absolute before:-inset-px before:bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] before:from-primary/40 before:via-primary/0 before:to-transparent before:opacity-60 before:blur-3xl before:content-['']",
            "after:pointer-events-none after:absolute after:-inset-32 after:bg-[conic-gradient(from_90deg_at_50%_50%,var(--tw-gradient-stops))] after:from-transparent after:via-primary/30 after:to-transparent after:opacity-30 after:blur-3xl after:animate-[spin_20s_linear_infinite] after:content-['']"
          )}
        >
          <div className="relative z-10 px-8 py-6">
            {/* Breadcrumbs */}
            {resolvedBreadcrumbs && (
              <div className="mb-4">
                <Breadcrumb items={resolvedBreadcrumbs.items} showHomeIcon={showHomeIcon} />
              </div>
            )}

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center text-primary">
                  {icon && <div className="mr-3 h-6 w-6">{icon}</div>}
                  <h1 className="text-3xl font-bold text-foreground">{title}</h1>
                </div>
                {description && (
                  <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
                )}
              </div>
              {action && (
                <div className="md:self-end">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-foreground shadow-sm backdrop-blur dark:bg-slate-900/40">
                    {action}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 py-6">{children}</div>
    </div>
  );
}
