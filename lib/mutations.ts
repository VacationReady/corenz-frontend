/**
 * Shared mutation utilities for POST/PUT/DELETE operations
 * Provides consistent error handling, toast notifications, and cache invalidation
 */

import { toast } from 'sonner';
import { apiClient } from './apiClient';
import { mutate } from 'swr';

/**
 * Configuration for mutation operations
 */
export interface MutationConfig {
  /** Success message to display (if false, no toast shown) */
  successMessage?: string | false;
  /** Error message to display (if false, no toast shown) */
  errorMessage?: string | false;
  /** SWR cache keys to invalidate after successful mutation */
  invalidateKeys?: string[];
  /** Whether to invalidate all SWR cache keys matching a pattern */
  invalidatePattern?: RegExp;
  /** Callback to execute on success */
  onSuccess?: (data: any) => void | Promise<void>;
  /** Callback to execute on error */
  onError?: (error: Error) => void | Promise<void>;
  /** Whether to show loading toast during mutation */
  showLoadingToast?: boolean;
  /** Loading message to display */
  loadingMessage?: string;
}

/**
 * Result of a mutation operation
 */
export interface MutationResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Execute a POST mutation with automatic error handling and cache invalidation
 */
export async function mutatePost<TData = any, TBody = any>(
  url: string,
  body: TBody,
  config: MutationConfig = {}
): Promise<MutationResult<TData>> {
  return executeMutation<TData>(
    () => apiClient.post<TData, TBody>(url, body),
    config
  );
}

/**
 * Execute a PUT mutation with automatic error handling and cache invalidation
 */
export async function mutatePut<TData = any, TBody = any>(
  url: string,
  body: TBody,
  config: MutationConfig = {}
): Promise<MutationResult<TData>> {
  return executeMutation<TData>(
    () => apiClient.put<TData, TBody>(url, body),
    config
  );
}

/**
 * Execute a PATCH mutation with automatic error handling and cache invalidation
 */
export async function mutatePatch<TData = any, TBody = any>(
  url: string,
  body: TBody,
  config: MutationConfig = {}
): Promise<MutationResult<TData>> {
  return executeMutation<TData>(
    () => apiClient.patch<TData, TBody>(url, body),
    config
  );
}

/**
 * Execute a DELETE mutation with automatic error handling and cache invalidation
 */
export async function mutateDelete<TData = any>(
  url: string,
  config: MutationConfig = {}
): Promise<MutationResult<TData>> {
  return executeMutation<TData>(
    () => apiClient.delete<TData>(url),
    config
  );
}

/**
 * Core mutation executor with error handling, toasts, and cache invalidation
 */
async function executeMutation<TData>(
  mutationFn: () => Promise<{ data: TData | null; error: any }>,
  config: MutationConfig
): Promise<MutationResult<TData>> {
  const {
    successMessage,
    errorMessage = 'An error occurred',
    invalidateKeys = [],
    invalidatePattern,
    onSuccess,
    onError,
    showLoadingToast = false,
    loadingMessage = 'Processing...',
  } = config;

  let loadingToastId: string | number | undefined;

  try {
    // Show loading toast if requested
    if (showLoadingToast) {
      loadingToastId = toast.loading(loadingMessage);
    }

    // Execute the mutation
    const { data, error } = await mutationFn();

    // Dismiss loading toast
    if (loadingToastId) {
      toast.dismiss(loadingToastId);
    }

    if (error) {
      // Handle error
      const errorObj = new Error(error.message || 'Mutation failed');
      
      if (errorMessage !== false) {
        toast.error(errorMessage);
      }

      if (onError) {
        await onError(errorObj);
      }

      return {
        success: false,
        error: errorObj,
      };
    }

    // Success - invalidate cache
    await invalidateCache(invalidateKeys, invalidatePattern);

    // Show success toast
    if (successMessage !== false && successMessage) {
      toast.success(successMessage);
    }

    // Execute success callback
    if (onSuccess && data) {
      await onSuccess(data);
    }

    return {
      success: true,
      data: data || undefined,
    };
  } catch (err) {
    // Dismiss loading toast on exception
    if (loadingToastId) {
      toast.dismiss(loadingToastId);
    }

    const error = err instanceof Error ? err : new Error('Unknown error');

    if (errorMessage !== false) {
      toast.error(errorMessage);
    }

    if (onError) {
      await onError(error);
    }

    return {
      success: false,
      error,
    };
  }
}

/**
 * Invalidate SWR cache keys
 */
async function invalidateCache(
  keys: string[],
  pattern?: RegExp
): Promise<void> {
  // Invalidate specific keys
  const invalidations = keys.map((key) => mutate(key));

  // Invalidate keys matching pattern
  if (pattern) {
    // Get all SWR cache keys and invalidate matching ones
    invalidations.push(
      mutate(
        (key) => {
          if (typeof key === 'string') {
            return pattern.test(key);
          }
          return false;
        },
        undefined,
        { revalidate: true }
      )
    );
  }

  await Promise.all(invalidations);
}

/**
 * Batch multiple mutations and execute them sequentially
 * Useful for operations that need to happen in order
 */
export async function batchMutations(
  mutations: Array<() => Promise<MutationResult>>,
  config: {
    stopOnError?: boolean;
    successMessage?: string;
    errorMessage?: string;
  } = {}
): Promise<{ success: boolean; results: MutationResult[] }> {
  const { stopOnError = true, successMessage, errorMessage } = config;
  const results: MutationResult[] = [];

  for (const mutation of mutations) {
    const result = await mutation();
    results.push(result);

    if (!result.success && stopOnError) {
      if (errorMessage) {
        toast.error(errorMessage);
      }
      return { success: false, results };
    }
  }

  const allSucceeded = results.every((r) => r.success);

  if (allSucceeded && successMessage) {
    toast.success(successMessage);
  } else if (!allSucceeded && errorMessage) {
    toast.error(errorMessage);
  }

  return { success: allSucceeded, results };
}

/**
 * Execute mutations in parallel
 * Useful for independent operations that can happen simultaneously
 */
export async function parallelMutations(
  mutations: Array<() => Promise<MutationResult>>,
  config: {
    successMessage?: string;
    errorMessage?: string;
  } = {}
): Promise<{ success: boolean; results: MutationResult[] }> {
  const { successMessage, errorMessage } = config;

  const results = await Promise.all(mutations.map((m) => m()));
  const allSucceeded = results.every((r) => r.success);

  if (allSucceeded && successMessage) {
    toast.success(successMessage);
  } else if (!allSucceeded && errorMessage) {
    toast.error(errorMessage);
  }

  return { success: allSucceeded, results };
}

/**
 * Create a mutation function with pre-configured settings
 * Useful for creating reusable mutation helpers
 */
export function createMutation<TData = any, TBody = any>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  urlFactory: (params: any) => string,
  defaultConfig: MutationConfig = {}
) {
  return async (
    params: any,
    body?: TBody,
    config: MutationConfig = {}
  ): Promise<MutationResult<TData>> => {
    const url = urlFactory(params);
    const mergedConfig = { ...defaultConfig, ...config };

    switch (method) {
      case 'POST':
        return mutatePost<TData, TBody>(url, body as TBody, mergedConfig);
      case 'PUT':
        return mutatePut<TData, TBody>(url, body as TBody, mergedConfig);
      case 'PATCH':
        return mutatePatch<TData, TBody>(url, body as TBody, mergedConfig);
      case 'DELETE':
        return mutateDelete<TData>(url, mergedConfig);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  };
}

/**
 * Optimistic update helper
 * Updates cache immediately, then reverts on error
 */
export async function optimisticMutation<TData = any, TBody = any>(
  url: string,
  body: TBody,
  cacheKey: string,
  optimisticData: TData | ((current: TData) => TData),
  config: MutationConfig = {}
): Promise<MutationResult<TData>> {
  // Get current data
  const currentData = await mutate(cacheKey);

  // Apply optimistic update
  const newData =
    typeof optimisticData === 'function'
      ? (optimisticData as (current: TData) => TData)(currentData)
      : optimisticData;

  await mutate(cacheKey, newData, { revalidate: false });

  // Execute mutation
  const result = await mutatePut<TData, TBody>(url, body, {
    ...config,
    invalidateKeys: [cacheKey, ...(config.invalidateKeys || [])],
  });

  // Revert on error
  if (!result.success) {
    await mutate(cacheKey, currentData, { revalidate: false });
  }

  return result;
}
