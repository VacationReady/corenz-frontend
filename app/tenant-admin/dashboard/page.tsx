"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, LogOut, Building2, Users, UserCheck } from "lucide-react";
import { FunctionalitySection } from "@/tenant-admin/components/FunctionalitySection";
import { FeatureToggleState, ALL_FEATURE_KEYS, FeatureKey } from "@/lib/feature-toggles/types";

interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  employeeCount: number;
}

export default function TenantAdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [createdTenant, setCreatedTenant] = useState<{ name: string; adminEmail: string; activationLink: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [createStep, setCreateStep] = useState<"details" | "features">("details");
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureToggleState>(() => {
    // Default all features to enabled
    return ALL_FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as FeatureToggleState);
  });
  const tenantNameInputRef = React.useRef<HTMLInputElement>(null);

  const checkAuth = useCallback(async () => {
    const response = await fetch("/api/tenant-admin/verify");
    const data = await response.json();
    if (!data.authenticated) {
      router.push("/tenant-admin");
    }
  }, [router]);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch("/api/tenant-admin/tenants");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/tenant-admin");
          return;
        }
        throw new Error("Failed to fetch tenants");
      }
      const data = await response.json();
      setTenants(data.companies || []);
    } catch (error) {
      console.error("Fetch tenants error:", error);
      toast.error("Failed to load tenants");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
    fetchTenants();
  }, [checkAuth, fetchTenants]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTenants();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/tenant-admin/logout", { method: "POST" });
      toast.success("Logged out");
      router.push("/tenant-admin");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim() || !adminName.trim() || !adminEmail.trim()) return;

    setIsCreating(true);
    try {
      // Get enabled feature keys from selectedFeatures
      const enabledFeatures = Object.entries(selectedFeatures)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key as FeatureKey);

      const response = await fetch("/api/tenant-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          companyName: newTenantName.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          enabledFeatures,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create tenant");
      }

      const newTenant = await response.json();
      setTenants((prev) => [...prev, newTenant].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Show success with activation link
      const activationLink = `${window.location.origin}/activate?token=${newTenant.activationToken}`;
      setCreatedTenant({
        name: newTenant.name,
        adminEmail: newTenant.adminEmail,
        activationLink,
      });
      
      toast.success(`Tenant "${newTenant.name}" created successfully`);
    } catch (error: any) {
      console.error("Create tenant error:", error);
      toast.error(error.message || "Failed to create tenant");
      setIsCreating(false);
    }
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
    setNewTenantName("");
    setAdminName("");
    setAdminEmail("");
    setCreatedTenant(null);
    setIsCreating(false);
    setCreateStep("details");
    // Reset features to all enabled
    setSelectedFeatures(
      ALL_FEATURE_KEYS.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as FeatureToggleState)
    );
  };

  const handleSwitchToTenant = async (tenant: Tenant) => {
    setSwitchingId(tenant.id);
    try {
      const response = await fetch("/api/tenant-admin/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: tenant.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate switch token");
      }

      const data = await response.json();
      const switchUrl = `${window.location.origin}/tenant-switch?token=${data.token}`;
      
      // Open in new tab
      window.open(switchUrl, "_blank");
      toast.success(`Opening ${tenant.name} in new tab...`);
    } catch (error: any) {
      console.error("Switch tenant error:", error);
      toast.error(error.message || "Failed to switch tenant");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`⚠️ DELETE TENANT "${tenant.name}"?\n\nThis will permanently delete:\n- ${tenant.userCount} users\n- ${tenant.employeeCount} employees\n- All associated data\n\nThis action CANNOT be undone!`)) {
      return;
    }

    setDeletingId(tenant.id);
    try {
      const response = await fetch("/api/tenant-admin/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: tenant.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete tenant");
      }

      setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
      toast.success(`Tenant "${tenant.name}" deleted`);
    } catch (error: any) {
      console.error("Delete tenant error:", error);
      toast.error(error.message || "Failed to delete tenant");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-muted-foreground">Loading tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Tenant Management Portal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              System-wide tenant administration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              loading={isRefreshing}
            >
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} icon={<Plus className="h-4 w-4" />}>
              Create Tenant
            </Button>
            <Button
              variant="danger"
              onClick={handleLogout}
              icon={<LogOut className="h-4 w-4" />}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-3">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold text-foreground">{tenants.length}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">
                  {tenants.reduce((sum, t) => sum + t.userCount, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-3">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold text-foreground">
                  {tenants.reduce((sum, t) => sum + t.employeeCount, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Grid */}
        <div id="tenants">
          {tenants.length === 0 ? (
            <div className="glass flex min-h-[400px] items-center justify-center rounded-3xl p-12 text-center">
              <div>
                <Building2 className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                  No tenants yet
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first tenant to get started
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  Create Tenant
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="glass rounded-3xl p-6 shadow-glass transition-glass hover-glass"
                >
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      {tenant.name}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-muted-foreground/60">
                      {tenant.id}
                    </p>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Users</span>
                      <Badge variant="secondary">{tenant.userCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Employees</span>
                      <Badge variant="secondary">{tenant.employeeCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => router.push(`/tenant-admin/tenants/${tenant.id}`)}
                    >
                      Manage Features
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => handleSwitchToTenant(tenant)}
                      loading={switchingId === tenant.id}
                      disabled={tenant.userCount === 0}
                    >
                      {tenant.userCount === 0 ? "No Users" : "Switch to Tenant"}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteTenant(tenant)}
                      loading={deletingId === tenant.id}
                      icon={<Trash2 className="h-4 w-4" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            if (open) {
              setShowCreateDialog(true);
              return;
            }
            handleCloseCreateDialog();
          }}
        >
          <DialogContent
            className={createStep === "features" ? "max-w-2xl" : "max-w-md"}
            title={
              createdTenant 
                ? "✅ Tenant Created Successfully" 
                : createStep === "features"
                  ? "Select Features"
                  : "Create New Tenant"
            }
            onOpenAutoFocus={(event) => {
              if (createdTenant || createStep === "features") return;
              event.preventDefault();
              tenantNameInputRef.current?.focus();
            }}
          >
            {createdTenant ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4">
                  <p className="font-semibold text-foreground">{createdTenant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Admin: {createdTenant.adminEmail}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Activation Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createdTenant.activationLink}
                      readOnly
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 font-mono text-xs text-foreground"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(createdTenant.activationLink);
                        toast.success("Link copied!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    ✉️ Activation email sent to {createdTenant.adminEmail}
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleCloseCreateDialog}
                >
                  Done
                </Button>
              </div>
            ) : createStep === "features" ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                  <p className="font-medium">Creating tenant: {newTenantName}</p>
                  <p className="text-xs mt-1">Select which features to enable for this tenant</p>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <FunctionalitySection
                    companyId={null}
                    toggles={selectedFeatures}
                    onTogglesChange={setSelectedFeatures}
                    isCreateMode={true}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setCreateStep("details")}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    loading={isCreating}
                    onClick={(e) => handleCreateTenant(e as unknown as React.FormEvent)}
                  >
                    Create Tenant
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setCreateStep("features"); }} className="space-y-4">
                <div>
                  <label
                    htmlFor="tenantName"
                    className="block text-sm font-medium text-foreground"
                  >
                    Company Name
                  </label>
                  <input
                    id="tenantName"
                    ref={tenantNameInputRef}
                    type="text"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Acme Corporation"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="adminName"
                    className="block text-sm font-medium text-foreground"
                  >
                    Admin Full Name
                  </label>
                  <input
                    id="adminName"
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., John Smith"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="adminEmail"
                    className="block text-sm font-medium text-foreground"
                  >
                    Admin Email
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="admin@company.com"
                    required
                  />
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                  <p className="font-medium">What will be created:</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>✓ Company tenant</li>
                    <li>✓ Default &quot;General&quot; department</li>
                    <li>✓ 3 permission profiles (Admin, Manager, Employee)</li>
                    <li>✓ Admin user account</li>
                    <li>✓ Activation email sent</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={handleCloseCreateDialog}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!newTenantName.trim() || !adminName.trim() || !adminEmail.trim()}
                  >
                    Next: Select Features
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
