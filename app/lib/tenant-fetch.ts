/**
 * Tenant-aware fetch utilities
 * 
 * Automatically includes x-company-id header for rate-limited API paths
 * to ensure tenant context is always present for middleware validation.
 * 
 * Rate-limited paths that require tenant header:
 * - /api/employees
 * - /api/documents
 * - /api/news
 * - /api/reports
 * - /api/upload
 * - /api/email
 * - /api/report
 */

import { getSession } from "next-auth/react";

/**
 * Rate-limited API paths that require tenant context
 */
const RATE_LIMITED_PATHS = [
  "/api/email",
  "/api/upload",
  "/api/report",
  "/api/employees",
  "/api/documents",
  "/api/news",
  "/api/reports",
];

/**
 * Check if a URL path requires tenant context
 */
export function requiresTenantHeader(url: string): boolean {
  return RATE_LIMITED_PATHS.some((path) => url.startsWith(path));
}

/**
 * Get tenant headers for a given URL
 * Returns headers with x-company-id if the path requires it and companyId is available
 */
export async function getTenantHeaders(
  url: string,
  companyId?: string | null
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (requiresTenantHeader(url) && companyId) {
    headers["x-company-id"] = companyId;
  }

  return headers;
}

/**
 * Get tenant headers synchronously (for use in hooks with session)
 * This is the preferred method for client components
 */
export function getTenantHeadersSync(
  url: string,
  companyId?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (requiresTenantHeader(url) && companyId) {
    headers["x-company-id"] = companyId;
  }

  return headers;
}

/**
 * Merge tenant headers with existing headers
 * Preserves existing headers while adding tenant context when needed
 */
export function mergeTenantHeaders(
  url: string,
  existingHeaders?: HeadersInit,
  companyId?: string | null
): HeadersInit {
  const tenantHeaders = getTenantHeadersSync(url, companyId);

  if (!existingHeaders) {
    return tenantHeaders;
  }

  // Handle Headers object
  if (existingHeaders instanceof Headers) {
    const merged = new Headers(existingHeaders);
    if (tenantHeaders["x-company-id"]) {
      merged.set("x-company-id", tenantHeaders["x-company-id"]);
    }
    return merged;
  }

  // Handle plain object
  if (typeof existingHeaders === "object" && !Array.isArray(existingHeaders)) {
    return {
      ...(existingHeaders as Record<string, string>),
      ...tenantHeaders,
    };
  }

  // Handle array of tuples (unlikely but possible)
  if (Array.isArray(existingHeaders)) {
    const merged = new Headers(existingHeaders);
    if (tenantHeaders["x-company-id"]) {
      merged.set("x-company-id", tenantHeaders["x-company-id"]);
    }
    return merged;
  }

  return tenantHeaders;
}

