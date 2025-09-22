"use client";

import { ReactNode } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import ErrorBoundary from "./ErrorBoundary";
import ChunkErrorHandler from "./ChunkErrorHandler";
import { TenantThemeProvider } from "../lib/tenant-theme";
import { TenantThemePalette } from "../lib/tenant-theme-config";

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
          {children}
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
