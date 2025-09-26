"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <body
      className={`${fontClassName} min-h-screen font-sans text-foreground antialiased relative overflow-x-hidden`}
      style={cssVariables}
    >
      {/* Layered background system for depth and richness */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Base gradient layer */}
        <div className="absolute inset-0 bg-gradient-landscape opacity-60" />
        
        {/* Aurora overlay for color richness */}
        {mounted && (
          <div className="absolute inset-0 bg-aurora opacity-30" />
        )}
        
        {/* Subtle noise texture for depth */}
        <div 
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='5' /%3E%3C/filter%3E%3C/defs%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          }}
        />

        {/* Radial gradient vignette for focus */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.02) 100%)`,
          }}
        />
        
        {/* Top light accent */}
        {mounted && (
          <div 
            className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[200%] h-[100%] opacity-40"
            style={{
              background: `radial-gradient(ellipse at center, hsl(var(--primary) / 0.1) 0%, transparent 50%)`,
              filter: 'blur(100px)',
            }}
          />
        )}
      </div>

      {/* Main content layer */}
      <div className="relative z-10 min-h-screen">
        {children}
        {/* Toaster and CommandPaletteMount are mounted in Providers to avoid duplicates */}
      </div>
    </body>
  );
}
