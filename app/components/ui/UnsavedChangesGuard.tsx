"use client";

import { useEffect, useRef, useState } from "react";

export default function UnsavedChangesGuard({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const message = "There are unsaved changes. Discard them?";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onInput = () => setDirty(true);
    container.addEventListener("input", onInput, { passive: true } as any);
    return () => container.removeEventListener("input", onInput as any);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onDocumentClick = (e: MouseEvent) => {
      if (!dirty) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Allow buttons/links that explicitly bypass the guard
      const bypass = target.closest("[data-bypass-unsaved]");
      if (bypass) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("javascript:")) return;
      e.preventDefault();
      const ok = window.confirm(message);
      if (ok) {
        // Allow navigation by setting location; this avoids router coupling
        window.location.href = href;
      }
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [dirty]);

  return <div ref={containerRef}>{children}</div>;
}


