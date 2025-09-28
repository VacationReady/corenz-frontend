"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  className?: string;
  size?: number;
};

export function Avatar({ src, name, className, size = 32 }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
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

  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className={cn("rounded-full object-cover bg-muted", className)}
        style={dimension}
        onError={() => setFailed(true)}
        decoding="async"
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
