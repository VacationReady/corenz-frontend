/**
 * useReportData - Enterprise-grade hook for fetching report data
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Request cancellation on unmount/dependency changes
 * - Stale-while-revalidate caching
 * - Optimistic updates for filters
 * - Progress tracking for large exports
 * - Data freshness indicators
 * 
 * @example
 * ```typescript
 * const {
 *   data,
 *   total,
 *   isLoading,
 *   error,
 *   refetch,
 *   lastFetched,
 *   isStale
 * } = useReportData({
 *   fields: ['User.firstName', 'User.lastName'],
 *   filters: [],
 *   pagination: { page: 1, pageSize: 50 },
 * });
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  resilientPost, 
  ResilientFetchError,
  createAbortController,
} from "@/lib/resilientFetch";

export interface ReportDataParams {
  /** Selected fields for the report */
  fields: string[];
  /** Filter configuration */
  filters?: unknown[];
  /** Filter group for complex queries */
  filterGroup?: unknown;
  /** Pagination settings */
  pagination?: {
    page: number;
    pageSize: number;
  };
  /** Sort configuration */
  sort?: {
    field: string;
    direction: "asc" | "desc";
  } | null;
  /** Multi-sort configuration */
  sorts?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  /** Report engine type */
  engine?: "dynamic" | "custom";
  /** Custom report type for custom engine */
  reportType?: string;
}

export interface ReportDataResult<T = unknown[]> {
  /** Report data rows */
  data: T;
  /** Total count of matching records */
  total: number;
  /** Loading state */
  isLoading: boolean;
  /** Initial loading (no data yet) */
  isInitialLoading: boolean;
  /** Background refetching */
  isRefetching: boolean;
  /** Error if request failed */
  error: ResilientFetchError | null;
  /** Manual refetch function */
  refetch: () => Promise<void>;
  /** Last successful fetch timestamp */
  lastFetched: Date | null;
  /** Whether data is stale (older than threshold) */
  isStale: boolean;
  /** Number of retry attempts made */
  retryCount: number;
  /** Whether request was cancelled */
  isCancelled: boolean;
}

export interface UseReportDataOptions {
  /** Whether to fetch data automatically */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 60000 - 1 minute) */
  staleTime?: number;
  /** Cache time in milliseconds (default: 300000 - 5 minutes) */
  cacheTime?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retries (default: 3) */
  retries?: number;
  /** Callback on successful fetch */
  onSuccess?: (data: unknown[], total: number) => void;
  /** Callback on error */
  onError?: (error: ResilientFetchError) => void;
  /** Callback on retry */
  onRetry?: (attempt: number, error: Error) => void;
}

// Simple cache for report data
const reportDataCache = new Map<string, {
  data: unknown[];
  total: number;
  timestamp: number;
}>();

function generateCacheKey(params: ReportDataParams, companyId: string | undefined): string {
  const key = {
    fields: params.fields.sort(),
    filters: params.filters,
    filterGroup: params.filterGroup,
    pagination: params.pagination,
    sort: params.sort,
    sorts: params.sorts,
    engine: params.engine,
    reportType: params.reportType,
    companyId,
  };
  return JSON.stringify(key);
}

export function useReportData(
  params: ReportDataParams,
  options: UseReportDataOptions = {}
): ReportDataResult {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;

  const {
    enabled = true,
    staleTime = 60000,
    cacheTime = 300000,
    timeout = 30000,
    retries = 3,
    onSuccess,
    onError,
    onRetry,
  } = options;

  const [data, setData] = useState<unknown[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<ResilientFetchError | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);

  // Refs for cleanup and deduplication
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);

  // Calculate if data is stale
  const isStale = lastFetched 
    ? Date.now() - lastFetched.getTime() > staleTime 
    : true;

  // Check cache for existing data
  const cacheKey = generateCacheKey(params, companyId);
  
  useEffect(() => {
    const cached = reportDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data);
      setTotal(cached.total);
      setLastFetched(new Date(cached.timestamp));
      setIsInitialLoading(false);
    }
  }, [cacheKey, cacheTime]);

  // Main fetch function
  const fetchReportData = useCallback(async (isRefetch = false) => {
    // Skip if disabled or no fields
    if (!enabled || params.fields.length === 0) {
      setIsLoading(false);
      setIsInitialLoading(false);
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const { controller, cleanup } = createAbortController(timeout + 5000);
    abortControllerRef.current = controller;

    // Track this fetch request
    const fetchId = ++fetchIdRef.current;

    setIsLoading(true);
    setIsCancelled(false);
    if (isRefetch) {
      setIsRefetching(true);
    }
    setError(null);

    try {
      let result;

      // Choose API endpoint based on engine type
      if (params.engine === "custom" && params.reportType) {
        // Custom engine uses /api/reports/generate
        const transformedFilters = Object.fromEntries(
          (Array.isArray(params.filters) ? params.filters : []).map((filter: any) => {
            const filterKey = filter.field.includes('.') 
              ? filter.field.split('.').pop() 
              : filter.field;
            
            const filterValue = filter.operator === "between" || filter.operator === "date_between"
              ? { value: filter.value, value2: filter.value2 }
              : filter.value;
            
            return [filterKey, filterValue];
          }),
        );

        result = await resilientPost<{ data: unknown[]; error?: string }>(
          "/api/reports/generate",
          {
            reportType: params.reportType,
            filters: transformedFilters,
            pagination: { 
              page: params.pagination?.page ?? 1, 
              limit: params.pagination?.pageSize ?? 50, 
              sortBy: params.sort?.field, 
              sortOrder: params.sort?.direction 
            },
          },
          {
            signal: controller.signal,
            timeout,
            retries,
            headers: companyId ? { "x-company-id": companyId } : undefined,
            onRetry: (attempt, err) => {
              setRetryCount(attempt);
              onRetry?.(attempt, err);
            },
          }
        );
      } else {
        // Dynamic engine uses /api/reports/query
        result = await resilientPost<{ data: unknown[]; total: number; error?: string }>(
          "/api/reports/query",
          {
            selectedFields: params.fields,
            filters: params.filters || [],
            filterGroup: params.filterGroup,
            pagination: { 
              page: params.pagination?.page ?? 1, 
              limit: params.pagination?.pageSize ?? 50 
            },
            sort: params.sort || undefined,
            sorts: params.sorts || undefined,
          },
          {
            signal: controller.signal,
            timeout,
            retries,
            headers: companyId ? { "x-company-id": companyId } : undefined,
            onRetry: (attempt, err) => {
              setRetryCount(attempt);
              onRetry?.(attempt, err);
            },
          }
        );
      }

      // Check if this request is still current
      if (fetchId !== fetchIdRef.current) {
        return;
      }

      if (result.error) {
        setError(result.error);
        onError?.(result.error);
        return;
      }

      // Check for API-level errors
      if (result.data?.error) {
        const apiError = new ResilientFetchError({
          message: result.data.error as string,
          status: result.status,
          attempts: result.attempts,
        });
        setError(apiError);
        onError?.(apiError);
        return;
      }

      const responseData = Array.isArray(result.data?.data) ? result.data.data : [];
      const responseTotal = typeof (result.data as any)?.total === "number" 
        ? (result.data as any).total 
        : responseData.length;

      // Update state
      setData(responseData);
      setTotal(responseTotal);
      setLastFetched(new Date());
      setIsInitialLoading(false);
      setRetryCount(0);

      // Update cache
      reportDataCache.set(cacheKey, {
        data: responseData,
        total: responseTotal,
        timestamp: Date.now(),
      });

      // Callback
      onSuccess?.(responseData, responseTotal);

    } catch (err) {
      // Check if this request is still current
      if (fetchId !== fetchIdRef.current) {
        return;
      }

      // Handle abort
      if (err instanceof DOMException && err.name === "AbortError") {
        setIsCancelled(true);
        return;
      }

      const fetchError = err instanceof ResilientFetchError
        ? err
        : new ResilientFetchError({
            message: err instanceof Error ? err.message : "Unknown error",
            isNetworkError: true,
          });

      setError(fetchError);
      onError?.(fetchError);
    } finally {
      // Check if this request is still current before updating loading states
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
        cleanup();
      }
    }
  }, [
    enabled,
    params.fields,
    params.filters,
    params.filterGroup,
    params.pagination?.page,
    params.pagination?.pageSize,
    params.sort,
    params.sorts,
    params.engine,
    params.reportType,
    companyId,
    timeout,
    retries,
    cacheKey,
    onSuccess,
    onError,
    onRetry,
  ]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchReportData(true);
  }, [fetchReportData]);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    fetchReportData(false);

    return () => {
      // Cancel request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchReportData]);

  // Cleanup stale cache entries periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of reportDataCache.entries()) {
        if (now - value.timestamp > cacheTime * 2) {
          reportDataCache.delete(key);
        }
      }
    }, cacheTime);

    return () => clearInterval(cleanupInterval);
  }, [cacheTime]);

  return {
    data,
    total,
    isLoading,
    isInitialLoading,
    isRefetching,
    error,
    refetch,
    lastFetched,
    isStale,
    retryCount,
    isCancelled,
  };
}

/**
 * Hook for exporting full report data with progress tracking
 */
export interface UseReportExportOptions {
  /** Fields to include in export */
  fields: string[];
  /** Filters to apply */
  filters?: unknown[];
  /** Sort configuration */
  sort?: { field: string; direction: "asc" | "desc" } | null;
  /** Page size for chunked fetching */
  pageSize?: number;
  /** Timeout per request */
  timeout?: number;
  /** Callback for progress updates */
  onProgress?: (loaded: number, total: number) => void;
}

export interface UseReportExportResult {
  /** Export function that returns all data */
  exportAll: () => Promise<unknown[]>;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Export progress (0-100) */
  progress: number;
  /** Cancel export */
  cancel: () => void;
  /** Error if export failed */
  error: ResilientFetchError | null;
}

export function useReportExport(
  options: UseReportExportOptions
): UseReportExportResult {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ResilientFetchError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const exportAll = useCallback(async (): Promise<unknown[]> => {
    const { fields, filters, sort, pageSize = 100, timeout = 30000, onProgress } = options;

    if (fields.length === 0) {
      return [];
    }

    // Cancel any existing export
    cancel();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExporting(true);
    setProgress(0);
    setError(null);

    const allData: unknown[] = [];
    let page = 1;
    let totalPages = 1;

    try {
      // First request to get total count
      const firstResult = await resilientPost<{ data: unknown[]; total: number }>(
        "/api/reports/query",
        {
          selectedFields: fields,
          filters: filters || [],
          pagination: { page: 1, limit: pageSize },
          sort: sort || undefined,
        },
        {
          signal: controller.signal,
          timeout,
          retries: 2,
          headers: companyId ? { "x-company-id": companyId } : undefined,
        }
      );

      if (firstResult.error || !firstResult.data) {
        throw firstResult.error || new Error("Failed to fetch initial data");
      }

      const total = firstResult.data.total ?? firstResult.data.data.length;
      totalPages = Math.ceil(total / pageSize);
      allData.push(...firstResult.data.data);

      setProgress(Math.round((1 / totalPages) * 100));
      onProgress?.(allData.length, total);

      // Fetch remaining pages
      while (page < totalPages) {
        page++;

        if (controller.signal.aborted) {
          throw new DOMException("Export cancelled", "AbortError");
        }

        const result = await resilientPost<{ data: unknown[]; total: number }>(
          "/api/reports/query",
          {
            selectedFields: fields,
            filters: filters || [],
            pagination: { page, limit: pageSize },
            sort: sort || undefined,
          },
          {
            signal: controller.signal,
            timeout,
            retries: 2,
            headers: companyId ? { "x-company-id": companyId } : undefined,
          }
        );

        if (result.error || !result.data) {
          throw result.error || new Error(`Failed to fetch page ${page}`);
        }

        allData.push(...result.data.data);

        const progressPercent = Math.round((page / totalPages) * 100);
        setProgress(progressPercent);
        onProgress?.(allData.length, total);
      }

      return allData;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(null);
        return [];
      }

      const fetchError = err instanceof ResilientFetchError
        ? err
        : new ResilientFetchError({
            message: err instanceof Error ? err.message : "Export failed",
          });

      setError(fetchError);
      throw fetchError;
    } finally {
      setIsExporting(false);
    }
  }, [options, companyId, cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    exportAll,
    isExporting,
    progress,
    cancel,
    error,
  };
}

/**
 * Clear report data cache
 */
export function clearReportDataCache(): void {
  reportDataCache.clear();
}

export default useReportData;








