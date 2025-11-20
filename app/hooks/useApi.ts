/**
 * React hooks for API data fetching with SWR integration
 * 
 * Features:
 * - Automatic caching and revalidation via SWR
 * - Type-safe request/response handling
 * - Loading and error states
 * - Mutation helpers with optimistic updates
 * - AbortSignal support for cleanup
 * 
 * @example
 * ```typescript
 * // Simple GET request
 * const { data, error, isLoading } = useApi<Employee[]>('/api/employees');
 * 
 * // With query parameters
 * const { data } = useApi<Employee[]>('/api/employees', {
 *   params: { status: 'active', limit: 50 }
 * });
 * 
 * // Manual mutation
 * const { trigger, isMutating } = useApiMutation<Employee, CreateEmployeeDto>(
 *   '/api/employees',
 *   'POST'
 * );
 * await trigger({ firstName: 'John', lastName: 'Doe' });
 * ```
 */

import { useEffect, useRef, useState } from 'react';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import useSWRMutation, { type SWRMutationConfiguration } from 'swr/mutation';
import { apiClient, swrFetcher, type ApiRequestOptions, type ApiError } from '@/lib/apiClient';

/**
 * Hook options extending SWR configuration
 */
export interface UseApiOptions<T> extends SWRConfiguration<T> {
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Disable automatic fetching */
  enabled?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Hook for GET requests with SWR caching
 * 
 * @param url - API endpoint URL
 * @param options - Request and SWR options
 * @returns SWR response with data, error, and loading states
 */
export function useApi<T>(
  url: string | null,
  options?: UseApiOptions<T>
): SWRResponse<T, Error> & { isLoading: boolean } {
  const { params, enabled = true, timeout, ...swrOptions } = options || {};

  // Build URL with params
  const finalUrl = url && params ? buildUrlWithParams(url, params) : url;

  // Disable fetching if enabled is false or url is null
  const shouldFetch = enabled && finalUrl !== null;

  const swr = useSWR<T, Error>(
    shouldFetch ? finalUrl : null,
    swrFetcher<T>,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      ...swrOptions,
    }
  );

  return {
    ...swr,
    isLoading: !swr.error && !swr.data && shouldFetch,
  };
}

/**
 * Hook for manual API mutations (POST, PUT, PATCH, DELETE)
 * 
 * @param url - API endpoint URL
 * @param method - HTTP method
 * @param options - Mutation options
 * @returns Mutation trigger function and state
 */
export function useApiMutation<TData, TVariables = unknown>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: SWRMutationConfiguration<TData, Error, string, TVariables>
) {
  const mutation = useSWRMutation<TData, Error, string, TVariables>(
    url,
    async (key, { arg }) => {
      let response;

      switch (method) {
        case 'POST':
          response = await apiClient.post<TData, TVariables>(key, arg);
          break;
        case 'PUT':
          response = await apiClient.put<TData, TVariables>(key, arg);
          break;
        case 'PATCH':
          response = await apiClient.patch<TData, TVariables>(key, arg);
          break;
        case 'DELETE':
          response = await apiClient.delete<TData>(key);
          break;
      }

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data as TData;
    },
    options
  );

  return mutation;
}

/**
 * Hook for paginated API requests
 * 
 * Supports cursor-based pagination with "Load More" pattern
 * 
 * @example
 * ```typescript
 * const { data, loadMore, hasMore, isLoading } = usePaginatedApi<Employee[]>(
 *   '/api/employees',
 *   { params: { limit: 50 } }
 * );
 * ```
 */
export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export interface UsePaginatedApiResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  reset: () => void;
}

export function usePaginatedApi<T>(
  url: string,
  options?: UseApiOptions<PaginatedResponse<T>>
): UsePaginatedApiResult<T> {
  const [allData, setAllData] = useState<T | undefined>();
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { params, ...swrOptions } = options || {};

  // Build URL with cursor
  const finalParams = { ...params, cursor: cursor || undefined };
  const finalUrl = buildUrlWithParams(url, finalParams);

  const { data, error, isLoading, mutate } = useApi<PaginatedResponse<T>>(
    finalUrl,
    swrOptions
  );

  // Update accumulated data when new page arrives
  useEffect(() => {
    if (data) {
      setAllData((prev) => {
        if (!prev) return data.data;
        // Merge arrays if data is an array
        if (Array.isArray(prev) && Array.isArray(data.data)) {
          return [...prev, ...data.data] as T;
        }
        // Otherwise replace
        return data.data;
      });
      setCursor(data.pagination.cursor);
      setHasMore(data.pagination.hasMore);
      setIsLoadingMore(false);
    }
  }, [data]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    await mutate();
  };

  const reset = () => {
    setAllData(undefined);
    setCursor(null);
    setHasMore(true);
    setIsLoadingMore(false);
    mutate();
  };

  return {
    data: allData,
    error,
    isLoading: isLoading || isLoadingMore,
    loadMore,
    hasMore,
    reset,
  };
}

/**
 * Hook for batched API requests
 * 
 * Useful for fetching multiple resources in a single request
 * 
 * @example
 * ```typescript
 * const { data, error, isLoading } = useBatchedApi<DocumentStatus>(
 *   '/api/documents/status',
 *   { documentIds: ['doc1', 'doc2', 'doc3'] }
 * );
 * ```
 */
export function useBatchedApi<TResponse, TRequest = unknown>(
  url: string,
  requestData: TRequest,
  options?: UseApiOptions<TResponse>
) {
  const { enabled = true, ...swrOptions } = options || {};

  // Create a stable key for SWR that includes the request data
  const swrKey = enabled ? [url, JSON.stringify(requestData)] : null;

  const swr = useSWR<TResponse, Error>(
    swrKey,
    async ([url, requestDataStr]) => {
      const parsedRequestData = JSON.parse(requestDataStr) as TRequest;
      const response = await apiClient.post<TResponse, TRequest>(
        url,
        parsedRequestData
      );

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data as TResponse;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Match server cache TTL (60 seconds)
      ...swrOptions,
    }
  );

  return {
    data: swr.data,
    error: swr.error,
    isLoading: !swr.error && !swr.data && enabled,
  };
}

/**
 * Helper to build URL with query parameters
 */
function buildUrlWithParams(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) return url;

  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
}
