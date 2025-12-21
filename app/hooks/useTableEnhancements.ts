/**
 * useTableEnhancements Hook
 * 
 * Provides enhanced table functionality including:
 * - Column resizing with persistence
 * - Column reordering via drag-and-drop
 * - Column pinning (freeze columns)
 * - Keyboard shortcuts for navigation and actions
 * - Row density preferences
 * - Column visibility toggling
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";

/**
 * Column Configuration
 */
export interface ColumnConfig {
  id: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  isPinned: boolean;
  pinPosition?: "left" | "right";
  isVisible: boolean;
  order: number;
}

export type RowDensity = "compact" | "comfortable" | "spacious";

/**
 * Keyboard shortcut definitions
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook options
 */
export interface UseTableEnhancementsOptions {
  /** Unique identifier for persisting preferences */
  tableId: string;
  /** Initial column configurations */
  initialColumns: Array<{ id: string; label: string; width?: number }>;
  /** Enable persistence to localStorage */
  persist?: boolean;
  /** Callback when preferences change */
  onPreferencesChange?: (prefs: TablePreferences) => void;
}

/**
 * Persisted preferences structure
 */
export interface TablePreferences {
  columns: Record<string, Omit<ColumnConfig, "id">>;
  rowDensity: RowDensity;
  columnOrder: string[];
}

/**
 * Return type for the hook
 */
export interface UseTableEnhancementsReturn {
  // Column state
  columns: ColumnConfig[];
  columnOrder: string[];
  pinnedColumns: { left: string[]; right: string[] };
  visibleColumns: string[];
  
  // Column actions
  setColumnWidth: (columnId: string, width: number) => void;
  toggleColumnPin: (columnId: string, position?: "left" | "right") => void;
  toggleColumnVisibility: (columnId: string) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  resetColumnOrder: () => void;
  
  // Row density
  rowDensity: RowDensity;
  setRowDensity: (density: RowDensity) => void;
  rowDensityClasses: string;
  
  // Keyboard shortcuts
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  shortcuts: KeyboardShortcut[];
  
  // Resize helpers
  isResizing: boolean;
  resizeHandleProps: (columnId: string) => {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  
  // Reset
  resetPreferences: () => void;
}

const DEFAULT_MIN_WIDTH = 80;
const DEFAULT_MAX_WIDTH = 600;
const DEFAULT_WIDTH = 150;

const ROW_DENSITY_CLASSES: Record<RowDensity, string> = {
  compact: "py-1 text-xs",
  comfortable: "py-2.5 text-sm",
  spacious: "py-4 text-sm",
};

/**
 * Get storage key for table preferences
 */
function getStorageKey(tableId: string): string {
  return `table_prefs_${tableId}`;
}

/**
 * Load preferences from localStorage
 */
function loadPreferences(tableId: string): TablePreferences | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(getStorageKey(tableId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load table preferences:", error);
  }
  return null;
}

/**
 * Save preferences to localStorage
 */
function savePreferences(tableId: string, prefs: TablePreferences): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(getStorageKey(tableId), JSON.stringify(prefs));
  } catch (error) {
    console.error("Failed to save table preferences:", error);
  }
}

export function useTableEnhancements(
  options: UseTableEnhancementsOptions
): UseTableEnhancementsReturn {
  const { tableId, initialColumns, persist = true, onPreferencesChange } = options;
  
  // Initialize columns from saved preferences or defaults
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = persist ? loadPreferences(tableId) : null;
    
    return initialColumns.map((col, index) => ({
      id: col.id,
      width: saved?.columns[col.id]?.width ?? col.width ?? DEFAULT_WIDTH,
      minWidth: DEFAULT_MIN_WIDTH,
      maxWidth: DEFAULT_MAX_WIDTH,
      isPinned: saved?.columns[col.id]?.isPinned ?? false,
      pinPosition: saved?.columns[col.id]?.pinPosition,
      isVisible: saved?.columns[col.id]?.isVisible ?? true,
      order: saved?.columns[col.id]?.order ?? index,
    }));
  });
  
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = persist ? loadPreferences(tableId) : null;
    return saved?.columnOrder ?? initialColumns.map((col) => col.id);
  });
  
  const [rowDensity, setRowDensityState] = useState<RowDensity>(() => {
    const saved = persist ? loadPreferences(tableId) : null;
    return saved?.rowDensity ?? "comfortable";
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  
  const resizeStartRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  
  // Compute derived state
  const pinnedColumns = useMemo(() => {
    const left: string[] = [];
    const right: string[] = [];
    
    columns.forEach((col) => {
      if (col.isPinned) {
        if (col.pinPosition === "right") {
          right.push(col.id);
        } else {
          left.push(col.id);
        }
      }
    });
    
    return { left, right };
  }, [columns]);
  
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.isVisible).map((col) => col.id);
  }, [columns]);
  
  // Save preferences on change
  useEffect(() => {
    if (!persist) return;
    
    const prefs: TablePreferences = {
      columns: columns.reduce((acc, col) => {
        acc[col.id] = {
          width: col.width,
          isPinned: col.isPinned,
          pinPosition: col.pinPosition,
          isVisible: col.isVisible,
          order: col.order,
        };
        return acc;
      }, {} as Record<string, Omit<ColumnConfig, "id">>),
      rowDensity,
      columnOrder,
    };
    
    savePreferences(tableId, prefs);
    onPreferencesChange?.(prefs);
  }, [columns, rowDensity, columnOrder, tableId, persist, onPreferencesChange]);
  
  // Column width setter
  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id !== columnId) return col;
        const clampedWidth = Math.max(
          col.minWidth ?? DEFAULT_MIN_WIDTH,
          Math.min(width, col.maxWidth ?? DEFAULT_MAX_WIDTH)
        );
        return { ...col, width: clampedWidth };
      })
    );
  }, []);
  
  // Toggle column pin
  const toggleColumnPin = useCallback(
    (columnId: string, position: "left" | "right" = "left") => {
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            isPinned: !col.isPinned,
            pinPosition: col.isPinned ? undefined : position,
          };
        })
      );
    },
    []
  );
  
  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id !== columnId) return col;
        return { ...col, isVisible: !col.isVisible };
      })
    );
  }, []);
  
  // Reorder columns
  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumnOrder((prev) => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      return newOrder;
    });
    
    setColumns((prev) =>
      prev.map((col) => {
        const newOrderIndex = columnOrder.indexOf(col.id);
        return { ...col, order: newOrderIndex };
      })
    );
  }, [columnOrder]);
  
  // Reset column order
  const resetColumnOrder = useCallback(() => {
    const defaultOrder = initialColumns.map((col) => col.id);
    setColumnOrder(defaultOrder);
    setColumns((prev) =>
      prev.map((col, index) => ({ ...col, order: index }))
    );
  }, [initialColumns]);
  
  // Row density setter
  const setRowDensity = useCallback((density: RowDensity) => {
    setRowDensityState(density);
  }, []);
  
  // Register keyboard shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => {
      // Remove existing shortcut with same key combo
      const filtered = prev.filter(
        (s) =>
          !(
            s.key === shortcut.key &&
            s.ctrl === shortcut.ctrl &&
            s.shift === shortcut.shift &&
            s.alt === shortcut.alt &&
            s.meta === shortcut.meta
          )
      );
      return [...filtered, shortcut];
    });
  }, []);
  
  // Unregister keyboard shortcut
  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts((prev) => prev.filter((s) => s.key !== key));
  }, []);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!e.ctrlKey === !!shortcut.ctrl &&
          !!e.shiftKey === !!shortcut.shift &&
          !!e.altKey === !!shortcut.alt &&
          !!e.metaKey === !!shortcut.meta
        ) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
  
  // Resize handle props
  const resizeHandleProps = useCallback(
    (columnId: string) => {
      const handleResizeStart = (clientX: number) => {
        const column = columns.find((col) => col.id === columnId);
        if (!column) return;
        
        resizeStartRef.current = {
          columnId,
          startX: clientX,
          startWidth: column.width,
        };
        setIsResizing(true);
      };
      
      const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        handleResizeStart(e.clientX);
      };
      
      const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        handleResizeStart(e.touches[0].clientX);
      };
      
      return {
        onMouseDown: handleMouseDown,
        onTouchStart: handleTouchStart,
      };
    },
    [columns]
  );
  
  // Handle resize move and end
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMove = (clientX: number) => {
      if (!resizeStartRef.current) return;
      
      const { columnId, startX, startWidth } = resizeStartRef.current;
      const diff = clientX - startX;
      setColumnWidth(columnId, startWidth + diff);
    };
    
    const handleEnd = () => {
      resizeStartRef.current = null;
      setIsResizing(false);
    };
    
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchend", handleEnd);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isResizing, setColumnWidth]);
  
  // Reset preferences
  const resetPreferences = useCallback(() => {
    setColumns(
      initialColumns.map((col, index) => ({
        id: col.id,
        width: col.width ?? DEFAULT_WIDTH,
        minWidth: DEFAULT_MIN_WIDTH,
        maxWidth: DEFAULT_MAX_WIDTH,
        isPinned: false,
        pinPosition: undefined,
        isVisible: true,
        order: index,
      }))
    );
    setColumnOrder(initialColumns.map((col) => col.id));
    setRowDensityState("comfortable");
    
    if (persist) {
      localStorage.removeItem(getStorageKey(tableId));
    }
  }, [initialColumns, persist, tableId]);
  
  return {
    // Column state
    columns,
    columnOrder,
    pinnedColumns,
    visibleColumns,
    
    // Column actions
    setColumnWidth,
    toggleColumnPin,
    toggleColumnVisibility,
    reorderColumns,
    resetColumnOrder,
    
    // Row density
    rowDensity,
    setRowDensity,
    rowDensityClasses: ROW_DENSITY_CLASSES[rowDensity],
    
    // Keyboard shortcuts
    registerShortcut,
    unregisterShortcut,
    shortcuts,
    
    // Resize helpers
    isResizing,
    resizeHandleProps,
    
    // Reset
    resetPreferences,
  };
}

export default useTableEnhancements;
















