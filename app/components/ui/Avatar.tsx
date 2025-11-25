"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  className?: string;
  size?: number;
};

export function Avatar({ src, name, className, size = 32, children }: AvatarProps & { children?: React.ReactNode }) {
  // Track if the image failed to load
  const [imgError, setImgError] = React.useState(false);
  
  // Reset error state when src changes (e.g., new signed URL)
  React.useEffect(() => {
    setImgError(false);
  }, [src]);
  
  // If children provided, render as shadcn-style Avatar wrapper
  if (children) {
    return (
      <div
        className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}
        style={{ width: size, height: size }}
      >
        {children}
      </div>
    );
  }
  
  // Otherwise use the original Avatar component logic
  const initials = React.useMemo(() => {
    const safe = (name || "").trim();
    if (!safe) return "?";
    const parts = safe.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
    return letters.join("") || "?";
  }, [name]);

  const dimension = {
    width: size,
    height: size,
    minWidth: size,
  } as React.CSSProperties;

  // Show image if src is provided and hasn't errored
  if (src && !imgError) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className={cn("rounded-full object-cover bg-muted", className)}
        style={dimension}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback to initials (no src, or image failed to load)
  return (
    <div
      className={cn(
        "rounded-full bg-accent text-foreground flex items-center justify-center font-semibold",
        className,
      )}
      style={dimension}
      aria-label={name || "avatar"}
    >
      <span
        className="text-xs"
        style={{ fontSize: Math.max(11, Math.floor(size / 3)) }}
      >
        {initials}
      </span>
    </div>
  );
}

// Shadcn-style Avatar subcomponents for compatibility
export function AvatarImage({ 
  src, 
  alt, 
  className,
  onLoadingStatusChange, 
}: { 
  src?: string; 
  alt?: string; 
  className?: string;
  onLoadingStatusChange?: (status: "loading" | "loaded" | "error") => void;
}) {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading");
  
  // Reset status when src changes
  React.useEffect(() => {
    setStatus("loading");
  }, [src]);
  
  // Notify parent of status changes
  React.useEffect(() => {
    onLoadingStatusChange?.(status);
  }, [status, onLoadingStatusChange]);
  
  if (!src || status === "error") return null;
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || "avatar"}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
    />
  );
}

export function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}>
      {children}
    </div>
  );
}
