import React from "react";
import clsx from "clsx";

type CardVariant = "default" | "elevated" | "flat" | "gradient" | "interactive";
type CardSize = "sm" | "md" | "lg";

interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  size?: CardSize;
  hoverable?: boolean;
  glow?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: "glass-card shadow-depth-2",
  elevated: "glass-strong shadow-depth-3",
  flat: "glass-subtle shadow-depth-1",
  gradient: "glass bg-gradient-to-br from-white/20 to-white/5 shadow-depth-2",
  interactive: "glass-card shadow-depth-2 cursor-pointer active-scale",
};

const sizeClasses: Record<CardSize, { wrapper: string; header: string; content: string }> = {
  sm: {
    wrapper: "rounded-2xl",
    header: "px-4 py-3",
    content: "p-4",
  },
  md: {
    wrapper: "rounded-3xl",
    header: "px-6 py-4",
    content: "p-6",
  },
  lg: {
    wrapper: "rounded-[2rem]",
    header: "px-8 py-6",
    content: "p-8",
  },
};

export function Card({
  title,
  icon,
  action,
  children,
  className,
  variant = "default",
  size = "md",
  hoverable = false,
  glow = false,
  ...props
}: CardProps) {
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={clsx(
        variantClasses[variant],
        sizeClass.wrapper,
        "h-full transition-premium overflow-hidden",
        hoverable && "hover-lift hover-glass",
        glow && "hover-glow",
        className,
      )}
      {...props}
    >
      {(title || action) && (
        <CardHeader className={sizeClass.header}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="flex-shrink-0 w-6 h-6 text-primary">
                  {icon}
                </div>
              )}
              <CardTitle className="truncate">{title}</CardTitle>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={sizeClass.content}>{children}</CardContent>
    </div>
  );
}

export function CardHeader({
  children,
  className,
  transparent = false,
}: {
  children: React.ReactNode;
  className?: string;
  transparent?: boolean;
}) {
  return (
    <div
      className={clsx(
        !transparent && "glass-subtle border-b border-glass",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className,
  noPadding = false,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={clsx(
        !noPadding && "text-sm text-foreground space-y-4 leading-relaxed",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeStyles = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  }[size];

  return (
    <h2 className={clsx("font-semibold text-foreground", sizeStyles, className)}>
      {children}
    </h2>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={clsx("text-sm text-muted-foreground mt-1", className)}>
      {children}
    </p>
  );
}

export function CardFooter({
  children,
  className,
  transparent = false,
}: {
  children: React.ReactNode;
  className?: string;
  transparent?: boolean;
}) {
  return (
    <div
      className={clsx(
        !transparent && "glass-subtle border-t border-glass",
        "px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Specialized card variants for common patterns
export function MetricCard({
  title,
  value,
  change,
  trend,
  icon,
  className,
}: {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}) {
  const trendColors = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground",
  };

  return (
    <Card variant="elevated" size="sm" hoverable className={className}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change && (
            <p className={clsx("text-sm font-medium", trend && trendColors[trend])}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="glass-subtle p-3 rounded-xl text-primary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function FeatureCard({
  title,
  description,
  icon,
  onClick,
  className,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Card
      variant="interactive"
      size="md"
      hoverable
      glow
      onClick={onClick}
      className={className}
    >
      {icon && (
        <div className="glass-strong w-12 h-12 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-depth-1">
          {icon}
        </div>
      )}
      <CardTitle size="md">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </Card>
  );
}
