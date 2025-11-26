import React from "react";
import clsx from "clsx";

interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  variant?: string;
  hoverable?: boolean;
  glow?: boolean;
  transparent?: boolean;
  noPadding?: boolean;
  value?: string | number;
  description?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

export function Card({
  title,
  icon,
  action,
  children,
  className,
  variant,
  hoverable = false,
  glow = false,
  transparent = false,
  noPadding = false,
  value,
  description,
  change,
  trend,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "glass rounded-3xl shadow-glass h-full transition-glass hover-glass hover-lift",
        {
          "hover-lift cursor-pointer": hoverable,
          "shadow-glow": glow,
          "bg-transparent backdrop-blur-none border-none shadow-none": transparent,
          "p-0": noPadding,
        },
        className,
      )}
      {...props}
    >
      {(title || action) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-primary">
              {icon && <div className="w-6 h-6 mr-3">{icon}</div>}
              <CardTitle>{title}</CardTitle>
            </div>
            {action && <div>{action}</div>}
          </div>
        </CardHeader>
      )}
      {children && <CardContent>{children}</CardContent>}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export function CardHeader({
  children,
  className,
  transparent,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={clsx(
        "glass-subtle border-b border-glass px-6 py-5 rounded-t-3xl",
        {
          "bg-transparent border-none": transparent,
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  transparent?: boolean;
  noPadding?: boolean;
}

export function CardContent({
  children,
  className,
  transparent,
  noPadding,
  ...props
}: CardContentProps) {
  return (
    <div
      className={clsx(
        "p-6 text-sm text-foreground space-y-3 leading-relaxed",
        {
          "bg-transparent": transparent,
          "p-0": noPadding,
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={clsx("text-lg font-bold text-foreground", className)}>
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
    <p className={clsx("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export function CardFooter({
  children,
  className,
  transparent,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={clsx(
        "border-t border-glass px-6 py-5 glass-subtle rounded-b-3xl",
        {
          "bg-transparent border-none": transparent,
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Alias exports for compatibility
export const MetricCard = Card;
export const FeatureCard = Card;
