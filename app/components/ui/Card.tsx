import React from "react";
import clsx from "clsx";

export function Card({
  title,
  icon,
  children,
  className,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "bg-white dark:bg-surface-dark rounded-2xl shadow-sm p-6 h-full transition-transform duration-200 hover:scale-[1.02]",
        className
      )}
    >
      {title && (
        <div className="flex items-center mb-4 text-primary">
          {icon && <div className="w-6 h-6 mr-2">{icon}</div>}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}
      <div className="text-sm text-gray-800 dark:text-gray-200 space-y-2">
        {children}
      </div>
    </div>
  );
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="pt-2">{children}</div>;
}
