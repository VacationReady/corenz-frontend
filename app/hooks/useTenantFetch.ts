/**
 * Hook for tenant-aware fetch calls
 * 
 * Automatically includes x-company-id header for rate-limited API paths.
 * Use this hook when making direct fetch calls instead of useApi.
 * 
 * @example
 * ```typescript
 * const tenantFetch = useTenantFetch();
 * 
 * const response = await tenantFetch('/api/documents/upload', {
 *   method: 'POST',
 *   body: formData
 * });
 * ```
 */

import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { mergeTenantHeaders } from "@/lib/tenant-fetch";

export function useTenantFetch() {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;

  const fetchWithTenant = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const mergedHeaders = mergeTenantHeaders(url, init?.headers, companyId);

      return fetch(url, {
        ...init,
        headers: mergedHeaders,
        credentials: init?.credentials ?? "include",
      });
    },
    [companyId]
  );

  return fetchWithTenant;
}

