/**
 * React hook for mutations with automatic cache refresh and router refresh
 * Integrates with Next.js router and SWR cache
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  mutatePost,
  mutatePut,
  mutatePatch,
  mutateDelete,
  MutationConfig,
  MutationResult,
} from '@/lib/mutations';

/**
 * Configuration for useMutationWithRefresh hook
 */
export interface UseMutationConfig extends MutationConfig {
  /** Whether to call router.refresh() after successful mutation */
  refreshRouter?: boolean;
  /** Delay before router refresh (ms) */
  refreshDelay?: number;
}

/**
 * State returned by useMutationWithRefresh
 */
export interface UseMutationState<TData = any> {
  /** Whether mutation is currently in progress */
  isMutating: boolean;
  /** Data returned from last successful mutation */
  data: TData | null;
  /** Error from last failed mutation */
  error: Error | null;
  /** Reset state to initial values */
  reset: () => void;
}

/**
 * Hook for POST mutations with automatic refresh
 */
export function usePostMutation<TData = any, TBody = any>(
  url: string | ((body?: TBody) => string),
  config: UseMutationConfig = {}
) {
  return useMutation<TData, TBody>('POST', url, config);
}

/**
 * Hook for PUT mutations with automatic refresh
 */
export function usePutMutation<TData = any, TBody = any>(
  url: string | ((body?: TBody) => string),
  config: UseMutationConfig = {}
) {
  return useMutation<TData, TBody>('PUT', url, config);
}

/**
 * Hook for PATCH mutations with automatic refresh
 */
export function usePatchMutation<TData = any, TBody = any>(
  url: string | ((body?: TBody) => string),
  config: UseMutationConfig = {}
) {
  return useMutation<TData, TBody>('PATCH', url, config);
}

/**
 * Hook for DELETE mutations with automatic refresh
 */
export function useDeleteMutation<TData = any>(
  url: string | ((body?: never) => string),
  config: UseMutationConfig = {}
) {
  return useMutation<TData, never>('DELETE', url, config);
}

/**
 * Core mutation hook with router refresh integration
 */
function useMutation<TData = any, TBody = any>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string | ((body?: TBody) => string),
  config: UseMutationConfig = {}
) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const {
    refreshRouter = false,
    refreshDelay = 0,
    onSuccess,
    onError,
    ...mutationConfig
  } = config;

  const trigger = useCallback(
    async (body?: TBody): Promise<MutationResult<TData>> => {
      setIsMutating(true);
      setError(null);

      // Resolve URL
      const resolvedUrl = typeof url === 'function' ? url(body) : url;

      // Execute mutation
      let result: MutationResult<TData>;

      try {
        switch (method) {
          case 'POST':
            result = await mutatePost<TData, TBody>(resolvedUrl, body as TBody, {
              ...mutationConfig,
              onSuccess: async (responseData) => {
                setData(responseData);
                if (onSuccess) await onSuccess(responseData);
              },
              onError: async (err) => {
                setError(err);
                if (onError) await onError(err);
              },
            });
            break;
          case 'PUT':
            result = await mutatePut<TData, TBody>(resolvedUrl, body as TBody, {
              ...mutationConfig,
              onSuccess: async (responseData) => {
                setData(responseData);
                if (onSuccess) await onSuccess(responseData);
              },
              onError: async (err) => {
                setError(err);
                if (onError) await onError(err);
              },
            });
            break;
          case 'PATCH':
            result = await mutatePatch<TData, TBody>(resolvedUrl, body as TBody, {
              ...mutationConfig,
              onSuccess: async (responseData) => {
                setData(responseData);
                if (onSuccess) await onSuccess(responseData);
              },
              onError: async (err) => {
                setError(err);
                if (onError) await onError(err);
              },
            });
            break;
          case 'DELETE':
            result = await mutateDelete<TData>(resolvedUrl, {
              ...mutationConfig,
              onSuccess: async (responseData) => {
                setData(responseData);
                if (onSuccess) await onSuccess(responseData);
              },
              onError: async (err) => {
                setError(err);
                if (onError) await onError(err);
              },
            });
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        // Refresh router if requested and mutation succeeded
        if (result.success && refreshRouter) {
          if (refreshDelay > 0) {
            setTimeout(() => router.refresh(), refreshDelay);
          } else {
            router.refresh();
          }
        }

        setIsMutating(false);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Mutation failed');
        setError(error);
        setIsMutating(false);
        return { success: false, error };
      }
    },
    [url, method, router, refreshRouter, refreshDelay, mutationConfig, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsMutating(false);
  }, []);

  return {
    trigger,
    isMutating,
    data,
    error,
    reset,
  };
}

/**
 * Hook for mutations with optimistic updates
 */
export function useOptimisticMutation<TData = any, TBody = any>(
  url: string,
  cacheKey: string,
  config: UseMutationConfig & {
    optimisticData: TData | ((current: TData) => TData);
  }
) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const { optimisticData, refreshRouter = false, refreshDelay = 0, ...mutationConfig } = config;

  const trigger = useCallback(
    async (body: TBody): Promise<MutationResult<TData>> => {
      setIsMutating(true);
      setError(null);

      const { optimisticMutation } = await import('@/lib/mutations');

      const result = await optimisticMutation<TData, TBody>(
        url,
        body,
        cacheKey,
        optimisticData,
        mutationConfig
      );

      if (result.success) {
        setData(result.data || null);
        if (refreshRouter) {
          if (refreshDelay > 0) {
            setTimeout(() => router.refresh(), refreshDelay);
          } else {
            router.refresh();
          }
        }
      } else {
        setError(result.error || null);
      }

      setIsMutating(false);
      return result;
    },
    [url, cacheKey, optimisticData, router, refreshRouter, refreshDelay, mutationConfig]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsMutating(false);
  }, []);

  return {
    trigger,
    isMutating,
    data,
    error,
    reset,
  };
}
