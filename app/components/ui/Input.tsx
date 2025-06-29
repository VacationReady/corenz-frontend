"use client";
import React from "react";
import clsx from "clsx";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: "default" | "dark";
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "default", className, ...props }, ref) => {
    const baseClasses =
      "block w-full rounded-lg border px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200";
    const variants = {
      default: "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
      dark: "bg-neutral-800 border-neutral-700 text-white placeholder-gray-400",
    };

    return (
      <input
        ref={ref}
        className={clsx(baseClasses, variants[variant], className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default function Input(...) { ... }

