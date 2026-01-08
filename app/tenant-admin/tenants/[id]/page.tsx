"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { ArrowLeft, Building2, Users, UserCheck, Calendar, Loader2 } from "lucide-react";
import { FunctionalitySection } from "@/tenant-admin/components/FunctionalitySection";
import { FeatureToggleState } from "@/lib/feature-toggles/types";

interface TenantDetails {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  employeeCount: number;
}

interface FeatureTogglesResponse {
  companyId: string;
  companyName: string;
  toggles: FeatureToggleState;
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [toggles, setToggles] = useState<FeatureToggleState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglesLoading, setIsTogglesLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const response = await fetch("/api/tenant-admin/verify");
    const data = await response.json();
    if (!data.authenticated) {
      router.push("/tenant-admin");
      return false;
    }
    return true;
  }, [router]);

  const fetchTenantDetails = useCallback(async () => {
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
      const foundTenant = data.companies?.find((t: TenantDetails) => t.id === companyId);
      
      if (!foundTenant) {
        toast.error("Tenant not found");
        router.push("/tenant-admin/dashboard");
        return;
      }
      
      setTenant(foundTenant);
    } catch (error) {
      console.error("Fetch tenant error:", error);
      toast.error("Failed to load tenant details");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, router]);

  const fetchFeatureToggles = useCallback(async () => {
    try {
      const response = await fetch(`/api/tenant-admin/feature-toggles/${companyId}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/tenant-admin");
          return;
        }
        throw new Error("Failed to fetch feature toggles");
      }
      const data: FeatureTogglesResponse = await response.json();
      setToggles(data.toggles);
    } catch (error) {
      console.error("Fetch feature toggles error:", error);
      toast.error("Failed to load feature toggles");
    } finally {
      setIsTogglesLoading(false);
    }
  }, [companyId, router]);

  useEffect(() => {
    const init = async () => {
      const isAuth = await checkAuth();
      if (isAuth) {
        await Promise.all([fetchTenantDetails(), fetchFeatureToggles()]);
      }
    };
    init();
  }, [checkAuth, fetchTenantDetails, fetchFeatureToggles]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-purple-600" />
          <p className="text-muted-foreground">Loading tenant details...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <Building2 className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">Tenant not found</h2>
          <Button onClick={() => router.push("/tenant-admin/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="secondary"
            onClick={() => router.push("/tenant-admin/dashboard")}
            icon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4"
          >
            Back to Dashboard
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{tenant.name}</h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{tenant.id}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Users</p>
                <p className="text-xl font-bold text-foreground">{tenant.userCount}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employees</p>
                <p className="text-xl font-bold text-foreground">{tenant.employeeCount}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(tenant.updatedAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Toggles Section */}
        <div className="glass rounded-3xl p-6">
          <FunctionalitySection
            companyId={companyId}
            toggles={toggles}
            isLoading={isTogglesLoading}
          />
        </div>
      </div>
    </div>
  );
}
