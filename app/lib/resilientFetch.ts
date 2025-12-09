/**
 * Resilient Fetch Utility for Enterprise Report Generation
 * 
 * Features:
 * - Exponential backoff retry logic (3 attempts: 1s, 2s, 4s delays)
 * - AbortController support for request cancellation
 * - Request deduplication to prevent duplicate API calls
 * - Stale-while-revalidate caching pattern
 * - Comprehensive error handling with typed errors
 * 
 * @example
 * ```typescript
 * const { data, error } = await resilientFetch<ReportData>('/api/reports/query', {
 *   method: 'POST',
 *   body: JSON.stringify({ fields: [...] }),
 *   retries: 3,
 *   timeout: 30000,
 * });
 * ```
 */

export interface ResilientFetchOptions extends Omit<RequestInit, 'signal'> {
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Initial retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** AbortController signal for external cancellation */
  signal?: AbortSignal;
  /** Skip retry for certain status codes */
  noRetryStatuses?: number[];
  /** Cache key for deduplication */
  cacheKey?: string;
  /** Cache TTL in ms (default: 0 - no cache) */
  cacheTTL?: number;
  /** Callback for retry attempts */
  onRetry?: (attempt: number, error: Error) => void;
  /** Callback for timeout */
  onTimeout?: () => void;
}

export interface ResilientFetchResult<T> {
  data: T | null;
  error: ResilientFetchError | null;
  status: number | null;
  headers: Headers | null;
  cached: boolean;
  attempts: number;
}

export class ResilientFetchError extends Error {
  public readonly status: number | null;
  public readonly statusText: string | null;
  public readonly isTimeout: boolean;
  public readonly isAborted: boolean;
  public readonly isNetworkError: boolean;
  public readonly attempts: number;
  public readonly originalError: Error | null;

  constructor(options: {
    message: string;
    status?: number | null;
    statusText?: string | null;
    isTimeout?: boolean;
    isAborted?: boolean;
    isNetworkError?: boolean;
    attempts?: number;
    originalError?: Error | null;
  }) {
    super(options.message);
    this.name = 'ResilientFetchError';
    this.status = options.status ?? null;
    this.statusText = options.statusText ?? null;
    this.isTimeout = options.isTimeout ?? false;
    this.isAborted = options.isAborted ?? false;
    this.isNetworkError = options.isNetworkError ?? false;
    this.attempts = options.attempts ?? 1;
    this.originalError = options.originalError ?? null;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      statusText: this.statusText,
      isTimeout: this.isTimeout,
      isAborted: this.isAborted,
      isNetworkError: this.isNetworkError,
      attempts: this.attempts,
    };
  }
}

// Simple in-memory cache for request deduplication
const requestCache = new Map<string, { data: unknown; timestamp: number; promise?: Promise<unknown> }>();
const inflightRequests = new Map<string, Promise<ResilientFetchResult<unknown>>>();

// Default non-retryable status codes
const DEFAULT_NO_RETRY_STATUSES = [400, 401, 403, 404, 422];

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, baseDelay: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const delay = baseDelay * Math.pow(2, attempt - 1);
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.min(delay + jitter, 30000); // Cap at 30s
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown, noRetryStatuses: number[]): boolean {
  if (error instanceof ResilientFetchError) {
    if (error.isAborted) return false;
    if (error.status && noRetryStatuses.includes(error.status)) return false;
    // Retry on network errors, timeouts, and 5xx errors
    if (error.isNetworkError || error.isTimeout) return true;
    if (error.status && error.status >= 500) return true;
  }
  return false;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }
  });
}

/**
 * Generate cache key from URL and options
 */
function generateCacheKey(url: string, options?: ResilientFetchOptions): string {
  if (options?.cacheKey) return options.cacheKey;
  
  const method = options?.method?.toUpperCase() || 'GET';
  const body = typeof options?.body === 'string' ? options.body : '';
  
  // Simple hash for body content
  let hash = 0;
  const str = `${method}:${url}:${body}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `${method}:${url}:${Math.abs(hash).toString(36)}`;
}

/**
 * Main resilient fetch function with retry logic
 */
export async function resilientFetch<T>(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<ResilientFetchResult<T>> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    signal: externalSignal,
    noRetryStatuses = DEFAULT_NO_RETRY_STATUSES,
    cacheKey,
    cacheTTL = 0,
    onRetry,
    onTimeout,
    ...fetchOptions
  } = options;

  const effectiveCacheKey = generateCacheKey(url, options);
  
  // Check for cached response
  if (cacheTTL > 0) {
    const cached = requestCache.get(effectiveCacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      return {
        data: cached.data as T,
        error: null,
        status: 200,
        headers: null,
        cached: true,
        attempts: 0,
      };
    }
  }

  // Check for inflight request (deduplication)
  const inflight = inflightRequests.get(effectiveCacheKey);
  if (inflight) {
    return inflight as Promise<ResilientFetchResult<T>>;
  }

  // Create promise for this request
  const requestPromise = executeWithRetry<T>(
    url,
    {
      ...fetchOptions,
      retries,
      retryDelay,
      timeout,
      signal: externalSignal,
      noRetryStatuses,
      onRetry,
      onTimeout,
    },
    effectiveCacheKey,
    cacheTTL
  );

  // Store as inflight
  inflightRequests.set(effectiveCacheKey, requestPromise as Promise<ResilientFetchResult<unknown>>);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Remove from inflight after completion
    inflightRequests.delete(effectiveCacheKey);
  }
}

/**
 * Execute fetch with retry logic
 */
async function executeWithRetry<T>(
  url: string,
  options: ResilientFetchOptions,
  cacheKey: string,
  cacheTTL: number
): Promise<ResilientFetchResult<T>> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    signal: externalSignal,
    noRetryStatuses = DEFAULT_NO_RETRY_STATUSES,
    onRetry,
    onTimeout,
    ...fetchOptions
  } = options;

  let lastError: ResilientFetchError | null = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    attempts = attempt;

    // Create abort controller for this attempt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      onTimeout?.();
    }, timeout);

    // Link external signal to this controller
    const abortHandler = () => controller.abort();
    externalSignal?.addEventListener('abort', abortHandler);

    try {
      // Check if externally aborted before starting
      if (externalSignal?.aborted) {
        throw new ResilientFetchError({
          message: 'Request aborted',
          isAborted: true,
          attempts,
        });
      }

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortHandler);

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody?.error || errorBody?.message || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }

        const error = new ResilientFetchError({
          message: errorMessage,
          status: response.status,
          statusText: response.statusText,
          attempts,
        });

        // Check if should retry
        if (attempt <= retries && isRetryableError(error, noRetryStatuses)) {
          lastError = error;
          onRetry?.(attempt, error);
          await sleep(getBackoffDelay(attempt, retryDelay), externalSignal);
          continue;
        }

        return {
          data: null,
          error,
          status: response.status,
          headers: response.headers,
          cached: false,
          attempts,
        };
      }

      // Parse successful response
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      // Cache successful response
      if (cacheTTL > 0) {
        requestCache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return {
        data,
        error: null,
        status: response.status,
        headers: response.headers,
        cached: false,
        attempts,
      };

    } catch (error) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortHandler);

      // Handle abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        const isExternalAbort = externalSignal?.aborted;
        
        const fetchError = new ResilientFetchError({
          message: isExternalAbort ? 'Request aborted' : 'Request timeout',
          isTimeout: !isExternalAbort,
          isAborted: isExternalAbort,
          attempts,
        });

        // Don't retry aborted requests
        if (isExternalAbort) {
          return {
            data: null,
            error: fetchError,
            status: null,
            headers: null,
            cached: false,
            attempts,
          };
        }

        // Retry timeout errors
        if (attempt <= retries) {
          lastError = fetchError;
          onRetry?.(attempt, fetchError);
          await sleep(getBackoffDelay(attempt, retryDelay), externalSignal);
          continue;
        }

        return {
          data: null,
          error: fetchError,
          status: null,
          headers: null,
          cached: false,
          attempts,
        };
      }

      // Handle network errors
      const networkError = new ResilientFetchError({
        message: error instanceof Error ? error.message : 'Network error',
        isNetworkError: true,
        attempts,
        originalError: error instanceof Error ? error : null,
      });

      // Retry network errors
      if (attempt <= retries) {
        lastError = networkError;
        onRetry?.(attempt, networkError);
        await sleep(getBackoffDelay(attempt, retryDelay), externalSignal);
        continue;
      }

      return {
        data: null,
        error: networkError,
        status: null,
        headers: null,
        cached: false,
        attempts,
      };
    }
  }

  // Should not reach here, but return last error if we do
  return {
    data: null,
    error: lastError || new ResilientFetchError({
      message: 'Unknown error',
      attempts,
    }),
    status: null,
    headers: null,
    cached: false,
    attempts,
  };
}

/**
 * Clear the request cache
 */
export function clearRequestCache(): void {
  requestCache.clear();
}

/**
 * Clear cache for specific key
 */
export function clearCacheKey(key: string): boolean {
  return requestCache.delete(key);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: requestCache.size,
    keys: Array.from(requestCache.keys()),
  };
}

/**
 * Hook-friendly wrapper for resilient fetch
 */
export function createResilientFetcher<T>(
  baseOptions: Partial<ResilientFetchOptions> = {}
) {
  return async (
    url: string,
    options: ResilientFetchOptions = {}
  ): Promise<ResilientFetchResult<T>> => {
    return resilientFetch<T>(url, { ...baseOptions, ...options });
  };
}

/**
 * Create a resilient POST request helper
 */
export async function resilientPost<T, B = unknown>(
  url: string,
  body: B,
  options: Omit<ResilientFetchOptions, 'method' | 'body'> = {}
): Promise<ResilientFetchResult<T>> {
  return resilientFetch<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Create an abort controller with auto-cleanup
 */
export function createAbortController(timeoutMs?: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (timeoutMs) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    controller.abort();
  };

  return { controller, cleanup };
}










