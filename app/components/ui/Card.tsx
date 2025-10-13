import React from "react";
import clsx from "clsx";

interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Card({
  title,
  icon,
  action,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "glass rounded-3xl shadow-glass h-full transition-glass hover-glass hover-lift",
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
        "glass-subtle border-b border-glass px-6 py-5 rounded-t-3xl",
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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "p-6 text-sm text-foreground space-y-3 leading-relaxed",
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
        "border-t border-glass px-6 py-5 glass-subtle rounded-b-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
