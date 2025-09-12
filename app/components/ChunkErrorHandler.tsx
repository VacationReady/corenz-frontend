"use client";

import { useEffect } from "react";

export default function ChunkErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Handle ChunkLoadError specifically
      if (
        event.error?.name === "ChunkLoadError" ||
        event.message?.includes("Loading chunk") ||
        event.message?.includes("ERR_HTTP2_PING_FAILED")
      ) {
        console.log("Chunk loading error detected, attempting recovery...");

        // Clear the cache and reload
        if ("caches" in window) {
          caches.keys().then((names) => {
            names.forEach((name) => {
              caches.delete(name);
            });
          });
        }

        // Small delay before reload to ensure cache clearing
        setTimeout(() => {
          window.location.reload();
        }, 1000);

        // Prevent the error from being logged as unhandled
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.name === "ChunkLoadError" ||
        event.reason?.message?.includes("Loading chunk")
      ) {
        console.log(
          "Chunk loading promise rejection detected, attempting recovery...",
        );

        event.preventDefault();

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return null;
}
