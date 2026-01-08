/**
 * Tenant Admin Feature Toggles API
 * 
 * GET /api/tenant-admin/feature-toggles
 * Returns all feature toggles for all tenants (dashboard view)
 * 
 * Requirements: 7.1, 7.5
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySignedToken, TENANT_ADMIN_COOKIE_NAME } from "@/lib/tenant-admin-auth";
import { ALL_FEATURE_KEYS, FeatureToggleState } from "@/lib/feature-toggles/types";

/**
 * Check if the request is authenticated as tenant admin
 */
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(TENANT_ADMIN_COOKIE_NAME);
  if (!session?.value) return false;
  const { valid } = verifySignedToken(session.value);
  return valid;
}

/**
 * GET /api/tenant-admin/feature-toggles
 * 
 * Returns all feature toggles for all tenants, grouped by company.
 * Used for the tenant admin dashboard view.
 */
export async function GET() {
  try {
    // Require tenant-admin authentication (Requirement 7.5)
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Fetch all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    // Fetch all feature toggles
    const allToggles = await prisma.tenantFeatureToggle.findMany({
      select: {
        companyId: true,
        featureKey: true,
        isEnabled: true,
      },
    });

    // Group toggles by company
    const togglesByCompany = new Map<string, Array<{ featureKey: string; isEnabled: boolean }>>();
    for (const toggle of allToggles) {
      const existing = togglesByCompany.get(toggle.companyId) || [];
      existing.push({ featureKey: toggle.featureKey, isEnabled: toggle.isEnabled });
      togglesByCompany.set(toggle.companyId, existing);
    }

    // Transform data to include all feature keys with defaults
    const result = companies.map((company) => {
      const companyToggles = togglesByCompany.get(company.id) || [];
      
      // Build toggle state, defaulting to true for missing features
      const toggles: FeatureToggleState = {};
      for (const key of ALL_FEATURE_KEYS) {
        const toggle = companyToggles.find(
          (t: { featureKey: string; isEnabled: boolean }) => t.featureKey === key
        );
        toggles[key] = toggle?.isEnabled ?? true;
      }

      return {
        companyId: company.id,
        companyName: company.name,
        toggles,
      };
    });

    return NextResponse.json({ tenants: result });
  } catch (error) {
    console.error("Tenant admin - fetch feature toggles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature toggles", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
