"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface TenantTheme {
  primaryColor: string;
  primaryForeground: string;
}

const DEFAULT_THEME: TenantTheme = {
  primaryColor: "hsl(var(--primary))",
  primaryForeground: "hsl(var(--primary-foreground))",
};

const TenantThemeContext = createContext<TenantTheme>(DEFAULT_THEME);

function resolveCssColor(variableValue: string | null | undefined, fallback: string) {
  const value = variableValue?.trim();
  if (!value) {
    return fallback;
  }

  if (/^(#|rgb|hsl)/i.test(value)) {
    return value;
  }

  return `hsl(${value})`;
}

export function TenantThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = document.documentElement;

    const readThemeFromCssVariables = () => {
      const styles = getComputedStyle(root);

      setTheme({
        primaryColor: resolveCssColor(
          styles.getPropertyValue("--primary"),
          DEFAULT_THEME.primaryColor,
        ),
        primaryForeground: resolveCssColor(
          styles.getPropertyValue("--primary-foreground"),
          DEFAULT_THEME.primaryForeground,
        ),
      });
    };

    readThemeFromCssVariables();

    const observer = new MutationObserver(() => {
      readThemeFromCssVariables();
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["style", "class", "data-theme"],
    });

    window.addEventListener("focus", readThemeFromCssVariables);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", readThemeFromCssVariables);
    };
  }, []);

  const value = useMemo(() => theme, [theme]);

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}
