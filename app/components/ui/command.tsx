"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import * as CommandPrimitive from "cmdk";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Command>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Command>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Command
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.Command.displayName;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandInput>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandInput>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-2">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.CommandInput
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.CommandInput.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandList>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandList>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.CommandList
    ref={ref}
    className={cn("max-h-[200px] overflow-y-auto p-1", className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.CommandList.displayName;

const CommandEmpty = CommandPrimitive.CommandEmpty;
const CommandGroup = CommandPrimitive.CommandGroup;
const CommandItem = CommandPrimitive.CommandItem;
const CommandSeparator = CommandPrimitive.CommandSeparator;

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
};
