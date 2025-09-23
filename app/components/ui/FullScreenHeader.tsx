"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FullScreenHeaderProps {
  backSlot?: ReactNode;
  title?: ReactNode;
  helpSlot?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FullScreenHeader({
  backSlot,
  title,
  helpSlot,
  children,
  className,
  contentClassName,
}: FullScreenHeaderProps) {
  return (
    <header
      className={cn(
        "w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {backSlot ? (
            <div className="text-sm font-medium text-muted-foreground [&_a]:inline-flex [&_a]:items-center [&_a]:gap-2 [&_a]:rounded-full [&_a]:px-3 [&_a]:py-1.5 [&_a]:transition-colors [&_a]:hover:bg-muted [&_button]:inline-flex [&_button]:items-center [&_button]:gap-2 [&_button]:rounded-full [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-sm [&_button]:font-medium [&_button]:text-muted-foreground [&_button]:transition-colors [&_button]:hover:bg-muted">
              {backSlot}
            </div>
          ) : null}
          {title ? (
            <div className="truncate text-base font-semibold text-foreground sm:text-lg">
              {title}
            </div>
          ) : null}
        </div>
        {helpSlot ? (
          <div className="shrink-0 text-sm font-medium text-muted-foreground [&_a]:inline-flex [&_a]:items-center [&_a]:gap-2 [&_a]:rounded-full [&_a]:px-3 [&_a]:py-1.5 [&_a]:text-sm [&_a]:font-medium [&_a]:text-primary [&_a]:transition-colors [&_a]:hover:bg-primary/10 [&_a]:hover:text-primary/90 [&_button]:inline-flex [&_button]:items-center [&_button]:gap-2 [&_button]:rounded-full [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-sm [&_button]:font-medium [&_button]:text-primary [&_button]:transition-colors [&_button]:hover:bg-primary/10 [&_button]:hover:text-primary/90">
            {helpSlot}
          </div>
        ) : null}
      </div>
      {children ? (
        <div className={cn("mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6", contentClassName)}>
          {children}
        </div>
      ) : null}
    </header>
  );
}

export default FullScreenHeader;
