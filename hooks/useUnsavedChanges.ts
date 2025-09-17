"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Options {
  message?: string;
}

export function useUnsavedChanges(options?: Options) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const message = options?.message || "There are unsaved changes. Discard them?";

  const bypassRef = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty || bypassRef.current) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, message]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirty || bypassRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("javascript:")) return;

      const isExternal = anchor.target === "_blank" || /^https?:\/\//i.test(href);
      if (isExternal) return; // let the native beforeunload handle if it triggers

      e.preventDefault();
      const ok = window.confirm(message);
      if (ok) {
        bypassRef.current = true;
        router.push(href);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [dirty, message, router]);

  useEffect(() => {
    const onPopState = (_e: PopStateEvent) => {
      if (!dirty || bypassRef.current) return;
      const ok = window.confirm(message);
      if (!ok) {
        // move forward again to cancel back navigation
        history.go(1);
      } else {
        bypassRef.current = true;
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dirty, message]);

  const markSaved = () => {
    bypassRef.current = false;
    setDirty(false);
  };

  return { dirty, setDirty, markSaved };
}


