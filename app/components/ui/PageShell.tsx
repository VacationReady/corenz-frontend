import React from "react";
import clsx from "clsx";

interface PageShellProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function PageShell({
  title,
  description,
  icon,
  children,
  className,
  action,
}: PageShellProps) {
  return (
    <div className={clsx("w-full min-h-screen bg-content-panel", className)}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-content-panel border-b border-enhanced backdrop-blur-sm">
        <div className="px-8 py-6">
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
