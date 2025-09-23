"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "accent" | "muted";
  className?: string;
  text?: string;
  showText?: boolean;
  color?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base", 
  xl: "text-lg",
};

const variantColorMap = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted-foreground))",
};

export function LoadingSpinner({
  size = "md",
  variant = "primary",
  className,
  text = "Loading...",
  showText = false,
  color,
}: LoadingSpinnerProps) {
  const resolvedColor = color ?? variantColorMap[variant];

  return (
    <div
      className={cn("flex items-center justify-center gap-3", className)}
      style={{ color: resolvedColor }}
    >
      <div className="relative">
        {/* Outer ring with gradient */}
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-transparent bg-gradient-to-r from-primary via-accent to-primary bg-clip-border",
            sizeClasses[size]
          )}
          style={{
            background: `conic-gradient(from 0deg, transparent, ${resolvedColor}, transparent)`,
            borderRadius: '50%',
            padding: '2px',
          }}
        >
          <div className="w-full h-full bg-background rounded-full" />
        </div>

        {/* Inner pulsing dot */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse",
            {
              "w-1 h-1": size === "sm",
              "w-1.5 h-1.5": size === "md",
              "w-2 h-2": size === "lg",
              "w-3 h-3": size === "xl",
            }
          )}
          style={{
            backgroundColor: resolvedColor,
            animationDuration: '1.5s',
          }}
        />
      </div>

      {showText && (
        <span className={cn(
          "font-medium animate-pulse",
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );
}

// Modern glassmorphism spinner variant
export function GlassSpinner({
  size = "md",
  className,
  text,
  showText = false,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <div className="relative">
        {/* Glass container */}
        <div
          className={cn(
            "rounded-full glass-subtle border border-glass backdrop-blur-md",
            sizeClasses[size],
            "flex items-center justify-center"
          )}
        >
          {/* Rotating gradient ring */}
          <div
            className={cn(
              "animate-spin rounded-full",
              {
                "w-3 h-3": size === "sm",
                "w-4 h-4": size === "md",
                "w-6 h-6": size === "lg", 
                "w-8 h-8": size === "xl",
              }
            )}
            style={{
              background: `conic-gradient(from 0deg, transparent, hsl(var(--primary)), transparent)`,
              borderRadius: '50%',
            }}
          />
        </div>
      </div>
      
      {showText && (
        <span className={cn(
          "font-medium text-foreground/80 animate-pulse",
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );
}

// Orbital spinner - very modern 2025 style
export function OrbitalSpinner({
  size = "md",
  className,
  text,
  showText = false,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <div className="relative">
        <div className={cn("relative", sizeClasses[size])}>
          {/* Central core */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-pulse"
            style={{ animationDuration: '2s' }}
          />
          
          {/* Orbiting particles */}
          {[0, 120, 240].map((rotation, index) => (
            <div
              key={index}
              className="absolute top-1/2 left-1/2 w-full h-full animate-spin"
              style={{
                transformOrigin: '50% 50%',
                animationDuration: '3s',
                animationDelay: `${index * 0.5}s`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
            >
              <div
                className={cn(
                  "absolute rounded-full bg-gradient-to-r from-primary to-accent",
                  {
                    "w-1 h-1 -top-0.5": size === "sm",
                    "w-1.5 h-1.5 -top-0.5": size === "md",
                    "w-2 h-2 -top-1": size === "lg",
                    "w-3 h-3 -top-1.5": size === "xl",
                  }
                )}
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
          ))}
        </div>
      </div>
      
      {showText && (
        <span className={cn(
          "font-medium text-foreground/80",
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );
}

// Page-level loading component
export function PageLoader({
  text = "Loading...",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] space-y-4",
      className
    )}>
      <OrbitalSpinner size="xl" />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">{text}</p>
        <p className="text-sm text-muted-foreground">Please wait a moment</p>
      </div>
    </div>
  );
}

// Inline loading component for buttons and small areas
export function InlineLoader({
  size = "sm",
  text,
  className,
}: {
  size?: "sm" | "md";
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LoadingSpinner size={size} />
      {text && (
        <span className={cn(
          "font-medium text-muted-foreground",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          {text}
        </span>
      )}
    </div>
  );
}
