"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import {
  extractBrandingFromSession,
  normalizeTenantBranding,
  requestTenantBranding,
  type TenantBranding,
  type TenantBrandingInput,
} from "@/lib/tenant-branding";

type TenantBrandingContextValue = {
  branding: TenantBranding;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<TenantBranding>;
};

const TenantBrandingContext =
  createContext<TenantBrandingContextValue | undefined>(undefined);

interface TenantBrandingProviderProps {
  children: ReactNode;
  initialBranding?: TenantBrandingInput;
}

export function TenantBrandingProvider({
  children,
  initialBranding,
}: TenantBrandingProviderProps) {
  const { data: session, status } = useSession();
  const [branding, setBranding] = useState<TenantBranding>(() =>
    normalizeTenantBranding(initialBranding),
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialBranding);
  const [error, setError] = useState<string | null>(null);

  const sessionBranding = useMemo(
    () => extractBrandingFromSession(session),
    [session],
  );

  useEffect(() => {
    if (sessionBranding) {
      setBranding(sessionBranding);
      setIsLoading(false);
      setError(null);
    }
  }, [sessionBranding]);

  useEffect(() => {
    if (sessionBranding || status === "loading") {
      if (sessionBranding) {
        setIsLoading(false);
      }
      return;
    }

    let cancelled = false;

    const loadBrandingFromApi = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiBranding = await requestTenantBranding();
        if (!cancelled) {
          setBranding(apiBranding);
        }
      } catch (caught) {
        if (!cancelled) {
          console.error(
            "[tenant-branding] Failed to fetch tenant branding",
            caught,
          );
          setError(
            caught instanceof Error
              ? caught.message
              : "Failed to load tenant branding",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadBrandingFromApi();

    return () => {
      cancelled = true;
    };
  }, [sessionBranding, status]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiBranding = await requestTenantBranding();
      setBranding(apiBranding);
      return apiBranding;
    } catch (caught) {
      console.error(
        "[tenant-branding] Failed to refresh tenant branding",
        caught,
      );
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load tenant branding",
      );
      return branding;
    } finally {
      setIsLoading(false);
    }
  }, [branding]);

  const value = useMemo(
    () => ({
      branding,
      isLoading,
      error,
      refresh,
    }),
    [branding, isLoading, error, refresh],
  );

  return (
    <TenantBrandingContext.Provider value={value}>
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding(): TenantBrandingContextValue {
  const context = useContext(TenantBrandingContext);

  if (!context) {
    throw new Error(
      "useTenantBranding must be used within a TenantBrandingProvider",
    );
  }

  return context;
}
