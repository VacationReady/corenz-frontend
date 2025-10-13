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

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className={cn("rounded-full object-cover bg-muted", className)}
        style={dimension}
      />
    );
  }

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
export function AvatarImage({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || "avatar"}
      className={cn("aspect-square h-full w-full object-cover", className)}
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
