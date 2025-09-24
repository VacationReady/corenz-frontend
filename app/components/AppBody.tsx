"use client";

import { CSSProperties, ReactNode } from "react";
import { Toaster } from "sonner";
import { useTenantTheme } from "../lib/tenant-theme";
import { createTenantCssVariables } from "../lib/tenant-theme-config";

export function AppBody({
  children,
  fontClassName,
}: {
  children: ReactNode;
  fontClassName: string;
}) {
  const { palette } = useTenantTheme();
  const cssVariables = createTenantCssVariables(palette) as CSSProperties;

  return (
    <body
      className={`${fontClassName} min-h-screen font-sans text-foreground antialiased relative`}
      style={cssVariables}
    >
      <div className="fixed inset-0 bg-gradient-landscape pointer-events-none z-0" />
      <div className="relative z-10">
        {children}
        {/* Toaster and CommandPaletteMount are mounted in Providers to avoid duplicates */}
      </div>
    </body>
  );
}
