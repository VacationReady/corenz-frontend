/**
 * Feature Toggles API for regular users
 * 
 * GET /api/settings/feature-toggles
 * Returns the feature toggle states for the current user's tenant
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { featureToggleService } from "@/lib/feature-toggles/service";

export const runtime = "nodejs";

/**
 * GET /api/settings/feature-toggles
 * Fetch feature toggle states for the current user's tenant
 * Any authenticated user can read their tenant's feature toggles
 */
export async function GET() {
  try {
    const session = await auth();
    const companyId = (session as any)?.user?.companyId as string | undefined;
    
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const features = await featureToggleService.getEnabledFeatures(companyId);

    return NextResponse.json(features);
  } catch (error) {
    console.error("[settings/feature-toggles][GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
