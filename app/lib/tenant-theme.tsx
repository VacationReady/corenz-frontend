"use client";

import { createContext, ReactNode, useContext } from "react";
import {
  TenantThemePalette,
  getTenantPalette,
  normalizeTenantId,
} from "./tenant-theme-config";

export { createTenantCssVariables, getTenantPalette } from "./tenant-theme-config";
export type { TenantThemePalette } from "./tenant-theme-config";

export type TenantThemeContextValue = {
  tenantId: string;
  palette: TenantThemePalette;
};

const defaultContextValue: TenantThemeContextValue = {
  tenantId: "default",
  palette: getTenantPalette("default"),
};

const TenantThemeContext = createContext<TenantThemeContextValue>(
  defaultContextValue,
);

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}

export type TenantThemeProviderProps = {
  tenantId?: string;
  initialTenantId?: string;
  initialPalette?: TenantThemePalette;
  children: ReactNode;
};

export function TenantThemeProvider({
  tenantId,
  initialTenantId,
  initialPalette,
  children,
}: TenantThemeProviderProps) {
  const normalizedTenantId = normalizeTenantId(
    tenantId ?? initialTenantId ?? "default",
  ) ?? "default";

  const palette =
    initialPalette &&
    normalizedTenantId === normalizeTenantId(initialTenantId ?? tenantId)
      ? initialPalette
      : getTenantPalette(normalizedTenantId);

  const value: TenantThemeContextValue = {
    tenantId: normalizedTenantId,
    palette,
  };

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}
