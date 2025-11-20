/**
 * Admin Dashboard - SWR Hooks
 * 
 * Custom SWR hooks for client-side data fetching with automatic:
 * - Deduplication (multiple components requesting same data)
 * - Caching (reduces redundant network requests)
 * - Revalidation (keeps data fresh)
 * - Error handling
 * 
 * Architecture:
 * - Use SWR for frequently changing/user-specific data
 * - Server components handle initial/static data
 * 
 * Related:
 * - Prompt 8: Server-first architecture
 * - Prompt 9: AdminDashboard SWR refactor
 */

"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";

// Generic fetcher for SWR
const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

/**
 * Hook for fetching document action items (acknowledgments and signatures)
 * Uses SWR for automatic deduplication and caching
 */
export function useDocumentActionItems(employeeId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    employeeId ? `/api/dashboard/document-action-items?employeeId=${employeeId}` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      dedupingInterval: 30000, // Dedupe requests within 30s
    }
  );

  return {
    ackItems: data?.ack || [],
    signItems: data?.sign || [],
    urlMap: data?.urlMap || {},
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching pending approval items
 * Includes deduplication for multiple widgets requesting same data
 */
export function useApprovalItems(scope: "my" | "all" = "my") {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/approval-items?scope=${scope}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30s
      revalidateOnFocus: true,
      dedupingInterval: 15000, // Dedupe requests within 15s
    }
  );

  return {
    items: data?.items || [],
    count: data?.count || 0,
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching departments (rarely changes, use immutable)
 */
export function useDepartments() {
  const { data, error, isLoading } = useSWRImmutable(
    "/api/departments",
    fetcher
  );

  return {
    departments: Array.isArray(data) ? data : (data?.departments || []),
    loading: isLoading,
    error,
  };
}

/**
 * Hook for fetching new starters (on-demand, not automatic)
 */
export function useNewStarters(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? "/api/dashboard/new-starters" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    newStarters: data?.newStarters || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching entitlement projection (used in approval detail)
 */
export function useEntitlementProjection(
  employeeId: string | null,
  eventCategoryId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const enabled = !!(employeeId && eventCategoryId && startDate && endDate);
  
  const { data, error, isLoading } = useSWR(
    enabled
      ? `/api/employees/${employeeId}/entitlement-projection?eventCategoryId=${eventCategoryId}&startDate=${startDate}&endDate=${endDate}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    projectionText: data?.text || null,
    loading: isLoading,
    error,
  };
}

/**
 * Hook for fetching employees list (for edit employee modal)
 * Uses pagination from Prompt 8
 */
export function useEmployees(enabled: boolean) {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;
  
  const { data, error, isLoading } = useSWR(
    enabled ? "/api/employees?status=active&limit=100" : null,
    async (url: string) => {
      // Fetch all pages if needed
      let allEmployees: any[] = [];
      let cursor: string | null = null;
      let hasMore: boolean = true;

      const headers: HeadersInit = {};
      if (companyId) {
        headers["x-company-id"] = companyId;
      }

      while (hasMore) {
        const fetchUrl: string = cursor ? `${url}&cursor=${cursor}` : url;
        const response: Response = await fetch(fetchUrl, { cache: "no-store", headers });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result: any = await response.json();
        const employees: any[] = Array.isArray(result) ? result : (result.data || []);
        const pagination: any = result.pagination || { hasMore: false, cursor: null };

        allEmployees = [...allEmployees, ...employees];
        hasMore = pagination.hasMore;
        cursor = pagination.cursor;

        // Safety limit to prevent infinite loops
        if (allEmployees.length > 1000) break;
      }

      return allEmployees;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000, // 2 minutes
    }
  );

  return {
    employees: data || [],
    loading: isLoading,
    error,
  };
}
