/**
 * Tenant Admin Bug Reports API
 * 
 * GET /api/tenant-admin/bugs - List all bugs across all tenants
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { listAllBugs } from "@/lib/bugs/service";
import type { AdminListBugsQuery, BugSeverity, BugStatus } from "@/types/bugs";
import { isBugSeverity, isBugStatus } from "@/types/bugs";

/**
 * Check if the user has tenant admin permission
 * 
 * Requirement 8.2: Verify canManageTenants permission
 */
async function checkTenantAdminPermission(): Promise<{ authorized: boolean; userId?: string }> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { authorized: false };
  }
  
  // Check canManageTenants permission (Requirement 9.3)
  if (!session.user.canManageTenants) {
    return { authorized: false };
  }
  
  return { authorized: true, userId: session.user.id };
}

/**
 * GET /api/tenant-admin/bugs - List all bugs across all tenants
 * 
 * Requirements:
 * - 8.1: Expose GET /api/tenant-admin/bugs endpoint
 * - 8.2: Verify canManageTenants permission
 * - 8.3: Support query parameters: companyId, status, severity, dateFrom, dateTo, page, limit, sortBy, sortOrder
 * - Include bug statistics in response
 */
export async function GET(req: NextRequest) {
  try {
    // Check tenant admin permission (Requirement 8.2)
    const { authorized } = await checkTenantAdminPermission();
    
    if (!authorized) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Parse query parameters (Requirement 8.3)
    const { searchParams } = new URL(req.url);
    
    const query: AdminListBugsQuery = {};
    
    // Company/Tenant filter
    const companyId = searchParams.get("companyId");
    if (companyId) {
      query.companyId = companyId;
    }
    
    // Status filter
    const status = searchParams.get("status");
    if (status && isBugStatus(status)) {
      query.status = status as BugStatus;
    }
    
    // Severity filter
    const severity = searchParams.get("severity");
    if (severity && isBugSeverity(severity)) {
      query.severity = severity as BugSeverity;
    }
    
    // Date range filters
    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) {
      query.dateFrom = dateFrom;
    }
    
    const dateTo = searchParams.get("dateTo");
    if (dateTo) {
      query.dateTo = dateTo;
    }
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    query.page = Math.max(1, page);
    query.limit = Math.min(100, Math.max(1, limit)); // Cap at 100
    
    // Sorting
    const sortBy = searchParams.get("sortBy");
    if (sortBy && ["createdAt", "status", "severity", "resolvedAt"].includes(sortBy)) {
      query.sortBy = sortBy as AdminListBugsQuery["sortBy"];
    }
    
    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder && ["asc", "desc"].includes(sortOrder)) {
      query.sortOrder = sortOrder as "asc" | "desc";
    }

    // List all bugs with statistics (Requirements 8.1, 8.3)
    const result = await listAllBugs(query);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing tenant admin bug reports:", error);
    return NextResponse.json(
      { error: "Failed to list bug reports", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
