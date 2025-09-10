"use client";

import React from "react";

export function WidgetLoading({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, idx) => (
        <div key={idx} className={`h-4 bg-muted animate-pulse rounded ${idx === 0 ? "w-full" : "w-2/3"}`} />
      ))}
    </div>
  );
}

export function WidgetError({ message = "Something went wrong.", children }: { message?: string; children?: React.ReactNode }) {
  return (
    <div className="text-sm text-muted-foreground">
      {message} {children}
    </div>
  );
}


