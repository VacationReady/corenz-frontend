import Card from "./Card";
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
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-indigo-700" />
          <span>{title}</span>
        </div>
      }
      className={className}
    >
      {children}
    </Card>
  );
}
