"use client";

import {
  ReactNode,
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Router = ReturnType<typeof useRouter>;
type PushArgs = Parameters<Router["push"]>;
type ReplaceArgs = Parameters<Router["replace"]>;

interface UnsavedChangesContextValue {
  dirty: boolean;
  markDirty: () => void;
  markSaved: () => void;
  requestNavigation: (action: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
);

export function useUnsavedChangesContext() {
  return useContext(UnsavedChangesContext);
}

interface UnsavedChangesGuardProps {
  children: ReactNode;
  message?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onDiscard?: () => void;
  onStay?: () => void;
}

const DEFAULT_MESSAGE =
  "You have unsaved changes. If you leave this page, they will be lost.";

function readTenantName() {
  if (typeof document === "undefined") return null;
  const fromBody = document.body?.dataset?.tenantName;
  if (fromBody && fromBody.trim()) return fromBody.trim();
  const fromHtml = document.documentElement?.dataset?.tenantName;
  if (fromHtml && fromHtml.trim()) return fromHtml.trim();
  const meta = document.querySelector("meta[name='tenant-name']") as
    | HTMLMetaElement
    | null;
  if (meta?.content?.trim()) return meta.content.trim();
  return null;
}

export default function UnsavedChangesGuard({
  children,
  message,
  onDirtyChange,
  onDiscard,
  onStay,
}: UnsavedChangesGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const closingActionRef = useRef<"stay" | "discard" | null>(null);
  const bypassRef = useRef(false);
  const dirtyRef = useRef(dirty);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const lastStableUrlRef = useRef<string | null>(null);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setTenantName(readTenantName());
  }, []);

  const resolvedMessage = message ?? DEFAULT_MESSAGE;
  const modalTitle = tenantName
    ? `Leave ${tenantName}?`
    : "Discard unsaved changes?";
  const modalDescription = tenantName
    ? `You're about to leave ${tenantName}. Any unsaved changes will be lost.`
    : resolvedMessage;
  const beforeUnloadMessage = tenantName
    ? `Changes to your ${tenantName} workspace may be lost if you leave this page.`
    : resolvedMessage;

  const beforeUnloadMessageRef = useRef(beforeUnloadMessage);
  useEffect(() => {
    beforeUnloadMessageRef.current = beforeUnloadMessage;
  }, [beforeUnloadMessage]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const search = searchParams?.toString() ?? "";
  useEffect(() => {
    if (typeof window === "undefined") return;
    lastStableUrlRef.current = window.location.href;
  }, [pathname, search]);

  const markDirty = useCallback(() => {
    setDirty(prev => (prev ? prev : true));
  }, []);

  const markSaved = useCallback(() => {
    setDirty(prev => (prev ? false : prev));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleInput = () => markDirty();
    const handleReset = () => setDirty(false);

    container.addEventListener("input", handleInput);
    container.addEventListener("change", handleInput);
    container.addEventListener("reset", handleReset);

    return () => {
      container.removeEventListener("input", handleInput);
      container.removeEventListener("change", handleInput);
      container.removeEventListener("reset", handleReset);
    };
  }, [markDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = beforeUnloadMessageRef.current;
      return beforeUnloadMessageRef.current;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const openConfirmation = useCallback((action: () => void) => {
    pendingActionRef.current = action;
    closingActionRef.current = null;
    setDialogOpen(true);
  }, []);

  const requestNavigation = useCallback(
    (action: () => void) => {
      if (!dirtyRef.current || bypassRef.current) {
        action();
        return;
      }

      openConfirmation(() => {
        bypassRef.current = true;
        action();
        setTimeout(() => {
          bypassRef.current = false;
        }, 50);
      });
    },
    [openConfirmation],
  );

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!dirtyRef.current || bypassRef.current) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-bypass-unsaved]")) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("javascript:")) return;

      const isExternal =
        anchor.target === "_blank" ||
        anchor.rel?.includes("external") ||
        /^(https?:|mailto:|tel:)/i.test(href);

      if (isExternal) return;

      event.preventDefault();

      requestNavigation(() => {
        router.push(href);
      });
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [requestNavigation, router]);

  useEffect(() => {
    const handlePopState = () => {
      if (!dirtyRef.current || bypassRef.current) return;
      const fallbackUrl = lastStableUrlRef.current;
      if (!fallbackUrl) return;

      try {
        window.history.pushState(null, "", fallbackUrl);
      } catch {
        return;
      }

      requestNavigation(() => {
        window.history.back();
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [requestNavigation]);

  useEffect(() => {
    if (dialogOpen || !closingActionRef.current) return;

    if (closingActionRef.current === "discard") {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      markSaved();
      onDiscard?.();
      if (action) {
        action();
      }
    } else {
      pendingActionRef.current = null;
      onStay?.();
    }

    closingActionRef.current = null;
  }, [dialogOpen, markSaved, onDiscard, onStay]);

  const requestStay = useCallback(() => {
    closingActionRef.current = "stay";
    setDialogOpen(false);
  }, []);

  const requestDiscard = useCallback(() => {
    closingActionRef.current = "discard";
    setDialogOpen(false);
  }, []);

  const contextValue: UnsavedChangesContextValue = {
    dirty,
    markDirty,
    markSaved,
    requestNavigation,
  };

  return (
    <UnsavedChangesContext.Provider value={contextValue}>
      <div ref={containerRef}>{children}</div>

      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          if (open) {
            setDialogOpen(true);
          } else {
            if (!closingActionRef.current) {
              closingActionRef.current = "stay";
            }
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>{modalDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-3 pt-2">
            <Button variant="outline" onClick={requestStay}>
              Stay here
            </Button>
            <Button variant="danger" onClick={requestDiscard}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

export function useGuardedNavigation() {
  const router = useRouter();
  const unsaved = useUnsavedChangesContext();

  const runGuarded = useCallback(
    (action: () => void) => {
      if (!unsaved) {
        action();
        return;
      }
      unsaved.requestNavigation(action);
    },
    [unsaved],
  );

  const push = useCallback(
    (...args: PushArgs) => {
      runGuarded(() => router.push(...args));
    },
    [router, runGuarded],
  );

  const replace = useCallback(
    (...args: ReplaceArgs) => {
      runGuarded(() => router.replace(...args));
    },
    [router, runGuarded],
  );

  const back = useCallback(() => {
    runGuarded(() => router.back());
  }, [router, runGuarded]);

  return { push, replace, back };
}

export function GuardedLink({
  href,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
}) {
  const { push } = useGuardedNavigation();

  return (
    <Link
      {...props}
      href={href}
      data-bypass-unsaved
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.stopPropagation();
        event.preventDefault();
        push(href);
      }}
    />
  );
}
