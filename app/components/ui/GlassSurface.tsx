"use client";

import React from "react";
import { cn } from "@/lib/utils";

type GlassIntensity = "subtle" | "medium" | "strong" | "ultra";
type GlassVariant = "flat" | "card" | "panel" | "elevated" | "inset";
type GlassSize = "sm" | "md" | "lg" | "xl";

interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: GlassIntensity;
  variant?: GlassVariant;
  size?: GlassSize;
  blur?: boolean;
  glow?: boolean;
  gradient?: boolean;
  hoverable?: boolean;
  clickable?: boolean;
  asChild?: boolean;
  children: React.ReactNode;
}

const intensityClasses: Record<GlassIntensity, string> = {
  subtle: "glass-subtle",
  medium: "glass",
  strong: "glass-strong",
  ultra: "glass-ultra",
};

const variantClasses: Record<GlassVariant, string> = {
  flat: "",
  card: "glass-card",
  panel: "shadow-depth-2",
  elevated: "shadow-depth-3 hover-lift",
  inset: "shadow-glass-inset",
};

const sizeClasses: Record<GlassSize, string> = {
  sm: "p-3 rounded-xl",
  md: "p-4 rounded-2xl",
  lg: "p-6 rounded-3xl",
  xl: "p-8 rounded-[2rem]",
};

export function GlassSurface({
  intensity = "medium",
  variant = "flat",
  size = "md",
  blur = true,
  glow = false,
  gradient = false,
  hoverable = false,
  clickable = false,
  asChild = false,
  children,
  className,
  ...props
}: GlassSurfaceProps) {
  const Component = asChild ? React.Fragment : "div";

  const classes = cn(
    // Base glass intensity
    intensityClasses[intensity],
    // Variant-specific styling
    variantClasses[variant],
    // Size and padding
    sizeClasses[size],
    // Optional effects
    {
      "backdrop-blur-none": !blur,
      "hover-glow": glow && hoverable,
      "bg-gradient-to-br from-white/10 to-white/5": gradient,
      "hover-glass transition-glass cursor-pointer": hoverable || clickable,
      "active-scale": clickable,
    },
    // Custom className
    className
  );

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      className: cn((children as React.ReactElement).props.className, classes),
      ...props,
    });
  }

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

// Specialized glass components for common use cases
export function GlassCard({
  children,
  className,
  ...props
}: Omit<GlassSurfaceProps, "variant">) {
  return (
    <GlassSurface
      variant="card"
      intensity="strong"
      size="lg"
      hoverable
      className={className}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}

export function GlassPanel({
  children,
  className,
  ...props
}: Omit<GlassSurfaceProps, "variant">) {
  return (
    <GlassSurface
      variant="panel"
      intensity="medium"
      size="md"
      className={className}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}

export function GlassButton({
  children,
  onClick,
  className,
  ...props
}: Omit<GlassSurfaceProps, "variant" | "clickable"> & {
  onClick?: () => void;
}) {
  return (
    <GlassSurface
      variant="elevated"
      intensity="strong"
      size="sm"
      clickable
      hoverable
      className={cn("inline-flex items-center justify-center gap-2", className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}

// Glass container with noise texture overlay
export function GlassContainer({
  children,
  className,
  showNoise = true,
  ...props
}: GlassSurfaceProps & { showNoise?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      <GlassSurface 
        intensity="medium" 
        size="lg"
        className="relative z-10"
      >
        {children}
      </GlassSurface>
      {showNoise && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3C/defs%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          }}
        />
      )}
    </div>
  );
}
