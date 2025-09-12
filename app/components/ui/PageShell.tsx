import React from "react";
import clsx from "clsx";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { BreadcrumbConfig } from "@/types/breadcrumb";

interface PageShellProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbConfig; // Added for breadcrumb support
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
  return (
    <div className={clsx("w-full min-h-screen bg-content-panel", className)}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-content-panel border-b border-enhanced backdrop-blur-sm">
        <div className="px-8 py-6">
          {/* Breadcrumbs */}
          {breadcrumbs && (
            <div className="mb-4">
              <Breadcrumb items={breadcrumbs.items} showHomeIcon={showHomeIcon} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-primary mb-2">
                {icon && <div className="w-6 h-6 mr-3">{icon}</div>}
                <h1 className="text-3xl font-bold text-foreground">{title}</h1>
              </div>
              {description && (
                <p className="text-muted-foreground text-base leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 py-6">{children}</div>
    </div>
  );
}
