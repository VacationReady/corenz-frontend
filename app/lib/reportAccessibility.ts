/**
 * Report Accessibility Utilities
 * 
 * WCAG 2.1 AA Compliance utilities for the reporting system.
 * Includes helpers for:
 * - ARIA attributes
 * - Focus management
 * - Screen reader announcements
 * - Keyboard navigation
 * - High contrast support
 */

/**
 * Create ARIA props for a data table
 */
export function getTableAriaProps(options: {
  caption: string;
  sortedBy?: string;
  sortDirection?: "asc" | "desc";
  totalRows: number;
  visibleRows: number;
  filteredRows?: number;
}) {
  return {
    role: "table",
    "aria-label": options.caption,
    "aria-rowcount": options.totalRows,
    "aria-describedby": "table-description",
  };
}

/**
 * Create ARIA props for a sortable column header
 */
export function getSortableHeaderAriaProps(options: {
  columnName: string;
  isSorted: boolean;
  sortDirection?: "asc" | "desc";
}) {
  return {
    role: "columnheader",
    "aria-sort": options.isSorted
      ? options.sortDirection === "asc"
        ? "ascending" as const
        : "descending" as const
      : "none" as const,
    "aria-label": options.isSorted
      ? `${options.columnName}, sorted ${options.sortDirection === "asc" ? "ascending" : "descending"}. Activate to sort ${options.sortDirection === "asc" ? "descending" : "ascending"}.`
      : `${options.columnName}. Activate to sort ascending.`,
    tabIndex: 0,
  };
}

/**
 * Create ARIA props for filter controls
 */
export function getFilterAriaProps(options: {
  fieldName: string;
  isActive: boolean;
  filterValue?: string;
}) {
  return {
    "aria-label": options.isActive
      ? `Filter ${options.fieldName}: ${options.filterValue}. Press to modify.`
      : `Filter by ${options.fieldName}`,
    "aria-expanded": options.isActive,
    "aria-haspopup": "dialog" as const,
  };
}

/**
 * Create ARIA props for pagination
 */
export function getPaginationAriaProps(options: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}) {
  const start = (options.currentPage - 1) * options.pageSize + 1;
  const end = Math.min(options.currentPage * options.pageSize, options.totalItems);
  
  return {
    nav: {
      role: "navigation",
      "aria-label": "Table pagination",
    },
    status: {
      role: "status",
      "aria-live": "polite" as const,
      "aria-atomic": true,
      children: `Showing ${start} to ${end} of ${options.totalItems} results. Page ${options.currentPage} of ${options.totalPages}.`,
    },
    prevButton: {
      "aria-label": "Go to previous page",
      "aria-disabled": options.currentPage === 1,
    },
    nextButton: {
      "aria-label": "Go to next page",
      "aria-disabled": options.currentPage === options.totalPages,
    },
    pageButton: (page: number) => ({
      "aria-label": `Go to page ${page}`,
      "aria-current": page === options.currentPage ? "page" as const : undefined,
    }),
  };
}

/**
 * Create ARIA props for row selection
 */
export function getRowSelectionAriaProps(options: {
  rowIndex: number;
  isSelected: boolean;
  rowLabel: string;
  totalSelected: number;
}) {
  return {
    row: {
      role: "row",
      "aria-rowindex": options.rowIndex + 1,
      "aria-selected": options.isSelected,
    },
    checkbox: {
      "aria-label": `Select ${options.rowLabel}`,
      "aria-checked": options.isSelected,
    },
  };
}

/**
 * Create ARIA props for export actions
 */
export function getExportAriaProps(options: {
  format: "csv" | "pdf" | "excel";
  rowCount: number;
}) {
  return {
    "aria-label": `Export ${options.rowCount} rows as ${options.format.toUpperCase()}`,
    role: "button",
  };
}

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  // Find or create the announcement region
  let region = document.getElementById("sr-announcements");
  
  if (!region) {
    region = document.createElement("div");
    region.id = "sr-announcements";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", priority);
    region.setAttribute("aria-atomic", "true");
    region.className = "sr-only";
    document.body.appendChild(region);
  }
  
  // Update the region to trigger announcement
  region.textContent = "";
  setTimeout(() => {
    region!.textContent = message;
  }, 100);
}

/**
 * Trap focus within an element (for modals/dialogs)
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };
  
  element.addEventListener("keydown", handleKeyDown);
  firstFocusable?.focus();
  
  return () => {
    element.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Create keyboard navigation handler for data table
 */
export function createTableKeyboardHandler(options: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSelect: () => void;
  onEscape: () => void;
  onHome: () => void;
  onEnd: () => void;
}) {
  return (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        options.onMoveUp();
        break;
      case "ArrowDown":
        e.preventDefault();
        options.onMoveDown();
        break;
      case "ArrowLeft":
        e.preventDefault();
        options.onMoveLeft();
        break;
      case "ArrowRight":
        e.preventDefault();
        options.onMoveRight();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        options.onSelect();
        break;
      case "Escape":
        e.preventDefault();
        options.onEscape();
        break;
      case "Home":
        e.preventDefault();
        options.onHome();
        break;
      case "End":
        e.preventDefault();
        options.onEnd();
        break;
    }
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/**
 * Generate skip link targets
 */
export const SKIP_LINKS = {
  mainContent: "main-content",
  tableData: "table-data",
  filters: "filters",
  actions: "actions",
} as const;

/**
 * Create skip links for report pages
 */
export function getSkipLinks() {
  return [
    { href: `#${SKIP_LINKS.mainContent}`, label: "Skip to main content" },
    { href: `#${SKIP_LINKS.tableData}`, label: "Skip to report data" },
    { href: `#${SKIP_LINKS.filters}`, label: "Skip to filters" },
    { href: `#${SKIP_LINKS.actions}`, label: "Skip to actions" },
  ];
}

/**
 * Format number for screen readers
 */
export function formatNumberForScreenReader(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} million`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} thousand`;
  }
  return value.toLocaleString();
}

/**
 * Generate description for complex data
 */
export function generateDataDescription(options: {
  totalRows: number;
  columns: string[];
  filters?: { field: string; value: string }[];
  sortedBy?: string;
}) {
  let description = `Table with ${options.totalRows} rows and ${options.columns.length} columns`;
  
  if (options.filters && options.filters.length > 0) {
    const filterDesc = options.filters.map((f) => `${f.field} is ${f.value}`).join(", ");
    description += `. Filtered by: ${filterDesc}`;
  }
  
  if (options.sortedBy) {
    description += `. Sorted by ${options.sortedBy}`;
  }
  
  return description;
}

/**
 * CSS class utilities for accessibility
 */
export const a11yClasses = {
  /** Screen reader only - hides visually but keeps accessible */
  srOnly: "sr-only",
  
  /** Not screen reader - hides from assistive tech */
  notSr: "aria-hidden",
  
  /** Focus visible styling */
  focusVisible: "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  
  /** High contrast mode adjustments */
  highContrast: "contrast-more:border-2 contrast-more:border-current",
  
  /** Reduced motion adjustments */
  reducedMotion: "motion-reduce:transition-none motion-reduce:animate-none",
};

export default {
  getTableAriaProps,
  getSortableHeaderAriaProps,
  getFilterAriaProps,
  getPaginationAriaProps,
  getRowSelectionAriaProps,
  getExportAriaProps,
  announceToScreenReader,
  trapFocus,
  createTableKeyboardHandler,
  prefersReducedMotion,
  prefersHighContrast,
  getSkipLinks,
  formatNumberForScreenReader,
  generateDataDescription,
  a11yClasses,
  SKIP_LINKS,
};





