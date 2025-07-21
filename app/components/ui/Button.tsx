"use client"

import React from "react";
import clsx from "clsx";
import { Slot } from "@radix-ui/react-slot";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
}

export default function Button({
  children,
  variant = "ghost",
  size = "md",
  loading = false,
  disabled,
  type = "submit",
  asChild = false,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent text-blue-600 hover:bg-blue-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];

  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  }[size];

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      {...props}
      {...(asChild ? {} : { type })} // ✅ Only apply type when rendering a <button>
      disabled={disabled || loading}
      className={clsx(
        baseClasses,
        variantClasses,
        sizeClasses,
        props.className,
        {
          "opacity-50 cursor-not-allowed": disabled || loading,
        }
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3 3-3h-4a8 8 0 01-8 8V8l-3 3 3 3v-4z"
            ></path>
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </Comp>
  );
}
