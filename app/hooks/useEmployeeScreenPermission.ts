import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useTenantFetch } from "@/hooks/useTenantFetch";

type PermissionAction = "read" | "edit" | "delete" | "approve";

interface PermissionCheckResult {
  hasAccess: boolean | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to check if the current user has permission for a specific employee profile screen.
 * 
 * This hook validates screen-specific permissions to prevent users with only one
 * employee-* permission (e.g., "employee-documents") from accessing other sections
 * (e.g., "employee-training", "employee-bank-payroll").
 * 
 * @param screen - The employee profile screen key (e.g., "employee-documents")
 * @param action - The action to check (default: "read")
 * @returns { hasAccess, loading, error, refetch }
 * 
 * @example
 * ```tsx
 * const { hasAccess, loading } = useEmployeeScreenPermission("employee-documents");
 * 
 * if (loading) return <Spinner />;
 * if (!hasAccess) return <AccessDenied />;
 * return <DocumentsPage />;
 * ```
 */
export function useEmployeeScreenPermission(
  screen: string,
  action: PermissionAction = "read"
): PermissionCheckResult {
  const { data: session, status } = useSession();
  const tenantFetch = useTenantFetch();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback(async () => {
    // Wait for session to be determined
    if (status === "loading") {
      return;
    }

    // No session = no access
    if (!session?.user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    // ADMIN/SUPER_ADMIN always have access - skip API call
    if (["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      setHasAccess(true);
      setLoading(false);
      return;
    }

    // For other roles, check via API
    try {
      setLoading(true);
      setError(null);

      const res = await tenantFetch(
        `/api/permissions/check?screen=${encodeURIComponent(screen)}&action=${encodeURIComponent(action)}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to check permission");
      }

      const data = await res.json();
      setHasAccess(data.allowed === true);
    } catch (err) {
      console.error("Error checking permission:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Default to no access on error for security
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [session, status, screen, action, tenantFetch]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    hasAccess,
    loading,
    error,
    refetch: checkPermission,
  };
}

/**
 * Hook to check multiple employee screen permissions at once.
 * Useful for navigation menus or dashboards that need to show/hide multiple sections.
 * 
 * @param screens - Array of screen keys to check
 * @param action - The action to check (default: "read")
 * @returns Map of screen -> hasAccess
 */
export function useEmployeeScreenPermissions(
  screens: string[],
  action: PermissionAction = "read"
): {
  permissions: Record<string, boolean>;
  loading: boolean;
  error: string | null;
} {
  const { data: session, status } = useSession();
  const tenantFetch = useTenantFetch();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPermissions() {
      if (status === "loading") {
        return;
      }

      if (!session?.user) {
        const noAccess: Record<string, boolean> = {};
        screens.forEach(s => { noAccess[s] = false; });
        setPermissions(noAccess);
        setLoading(false);
        return;
      }

      // ADMIN/SUPER_ADMIN always have access
      if (["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        const fullAccess: Record<string, boolean> = {};
        screens.forEach(s => { fullAccess[s] = true; });
        setPermissions(fullAccess);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check each screen in parallel
        const results = await Promise.all(
          screens.map(async (screen) => {
            try {
              const res = await tenantFetch(
                `/api/permissions/check?screen=${encodeURIComponent(screen)}&action=${encodeURIComponent(action)}`
              );
              if (!res.ok) return { screen, allowed: false };
              const data = await res.json();
              return { screen, allowed: data.allowed === true };
            } catch {
              return { screen, allowed: false };
            }
          })
        );

        const permMap: Record<string, boolean> = {};
        results.forEach(({ screen, allowed }) => {
          permMap[screen] = allowed;
        });
        setPermissions(permMap);
      } catch (err) {
        console.error("Error checking permissions:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        const noAccess: Record<string, boolean> = {};
        screens.forEach(s => { noAccess[s] = false; });
        setPermissions(noAccess);
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, [session, status, screens.join(","), action, tenantFetch]);

  return { permissions, loading, error };
}
