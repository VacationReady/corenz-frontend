"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "filled" | "outline" | "glass";
  icon?: React.ReactNode;
  iconPosition?: "start" | "end" | "left" | "right";
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, icon, iconPosition = "start", error, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          {(iconPosition === "start" || iconPosition === "left") && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-2xl glass-subtle border-glass py-2.5 text-sm transition-glass placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 focus:glass-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
              {
                "pl-10 pr-4": iconPosition === "start" || iconPosition === "left",
                "pl-4 pr-10": iconPosition === "end" || iconPosition === "right",
                "border-red-500 focus:ring-red-500/50": error,
              },
              className,
            )}
            ref={ref}
            {...props}
          />
          {(iconPosition === "end" || iconPosition === "right") && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-2xl glass-subtle border-glass pl-4 pr-4 py-2.5 text-sm transition-glass placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 focus:glass-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
          {
            "border-red-500 focus:ring-red-500/50": error,
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };

// Alias exports for compatibility
export const SearchInput = Input;
export const PasswordInput = Input;
