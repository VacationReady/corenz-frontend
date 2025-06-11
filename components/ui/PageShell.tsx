// components/ui/PageShell.tsx
"use client";

import React from "react";
import clsx from "clsx";

export function PageShell({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode; // <-- ADD THIS LINE
}) {
  return (
    <div className={clsx("w-full p-6 max-w-7xl mx-auto", className)}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {action && <div>{action}</div>} {/* <-- ADD THIS LINE */}
      </div>
      {children}
    </div>
  );
}
