"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { AddTenantDialog } from "./AddTenantDialog";
import { Bell, Menu, Search } from "lucide-react";
import { toast } from "sonner";

interface TopBarProps {
  onOpenMobileSidebar?: () => void;
  hasSidebar?: boolean;
}

interface TenantOption {
  id: string;
  name: string;
}

const ADD_TENANT_VALUE = "__add_tenant__";

export default function TopBar({
  onOpenMobileSidebar,
  hasSidebar = true,
}: TopBarProps) {
  const { data: session, update: updateSession } = useSession();
  const [modifierKey, setModifierKey] = React.useState("⌘");
  const [tenants, setTenants] = React.useState<TenantOption[]>([]);
  const [tenantsLoading, setTenantsLoading] = React.useState(false);
  const [isSwitchingTenant, setIsSwitchingTenant] = React.useState(false);
  const [isAddTenantOpen, setIsAddTenantOpen] = React.useState(false);
  const [tenantsError, setTenantsError] = React.useState<string | null>(null);
  const [tenant, setTenant] = React.useState<string>("");

  const role = session?.user?.role;
  const canManageTenants = Boolean(session?.user?.canManageTenants);
  const homeCompanyId = session?.user?.homeCompanyId ?? null;
  const currentCompanyId = session?.user?.companyId ?? null;

  React.useEffect(() => {
    if (!session?.user?.companyId) return;
    setTenant(session.user.companyId);
  }, [session?.user?.companyId]);

  React.useEffect(() => {
    if (!canManageTenants) return;

    let cancelled = false;
    const loadTenants = async () => {
      setTenantsLoading(true);
      setTenantsError(null);
      try {
        const response = await fetch("/api/tenants", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const message = data?.error || "Unable to load tenants";
          if (!cancelled) {
            setTenantsError(message);
            toast.error(message);
          }
          return;
        }

        const data = await response.json();
        const options: TenantOption[] = Array.isArray(data?.companies)
          ? data.companies.map((company: any) => ({
              id: company.id as string,
              name: company.name as string,
            }))
          : [];

        const ensurePresent = (id: string | null, label?: string) => {
          if (!id) return;
          if (!options.some((option) => option.id === id)) {
            options.push({
              id,
              name: label || `Tenant ${id.slice(0, 8).toUpperCase()}`,
            });
          }
        };

        ensurePresent(homeCompanyId);
        ensurePresent(
          session?.user?.companyId ?? null,
          session?.user?.companyId
            ? `Tenant ${session.user.companyId.slice(0, 8).toUpperCase()}`
            : undefined,
        );

        const sorted = options.sort((a, b) => {
          if (homeCompanyId && a.id === homeCompanyId) return -1;
          if (homeCompanyId && b.id === homeCompanyId) return 1;
          return a.name.localeCompare(b.name);
        });

        if (!cancelled) {
          setTenants(sorted);
        }
      } catch (error) {
        console.error("Failed to load tenants", error);
        if (!cancelled) {
          setTenantsError("Failed to load tenants");
          toast.error("Failed to load tenants");
        }
      } finally {
        if (!cancelled) {
          setTenantsLoading(false);
        }
      }
    };

    loadTenants();
    return () => {
      cancelled = true;
    };
  }, [canManageTenants, homeCompanyId, session?.user?.companyId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const isMac = navigator.platform.toLowerCase().includes("mac");
    setModifierKey(isMac ? "⌘" : "Ctrl");
  }, []);

  const handleTenantChange = React.useCallback(
    async (value: string) => {
      if (value === ADD_TENANT_VALUE) {
        setIsAddTenantOpen(true);
        return;
      }

      if (!value || value === tenant) return;

      setIsSwitchingTenant(true);
      setTenant(value);

      try {
        await updateSession?.({ companyId: value });
        const selected = tenants.find((option) => option.id === value);
        toast.success(
          selected ? `Now viewing “${selected.name}”` : "Tenant switched",
        );
      } catch (error) {
        console.error("Failed to switch tenant", error);
        toast.error("Unable to switch tenants. Try again.");
        if (currentCompanyId) {
          setTenant(currentCompanyId);
        }
      } finally {
        setIsSwitchingTenant(false);
      }
    },
    [tenant, tenants, updateSession, currentCompanyId],
  );

  const handleTenantCreated = React.useCallback(
    async (created: TenantOption) => {
      setTenants((prev) => {
        const exists = prev.some((option) => option.id === created.id);
        const merged = exists ? prev : [...prev, created];
        return merged.sort((a, b) => {
          if (homeCompanyId && a.id === homeCompanyId) return -1;
          if (homeCompanyId && b.id === homeCompanyId) return 1;
          return a.name.localeCompare(b.name);
        });
      });

      setTenant(created.id);
      setIsSwitchingTenant(true);
      try {
        // Fire a custom event so the rest of the app can react to a new tenant being created.
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("tenant:created", { detail: created }),
          );
        }

        await updateSession?.({ companyId: created.id });
        toast.success(`Now viewing “${created.name}”`);
      } catch (error) {
        console.error("Failed to switch to new tenant", error);
        toast.error(
          "Tenant created, but switching failed. Refresh and try again.",
        );
      } finally {
        setIsSwitchingTenant(false);
      }
    },
    [homeCompanyId, updateSession],
  );

  if (!canManageTenants || role !== "SUPER_ADMIN") {
    return null;
  }

  const currentTenant = tenants.find((option) => option.id === tenant);
  const isImpersonating = Boolean(
    homeCompanyId && tenant && homeCompanyId !== tenant,
  );

  const tenantPlaceholder = tenantsLoading
    ? "Loading tenants..."
    : tenantsError || "Select tenant";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/20 bg-white/70 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          {hasSidebar && onOpenMobileSidebar ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 rounded-xl p-0 text-muted-foreground hover:text-foreground lg:hidden"
              onClick={onOpenMobileSidebar}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex items-center gap-3">
              <Select
                value={tenant || undefined}
                onValueChange={handleTenantChange}
                disabled={tenantsLoading || isSwitchingTenant || tenants.length === 0}
              >
                <SelectTrigger className="w-[240px] rounded-xl border border-white/30 bg-white/80 backdrop-blur">
                  <SelectValue placeholder={tenantPlaceholder}>
                    {currentTenant?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-white/40 bg-white/90 backdrop-blur">
                  {tenants.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                      {option.id === homeCompanyId ? " (Home)" : ""}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem
                    value={ADD_TENANT_VALUE}
                    className="font-semibold text-primary"
                  >
                    + Add tenant
                  </SelectItem>
                </SelectContent>
              </Select>
              <span
                className={
                  isImpersonating
                    ? "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
                    : "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                }
              >
                {isImpersonating ? "Impersonating" : "Main tenant"}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("command-palette:open"))}
                className="hidden items-center gap-3 rounded-xl border border-white/30 bg-white/70 px-3 py-2 text-sm text-muted-foreground shadow-glass transition hover:text-foreground hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-white sm:flex"
              >
                <Search className="h-4 w-4" />
                <span className="whitespace-nowrap">Search the workspace</span>
                <kbd className="ml-auto hidden rounded-md border border-white/40 bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground sm:block">
                  {modifierKey}+K
                </kbd>
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.dispatchEvent(new Event("command-palette:open"))}
                className="h-10 w-10 rounded-xl p-0 text-muted-foreground hover:text-foreground sm:hidden"
                aria-label="Open global search"
              >
                <Search className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="relative h-10 w-10 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 block h-2 w-2 rounded-full bg-destructive" />
              </Button>

              <div className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/70 px-2 py-1.5 shadow-glass">
                <Avatar
                  src={session?.user?.image ?? null}
                  name={session?.user?.name || session?.user?.email || "User"}
                  size={32}
                />
                <div className="hidden text-left text-sm leading-tight sm:block">
                  <p className="font-semibold text-foreground">
                    {session?.user?.name || session?.user?.email || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {(role || "Employee").toLowerCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <AddTenantDialog
        open={isAddTenantOpen}
        onOpenChange={setIsAddTenantOpen}
        onTenantCreated={handleTenantCreated}
      />
    </>
  );
}
