declare module "@tanstack/react-table" {
  import type { ReactNode } from "react";

  export type SortingState = Array<{ id: string; desc?: boolean }>;
  export type ColumnFiltersState = Array<{ id: string; value: unknown }>;

  export type ColumnDef<TData, TValue = unknown> = {
    id?: string;
    accessorKey?: string;
    accessorFn?: (row: TData) => unknown;
    header?: ReactNode | ((ctx: any) => ReactNode);
    cell?: (ctx: { row: Row<TData> }) => ReactNode;
    meta?: unknown;
    enableSorting?: boolean;
    enableHiding?: boolean;
    enableColumnFilter?: boolean;
    filterFn?: unknown;
    size?: number;
  };

  export type Cell<TData> = {
    id: string;
    column: Column<TData>;
    getContext: () => any;
  };

  export type Column<TData> = {
    id: string;
    columnDef: ColumnDef<TData, unknown>;
    getIsSorted: () => false | "asc" | "desc";
    getToggleSortingHandler: () => ((e?: unknown) => void) | undefined;
    getCanFilter: () => boolean;
    getFilterValue: () => unknown;
    setFilterValue: (value: unknown) => void;
  };

  export type Row<TData> = {
    id: string;
    original: TData;
    getVisibleCells: () => Array<Cell<TData>>;
    getValue: (columnId: string) => unknown;
    getIsSelected: () => boolean;
    toggleSelected: (value: boolean) => void;
  };

  export type Header<TData> = {
    id: string;
    column: Column<TData>;
    getContext: () => { table: Table<TData> } & any;
  };

  export type HeaderGroup<TData> = {
    id: string;
    headers: Array<Header<TData>>;
  };

  export type RowModel<TData> = {
    rows: Array<Row<TData>>;
  };

  export type TableState = {
    sorting: SortingState;
    columnFilters: ColumnFiltersState;
    rowSelection: Record<string, boolean>;
  };

  export type Table<TData> = {
    getHeaderGroups: () => Array<HeaderGroup<TData>>;
    getRowModel: () => RowModel<TData>;
    getSelectedRowModel: () => RowModel<TData>;
    getPreFilteredRowModel: () => RowModel<TData>;
    getState: () => TableState;
    getVisibleLeafColumns: () => Array<Column<TData>>;
    getIsAllPageRowsSelected: () => boolean;
    getIsSomePageRowsSelected: () => boolean;
    toggleAllPageRowsSelected: (value: boolean) => void;
  };

  export function flexRender(component: unknown, props: unknown): ReactNode;

  export function getCoreRowModel<TData>(): unknown;
  export function getSortedRowModel<TData>(): unknown;
  export function getFilteredRowModel<TData>(): unknown;

  export function useReactTable<TData>(options: {
    data: TData[];
    columns: Array<ColumnDef<TData, unknown>>;
    state: Partial<TableState>;
    onSortingChange?: (updater: any) => void;
    onColumnFiltersChange?: (updater: any) => void;
    onRowSelectionChange?: (updater: any) => void;
    getCoreRowModel?: unknown;
    getSortedRowModel?: unknown;
    getFilteredRowModel?: unknown;
    enableRowSelection?: boolean;
    getRowId?: (row: TData, index: number) => string;
  }): Table<TData>;
}
