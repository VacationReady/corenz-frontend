import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

type GridColumnOption = 1 | 2 | 3 | 4;

const GRID_COLUMNS: Record<GridColumnOption, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-2/3"];

type SectionSkeletonVariant = "rows" | "grid" | "table" | "cards" | "dashboard";

export interface SectionSkeletonProps {
  /**
   * Controls the general shape of the placeholders rendered inside the section.
   * - `rows`: stacked text rows (default)
   * - `grid`: grid of card placeholders (great for dashboards/forms)
   * - `table`: table style rows with action buttons
   */
  variant?: SectionSkeletonVariant;
  /** Number of row placeholders to render for `rows`/`table` variants. */
  rows?: number;
  /** Number of grid items to render when `variant` is `grid`. */
  gridItems?: number;
  /** Column configuration for grid placeholders. */
  gridCols?: GridColumnOption;
  /** Shows a header skeleton inside the card container. */
  showHeader?: boolean;
  /** Renders a button sized skeleton in the header area. */
  showAction?: boolean;
  /** Adds a toolbar style skeleton (search + actions) above the content. */
  showToolbar?: boolean;
  /** Wraps the skeletons with the standard card chrome. */
  showContainer?: boolean;
  /** Additional classes passed to the outer wrapper. */
  className?: string;
  /** Overrides the default height/width of row placeholders. */
  lineClassName?: string;
}

export function SectionSkeleton({
  variant = "rows",
  rows = 4,
  gridItems,
  gridCols = 2,
  showHeader = false,
  showAction = false,
  showToolbar = false,
  showContainer = true,
  className,
  lineClassName,
}: SectionSkeletonProps) {
  const items = gridItems ?? rows;
  const columnClass = GRID_COLUMNS[gridCols] ?? GRID_COLUMNS[2];

  const toolbar = showToolbar ? (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Skeleton className="h-10 w-full rounded-lg md:w-72" />
      <div className="flex flex-1 justify-end gap-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  ) : null;

  let body: ReactNode;

  switch (variant) {
    case "grid":
      body = (
        <div className={cn("grid gap-4", columnClass)}>
          {Array.from({ length: items }).map((_, index) => (
            <div
              key={index}
              className="glass-subtle rounded-2xl p-4 space-y-3 animate-pulse"
            >
              <Skeleton className="h-4 w-2/3 glass-subtle rounded-xl" />
              <Skeleton className="h-4 w-1/2 glass-subtle rounded-xl" />
              <Skeleton className="h-10 w-full glass-subtle rounded-xl" />
            </div>
          ))}
        </div>
      );
      break;
    case "cards":
      body = (
        <div className={cn("grid gap-6", columnClass)}>
          {Array.from({ length: items }).map((_, index) => (
            <div
              key={index}
              className="glass-card rounded-3xl shadow-depth-1 overflow-hidden"
            >
              <div className="glass-subtle p-6 border-b border-glass">
                <Skeleton className="h-5 w-3/4 glass-subtle rounded-xl" />
              </div>
              <div className="p-6 space-y-4">
                <Skeleton className="h-4 w-full glass-subtle rounded-xl" />
                <Skeleton className="h-4 w-5/6 glass-subtle rounded-xl" />
                <Skeleton className="h-4 w-4/6 glass-subtle rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      );
      break;
    case "dashboard":
      body = (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Metric Cards */}
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`metric-${index}`} className="glass-card rounded-2xl p-6 shadow-depth-1">
              <Skeleton className="h-4 w-20 glass-subtle rounded-xl mb-3" />
              <Skeleton className="h-8 w-32 glass-subtle rounded-xl mb-2" />
              <Skeleton className="h-3 w-16 glass-subtle rounded-xl" />
            </div>
          ))}
          {/* Chart Area */}
          <div className="col-span-1 lg:col-span-2 glass-card rounded-3xl p-6 shadow-depth-1">
            <Skeleton className="h-5 w-32 glass-subtle rounded-xl mb-4" />
            <Skeleton className="h-64 w-full glass-subtle rounded-2xl" />
          </div>
          {/* Activity Feed */}
          <div className="col-span-1 lg:col-span-2 glass-card rounded-3xl p-6 shadow-depth-1">
            <Skeleton className="h-5 w-28 glass-subtle rounded-xl mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`activity-${idx}`} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full glass-subtle" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4 glass-subtle rounded-xl" />
                    <Skeleton className="h-3 w-1/2 glass-subtle rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
      break;
    case "table":
      body = (
        <div className="glass-strong rounded-2xl shadow-depth-2 overflow-hidden">
          <div className="glass-subtle border-b border-glass px-6 py-3">
            <div className="hidden md:flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-48 glass-subtle rounded-xl" />
              <Skeleton className="h-4 w-32 glass-subtle rounded-xl" />
              <Skeleton className="h-4 w-24 glass-subtle rounded-xl" />
              <Skeleton className="h-4 w-24 glass-subtle rounded-xl" />
              <Skeleton className="h-4 w-24 glass-subtle rounded-xl" />
              <Skeleton className="h-4 w-16 glass-subtle rounded-xl" />
            </div>
          </div>
          <div className="divide-y divide-glass">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="px-6 py-4 hover:glass-subtle transition-glass"
              >
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6 md:items-center">
                  <Skeleton className="col-span-2 h-4 w-5/6 md:w-4/5 glass-subtle rounded-xl" />
                  <Skeleton className="col-span-1 h-4 w-2/3 glass-subtle rounded-xl" />
                  <Skeleton className="col-span-1 h-4 w-1/2 glass-subtle rounded-xl" />
                  <Skeleton className="col-span-1 h-4 w-1/2 glass-subtle rounded-xl" />
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-full glass-subtle" />
                    <Skeleton className="h-8 w-20 rounded-full glass-subtle" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      break;
    default:
      body = (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                lineClassName ?? "h-4",
                !lineClassName && LINE_WIDTHS[index % LINE_WIDTHS.length],
              )}
            />
          ))}
        </div>
      );
  }

  if (showContainer) {
    return (
      <div
        className={cn(
          "glass-card rounded-3xl shadow-depth-2",
          className,
        )}
      >
        {(showHeader || showAction) && (
          <div className="glass-subtle border-b border-glass px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 glass-subtle rounded-xl" />
              {showHeader && <Skeleton className="h-4 w-64 glass-subtle rounded-xl" />}
            </div>
            {showAction && <Skeleton className="h-10 w-28 glass-subtle rounded-xl" />}
          </div>
        )}
        <div className="space-y-4 px-6 py-6">
          {toolbar}
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar}
      {body}
    </div>
  );
}

export interface PageSkeletonProps {
  /** Optional list of sections to render inside the skeleton page. */
  sections?: SectionSkeletonProps[];
  /** Displays an action-sized skeleton in the page header. */
  showHeaderAction?: boolean;
  /** Shows a breadcrumb-sized skeleton above the page title. */
  showBreadcrumb?: boolean;
  /** Number of description lines to display under the title skeleton. */
  headerLines?: number;
  /** Additional classes applied to the page wrapper. */
  className?: string;
}

export function PageSkeleton({
  sections = [{}],
  showHeaderAction = false,
  showBreadcrumb = true,
  headerLines = 2,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("w-full min-h-screen bg-content-panel", className)}>
      <div className="sticky top-0 z-10 border-b border-enhanced bg-content-panel backdrop-blur-sm">
        <div className="px-8 py-6 space-y-4">
          {showBreadcrumb && <Skeleton className="h-4 w-48" />}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              {Array.from({ length: Math.max(0, headerLines - 1) }).map(
                (_, index) => (
                  <Skeleton key={index} className="h-4 w-80" />
                ),
              )}
            </div>
            {showHeaderAction && <Skeleton className="h-10 w-36 rounded-lg" />}
          </div>
        </div>
      </div>
      <div className="px-8 py-6 space-y-6">
        {sections.map((section, index) => (
          <SectionSkeleton key={index} {...section} />
        ))}
      </div>
    </div>
  );
}
