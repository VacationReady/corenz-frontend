"use client";

import { Card } from "./Card";
import { LucideIcon } from "lucide-react";

type DashboardWidgetProps = {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
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
      title={title}
      icon={<Icon className="w-5 h-5 text-primary" />}
      action={action}
      className={className}
    >
      {children}
    </Card>
  );
}
