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
import { Checkbox } from "@/components/ui/Checkbox";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableRowSelection?: boolean;
  getRowId?: (row: TData, index: number) => string;
  selectionActionBar?: (selectedRows: TData[]) => ReactNode;
  onSelectionChange?: (selectedRows: TData[]) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableRowSelection = false,
  getRowId,
  selectionActionBar,
  onSelectionChange,
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

  const columnsWithSelection = useMemo(
    () => (selectionColumn ? ([selectionColumn, ...columns] as ColumnDef<TData, TValue>[]) : columns),
    [selectionColumn, columns],
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

  return (
    <div className="space-y-4">
      {enableRowSelection && selectionActionBar && selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
          <div className="text-sm">{selectedRows.length} selected</div>
          <div className="flex items-center gap-2">{selectionActionBar(selectedRows)}</div>
        </div>
      )}
      <div className="flex items-center gap-2">
        {table
          .getAllColumns()
          .map((column) =>
            column.getCanFilter() ? (
              <Input
                key={column.id}
                placeholder={`Filter ${column.id}`}
                value={(column.getFilterValue() ?? "") as string}
                onChange={(e) => column.setFilterValue(e.target.value)}
                className="max-w-xs"
              />
            ) : null,
          )}
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer px-4 py-2 text-left text-sm font-medium"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{
                      asc: " 🔼",
                      desc: " 🔽",
                    }[header.column.getIsSorted() as string] ?? null}
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
