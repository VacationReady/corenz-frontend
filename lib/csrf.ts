/**
 * CSRF Protection Utilities
 * 
 * Provides client-side CSRF token management for secure POST/PUT/DELETE requests.
 * Tokens are retrieved from NextAuth session or API endpoint.
 * 
 * Note: For tenant-aware requests, use `useTenantFetch` hook instead, which includes
 * both CSRF protection and tenant headers automatically.
 */

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Fetches a CSRF token from the server.
 * Tokens are cached for 1 hour to reduce server load.
 */
async function fetchCsrfToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid
  if (cachedToken && tokenExpiry > now) {
    return cachedToken;
  }

  try {
    // NextAuth provides built-in CSRF protection via /api/auth/csrf
    const response = await fetch("/api/auth/csrf", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const data = await response.json();
    const token = data.csrfToken;

    if (!token) {
      throw new Error("CSRF token not found in response");
    }

    // Cache the token
    cachedToken = token;
    tokenExpiry = now + TOKEN_CACHE_DURATION;

    return token;
  } catch (error) {
    console.error("[CSRF] Failed to fetch token:", error);
    throw error;
  }
}

/**
 * Makes a fetch request with CSRF protection.
 * Automatically includes the CSRF token in request headers for POST/PUT/PATCH/DELETE.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (method, headers, body, etc.)
 * @param companyId - Optional company ID for tenant-aware requests
 * @returns Promise<Response>
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {},
  companyId?: string | null
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  // Import tenant utilities dynamically
  const { getTenantHeadersSync } = await import('@/lib/tenant-fetch');
  const tenantHeaders = getTenantHeadersSync(url, companyId);

  if (!needsCsrf) {
    // GET requests don't need CSRF protection
    const headers = new Headers(options.headers);
    Object.entries(tenantHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return fetch(url, {
      ...options,
      credentials: options.credentials || "include",
      headers,
    });
  }

  try {
    const csrfToken = await fetchCsrfToken();

    // Add CSRF token and tenant headers
    const headers = new Headers(options.headers);
    headers.set("x-csrf-token", csrfToken);
    Object.entries(tenantHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return fetch(url, {
      ...options,
      credentials: options.credentials || "include",
      headers,
    });
  } catch (error) {
    console.error("[CSRF] Request failed:", error);
    // Fall back to regular fetch without CSRF (server should reject it)
    const headers = new Headers(options.headers);
    Object.entries(tenantHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return fetch(url, {
      ...options,
      credentials: options.credentials || "include",
      headers,
    });
  }
}

/**
 * Clears the cached CSRF token.
 * Useful after logout or when token becomes invalid.
 */
export function clearCsrfToken(): void {
  cachedToken = null;
  tokenExpiry = 0;
}
