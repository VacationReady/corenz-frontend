"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Send } from "lucide-react";

interface UnpublishedShiftsGuardContextValue {
  unpublishedCount: number;
  setUnpublishedCount: (count: number) => void;
  onPublishAll?: () => Promise<void>;
  setOnPublishAll: (fn: (() => Promise<void>) | undefined) => void;
}

const UnpublishedShiftsGuardContext = createContext<UnpublishedShiftsGuardContextValue | null>(
  null,
);

export function useUnpublishedShiftsGuard() {
  return useContext(UnpublishedShiftsGuardContext);
}

interface UnpublishedShiftsGuardProps {
  children: ReactNode;
  unpublishedCount: number;
  onPublishAll?: () => Promise<void>;
}

export default function UnpublishedShiftsGuard({
  children,
  unpublishedCount,
  onPublishAll,
}: UnpublishedShiftsGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const bypassRef = useRef(false);
  const unpublishedCountRef = useRef(unpublishedCount);
  const onPublishAllRef = useRef(onPublishAll);
  const lastPathnameRef = useRef(pathname);

  useEffect(() => {
    unpublishedCountRef.current = unpublishedCount;
  }, [unpublishedCount]);

  useEffect(() => {
    onPublishAllRef.current = onPublishAll;
  }, [onPublishAll]);

  useEffect(() => {
    lastPathnameRef.current = pathname;
  }, [pathname]);

  const hasUnpublishedShifts = useCallback(() => {
    return unpublishedCountRef.current > 0;
  }, []);

  const openConfirmation = useCallback((action: () => void) => {
    pendingActionRef.current = action;
    setDialogOpen(true);
  }, []);

  const requestNavigation = useCallback(
    (action: () => void) => {
      if (!hasUnpublishedShifts() || bypassRef.current) {
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
    [hasUnpublishedShifts, openConfirmation],
  );

  // Intercept link clicks
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasUnpublishedShifts() || bypassRef.current) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-bypass-unpublished-guard]")) return;

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

      // Check if navigating away from /rota
      if (pathname?.startsWith("/rota") && !href.startsWith("/rota")) {
        event.preventDefault();
        event.stopPropagation();

        requestNavigation(() => {
          router.push(href);
        });
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [hasUnpublishedShifts, requestNavigation, router, pathname]);

  // Intercept browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      if (!hasUnpublishedShifts() || bypassRef.current) return;

      // Check if we're leaving the rota page
      const currentPath = window.location.pathname;
      if (lastPathnameRef.current?.startsWith("/rota") && !currentPath.startsWith("/rota")) {
        // Push the current state back to prevent navigation
        window.history.pushState(null, "", lastPathnameRef.current);

        requestNavigation(() => {
          window.history.back();
        });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasUnpublishedShifts, requestNavigation]);

  // Warn on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnpublishedShifts()) return;
      event.preventDefault();
      event.returnValue = "You have unpublished shifts. Are you sure you want to leave?";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnpublishedShifts]);

  const handleStay = useCallback(() => {
    pendingActionRef.current = null;
    setDialogOpen(false);
  }, []);

  const handleLeaveWithoutPublishing = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setDialogOpen(false);
    if (action) {
      action();
    }
  }, []);

  const handlePublishAndLeave = useCallback(async () => {
    if (!onPublishAllRef.current) {
      handleLeaveWithoutPublishing();
      return;
    }

    setIsPublishing(true);
    try {
      await onPublishAllRef.current();
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      setDialogOpen(false);
      if (action) {
        action();
      }
    } catch (error) {
      console.error("Failed to publish shifts:", error);
      setIsPublishing(false);
    }
  }, [handleLeaveWithoutPublishing]);

  const contextValue: UnpublishedShiftsGuardContextValue = {
    unpublishedCount,
    setUnpublishedCount: () => {},
    onPublishAll,
    setOnPublishAll: () => {},
  };

  return (
    <UnpublishedShiftsGuardContext.Provider value={contextValue}>
      {children}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleStay()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unpublished Shifts
            </DialogTitle>
            <DialogDescription>
              You have {unpublishedCountRef.current} unpublished shift{unpublishedCountRef.current > 1 ? 's' : ''}.
              {' '}If you leave without publishing, employees won't be notified of their schedules.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleStay}
              disabled={isPublishing}
              className="w-full sm:w-auto"
            >
              Stay on page
            </Button>
            <Button
              variant="ghost"
              onClick={handleLeaveWithoutPublishing}
              disabled={isPublishing}
              className="w-full sm:w-auto"
            >
              Leave without publishing
            </Button>
            {onPublishAllRef.current && (
              <Button
                variant="default"
                onClick={handlePublishAndLeave}
                disabled={isPublishing}
                className="w-full sm:w-auto"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publish & leave
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnpublishedShiftsGuardContext.Provider>
  );
}
