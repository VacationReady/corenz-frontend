"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  Columns3,
  MoreVertical,
  PinOff,
  Pin,
  Eye,
  EyeOff,
  RotateCcw,
  Keyboard,
  ChevronDown,
  Layout,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import Button from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";
import type { ColumnConfig, RowDensity, KeyboardShortcut } from "@/hooks/useTableEnhancements";

interface TableToolbarProps {
  /** Column configurations */
  columns: ColumnConfig[];
  /** Column labels map */
  columnLabels: Record<string, string>;
  /** Current row density */
  rowDensity: RowDensity;
  /** Keyboard shortcuts */
  shortcuts: KeyboardShortcut[];
  /** Visible column IDs */
  visibleColumns: string[];
  /** Pinned columns */
  pinnedColumns: { left: string[]; right: string[] };
  
  /** Actions */
  onToggleColumnVisibility: (columnId: string) => void;
  onToggleColumnPin: (columnId: string, position?: "left" | "right") => void;
  onSetRowDensity: (density: RowDensity) => void;
  onResetPreferences: () => void;
  
  /** Optional className */
  className?: string;
}

const DENSITY_OPTIONS: Array<{ value: RowDensity; label: string; icon: React.ReactNode }> = [
  { value: "compact", label: "Compact", icon: <SlidersHorizontal className="w-4 h-4" /> },
  { value: "comfortable", label: "Comfortable", icon: <Layout className="w-4 h-4" /> },
  { value: "spacious", label: "Spacious", icon: <Columns3 className="w-4 h-4" /> },
];

export function TableToolbar({
  columns,
  columnLabels,
  rowDensity,
  shortcuts,
  visibleColumns,
  pinnedColumns,
  onToggleColumnVisibility,
  onToggleColumnPin,
  onSetRowDensity,
  onResetPreferences,
  className,
}: TableToolbarProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const hiddenCount = columns.filter((c) => !c.isVisible).length;
  const pinnedCount = pinnedColumns.left.length + pinnedColumns.right.length;

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Column Visibility Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Columns3 className="w-3.5 h-3.5" />
              Columns
              {hiddenCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {hiddenCount} hidden
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <div className="p-3 border-b">
              <h4 className="text-sm font-semibold">Show/Hide Columns</h4>
              <p className="text-xs text-muted-foreground">
                Toggle column visibility
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {columns.map((column) => (
                <label
                  key={column.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={column.isVisible}
                    onCheckedChange={() => onToggleColumnVisibility(column.id)}
                  />
                  <span className="text-sm flex-1 truncate">
                    {columnLabels[column.id] || column.id}
                  </span>
                  {column.isPinned && (
                    <Pin className="w-3.5 h-3.5 text-primary" />
                  )}
                </label>
              ))}
            </div>
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8"
                onClick={() => {
                  columns.forEach((c) => {
                    if (!c.isVisible) onToggleColumnVisibility(c.id);
                  });
                }}
              >
                <Eye className="w-3.5 h-3.5 mr-2" />
                Show all columns
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Row Density Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Layout className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Density</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Row Density</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DENSITY_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSetRowDensity(option.value)}
                className="gap-2"
              >
                {option.icon}
                <span className="flex-1">{option.label}</span>
                {rowDensity === option.value && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Pin Status Indicator */}
        {pinnedCount > 0 && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Pin className="w-3 h-3" />
            {pinnedCount} pinned
          </Badge>
        )}

        {/* More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowShortcuts(true)}>
              <Keyboard className="w-4 h-4 mr-2" />
              Keyboard shortcuts
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {pinnedCount > 0 && (
              <DropdownMenuItem
                onClick={() => {
                  [...pinnedColumns.left, ...pinnedColumns.right].forEach((id) => {
                    onToggleColumnPin(id);
                  });
                }}
              >
                <PinOff className="w-4 h-4 mr-2" />
                Unpin all columns
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={onResetPreferences}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset table preferences
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to navigate and interact with the table.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {shortcuts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No shortcuts configured
              </p>
            ) : (
              shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono rounded bg-background border">
                    {[
                      shortcut.ctrl && (typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "⌘" : "Ctrl"),
                      shortcut.shift && "⇧",
                      shortcut.alt && "Alt",
                      shortcut.key.toUpperCase(),
                    ]
                      .filter(Boolean)
                      .join(" + ")}
                  </kbd>
                </div>
              ))
            )}
            
            {/* Default shortcuts always available */}
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-muted-foreground mb-2">Default shortcuts:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Search table</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-background border">
                    {typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + F
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Export data</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-background border">
                    {typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + E
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Close/Cancel</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-background border">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Column Resize Handle Component
 */
interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
  isResizing?: boolean;
}

export function ColumnResizeHandle({ onResizeStart, isResizing }: ResizeHandleProps) {
  return (
    <div
      className={cn(
        "absolute top-0 right-0 w-1 h-full cursor-col-resize group",
        "hover:bg-primary/50 transition-colors",
        isResizing && "bg-primary"
      )}
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
    >
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8",
          "bg-primary opacity-0 group-hover:opacity-100 transition-opacity",
          isResizing && "opacity-100"
        )}
      />
    </div>
  );
}

/**
 * Column Pin Button Component
 */
interface ColumnPinButtonProps {
  isPinned: boolean;
  pinPosition?: "left" | "right";
  onToggle: (position?: "left" | "right") => void;
}

export function ColumnPinButton({ isPinned, pinPosition, onToggle }: ColumnPinButtonProps) {
  if (isPinned) {
    return (
      <button
        onClick={() => onToggle()}
        className="p-1 rounded hover:bg-muted transition-colors"
        title="Unpin column"
      >
        <Pin className="w-3.5 h-3.5 text-primary fill-primary" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
          title="Pin column"
        >
          <Pin className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onToggle("left")}>
          Pin to left
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggle("right")}>
          Pin to right
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TableToolbar;



