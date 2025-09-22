"use client";

import { ReactNode } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import ErrorBoundary from "./ErrorBoundary";
import ChunkErrorHandler from "./ChunkErrorHandler";
import { TenantThemeProvider } from "../lib/tenant-theme";
import { TenantThemePalette } from "../lib/tenant-theme-config";
import { CommandPaletteMount } from "./CommandPaletteMount";
import TenantSupportLauncher from "./support/TenantSupportLauncher";
import { TenantBrandingProvider } from "./TenantBrandingProvider";
import { Toaster } from "sonner";

interface ProvidersProps {
  children: ReactNode;
  initialTenantId: string;
  initialPalette: TenantThemePalette;
}

export default function Providers({
  children,
  initialTenantId,
  initialPalette,
}: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ChunkErrorHandler />
      <SessionProvider>
        <TenantThemeBridge
          initialTenantId={initialTenantId}
          initialPalette={initialPalette}
        >
          <TenantBrandingProvider>
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
          </TenantBrandingProvider>
        </TenantThemeBridge>
      </SessionProvider>
    </ErrorBoundary>
  );
}

function TenantThemeBridge({
  children,
  initialTenantId,
  initialPalette,
}: ProvidersProps) {
  const { data: session } = useSession();
  const tenantId = session?.user?.companyId ?? initialTenantId;

  return (
    <TenantThemeProvider
      tenantId={tenantId}
      initialTenantId={initialTenantId}
      initialPalette={initialPalette}
    >
      {children}
    </TenantThemeProvider>
  );
}

export { useTenantBranding } from "./TenantBrandingProvider";
