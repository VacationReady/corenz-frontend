"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-auto",
          // Custom scrollbar styles
          "[&::-webkit-scrollbar]:w-2",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:bg-border",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:border-2",
          "[&::-webkit-scrollbar-thumb]:border-transparent",
          "[&::-webkit-scrollbar-thumb]:bg-clip-content",
          // Firefox scrollbar
          "scrollbar-thin",
          "scrollbar-thumb-border",
          "scrollbar-track-transparent",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  // This is a placeholder for compatibility
  // The scrollbar is handled by CSS in the ScrollArea component
  return null;
})
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }
