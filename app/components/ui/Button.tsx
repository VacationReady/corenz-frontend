"use client";

import React from "react";
import clsx from "clsx";
import { Slot } from "@radix-ui/react-slot";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "destructive" | "default" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  pill?: boolean;
  glow?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      icon,
      iconPosition = "left",
      pill = false,
      glow = false,
      disabled,
      type = "submit",
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-2xl font-medium transition-glass focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";

    const normalizedVariant = variant === "destructive" ? "danger" : variant === "default" ? "primary" : variant;
    
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
      glass:
        "glass-strong text-foreground hover-glass border-glass",
    }[normalizedVariant] || variantClasses.primary;

    const sizeClasses = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
      icon: "h-10 w-10 p-0",
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
            "rounded-full": pill,
            "shadow-glow": glow,
          },
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3 3-3h-4a8 8 0 01-8 8V8l-3 3 3 3v-4z"
              />
            </svg>
            {loadingText || "Loading..."}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </span>
        )}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { Button };
export default Button;
