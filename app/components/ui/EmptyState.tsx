import React from "react";
import clsx from "clsx";
import { LucideIcon } from "lucide-react";
import Button from "./Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline";
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {description && (
        <p className="text-muted-foreground text-sm max-w-md leading-relaxed mb-6">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} variant={action.variant || "primary"}>
          {action.label}
        </Button>
      )}
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
