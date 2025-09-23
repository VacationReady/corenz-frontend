"use client";

import React from "react";
import clsx from "clsx";
import { Slot } from "@radix-ui/react-slot";
import { LoadingSpinner } from "./LoadingSpinner";
import { useTenantTheme } from "./TenantThemeProvider";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: "start" | "end";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      type = "submit",
      asChild = false,
      loadingText = "Loading...",
      icon,
      iconPosition = "start",
      ...props
    },
    ref,
  ) => {
    const { primaryColor } = useTenantTheme();
    const baseClasses =
      "inline-flex items-center justify-center rounded-2xl font-medium transition-glass focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      primary:
        "bg-primary text-primary-foreground hover:bg-primary/90 shadow-warm hover-lift",
      secondary:
        "glass-subtle text-secondary-foreground hover-glass border-glass",
      outline:
        "border border-glass bg-transparent hover-glass hover:text-accent-foreground",
      ghost:
        "hover:bg-accent/50 hover:text-accent-foreground hover:backdrop-blur-md",
      danger:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-warm hover-lift",
    }[variant];

    const sizeClasses = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    }[size];

    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        {...props}
        {...(asChild ? {} : { type })}
        disabled={disabled || loading}
        className={clsx(
          baseClasses,
          variantClasses,
          sizeClasses,
          props.className,
          {
            "opacity-50 cursor-not-allowed": disabled || loading,
          },
        )}
        aria-live={loading ? "polite" : undefined}
        aria-busy={loading || undefined}
      >
        <span className="relative inline-flex items-center justify-center">
          <span
            className={clsx(
              "flex items-center justify-center gap-2",
              loading && "invisible",
            )}
            aria-hidden={loading}
          >
            {icon && iconPosition === "start" && (
              <span className="flex items-center" aria-hidden="true">
                {icon}
              </span>
            )}
            {children}
            {icon && iconPosition === "end" && (
              <span className="flex items-center" aria-hidden="true">
                {icon}
              </span>
            )}
          </span>
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <span aria-hidden="true">
                <LoadingSpinner
                  size={size === "lg" ? "md" : "sm"}
                  color={primaryColor}
                />
              </span>
              <span>{loadingText}</span>
            </span>
          )}
        </span>
      </Comp>
    );
  },
);

Button.displayName = "Button";

export default Button;
