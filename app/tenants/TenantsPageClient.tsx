"use client";

import React from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AddTenantDialog } from "@/components/navigation/AddTenantDialog";
import { toast } from "sonner";

interface TenantSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string | null;
}

interface TenantsPageClientProps {
  initialTenants: TenantSummary[];
  homeCompanyId: string;
  mainCompanyId: string | null;
}

const TENANT_CREATED_EVENT = "tenant:created";

function sortTenants(
  tenants: TenantSummary[],
  homeCompanyId: string,
): TenantSummary[] {
  return tenants.slice().sort((a, b) => {
    if (a.id === homeCompanyId) return -1;
    if (b.id === homeCompanyId) return 1;
    return a.name.localeCompare(b.name);
  });
}

export default function TenantsPageClient({
  initialTenants,
  homeCompanyId,
  mainCompanyId,
}: TenantsPageClientProps) {
  const { data: session, update: updateSession } = useSession();
  const [tenants, setTenants] = React.useState<TenantSummary[]>(() =>
    sortTenants(initialTenants, homeCompanyId),
  );
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [switchingTenantId, setSwitchingTenantId] = React.useState<string | null>(
    null,
  );

  const currentCompanyId = session?.user?.companyId ?? null;

  React.useEffect(() => {
    setTenants(sortTenants(initialTenants, homeCompanyId));
  }, [initialTenants, homeCompanyId]);

  const refreshTenants = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/tenants");
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error || "Unable to refresh tenants";
        toast.error(message);
        return;
      }

      const data = (await response.json()) as {
        companies?: Array<{
          id: string;
          name: string;
          createdAt?: string;
          updatedAt?: string | null;
        }>;
      };

      const list: TenantSummary[] = Array.isArray(data?.companies)
        ? data.companies.map((company) => ({
            id: String(company.id),
            name: String(company.name),
            createdAt: String(
              company.createdAt ?? new Date().toISOString(),
            ),
            updatedAt: company.updatedAt ? String(company.updatedAt) : null,
          }))
        : [];

      setTenants(sortTenants(list, homeCompanyId));
    } catch (error) {
      console.error("Failed to refresh tenants", error);
      toast.error("Unexpected error while refreshing tenants");
    } finally {
      setIsRefreshing(false);
    }
  }, [homeCompanyId]);

  React.useEffect(() => {
    const handleTenantCreated: EventListener = () => {
      refreshTenants();
    };

    window.addEventListener(TENANT_CREATED_EVENT, handleTenantCreated);
    return () => {
      window.removeEventListener(TENANT_CREATED_EVENT, handleTenantCreated);
    };
  }, [refreshTenants]);

  const handleTenantCreatedFromDialog = React.useCallback(
    async (tenant: { id: string; name: string }) => {
      setIsDialogOpen(false);
      setTenants((prev) =>
        sortTenants(
          prev.some((item) => item.id === tenant.id)
            ? prev
            : [
                ...prev,
                {
                  id: tenant.id,
                  name: tenant.name,
                  createdAt: new Date().toISOString(),
                },
              ],
          homeCompanyId,
        ),
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(TENANT_CREATED_EVENT, { detail: tenant }),
        );
      }

      if (!updateSession) {
        return;
      }

      setSwitchingTenantId(tenant.id);
      try {
        await updateSession({ companyId: tenant.id });
      } catch (error) {
        console.error("Failed to switch to new tenant", error);
        toast.error(
          "Tenant created, but switching failed. Refresh and try again.",
        );
      } finally {
        setSwitchingTenantId(null);
      }
    },
    [homeCompanyId, updateSession],
  );

  const handleSwitchTenant = React.useCallback(
    async (tenantId: string) => {
      if (!updateSession || tenantId === currentCompanyId) {
        return;
      }

      setSwitchingTenantId(tenantId);
      try {
        await updateSession({ companyId: tenantId });
        const selected = tenants.find((item) => item.id === tenantId);
        toast.success(
          selected ? `Now viewing “${selected.name}”` : "Tenant switched",
        );
      } catch (error) {
        console.error("Failed to switch tenant", error);
        toast.error("Unable to switch tenants. Try again.");
      } finally {
        setSwitchingTenantId(null);
      }
    },
    [updateSession, currentCompanyId, tenants],
  );

  const description = mainCompanyId
    ? `Only super admins from ${mainCompanyId} can access tenant management.`
    : "Only super admins on the main production tenant can access tenant management.";

  return (
    <div className="flex min-h-full flex-1 flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Tenant management
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={refreshTenants}
            loading={isRefreshing}
          >
            Refresh
          </Button>
          <Button type="button" onClick={() => setIsDialogOpen(true)}>
            + Add tenant
          </Button>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-white/30 bg-white/40 p-12 text-center">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              No tenants yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Create your first tenant to provision a new company workspace.
            </p>
            <Button type="button" onClick={() => setIsDialogOpen(true)}>
              Create tenant
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant) => {
            const createdLabel = tenant.createdAt
              ? `Created ${format(new Date(tenant.createdAt), "d MMM yyyy")}`
              : "";
            const isHome = tenant.id === homeCompanyId;
            const isCurrent = tenant.id === currentCompanyId;
            const isSwitching = switchingTenantId === tenant.id;

            return (
              <div
                key={tenant.id}
                className="glass flex h-full flex-col justify-between rounded-3xl p-6 shadow-glass transition-glass hover-glass"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-foreground">
                        {tenant.name}
                      </h2>
                      <p className="font-mono text-xs text-muted-foreground/80">
                        {tenant.id}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isHome ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600">
                          Main production
                        </Badge>
                      ) : null}
                      {isCurrent && !isHome ? (
                        <Badge variant="secondary">In view</Badge>
                      ) : null}
                    </div>
                  </div>
                  {createdLabel ? (
                    <p className="text-sm text-muted-foreground">
                      {createdLabel}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={isHome ? "secondary" : "primary"}
                    onClick={() => handleSwitchTenant(tenant.id)}
                    disabled={isCurrent}
                    loading={isSwitching}
                  >
                    {isCurrent ? "Currently viewing" : "Switch to tenant"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTenantDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTenantCreated={handleTenantCreatedFromDialog}
      />
    </div>
  );
}
