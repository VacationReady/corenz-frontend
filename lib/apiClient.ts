/**
 * Centralized API client with consistent typing, error handling, and abort signal support
 * 
 * Features:
 * - Type-safe request/response handling
 * - Automatic error parsing and normalization
 * - AbortSignal support for request cancellation
 * - Consistent error structure across the application
 * - Integration with SWR and React Query
 * - Automatic tenant context headers for rate-limited paths
 * 
 * @example
 * ```typescript
 * const { data, error } = await apiClient.get<Employee[]>('/api/employees', {
 *   companyId: session?.user?.companyId
 * });
 * if (error) {
 *   console.error('Failed to fetch employees:', error.message);
 *   return;
 * }
 * console.log('Employees:', data);
 * ```
 */

/**
 * Standard API error structure
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * Request options
 */
export interface ApiRequestOptions extends RequestInit {
  /** Query parameters to append to URL */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Company ID for tenant context (automatically added to headers for rate-limited paths) */
  companyId?: string | null;
}

/**
 * Parse error from response
 */
async function parseError(response: Response): Promise<ApiError> {
  const status = response.status;
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      return {
        message: json.error || json.message || response.statusText || 'Request failed',
        status,
        code: json.code,
        details: json.details || json,
      };
    }
  } catch {
    // Failed to parse JSON, fall through to default
  }

  return {
    message: response.statusText || `Request failed with status ${status}`,
    status,
  };
}

/**
 * Build URL with query parameters
 */
function buildUrl(url: string, params?: Record<string, string | number | boolean | undefined | null>): string {
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

/**
 * Execute fetch request with error handling
 */
async function request<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, timeout, companyId, ...fetchOptions } = options;

  // Build URL with query params
  const finalUrl = buildUrl(url, params);

  // Setup abort controller for timeout
  const controller = new AbortController();
  const signal = options.signal || controller.signal;

  let timeoutId: NodeJS.Timeout | undefined;
  if (timeout) {
    timeoutId = setTimeout(() => controller.abort(), timeout);
  }

  // Import tenant utilities (dynamic import to avoid circular dependencies)
  const { mergeTenantHeaders } = await import('@/lib/tenant-fetch');
  
  // Merge tenant headers with existing headers
  const mergedHeaders = mergeTenantHeaders(
    finalUrl,
    {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    companyId
  );

  try {
    const response = await fetch(finalUrl, {
      ...fetchOptions,
      signal,
      headers: mergedHeaders,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await parseError(response);
      return { data: null, error };
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return { data: null as T, error: null };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);

    // Handle abort
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        data: null,
        error: {
          message: 'Request was cancelled',
          code: 'ABORTED',
        },
      };
    }

    // Handle network errors
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Network request failed',
        code: 'NETWORK_ERROR',
        details: err,
      },
    };
  }
}

/**
 * API client with typed methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(url, { ...options, method: 'GET' });
  },

  /**
   * POST request
   */
  async post<T, D = unknown>(
    url: string,
    data?: D,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PUT request
   */
  async put<T, D = unknown>(
    url: string,
    data?: D,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PATCH request
   */
  async patch<T, D = unknown>(
    url: string,
    data?: D,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(url, { ...options, method: 'DELETE' });
  },
};

/**
 * Fetcher function for SWR
 * 
 * @example
 * ```typescript
 * const { data, error } = useSWR('/api/employees', swrFetcher<Employee[]>);
 * ```
 */
export function swrFetcher<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'GET' }).then((response) => {
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.data as T;
  });
}

/**
 * Fetcher function for React Query
 * 
 * @example
 * ```typescript
 * const { data, error } = useQuery({
 *   queryKey: ['employees'],
 *   queryFn: () => queryFetcher<Employee[]>('/api/employees'),
 * });
 * ```
 */
export function queryFetcher<T>(url: string, options?: ApiRequestOptions): Promise<T> {
  return request<T>(url, { method: 'GET', ...options }).then((response) => {
    if (response.error) {
      const error = new Error(response.error.message) as Error & { status?: number };
      error.status = response.error.status;
      throw error;
    }
    return response.data as T;
  });
}
