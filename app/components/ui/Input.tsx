"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "glass" | "filled" | "outline";
  error?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "start" | "end";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "glass", error, icon, iconPosition = "start", ...props }, ref) => {
    const baseClasses = cn(
      "flex h-11 w-full rounded-2xl px-4 py-3 text-sm transition-premium",
      "placeholder:text-muted-foreground",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background"
    );

    const variantClasses = {
      default: cn(
        "glass-subtle border border-glass",
        "hover:glass hover:border-glass-light",
        "focus:glass-strong focus:border-primary/30 focus:ring-primary/40"
      ),
      glass: cn(
        "glass border border-glass shadow-depth-1",
        "hover:glass-strong hover:shadow-depth-2",
        "focus:glass-ultra focus:shadow-depth-2 focus:ring-primary/40"
      ),
      filled: cn(
        "bg-accent/10 border border-accent/20",
        "hover:bg-accent/15 hover:border-accent/30",
        "focus:bg-background focus:border-primary/40 focus:ring-primary/40"
      ),
      outline: cn(
        "bg-transparent border-2 border-input",
        "hover:border-primary/30 hover:bg-accent/5",
        "focus:border-primary focus:bg-background focus:ring-primary/40"
      ),
    }[variant];

    const errorClasses = error ? cn(
      "border-destructive/50 focus:border-destructive focus:ring-destructive/40",
      "text-destructive-foreground"
    ) : "";

    const inputElement = (
      <input
        type={type}
        className={cn(
          baseClasses,
          variantClasses,
          errorClasses,
          icon && (iconPosition === "start" ? "pl-10" : "pr-10"),
          className,
        )}
        ref={ref}
        aria-invalid={error || undefined}
        {...props}
      />
    );

    if (icon) {
      return (
        <div className="relative">
          {iconPosition === "start" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
          {inputElement}
          {iconPosition === "end" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = "Input";

// Specialized input variants
export const SearchInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputProps, "icon" | "iconPosition">
>((props, ref) => {
  return (
    <Input
      ref={ref}
      type="search"
      variant="glass"
      icon={
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      iconPosition="start"
      placeholder="Search..."
      {...props}
    />
  );
});

SearchInput.displayName = "SearchInput";

// Password input with show/hide toggle
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputProps, "type" | "icon" | "iconPosition">
>((props, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={showPassword ? "text" : "password"}
        variant="glass"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        )}
      </button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";

export { Input };
