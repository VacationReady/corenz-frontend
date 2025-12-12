"use client";

import React, { Fragment, useLayoutEffect, useRef, useState } from "react";
import { Menu, Transition, Portal } from "@headlessui/react";
import { cn } from "@/lib/utils"; // If you don&apos;t have this, replace with className joins.

type DropdownMenuProps = {
  children: React.ReactNode;
  align?: "left" | "right";
};

export function DropdownMenu({
  children,
  align = "right",
}: DropdownMenuProps) {
  const buttonRef = useRef<HTMLElement | null>(null);
  const [positionStyles, setPositionStyles] = useState<React.CSSProperties>({});

  // Find trigger and content from children
  const triggerChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === DropdownMenuTrigger
  );
  const contentChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === DropdownMenuContent
  );

  const content = React.isValidElement(contentChild)
    ? (contentChild.props as any).children
    : null;

  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => {
        // Compute fixed positioning relative to the trigger so the menu
        // can escape scroll/overflow containers via a portal.
        useLayoutEffect(() => {
          if (!open || !buttonRef.current) return;
          const rect = buttonRef.current.getBoundingClientRect();
          const top = rect.bottom + 8; // gap similar to mt-2
          if (align === "right") {
            setPositionStyles({ top, right: Math.max(window.innerWidth - rect.right, 0) });
          } else {
            setPositionStyles({ top, left: Math.max(rect.left, 0) });
          }
        }, [open, align]);

        return (
          <>
            <Menu.Button ref={buttonRef as any} as={Fragment}>
              {triggerChild as any}
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-1"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-1"
            >
              <Portal>
                <Menu.Items
                  className={cn(
                    "fixed z-50 min-w-[200px] p-1.5 rounded-2xl",
                    "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
                    "shadow-xl shadow-black/10 dark:shadow-black/30",
                    "border border-border/50 dark:border-slate-700/50",
                    "focus:outline-none",
                    align === "right" ? "origin-top-right" : "origin-top-left",
                  )}
                  style={positionStyles}
                >
                  {content}
                </Menu.Items>
              </Portal>
            </Transition>
          </>
        );
      }}
    </Menu>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  onSelect,
  className,
  asChild = false,
  disabled = false,
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onSelect?: (event: React.SyntheticEvent) => void;
  className?: string;
  asChild?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Menu.Item disabled={disabled}>
      {({ active, disabled: itemDisabled }) => {
        const classes = cn(
          "w-full flex items-center gap-3 text-left px-3 py-2.5 text-sm font-medium rounded-xl",
          "transition-all duration-200 ease-out",
          active && !itemDisabled 
            ? "bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 text-foreground" 
            : "text-foreground/80 hover:text-foreground",
          itemDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          className,
        );
        
        const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
          if (itemDisabled) return;
          onSelect?.(event);
          if (onClick) onClick();
        };
        
        if (asChild && React.isValidElement(children)) {
          const element = children as React.ReactElement<any>;
          return React.cloneElement(element, {
            className: cn(element.props.className, classes),
            onClick: (event: any) => {
              if (itemDisabled) return;
              onSelect?.(event);
              if (onClick) onClick();
              if (typeof element.props.onClick === "function") {
                element.props.onClick(event);
              }
            },
          });
        }
        return (
          <button 
            type="button"
            onClick={handleClick} 
            className={classes} 
            disabled={itemDisabled}
          >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </button>
        );
      }}
    </Menu.Item>
  );
}

// Radix UI-style compatibility exports
export const DropdownMenuTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    const childProps = child.props || {};
    const mergedProps: any = {
      ...childProps,
      ...props,
      className: cn(childProps.className, props.className),
      style: { ...(childProps.style || {}), ...(props.style || {}) },
      onClick: (event: any) => {
        if (typeof props.onClick === "function") props.onClick(event);
        if (typeof childProps.onClick === "function") childProps.onClick(event);
      },
      onKeyDown: (event: any) => {
        if (typeof props.onKeyDown === "function") props.onKeyDown(event);
        if (typeof childProps.onKeyDown === "function") childProps.onKeyDown(event);
      },
    };

    if (ref) {
      mergedProps.ref = ref as any;
    }

    return React.cloneElement(child, mergedProps);
  }
  return (
    <div ref={ref as any} {...props}>
      {children}
    </div>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }
>(({ children, align = "end", ...props }, ref) => {
  // Return children directly - Menu.Items needs Menu.Item as direct children
  // The wrapper div was breaking HeadlessUI's click handling
  return <>{children}</>;
});
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("my-1.5 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent", className)}
      {...props}
    />
  );
});
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}
      {...props}
    />
  );
});
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("", className)}
      {...props}
    />
  );
});
DropdownMenuGroup.displayName = "DropdownMenuGroup";

export function DropdownMenuCheckboxItem({
  children,
  checked,
  onCheckedChange,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Menu.Item disabled={disabled}>
      {({ active, disabled: itemDisabled }) => (
        <button
          onClick={() => !itemDisabled && onCheckedChange?.(!checked)}
          disabled={itemDisabled}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl",
            "transition-all duration-200 ease-out",
            active && !itemDisabled 
              ? "bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10" 
              : "",
            itemDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            className
          )}
        >
          <span className={cn(
            "flex items-center justify-center w-4 h-4 rounded border-2 transition-all duration-200",
            checked 
              ? "bg-primary border-primary text-white" 
              : "border-border bg-transparent"
          )}>
            {checked && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          {children}
        </button>
      )}
    </Menu.Item>
  );
}

// Simplified sub-menu components (render as nested containers without full sub-menu behavior)
export const DropdownMenuSub = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("relative", className)} {...props} />;
});
DropdownMenuSub.displayName = "DropdownMenuSub";

export const DropdownMenuSubTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl",
        "transition-all duration-200 ease-out",
        "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
        className
      )}
      {...props}
    >
      {children}
      <span className="ml-auto text-muted-foreground">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </button>
  );
});
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

export const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-full top-0 min-w-[180px] p-1.5 rounded-2xl",
        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
        "shadow-xl shadow-black/10 dark:shadow-black/30",
        "border border-border/50 dark:border-slate-700/50",
        className
      )}
      {...props}
    />
  );
});
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
