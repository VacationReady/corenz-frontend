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
import { useMemo, useState, useEffect, type ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Checkbox } from "@/components/ui/Checkbox";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableRowSelection?: boolean;
  getRowId?: (row: TData, index: number) => string;
  selectionActionBar?: (selectedRows: TData[]) => ReactNode;
  onSelectionChange?: (selectedRows: TData[]) => void;
  onFilteredRowsChange?: (rows: TData[]) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableRowSelection = false,
  getRowId,
  selectionActionBar,
  onSelectionChange,
  onFilteredRowsChange,
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
  }, [JSON.stringify(columns)]);

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

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original as TData);

  // Notify consumer when selection changes
  useEffect(() => {
    if (onSelectionChange) onSelectionChange(selectedRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(table.getState().rowSelection)]);

  // Notify consumer when filtered rows change
  useEffect(() => {
    if (!onFilteredRowsChange) return;
    const rows = table.getRowModel().rows.map((r) => r.original as TData);
    onFilteredRowsChange(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(table.getState().columnFilters), JSON.stringify(table.getState().sorting), JSON.stringify(data)]);

  return (
    <div className="space-y-4">
      {enableRowSelection && selectionActionBar && selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
          <div className="text-sm">{selectedRows.length} selected</div>
          <div className="flex items-center gap-2">{selectionActionBar(selectedRows)}</div>
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 text-left text-sm font-medium align-top">
                    <div className="flex flex-col gap-2">
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
                      {header.column.getCanFilter() && (() => {
                        const meta: any = header.column.columnDef.meta || {};
                        const filterType = meta?.filter?.type || "text";
                        if (filterType === "multi") {
                          // Build options from meta or unique pre-filtered values
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
                                  .rows.map((r) => r.getValue(header.column.id))
                                  .map((v) => (v ?? "").toString())
                                  .filter((v) => v.length > 0),
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
                            />
                          );
                        }
                        return (
                          <Input
                            placeholder={`Filter ${header.column.id}`}
                            value={(header.column.getFilterValue() ?? "") as string}
                            onChange={(e) => header.column.setFilterValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-9"
                          />
                        );
                      })()}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
