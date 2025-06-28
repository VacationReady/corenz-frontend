"use client";

import { Card } from "./Card";
import { LucideIcon } from "lucide-react";

type DashboardWidgetProps = {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode; // Added to allow top-right actions
};

export function DashboardWidget({
  title,
  icon: Icon,
  children,
  className,
  action,
}: DashboardWidgetProps) {
  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-800 font-semibold">
            <Icon className="w-5 h-5 text-indigo-700" />
            <span>{title}</span>
          </div>
          {action && <div>{action}</div>}
        </div>
      }
      className={className}
    >
      <div className="text-gray-800 dark:text-gray-200">{children}</div>
    </Card>
  );
}
