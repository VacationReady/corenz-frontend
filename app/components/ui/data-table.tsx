"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Checkbox } from "@/components/ui/Checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableRowSelection?: boolean;
  getRowId?: (row: TData, index: number) => string;
  selectionActionBar?: (selectedRows: TData[]) => ReactNode;
  onSelectionChange?: (selectedRows: TData[]) => void;
  onFilteredRowsChange?: (rows: TData[]) => void;
  // When this value changes, all active column filters are cleared
  resetFiltersAt?: number;
  virtualizeRows?: boolean;
  virtualizeContainerHeight?: number | string;
  virtualizeEstimateRowHeight?: number;
  virtualizeOverscan?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableRowSelection = false,
  getRowId,
  selectionActionBar,
  onSelectionChange,
  onFilteredRowsChange,
  resetFiltersAt,
  virtualizeRows = false,
  virtualizeContainerHeight = 520,
  virtualizeEstimateRowHeight = 44,
  virtualizeOverscan = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const selectionColumn = useMemo(() => {
    if (!enableRowSelection) return null;
    return ({
      id: "__select__",
      header: ({ table }: any) => (
        <div className="px-4 py-2">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all rows"
          />
        </div>
      ),
      cell: ({ row }: any) => (
        <div className="px-4 py-2">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    }) as unknown as ColumnDef<TData, TValue>;
  }, [enableRowSelection]);

  // Support multi-select filters via column meta
  const enhancedColumns = useMemo(() => {
    const multiSelectFilterFn = (row: any, columnId: string, filterValues: string[]) => {
      if (!Array.isArray(filterValues) || filterValues.length === 0) return true;
      if (filterValues.includes("all")) return true;
      const cellValue = row.getValue(columnId);
      const normalized = (cellValue ?? "").toString();
      return filterValues.includes(normalized);
    };

    // Attach filterFn to columns that declare meta.filter.type === 'multi'
    const attachFilterFn = (col: ColumnDef<TData, TValue>): ColumnDef<TData, TValue> => {
      const anyCol = col as any;
      const isMulti = anyCol?.meta?.filter?.type === "multi";
      if (isMulti && !anyCol.filterFn) {
        return { ...(col as any), filterFn: multiSelectFilterFn } as ColumnDef<TData, TValue>;
      }
      return col;
    };

    return columns.map(attachFilterFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  const columnsWithSelection = useMemo(
    () => (selectionColumn ? ([selectionColumn, ...enhancedColumns] as ColumnDef<TData, TValue>[]) : enhancedColumns),
    [selectionColumn, enhancedColumns],
  );

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection,
    getRowId,
  });

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: virtualizeRows ? rows.length : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => virtualizeEstimateRowHeight,
    overscan: virtualizeOverscan,
    measureElement:
      typeof window !== "undefined" && "ResizeObserver" in window
        ? (el: Element) => (el as HTMLElement).getBoundingClientRect().height
        : undefined,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1]!.end : 0;
  const colSpan = table.getVisibleLeafColumns().length;

  const selectedRowIdsKey = table.getSelectedRowModel().rows.map((r) => r.id).join(",");
  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map((r) => r.original as TData),
    [selectedRowIdsKey, data],
  );

  // Notify consumer when selection changes
  useEffect(() => {
    if (onSelectionChange) onSelectionChange(selectedRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRows, onSelectionChange]);

  // Notify consumer when filtered rows change
  useEffect(() => {
    if (!onFilteredRowsChange) return;
    const rows = table.getRowModel().rows.map((r) => r.original as TData);
    onFilteredRowsChange(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(table.getState().columnFilters), JSON.stringify(table.getState().sorting), JSON.stringify(data)]);

  // External reset for filters only
  useEffect(() => {
    if (typeof resetFiltersAt === "number") {
      setColumnFilters([]);
    }
  }, [resetFiltersAt]);

  return (
    <div className="space-y-4">
      {enableRowSelection && selectionActionBar && selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
          <div className="text-sm">{selectedRows.length} selected</div>
          <div className="flex items-center gap-2">{selectionActionBar(selectedRows)}</div>
        </div>
      )}
      <div
        ref={virtualizeRows ? tableContainerRef : undefined}
        className={virtualizeRows ? "rounded-md border overflow-auto" : "rounded-md border overflow-x-auto"}
        style={virtualizeRows ? { height: virtualizeContainerHeight } : undefined}
      >
        <table className="min-w-full border-collapse">
          <thead className={virtualizeRows ? "bg-muted sticky top-0 z-10" : "bg-muted"}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 text-left text-sm font-medium align-middle">
                    <div className="flex items-center gap-1">
                      <div
                        className="cursor-pointer select-none inline-flex items-center gap-1"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: " 🔼",
                          desc: " 🔽",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                      {header.column.getCanFilter() && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted/60 text-muted-foreground"
                              aria-label={`Filter ${header.column.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="p-2 w-60">
                            {(() => {
                              const meta: any = header.column.columnDef.meta || {};
                              const filterType = meta?.filter?.type || "text";
                              if (filterType === "multi") {
                                let options = (typeof meta?.filter?.options === "function"
                                  ? meta.filter.options({
                                      table: header.getContext().table,
                                      column: header.column,
                                    })
                                  : (meta?.filter?.options as { label: string; value: string }[] | undefined));
                                if (!options || (Array.isArray(options) && options.length === 0)) {
                                  const values = Array.from(
                                    new Set(
                                      header.getContext().table
                                        .getPreFilteredRowModel()
                                        .rows.map((r: any) => r.getValue(header.column.id))
                                        .map((v: any) => (v ?? "").toString())
                                        .filter((v: any) => v.length > 0),
                                    ),
                                  );
                                  options = values.map((v) => ({ label: v, value: v }));
                                }
                                return (
                                  <MultiSelect
                                    options={options}
                                    value={(header.column.getFilterValue() as string[]) || []}
                                    onValueChange={(vals) => header.column.setFilterValue(vals)}
                                    placeholder={`Select ${header.column.id}...`}
                                    autoOpen
                                  />
                                );
                              }
                              return (
                                <Input
                                  placeholder={`Filter ${header.column.id}...`}
                                  value={(header.column.getFilterValue() ?? "") as string}
                                  onChange={(e) => header.column.setFilterValue(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-9"
                                />
                              );
                            })()}
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualizeRows ? (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  if (!row) return null;
                  return (
                    <tr
                      key={row.id}
                      ref={(el) => {
                        if (el) rowVirtualizer.measureElement(el);
                      }}
                      data-index={virtualRow.index}
                      className="border-b hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                  </tr>
                )}
              </>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
