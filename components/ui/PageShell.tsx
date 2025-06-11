import React from "react";

export function PageShell({
  title,
  icon,
  children,
  className,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`w-full p-6 ${className || ""}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center text-indigo-700">
          {icon && <div className="w-5 h-5 mr-2">{icon}</div>}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
