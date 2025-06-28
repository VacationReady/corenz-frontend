'use client';

import { Card } from "./Card";
import { LucideIcon } from "lucide-react";

type DashboardWidgetProps = {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
};

export function DashboardWidget({ title, icon: Icon, children, className }: DashboardWidgetProps) {
  return (
    <Card
      title={
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold">
          <Icon className="w-5 h-5 text-primary" />
          <span>{title}</span>
        </div>
      }
      className={`hover:shadow-md transition-transform hover:-translate-y-0.5 ${className || ""}`}
    >
      <div className="text-gray-800 dark:text-gray-200">{children}</div>
    </Card>
  );
}
