"use client";

import { ReactNode } from "react";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="w-full min-h-screen bg-neutral-100 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-800 mb-6">{title}</h1>
        {children}
      </div>
    </div>
  );
}
