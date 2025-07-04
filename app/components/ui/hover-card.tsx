"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const HoverCard = PopoverPrimitive.Root;

const HoverCardTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Trigger ref={ref} className={cn(className)} {...props} />
));
HoverCardTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-xl border bg-white p-3 text-sm shadow-xl dark:border-neutral-700 dark:bg-neutral-900",
      className
    )}
    {...props}
  />
));
HoverCardContent.displayName = PopoverPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
