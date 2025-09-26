"use client";

import React from "react";
import clsx from "clsx";
import { Slot } from "@radix-ui/react-slot";
import { LoadingSpinner, GlassSpinner } from "./LoadingSpinner";
import { useTenantTheme } from "./TenantThemeProvider";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  asChild?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: "start" | "end";
  pill?: boolean;
  glow?: boolean;
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
      pill = false,
      glow = false,
      ...props
    },
    ref,
  ) => {
    const { primaryColor } = useTenantTheme();
    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-premium focus-ring disabled:opacity-50 disabled:cursor-not-allowed active-scale";

    const roundingClasses = pill ? "rounded-full" : "rounded-2xl";

    const variantClasses = {
      primary: clsx(
        "bg-primary text-primary-foreground shadow-depth-2",
        "hover:bg-primary/90 hover-lift",
        glow && "hover-glow"
      ),
      secondary: clsx(
        "glass text-foreground shadow-depth-1",
        "hover-glass hover-lift"
      ),
      outline: clsx(
        "border-2 border-primary/30 bg-transparent text-foreground",
        "hover:bg-primary/10 hover:border-primary/50 hover-lift"
      ),
      ghost: clsx(
        "text-foreground",
        "hover:bg-accent/20 hover:backdrop-blur-md"
      ),
      danger: clsx(
        "bg-destructive text-destructive-foreground shadow-depth-2",
        "hover:bg-destructive/90 hover-lift"
      ),
      glass: clsx(
        "glass-strong text-foreground shadow-depth-1",
        "hover-glass hover-lift",
        glow && "hover-glow"
      ),
    }[variant];

    const sizeClasses = {
      sm: "h-8 px-3 text-sm gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-10 w-10 p-0",
    }[size];

    const Comp = asChild ? Slot : "button";
    const isIcon = size === "icon";

    return (
      <Comp
        ref={ref}
        {...props}
        {...(asChild ? {} : { type })}
        disabled={disabled || loading}
        className={clsx(
          baseClasses,
          roundingClasses,
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
              "inline-flex items-center justify-center",
              !isIcon && "gap-2",
              loading && "invisible",
            )}
            aria-hidden={loading}
          >
            {icon && iconPosition === "start" && (
              <span className="flex items-center flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            {!isIcon && children}
            {icon && iconPosition === "end" && (
              <span className="flex items-center flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            {isIcon && (icon || children)}
          </span>
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <span aria-hidden="true">
                {variant === "glass" || variant === "secondary" ? (
                  <GlassSpinner
                    size={size === "lg" ? "md" : "sm"}
                  />
                ) : (
                  <LoadingSpinner
                    size={size === "lg" ? "md" : "sm"}
                    color={variant === "primary" ? "white" : primaryColor}
                  />
                )}
              </span>
              {!isIcon && <span className="text-sm">{loadingText}</span>}
            </span>
          )}
        </span>
      </Comp>
    );
  },
);

Button.displayName = "Button";

export default Button;
