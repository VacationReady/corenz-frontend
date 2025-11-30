"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { DatePresetSelector } from "./DatePresetSelector";
import { calculateDateRange, type DatePresetSelection } from "@/lib/reportingDatePresets";
import { useReportingTimeConfig } from "@/hooks/useReportingTimeConfig";
import { useDebounce } from "@/hooks/useDebounce";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Column {
  header: string;
  accessorKey: string;
}

type ColumnType = "number" | "date" | "boolean" | "string";

interface ColumnFilter {
  [columnKey: string]: string[];
}

type AdvancedFilter =
  | { mode: "search"; query: string }
  | { mode: "numberRange"; min?: number; max?: number }
  | { mode: "dateRange"; from?: string; to?: string; selection?: DatePresetSelection }
  | { mode: "boolean"; value: "true" | "false" | "" };

interface QuickFilterResult {
  columnFilters?: ColumnFilter;
  advancedFilters?: Record<string, AdvancedFilter>;
  globalSearch?: string;
  clearOthers?: boolean;
}

interface QuickFilterContext {
  columns: Column[];
  columnTypes: Record<string, ColumnType>;
  currentUserId?: string;
}

interface QuickFilterPreset {
  id: string;
  label: string;
  description?: string;
  apply: (context: QuickFilterContext) => QuickFilterResult | null;
  isAvailable?: (context: QuickFilterContext) => boolean;
}

interface StoredFilterSet {
  id: string;
  name: string;
  columnFilters: ColumnFilter;
  advancedFilters: Record<string, AdvancedFilter>;
  globalSearch: string;
  quickPresetId: string | null;
}

interface PersistedTableState {
  columnFilters: ColumnFilter;
  advancedFilters: Record<string, AdvancedFilter>;
  globalSearch: string;
  quickPresetId: string | null;
  page: number;
  pageSize: number;
  savedFilterSets?: StoredFilterSet[];
}

interface FilterChip {
  id: string;
  label: string;
  ariaLabel: string;
  onRemove: () => void;
}

interface FilterableDataTableProps {
  columns: Column[];
  data: any[];
  total?: number;
  page?: number;
  pageSize?: number;
  reportId?: string;
  currentUserId?: string;
  quickFilterPresets?: QuickFilterPreset[];
  virtualizationThreshold?: number;
  isLoading?: boolean;
  onFilteredDataChange?: (filteredData: any[]) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onTableLoadingChange?: (loading: boolean) => void;
}

const STORAGE_KEY_PREFIX = "reports-table-state";
const DEFAULT_VIRTUAL_ROW_HEIGHT = 48;
const VIRTUAL_OVERSCAN = 8;

const buildStorageKey = (reportId?: string) => `${STORAGE_KEY_PREFIX}:${reportId ?? "preview"}`;

const getNestedValue = (obj: any, path: string): any => {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return current[key];
    }
    return null;
  }, obj);
};

const detectColumnType = (sampleValues: string[], data: any[], accessorKey: string): ColumnType => {
  const boolSet = new Set(
    data
      .map((row) => getNestedValue(row, accessorKey))
      .filter((value) => value !== null && value !== undefined)
      .map((value) => (typeof value === "boolean" ? value : value === "true" ? true : value === "false" ? false : undefined))
      .filter((value) => value !== undefined),
  );
  if (boolSet.size > 0 && boolSet.size <= 2) {
    return "boolean";
  }

  const numeric = sampleValues.every((value) => value === "" || !Number.isNaN(Number(value)));
  if (numeric) {
    return "number";
  }

  const dateLike = sampleValues.every((value) => value === "" || !Number.isNaN(Date.parse(value)) || /\d{4}-\d{2}-\d{2}/.test(value));
  if (dateLike) {
    return "date";
  }

  return "string";
};

const isAdvancedFilterActive = (filter?: AdvancedFilter) => {
  if (!filter) return false;
  switch (filter.mode) {
    case "search":
      return Boolean(filter.query?.trim());
    case "numberRange":
      return filter.min !== undefined || filter.max !== undefined;
    case "dateRange":
      return Boolean(filter.from || filter.to || filter.selection);
    case "boolean":
      return Boolean(filter.value);
    default:
      return false;
  }
};

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" && /\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return String(value);
};

const describeAdvancedFilterLabel = (filter: AdvancedFilter, columnLabel: string) => {
  switch (filter.mode) {
    case "search":
      return `${columnLabel}: contains "${filter.query}"`;
    case "numberRange":
      if (filter.min !== undefined && filter.max !== undefined) return `${columnLabel}: ${filter.min}–${filter.max}`;
      if (filter.min !== undefined) return `${columnLabel}: ≥ ${filter.min}`;
      if (filter.max !== undefined) return `${columnLabel}: ≤ ${filter.max}`;
      return columnLabel;
    case "dateRange": {
      const from = filter.from ? new Date(filter.from).toLocaleDateString() : null;
      const to = filter.to ? new Date(filter.to).toLocaleDateString() : null;
      if (from && to) return `${columnLabel}: ${from} → ${to}`;
      if (from) return `${columnLabel}: after ${from}`;
      if (to) return `${columnLabel}: before ${to}`;
      return columnLabel;
    }
    case "boolean":
      return `${columnLabel}: ${filter.value === "true" ? "Yes" : "No"}`;
    default:
      return columnLabel;
  }
};

const cloneAdvancedFilter = (filter?: AdvancedFilter): AdvancedFilter | undefined => {
  if (!filter) return undefined;
  switch (filter.mode) {
    case "search":
      return { mode: "search", query: filter.query };
    case "numberRange":
      return { mode: "numberRange", min: filter.min, max: filter.max };
    case "dateRange":
      return {
        mode: "dateRange",
        from: filter.from,
        to: filter.to,
        selection: filter.selection ? { ...filter.selection } : undefined,
      };
    case "boolean":
      return { mode: "boolean", value: filter.value };
    default:
      return filter;
  }
};

const cloneAdvancedFilters = (input: Record<string, AdvancedFilter>): Record<string, AdvancedFilter> => {
  const result: Record<string, AdvancedFilter> = {};
  Object.entries(input).forEach(([key, value]) => {
    const cloned = cloneAdvancedFilter(value);
    if (cloned) {
      result[key] = cloned;
    }
  });
  return result;
};

const cloneColumnFilters = (input: ColumnFilter): ColumnFilter => {
  const result: ColumnFilter = {};
  Object.entries(input).forEach(([key, values]) => {
    result[key] = [...values];
  });
  return result;
};

const buildDefaultQuickPresets = (context: QuickFilterContext): QuickFilterPreset[] => {
  const presets: QuickFilterPreset[] = [];

  const firstDateColumn = context.columns.find((column) => context.columnTypes[column.accessorKey] === "date");
  if (firstDateColumn) {
    presets.push({
      id: "last_30_days",
      label: "Last 30 days",
      description: "Limit rows to the most recent 30 days",
      apply: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return {
          advancedFilters: {
            [firstDateColumn.accessorKey]: {
              mode: "dateRange",
              from: start.toISOString(),
              to: end.toISOString(),
            },
          },
          clearOthers: true,
        };
      },
    });
  }

  if (context.currentUserId) {
    const managerColumn = context.columns.find((column) => /manager|owner|lead|reports?/i.test(column.accessorKey));
    if (managerColumn) {
      presets.push({
        id: "my_team_only",
        label: "My team only",
        description: "Show only records owned by you",
        apply: () => ({
          columnFilters: {
            [managerColumn.accessorKey]: [context.currentUserId as string],
          },
          clearOthers: false,
        }),
      });
    }
  }

  return presets;
};

const safeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function FilterableDataTable({
  columns,
  data,
  total,
  page,
  pageSize,
  reportId,
  currentUserId,
  quickFilterPresets,
  virtualizationThreshold = 400,
  isLoading = false,
  onFilteredDataChange,
  onPageChange,
  onPageSizeChange,
  onTableLoadingChange,
}: FilterableDataTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({});
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, AdvancedFilter>>({});
  const [draftColumnFilters, setDraftColumnFilters] = useState<Record<string, string[]>>({});
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState<Record<string, AdvancedFilter | undefined>>({});
  const [globalSearchInput, setGlobalSearchInput] = useState("");
  const [quickPresetId, setQuickPresetId] = useState<string | null>(null);
  const [savedFilterSets, setSavedFilterSets] = useState<StoredFilterSet[]>([]);
  const [selectedSavedSetId, setSelectedSavedSetId] = useState("");
  const [openFilters, setOpenFilters] = useState<Set<string>>(new Set());
  const [hasError, setHasError] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const [virtualViewportHeight, setVirtualViewportHeight] = useState(520);
  const [internalPage, setInternalPage] = useState(page ?? 1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize ?? 50);
  const [hasHydrated, setHasHydrated] = useState(false);
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const virtualContainerRef = useRef<HTMLDivElement | null>(null);
  const { timeZone, locale } = useReportingTimeConfig();
  const storageKey = useMemo(() => buildStorageKey(reportId), [reportId]);
  const debouncedGlobalSearch = useDebounce(globalSearchInput, 250);

  useEffect(() => {
    if (typeof page === "number") {
      setInternalPage(page);
    }
  }, [page]);

  useEffect(() => {
    if (typeof pageSize === "number") {
      setInternalPageSize(pageSize);
    }
  }, [pageSize]);

  const currentPage = page ?? internalPage;
  const currentPageSize = pageSize ?? internalPageSize;
  const safePageSize = currentPageSize > 0 ? currentPageSize : 1;
  const hasTotal = typeof total === "number" && !Number.isNaN(total);

  const pageSizeOptions = useMemo(() => {
    const presets = [25, 50, 100, 250];
    if (!presets.includes(safePageSize)) {
      presets.push(safePageSize);
      presets.sort((a, b) => a - b);
    }
    return presets;
  }, [safePageSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setHasHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as PersistedTableState;
      setColumnFilters(parsed.columnFilters ?? {});
      setAdvancedFilters(parsed.advancedFilters ?? {});
      setGlobalSearchInput(parsed.globalSearch ?? "");
      setQuickPresetId(parsed.quickPresetId ?? null);
      setSavedFilterSets(parsed.savedFilterSets ?? []);
      if (page === undefined && typeof parsed.page === "number") {
        setInternalPage(parsed.page);
      }
      if (pageSize === undefined && typeof parsed.pageSize === "number") {
        setInternalPageSize(parsed.pageSize);
      }
    } catch (error) {
      console.warn("Failed to hydrate table state", error);
    } finally {
      setHasHydrated(true);
    }
  }, [storageKey, page, pageSize]);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") return;
    const payload: PersistedTableState = {
      columnFilters,
      advancedFilters,
      globalSearch: globalSearchInput,
      quickPresetId,
      page: currentPage,
      pageSize: currentPageSize,
      savedFilterSets,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [storageKey, columnFilters, advancedFilters, globalSearchInput, quickPresetId, currentPage, currentPageSize, savedFilterSets, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    setTableLoading(true);
    onTableLoadingChange?.(true);
  }, [debouncedGlobalSearch, columnFilters, advancedFilters, currentPage, currentPageSize, data, hasHydrated, onTableLoadingChange]);

  useEffect(() => {
    if (isLoading) return;
    if (!tableLoading) return;
    if (typeof window === "undefined") {
      setTableLoading(false);
      onTableLoadingChange?.(false);
      return;
    }
    const timeout = window.setTimeout(() => {
      setTableLoading(false);
      onTableLoadingChange?.(false);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [tableLoading, isLoading, onTableLoadingChange]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!tableWrapperRef.current) return;
      if (!tableWrapperRef.current.contains(event.target as Node)) {
        setOpenFilters(new Set());
        setDraftColumnFilters({});
        setDraftAdvancedFilters({});
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!openFilters.size) return;
    setDraftColumnFilters((prev) => {
      const next = { ...prev };
      openFilters.forEach((columnKey) => {
        if (!(columnKey in next)) {
          next[columnKey] = [...(columnFilters[columnKey] || [])];
        }
      });
      return next;
    });
    setDraftAdvancedFilters((prev) => {
      const next = { ...prev };
      openFilters.forEach((columnKey) => {
        if (!(columnKey in next)) {
          next[columnKey] = advancedFilters[columnKey];
        }
      });
      return next;
    });
  }, [openFilters, columnFilters, advancedFilters]);

  useEffect(() => {
    setHasError(false);
  }, [data, columns]);

  useEffect(() => {
    if (!selectedSavedSetId) return;
    if (!savedFilterSets.some((set) => set.id === selectedSavedSetId)) {
      setSelectedSavedSetId("");
    }
  }, [savedFilterSets, selectedSavedSetId]);

  const columnValues = useMemo(() => {
    if (!columns || !data || data.length === 0) {
      return {} as Record<string, string[]>;
    }
    const values: Record<string, string[]> = {};
    columns.forEach((column) => {
      const uniqueValues = new Set<string>();
      data.forEach((row) => {
        const value = getNestedValue(row, column.accessorKey);
        if (value !== null && value !== undefined && value !== "") {
          uniqueValues.add(String(value));
        }
      });
      values[column.accessorKey] = Array.from(uniqueValues).sort();
    });
    return values;
  }, [columns, data]);

  const columnTypes = useMemo(() => {
    if (!columns || !data) return {};
    const map: Record<string, ColumnType> = {};
    for (const column of columns) {
      map[column.accessorKey] = detectColumnType(columnValues[column.accessorKey] || [], data, column.accessorKey);
    }
    return map;
  }, [columns, data, columnValues]);

  const quickFilterContext = useMemo<QuickFilterContext>(
    () => ({ columns, columnTypes, currentUserId }),
    [columns, columnTypes, currentUserId],
  );

  const resolvedQuickPresets = useMemo(() => {
    if (quickFilterPresets && quickFilterPresets.length) {
      return quickFilterPresets;
    }
    return buildDefaultQuickPresets(quickFilterContext);
  }, [quickFilterPresets, quickFilterContext]);

  const globalSearchValue = useMemo(() => debouncedGlobalSearch.trim().toLowerCase(), [debouncedGlobalSearch]);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    let result = data;

    result = result.filter((row) => {
      return Object.entries(advancedFilters).every(([key, filter]) => {
        if (!filter) return true;
        const raw = getNestedValue(row, key);
        switch (filter.mode) {
          case "search": {
            const query = (filter.query || "").toLowerCase();
            if (!query) return true;
            return String(raw ?? "").toLowerCase().includes(query);
          }
          case "numberRange": {
            const numberValue = raw === null || raw === undefined ? undefined : Number(raw);
            if (numberValue === undefined || Number.isNaN(numberValue)) return false;
            if (filter.min !== undefined && numberValue < filter.min) return false;
            if (filter.max !== undefined && numberValue > filter.max) return false;
            return true;
          }
          case "dateRange": {
            if (!raw) return false;
            const dateValue = new Date(raw);
            if (filter.from && dateValue < new Date(filter.from)) return false;
            if (filter.to && dateValue > new Date(filter.to)) return false;
            return true;
          }
          case "boolean": {
            if (!filter.value) return true;
            const boolValue = typeof raw === "boolean" ? raw : String(raw).toLowerCase() === "true";
            return String(boolValue) === filter.value;
          }
          default:
            return true;
        }
      });
    });

    if (Object.keys(columnFilters).length > 0) {
      result = result.filter((row) => {
        return Object.entries(columnFilters).every(([columnKey, selectedValues]) => {
          if (selectedValues.length === 0) return true;
          const rowValue = getNestedValue(row, columnKey);
          return selectedValues.includes(String(rowValue));
        });
      });
    }

    if (globalSearchValue) {
      const searchableColumns = columns.map((col) => col.accessorKey);
      result = result.filter((row) =>
        searchableColumns.some((key) => {
          const raw = getNestedValue(row, key);
          if (raw === null || raw === undefined) return false;
          return String(raw).toLowerCase().includes(globalSearchValue);
        }),
      );
    }

    return result;
  }, [data, columnFilters, advancedFilters, globalSearchValue, columns]);

  useEffect(() => {
    onFilteredDataChange?.(filteredData);
  }, [filteredData, onFilteredDataChange]);

  const effectiveTotalCount = hasTotal ? total! : filteredData.length;
  const pageCount = Math.max(1, Math.ceil(effectiveTotalCount / safePageSize));
  const currentPageDisplay = Math.min(currentPage, pageCount);
  const startOffset = (currentPageDisplay - 1) * safePageSize;
  const pageRows = hasTotal ? filteredData : filteredData.slice(startOffset, startOffset + safePageSize);

  const virtualizationActive = pageRows.length > virtualizationThreshold;
  const rowHeight = DEFAULT_VIRTUAL_ROW_HEIGHT;
  const startIndex = virtualizationActive ? Math.max(0, Math.floor(virtualScrollTop / rowHeight) - VIRTUAL_OVERSCAN) : 0;
  const visibleCount = virtualizationActive
    ? Math.ceil(virtualViewportHeight / rowHeight) + VIRTUAL_OVERSCAN * 2
    : pageRows.length;
  const endIndex = virtualizationActive ? Math.min(pageRows.length, startIndex + visibleCount) : pageRows.length;
  const visibleRows = virtualizationActive ? pageRows.slice(startIndex, endIndex) : pageRows;
  const topPadding = virtualizationActive ? startIndex * rowHeight : 0;
  const bottomPadding = virtualizationActive ? (pageRows.length - endIndex) * rowHeight : 0;

  useEffect(() => {
    if (!virtualizationActive) return;
    setVirtualScrollTop(0);
  }, [virtualizationActive, pageRows.length]);

  useEffect(() => {
    if (!virtualizationActive) return;
    const container = virtualContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setVirtualViewportHeight(entry.contentRect.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [virtualizationActive]);

  const handleVirtualScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setVirtualScrollTop(event.currentTarget.scrollTop);
  }, []);

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pageCount) return;
    if (onPageChange) {
      onPageChange(nextPage);
    }
    if (page === undefined) {
      setInternalPage(nextPage);
    }
  };

  const changePageSize = (nextPageSize: number) => {
    if (nextPageSize <= 0) return;
    if (onPageSizeChange) {
      onPageSizeChange(nextPageSize);
    }
    if (pageSize === undefined) {
      setInternalPageSize(nextPageSize);
      setInternalPage(1);
    }
  };

  const toggleFilter = (columnKey: string, forceOpen?: boolean) => {
    setOpenFilters((prev) => {
      const next = new Set(prev);
      const shouldOpen = forceOpen !== undefined ? forceOpen : !next.has(columnKey);
      
      if (!shouldOpen) {
        next.delete(columnKey);
        setDraftColumnFilters((draft) => {
          const copy = { ...draft };
          delete copy[columnKey];
          return copy;
        });
        setDraftAdvancedFilters((draft) => {
          const copy = { ...draft };
          delete copy[columnKey];
          return copy;
        });
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

  const updateDraftColumnFilter = (columnKey: string, value: string, isChecked: boolean) => {
    setDraftColumnFilters((prev) => {
      const base = prev[columnKey] ?? columnFilters[columnKey] ?? [];
      let nextValues = [...base];
      if (isChecked) {
        if (!nextValues.includes(value)) {
          nextValues.push(value);
        }
      } else {
        nextValues = nextValues.filter((item) => item !== value);
      }
      return { ...prev, [columnKey]: nextValues };
    });
  };

  const applyColumnFilterChanges = (columnKey: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      const draftValues = draftColumnFilters[columnKey];
      if (draftValues && draftValues.length) {
        next[columnKey] = Array.from(new Set(draftValues));
      } else {
        delete next[columnKey];
      }
      return next;
    });
    setAdvancedFilters((prev) => {
      const next = { ...prev };
      const draft = draftAdvancedFilters[columnKey];
      if (draft && isAdvancedFilterActive(draft)) {
        next[columnKey] = draft;
      } else {
        delete next[columnKey];
      }
      return next;
    });
    setDraftColumnFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
    setDraftAdvancedFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
    setOpenFilters((prev) => {
      const next = new Set(prev);
      next.delete(columnKey);
      return next;
    });
    setQuickPresetId(null);
  };

  const resetColumnFilterChanges = (columnKey: string) => {
    setDraftColumnFilters((prev) => ({ ...prev, [columnKey]: [...(columnFilters[columnKey] || [])] }));
    setDraftAdvancedFilters((prev) => ({ ...prev, [columnKey]: advancedFilters[columnKey] }));
  };

  const clearColumnFilter = (columnKey: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
    setAdvancedFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
    setDraftColumnFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
    setDraftAdvancedFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
    setQuickPresetId(null);
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setAdvancedFilters({});
    setDraftColumnFilters({});
    setDraftAdvancedFilters({});
    setGlobalSearchInput("");
    setQuickPresetId(null);
    setOpenFilters(new Set());
  };

  const applyQuickPreset = (presetId: string) => {
    if (quickPresetId === presetId) {
      setQuickPresetId(null);
      return;
    }
    const preset = resolvedQuickPresets.find((item) => item.id === presetId);
    if (!preset) return;
    const result = preset.apply(quickFilterContext);
    if (!result) return;

    setColumnFilters((prev) => {
      if (!result.columnFilters) return result.clearOthers ? {} : prev;
      const base = result.clearOthers ? {} : { ...prev };
      Object.entries(result.columnFilters).forEach(([key, values]) => {
        base[key] = [...values];
      });
      return base;
    });

    setAdvancedFilters((prev) => {
      if (!result.advancedFilters) return result.clearOthers ? {} : prev;
      const base = result.clearOthers ? {} : { ...prev };
      Object.entries(result.advancedFilters).forEach(([key, value]) => {
        base[key] = value;
      });
      return base;
    });

    if (result.globalSearch !== undefined) {
      setGlobalSearchInput(result.globalSearch);
    }

    setQuickPresetId(presetId);
  };

  const handleSaveCurrentFilters = () => {
    const name = typeof window !== "undefined" ? window.prompt("Name this filter set:") : undefined;
    if (!name) return;
    const newSet: StoredFilterSet = {
      id: safeId(),
      name,
      columnFilters: cloneColumnFilters(columnFilters),
      advancedFilters: cloneAdvancedFilters(advancedFilters),
      globalSearch: globalSearchInput,
      quickPresetId,
    };
    setSavedFilterSets((prev) => [...prev, newSet]);
    setSelectedSavedSetId(newSet.id);
  };

  const handleLoadFilterSet = () => {
    if (!selectedSavedSetId) return;
    const set = savedFilterSets.find((item) => item.id === selectedSavedSetId);
    if (!set) return;
    setColumnFilters(cloneColumnFilters(set.columnFilters));
    setAdvancedFilters(cloneAdvancedFilters(set.advancedFilters));
    setGlobalSearchInput(set.globalSearch);
    setQuickPresetId(set.quickPresetId);
  };

  const handleDeleteFilterSet = () => {
    if (!selectedSavedSetId) return;
    setSavedFilterSets((prev) => prev.filter((set) => set.id !== selectedSavedSetId));
    setSelectedSavedSetId("");
  };

  const columnLabelMap = useMemo(() => Object.fromEntries(columns.map((col) => [col.accessorKey, col.header])), [columns]);

  const filterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];
    if (globalSearchValue) {
      chips.push({
        id: "global-search",
        label: `Search: "${debouncedGlobalSearch.trim()}"`,
        ariaLabel: "Clear global search",
        onRemove: () => setGlobalSearchInput(""),
      });
    }
    Object.entries(columnFilters).forEach(([columnKey, values]) => {
      values.forEach((value) => {
        chips.push({
          id: `${columnKey}-${value}`,
          label: `${columnLabelMap[columnKey] ?? columnKey}: ${value}`,
          ariaLabel: `Remove filter ${value} from ${columnLabelMap[columnKey] ?? columnKey}`,
          onRemove: () => {
            setColumnFilters((prev) => {
              const next = { ...prev };
              next[columnKey] = next[columnKey].filter((item) => item !== value);
              if (!next[columnKey].length) {
                delete next[columnKey];
              }
              return next;
            });
            setQuickPresetId(null);
          },
        });
      });
    });
    Object.entries(advancedFilters).forEach(([columnKey, filter]) => {
      if (!filter || !isAdvancedFilterActive(filter)) return;
      const label = describeAdvancedFilterLabel(filter, columnLabelMap[columnKey] ?? columnKey);
      chips.push({
        id: `${columnKey}-advanced`,
        label,
        ariaLabel: `Remove advanced filter for ${columnLabelMap[columnKey] ?? columnKey}`,
        onRemove: () => clearColumnFilter(columnKey),
      });
    });
    return chips;
  }, [globalSearchValue, debouncedGlobalSearch, columnFilters, advancedFilters, columnLabelMap]);

  const handleOmniboxChange = (value: string) => {
    setGlobalSearchInput(value);
    setQuickPresetId(null);
  };

  const quickFilterButtons = resolvedQuickPresets.filter((preset) => (preset.isAvailable ? preset.isAvailable(quickFilterContext) : true));
  const toolbarSummary = hasTotal
    ? `Showing ${pageRows.length.toLocaleString()} of ${effectiveTotalCount.toLocaleString()} rows`
    : `${pageRows.length.toLocaleString()} of ${filteredData.length.toLocaleString()} rows`;
  const disablePrev = currentPageDisplay <= 1;
  const disableNext = currentPageDisplay >= pageCount;
  const showingLoading = isLoading || tableLoading;

  const renderColumnDraft = (columnKey: string) => {
    const availableValues = columnValues[columnKey] || [];
    const detectedType = columnTypes[columnKey];
    const draftAdvanced = draftAdvancedFilters[columnKey] ?? advancedFilters[columnKey];
    const draftExact = draftColumnFilters[columnKey] ?? columnFilters[columnKey] ?? [];

    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Filter {columnLabelMap[columnKey] ?? columnKey}</h4>
          {(draftExact.length > 0 || isAdvancedFilterActive(draftAdvanced)) && (
            <button type="button" onClick={() => clearColumnFilter(columnKey)} className="text-xs text-gray-500 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>

        {detectedType === "string" && (
          <div>
            <label htmlFor={`search-${columnKey}`} className="mb-1 block text-xs font-medium text-gray-700">
              Search
            </label>
            <input
              id={`search-${columnKey}`}
              type="text"
              value={draftAdvanced?.mode === "search" ? draftAdvanced.query : ""}
              onChange={(event) => {
                const value = event.target.value;
                setDraftAdvancedFilters((prev) => ({
                  ...prev,
                  [columnKey]: { mode: "search", query: value },
                }));
              }}
              placeholder={`Search ${columnLabelMap[columnKey] ?? columnKey}`}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {detectedType === "number" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`min-${columnKey}`} className="mb-1 block text-xs font-medium text-gray-700">
                Min
              </label>
              <input
                id={`min-${columnKey}`}
                type="number"
                value={draftAdvanced?.mode === "numberRange" && draftAdvanced.min !== undefined ? draftAdvanced.min : ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraftAdvancedFilters((prev) => ({
                    ...prev,
                    [columnKey]: {
                      mode: "numberRange",
                      min: value === "" ? undefined : Number(value),
                      max: draftAdvanced?.mode === "numberRange" ? draftAdvanced.max : undefined,
                    },
                  }));
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor={`max-${columnKey}`} className="mb-1 block text-xs font-medium text-gray-700">
                Max
              </label>
              <input
                id={`max-${columnKey}`}
                type="number"
                value={draftAdvanced?.mode === "numberRange" && draftAdvanced.max !== undefined ? draftAdvanced.max : ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraftAdvancedFilters((prev) => ({
                    ...prev,
                    [columnKey]: {
                      mode: "numberRange",
                      max: value === "" ? undefined : Number(value),
                      min: draftAdvanced?.mode === "numberRange" ? draftAdvanced.min : undefined,
                    },
                  }));
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {detectedType === "date" && (() => {
          const dateFilter = draftAdvanced?.mode === "dateRange" ? draftAdvanced : undefined;
          const selection = dateFilter?.selection;

          const formatForInput = (iso?: string) => {
            if (!iso) return "";
            const parsed = new Date(iso);
            if (Number.isNaN(parsed.getTime())) {
              return iso.slice(0, 10);
            }
            return parsed.toISOString().slice(0, 10);
          };

          const updateManualRange = (updates: { from?: string; to?: string }) => {
            setDraftAdvancedFilters((prev) => ({
              ...prev,
              [columnKey]: {
                mode: "dateRange",
                from: updates.from ?? dateFilter?.from,
                to: updates.to ?? dateFilter?.to,
                selection: undefined,
              },
            }));
          };

          const applyPresetSelection = (selectionValue: DatePresetSelection) => {
            const range = calculateDateRange(selectionValue, { timeZone });
            setDraftAdvancedFilters((prev) => ({
              ...prev,
              [columnKey]: {
                mode: "dateRange",
                selection: selectionValue,
                from: range.start ? range.start.toISOString() : undefined,
                to: range.end ? range.end.toISOString() : undefined,
              },
            }));
          };

          return (
            <div className="space-y-3">
              <DatePresetSelector value={selection} onChange={applyPresetSelection} timeZone={timeZone} locale={locale} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`from-${columnKey}`} className="mb-1 block text-xs font-medium text-gray-700">
                    From
                  </label>
                  <input
                    id={`from-${columnKey}`}
                    type="date"
                    value={formatForInput(dateFilter?.from)}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) {
                        updateManualRange({ from: undefined });
                        return;
                      }
                      const parsed = new Date(value);
                      parsed.setHours(0, 0, 0, 0);
                      updateManualRange({ from: parsed.toISOString() });
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor={`to-${columnKey}`} className="mb-1 block text-xs font-medium text-gray-700">
                    To
                  </label>
                  <input
                    id={`to-${columnKey}`}
                    type="date"
                    value={formatForInput(dateFilter?.to)}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) {
                        updateManualRange({ to: undefined });
                        return;
                      }
                      const parsed = new Date(value);
                      parsed.setHours(23, 59, 59, 999);
                      updateManualRange({ to: parsed.toISOString() });
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {detectedType === "boolean" && (
          <div>
            <label htmlFor={`bool-${columnKey}`} className="mb-1 block text-xs font-medium text-gray-700">
              Value
            </label>
            <select
              id={`bool-${columnKey}`}
              value={draftAdvanced?.mode === "boolean" ? draftAdvanced.value : ""}
              onChange={(event) => {
                const value = event.target.value as "true" | "false" | "";
                setDraftAdvancedFilters((prev) => ({
                  ...prev,
                  [columnKey]: { mode: "boolean", value },
                }));
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </div>
        )}

        <div className="space-y-2 border-t border-gray-200 pt-2">
          <div className="text-xs font-medium text-gray-700">Exact values</div>
          {availableValues.length === 0 ? (
            <p className="text-sm text-gray-500">No values available</p>
          ) : (
            <div className="max-h-40 space-y-2 overflow-y-auto" role="group" aria-label={`Exact values for ${columnLabelMap[columnKey] ?? columnKey}`}>
              {availableValues.map((value) => {
                const isChecked = draftExact.includes(value);
                return (
                  <label key={value} className="flex cursor-pointer items-center space-x-2 rounded px-1 py-0.5 hover:bg-gray-50">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) => updateDraftColumnFilter(columnKey, value, event.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                          isChecked ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                        }`}
                        aria-hidden="true"
                      >
                        {isChecked && <CheckIcon className="h-3 w-3" />}
                      </div>
                    </div>
                    <span className="text-sm text-gray-700">{value}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-3">
          <button type="button" className="text-xs text-gray-600 hover:text-gray-900" onClick={() => resetColumnFilterChanges(columnKey)}>
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              onClick={() => {
                setOpenFilters((prev) => {
                  const next = new Set(prev);
                  next.delete(columnKey);
                  return next;
                });
                setDraftColumnFilters((prev) => {
                  const next = { ...prev };
                  delete next[columnKey];
                  return next;
                });
                setDraftAdvancedFilters((prev) => {
                  const next = { ...prev };
                  delete next[columnKey];
                  return next;
                });
              }}
            >
              Cancel
            </button>
            <button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700" onClick={() => applyColumnFilterChanges(columnKey)}>
              Apply
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (hasError) {
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-600">Something went wrong while rendering the table.</p>
        <button type="button" onClick={() => setHasError(false)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={tableWrapperRef}>
      <div className="sticky top-0 z-10 space-y-3 rounded-xl border border-gray-200 bg-white/90 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={globalSearchInput}
                onChange={(event) => handleOmniboxChange(event.target.value)}
                placeholder="Search across every column"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search all columns"
              />
              {showingLoading && <ArrowPathIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />}
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{toolbarSummary}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={clearAllFilters} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Clear all
            </button>
            <button type="button" onClick={handleSaveCurrentFilters} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              Save filters
            </button>
            <div className="flex items-center gap-2">
              <select
                value={selectedSavedSetId}
                onChange={(event) => setSelectedSavedSetId(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
                aria-label="Saved filter sets"
              >
                <option value="">Saved filter sets</option>
                {savedFilterSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleLoadFilterSet}
                disabled={!selectedSavedSetId}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 enabled:hover:bg-gray-50 disabled:opacity-50"
              >
                Load
              </button>
              <button
                type="button"
                onClick={handleDeleteFilterSet}
                disabled={!selectedSavedSetId}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 enabled:hover:bg-gray-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {quickFilterButtons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickFilterButtons.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyQuickPreset(preset.id)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition ${
                  quickPresetId === preset.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                }`}
              >
                <SparklesIcon className="h-4 w-4" />
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onRemove}
              aria-label={chip.ariaLabel}
              className="group inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
            >
              {chip.label}
              <span className="text-xs text-gray-500 group-hover:text-gray-800">×</span>
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div
          className={`relative overflow-x-auto ${virtualizationActive ? "max-h-[70vh] overflow-y-auto" : ""}`}
          ref={virtualizationActive ? virtualContainerRef : undefined}
          onScroll={virtualizationActive ? handleVirtualScroll : undefined}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => {
                  const isFilterOpen = openFilters.has(column.accessorKey);
                  return (
                    <th key={column.accessorKey} className="relative">
                      <div className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-500">
                        <div className="flex items-center justify-between gap-2">
                          <span>{column.header}</span>
                          <div className="flex items-center gap-1">
                            {((columnFilters[column.accessorKey] || []).length > 0 || isAdvancedFilterActive(advancedFilters[column.accessorKey])) && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {(columnFilters[column.accessorKey] || []).length + (isAdvancedFilterActive(advancedFilters[column.accessorKey]) ? 1 : 0)}
                              </span>
                            )}
                            <Popover 
                              open={isFilterOpen} 
                              onOpenChange={(open) => toggleFilter(column.accessorKey, open)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="rounded p-1 hover:bg-gray-200"
                                  aria-label={`Filter ${column.header}`}
                                  aria-expanded={isFilterOpen}
                                  aria-controls={`filter-${column.accessorKey}`}
                                >
                                  {isFilterOpen ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent 
                                id={`filter-${column.accessorKey}`}
                                align="start" 
                                sideOffset={8}
                                className="w-80 rounded-xl border border-gray-200 bg-white p-0 shadow-2xl"
                              >
                                {renderColumnDraft(column.accessorKey)}
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {virtualizationActive && topPadding > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={columns.length} style={{ height: topPadding }} />
                </tr>
              )}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500">
                    {filterChips.length > 0 ? "No rows match the current filters" : "No data available"}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, rowIndex) => {
                  const rowKey = row?.id ?? startOffset + rowIndex;
                  return (
                    <tr key={rowKey} className="hover:bg-gray-50">
                      {columns.map((column) => (
                        <td key={`${rowKey}-${column.accessorKey}`} className="px-6 py-4 text-sm text-gray-900">
                          {formatCellValue(getNestedValue(row, column.accessorKey))}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
              {virtualizationActive && bottomPadding > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={columns.length} style={{ height: bottomPadding }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select value={safePageSize} onChange={(event) => changePageSize(Number(event.target.value))} className="rounded-md border border-gray-300 px-3 py-1.5" aria-label="Rows per page">
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changePage(currentPageDisplay - 1)}
            disabled={disablePrev}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 enabled:hover:bg-gray-50 disabled:opacity-50"
            aria-label="Previous page"
          >
            Previous
          </button>
          <span>
            Page {currentPageDisplay} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => changePage(currentPageDisplay + 1)}
            disabled={disableNext}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 enabled:hover:bg-gray-50 disabled:opacity-50"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}


