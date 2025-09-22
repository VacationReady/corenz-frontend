"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_TENANT_PREFERENCES,
  resolveTenantDatePreferences,
  type TenantDatePreferences,
} from "@/lib/datetime";

interface TenantProviderProps {
  children: ReactNode;
  initialValue?: TenantDatePreferences;
}

const TenantContext = createContext<TenantDatePreferences>(DEFAULT_TENANT_PREFERENCES);

export function TenantProvider({ children, initialValue }: TenantProviderProps) {
  const [value, setValue] = useState<TenantDatePreferences>(
    initialValue ?? DEFAULT_TENANT_PREFERENCES,
  );

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (initialValue) return;

    let active = true;

    (async () => {
      try {
        const res = await fetch("/api/settings/public-holidays", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setValue(resolveTenantDatePreferences(data?.template ?? null));
      } catch (error) {
        console.error("Failed to resolve tenant preferences", error);
      }
    })();

    return () => {
      active = false;
    };
  }, [initialValue]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantSettings() {
  return useContext(TenantContext);
}
