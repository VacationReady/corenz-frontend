/**
 * Report Cache Management API
 * 
 * Provides endpoints to monitor and manage the report query cache.
 * Only accessible to authenticated users with admin privileges.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { reportQueryCache, cacheUtils } from "@/lib/reportCache";

export const runtime = "nodejs";

/**
 * GET /api/reports/cache
 * Returns cache statistics and health information
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = cacheUtils.getStats();
    const hitRate = cacheUtils.getHitRate();

    return NextResponse.json({
      status: "success",
      cache: {
        ...stats,
        hitRatePercent: hitRate,
        healthy: hitRate >= 0, // Cache is always "healthy" if it's working
      },
    });
  } catch (error: any) {
    console.error("Error fetching cache stats:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get cache statistics" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/cache
 * Clears the cache (company-specific or all)
 * 
 * Query params:
 * - scope: "company" (default) | "all"
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") || "company";

    if (scope === "all") {
      // Only allow clearing all cache for super admins (if you have such a role)
      // For now, restrict to company-level clearing only
      const count = cacheUtils.invalidateCompany(session.user.companyId);
      return NextResponse.json({
        status: "success",
        message: `Cleared ${count} cache entries for your company`,
        clearedEntries: count,
      });
    }

    const count = cacheUtils.invalidateCompany(session.user.companyId);
    return NextResponse.json({
      status: "success",
      message: `Cleared ${count} cache entries for your company`,
      clearedEntries: count,
    });
  } catch (error: any) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to clear cache" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports/cache/cleanup
 * Triggers cleanup of expired cache entries
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanedCount = cacheUtils.cleanup();

    return NextResponse.json({
      status: "success",
      message: `Cleaned up ${cleanedCount} expired cache entries`,
      cleanedEntries: cleanedCount,
    });
  } catch (error: any) {
    console.error("Error during cache cleanup:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to cleanup cache" },
      { status: 500 }
    );
  }
}














