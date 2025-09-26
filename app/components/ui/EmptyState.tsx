import React from "react";
import clsx from "clsx";
import { LucideIcon } from "lucide-react";
import Button from "./Button";
import { GlassSurface } from "./GlassSurface";

type EmptyStateTone = "default" | "brand" | "success" | "warning" | "danger";
type EmptyStateVariant = "default" | "glass" | "elevated" | "minimal";

type GuidanceItem =
  | React.ReactNode
  | {
      title?: string;
      description: React.ReactNode;
    };

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  guidance?: GuidanceItem[];
  tone?: EmptyStateTone;
  variant?: EmptyStateVariant;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline" | "glass";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const toneStyles: Record<EmptyStateTone, {
  container: string;
  iconWrapper: string;
  iconColor: string;
  title: string;
  description: string;
  marker: string;
  glow?: string;
}> = {
  default: {
    container: "",
    iconWrapper: "glass-subtle",
    iconColor: "text-muted-foreground",
    title: "text-foreground",
    description: "text-muted-foreground",
    marker: "text-muted-foreground",
  },
  brand: {
    container: "bg-gradient-to-br from-primary/5 to-primary/10",
    iconWrapper: "glass bg-gradient-to-br from-primary/20 to-primary/10",
    iconColor: "text-primary",
    title: "text-foreground",
    description: "text-primary-800 dark:text-primary-200",
    marker: "text-primary",
    glow: "shadow-glow-sm",
  },
  success: {
    container: "bg-gradient-to-br from-emerald-500/5 to-emerald-500/10",
    iconWrapper: "glass bg-gradient-to-br from-emerald-500/20 to-emerald-500/10",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    title: "text-emerald-800 dark:text-emerald-200",
    description: "text-emerald-700 dark:text-emerald-300",
    marker: "text-emerald-500 dark:text-emerald-300",
  },
  warning: {
    container: "bg-gradient-to-br from-amber-500/5 to-amber-500/10",
    iconWrapper: "glass bg-gradient-to-br from-amber-500/20 to-amber-500/10",
    iconColor: "text-amber-700 dark:text-amber-300",
    title: "text-amber-800 dark:text-amber-200",
    description: "text-amber-700 dark:text-amber-300",
    marker: "text-amber-500 dark:text-amber-300",
  },
  danger: {
    container: "bg-gradient-to-br from-red-500/5 to-red-500/10",
    iconWrapper: "glass bg-gradient-to-br from-red-500/20 to-red-500/10",
    iconColor: "text-red-700 dark:text-red-300",
    title: "text-red-800 dark:text-red-200",
    description: "text-red-700 dark:text-red-300",
    marker: "text-red-500 dark:text-red-300",
  },
};

function isGuidanceObject(
  item: GuidanceItem,
): item is { title?: string; description: React.ReactNode } {
  return (
    typeof item === "object" &&
    item !== null &&
    !React.isValidElement(item) &&
    "description" in item
  );
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  guidance,
  tone = "default",
  variant = "default",
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const toneStyle = toneStyles[tone] ?? toneStyles.default;

  const content = (
    <>
      {illustration ? (
        <div className="mb-4 flex w-full items-center justify-center animate-fadeIn">
          {illustration}
        </div>
      ) : Icon ? (
        <div
          className={clsx(
            "flex h-16 w-16 items-center justify-center rounded-2xl shadow-depth-1 mb-4",
            toneStyle.iconWrapper,
            toneStyle.glow,
          )}
        >
          <Icon className={clsx("h-8 w-8", toneStyle.iconColor)} />
        </div>
      ) : null}

      <div className="space-y-3">
        <h3 className={clsx("text-lg font-semibold", toneStyle.title)}>{title}</h3>

        {description ? (
          <p
            className={clsx(
              "mx-auto max-w-md text-sm leading-relaxed",
              toneStyle.description,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {guidance && guidance.length > 0 ? (
        <div className="mt-4 w-full max-w-md">
          <div className="glass-subtle rounded-xl p-4 text-left">
            <ul className="space-y-3 text-sm">
              {guidance.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span
                    className={clsx(
                      "mt-1 block h-2 w-2 rounded-full flex-shrink-0",
                      toneStyle.marker,
                    )}
                  />
                  {isGuidanceObject(item) ? (
                    <div className="space-y-1">
                      {item.title ? (
                        <div className={clsx("font-medium", toneStyle.title)}>
                          {item.title}
                        </div>
                      ) : null}
                      <div className={clsx(toneStyle.description)}>
                        {item.description}
                      </div>
                    </div>
                  ) : (
                    <div className={clsx(toneStyle.description)}>{item}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {(action || secondaryAction) ? (
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <Button 
              onClick={action.onClick} 
              variant={action.variant || "primary"}
              glow={tone === "brand"}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      ) : null}
    </>
  );

  if (variant === "glass") {
    return (
      <GlassSurface
        intensity="strong"
        size="lg"
        className={clsx(
          "flex flex-col items-center justify-center text-center",
          className,
        )}
      >
        {content}
      </GlassSurface>
    );
  }

  if (variant === "elevated") {
    return (
      <div
        className={clsx(
          "glass-card shadow-depth-2 rounded-3xl p-10 flex flex-col items-center justify-center text-center",
          toneStyle.container,
          className,
        )}
      >
        {content}
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div
        className={clsx(
          "flex flex-col items-center justify-center gap-4 py-10 px-6 text-center",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "glass-subtle rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center",
        toneStyle.container,
        className,
      )}
    >
      {content}
    </div>
  );
}

// Predefined empty states for common scenarios
export function EmptyEmployees({
  onAddEmployee,
}: {
  onAddEmployee: () => void;
}) {
  return (
    <EmptyState
      title="No employees yet"
      description="Get started by adding your first team member to the system."
      action={{
        label: "Add Employee",
        onClick: onAddEmployee,
      }}
    />
  );
}

export function EmptyDocuments({
  onAddDocument,
}: {
  onAddDocument: () => void;
}) {
  return (
    <EmptyState
      title="No documents found"
      description="Upload your first document to get started with document management."
      action={{
        label: "Upload Document",
        onClick: onAddDocument,
      }}
    />
  );
}

export function EmptyNews({ onCreateNews }: { onCreateNews: () => void }) {
  return (
    <EmptyState
      title="No news posts yet"
      description="Share important updates and announcements with your team."
      action={{
        label: "Create News Post",
        onClick: onCreateNews,
      }}
    />
  );
}

export function EmptySearchResults() {
  return (
    <EmptyState
      title="No results found"
      description="Try adjusting your search terms or filters to find what you're looking for."
    />
  );
}
