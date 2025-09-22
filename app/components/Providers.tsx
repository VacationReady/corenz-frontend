"use client";

import React, { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import ErrorBoundary from "./ErrorBoundary";
import ChunkErrorHandler from "./ChunkErrorHandler";
import { CommandPaletteMount } from "./CommandPaletteMount";
import TenantSupportLauncher from "./support/TenantSupportLauncher";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ChunkErrorHandler />
      <SessionProvider>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            className: "shadow-glass border-glass rounded-2xl",
            style: {
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(16px)",
              color: "hsl(var(--card-foreground))",
              border: "1px solid rgba(255, 255, 255, 0.4)",
            },
          }}
        />
        <CommandPaletteMount />
        <TenantSupportLauncher />
      </SessionProvider>
    </ErrorBoundary>
  );
}


