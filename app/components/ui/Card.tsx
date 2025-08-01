import React from "react";
import clsx from "clsx";

interface CardProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, icon, action, children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-card rounded-xl shadow-lg border border-enhanced h-full transition-smooth hover-lift",
        className
      )}
    >
      {(title || action) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-primary">
              {icon && <div className="w-5 h-5 mr-3">{icon}</div>}
              <CardTitle>{title}</CardTitle>
            </div>
            {action && <div>{action}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "bg-card-header border-b border-enhanced px-6 py-4 rounded-t-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("p-6 text-sm text-foreground space-y-3 leading-relaxed", className)}>
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

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "border-t border-enhanced px-6 py-4 bg-card-header rounded-b-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
