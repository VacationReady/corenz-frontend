/**
 * Tenant Admin Feature Toggles API - Single Tenant
 * 
 * GET /api/tenant-admin/feature-toggles/[companyId]
 * Returns feature toggles for a specific tenant
 * 
 * PATCH /api/tenant-admin/feature-toggles/[companyId]
 * Updates feature toggles for a specific tenant
 * 
 * Requirements: 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySignedToken, TENANT_ADMIN_COOKIE_NAME } from "@/lib/tenant-admin-auth";
import { 
  ALL_FEATURE_KEYS, 
  FeatureToggleState, 
  isValidFeatureKey 
} from "@/lib/feature-toggles/types";
import { featureToggleService } from "@/lib/feature-toggles/service";
import { AuditActorType } from "@prisma/client";

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

interface RouteParams {
  params: Promise<{ companyId: string }>;
}

/**
 * GET /api/tenant-admin/feature-toggles/[companyId]
 * 
 * Returns feature toggles for a specific tenant.
 * Requirements: 7.2, 7.5
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require tenant-admin authentication (Requirement 7.5)
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { companyId } = await params;

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Tenant not found", code: "TENANT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch toggles from database
    const toggleRecords = await prisma.tenantFeatureToggle.findMany({
      where: { companyId },
      select: { featureKey: true, isEnabled: true },
    });

    // Build toggle state, defaulting to true for missing features
    const toggles: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      const toggle = toggleRecords.find((t: { featureKey: string; isEnabled: boolean }) => t.featureKey === key);
      toggles[key] = toggle?.isEnabled ?? true;
    }

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      toggles,
    });
  } catch (error) {
    console.error("Tenant admin - fetch tenant feature toggles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature toggles", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}


/**
 * PATCH /api/tenant-admin/feature-toggles/[companyId]
 * 
 * Updates feature toggles for a specific tenant.
 * Accepts a partial object with only the changed feature keys.
 * Invalidates cache after update and logs changes to audit log.
 * 
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require tenant-admin authentication (Requirement 7.5)
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { companyId } = await params;

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Tenant not found", code: "TENANT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updates: Partial<FeatureToggleState> = body.toggles || body;

    // Validate feature keys
    const invalidKeys = Object.keys(updates).filter(
      (key) => !isValidFeatureKey(key)
    );
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { 
          error: "Invalid feature key(s)", 
          code: "INVALID_FEATURE_KEY",
          invalidKeys 
        },
        { status: 400 }
      );
    }

    // Get current toggle states to calculate changes count
    const currentToggles = await featureToggleService.getEnabledFeatures(companyId);

    // Calculate how many changes will be applied
    let changesCount = 0;
    for (const [key, newValue] of Object.entries(updates)) {
      const oldValue = currentToggles[key] ?? true;
      if (oldValue !== newValue) {
        changesCount++;
      }
    }

    // Only proceed if there are actual changes
    if (changesCount === 0) {
      return NextResponse.json({
        companyId: company.id,
        companyName: company.name,
        toggles: currentToggles,
        changesApplied: 0,
      });
    }

    // Get a system user for audit logging (use first admin user of the company)
    // For tenant-admin operations, we'll use a special system actor
    const systemUser = await prisma.user.findFirst({
      where: { companyId, role: "ADMIN" },
      select: { id: true },
    });

    // Apply updates using the service (handles cache invalidation and audit logging)
    // Requirement 7.6: Audit logging is now handled by the service
    await featureToggleService.bulkSetFeatures(
      companyId, 
      updates,
      systemUser ? {
        actorId: systemUser.id,
        actorType: AuditActorType.SYSTEM,
        source: 'tenant-admin',
      } : undefined
    );

    // Fetch updated state
    const updatedToggles = await featureToggleService.getEnabledFeatures(companyId);

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      toggles: updatedToggles,
      changesApplied: changesCount,
    });
  } catch (error) {
    console.error("Tenant admin - update feature toggles error:", error);
    return NextResponse.json(
      { error: "Failed to update feature toggles", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
