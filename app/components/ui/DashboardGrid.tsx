"use client";

import React from "react";
import clsx from "clsx";

type DashboardGridProps = {
  children: React.ReactNode;
  className?: string;
};

export default function DashboardGrid({
  children,
  className,
}: DashboardGridProps) {
  return (
    <div
      className={clsx(
        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
