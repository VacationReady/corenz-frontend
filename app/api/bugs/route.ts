/**
 * Bug Reports API - User Endpoints
 * 
 * POST /api/bugs - Create a new bug report
 * GET /api/bugs - List bug reports for the current tenant
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 6.1, 6.2, 6.3, 6.6
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import { createBug, listBugsForTenant } from "@/lib/bugs/service";
import { validateAndSanitizeBugRequest } from "@/lib/bugs/validation";
import type { CreateBugRequest, ListBugsQuery, BugSeverity, BugStatus } from "@/types/bugs";
import { isBugSeverity, isBugStatus } from "@/types/bugs";

/**
 * POST /api/bugs - Create a new bug report
 * 
 * Requirements:
 * - 4.1: Expose POST /api/bugs endpoint
 * - 4.2: Verify user is authenticated and tenant has BUG_REPORTING enabled
 * - 4.3: Return 201 Created with created bug report data
 * - 4.4: Return 400 Bad Request with validation errors if invalid
 * - 4.5: Return 401 Unauthorized if not authenticated
 * - 4.6: Return 403 Forbidden if feature disabled (handled by withFeatureGuard)
 * - 4.7: Sanitize all text inputs (handled by validateAndSanitizeBugRequest)
 * - 4.8: Enforce tenant isolation by setting companyId from session
 */
async function postHandler(req: NextRequest) {
  try {
    // Get authenticated session (Requirement 4.5)
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;

    // Parse request body
    let body: Partial<CreateBugRequest>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Validate and sanitize input (Requirements 4.4, 4.7)
    const validationResult = validateAndSanitizeBugRequest(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Auto-capture metadata (Requirement 2.3)
    const pageUrl = req.headers.get("referer") || req.headers.get("x-page-url") || "";
    const userAgent = req.headers.get("user-agent") || "";

    // Create bug with tenant isolation (Requirements 4.3, 4.8)
    const bug = await createBug({
      ...validationResult.data,
      submitterId: userId,
      companyId, // Tenant isolation - always from session
      pageUrl,
      userAgent,
    });

    return NextResponse.json({ bug }, { status: 201 });
  } catch (error) {
    console.error("Error creating bug report:", error);
    return NextResponse.json(
      { error: "Failed to create bug report", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bugs - List bug reports for the current tenant
 * 
 * Requirements:
 * - 6.1: Expose GET /api/bugs endpoint
 * - 6.2: Return only bugs where companyId matches user's companyId
 * - 6.3: Support query parameters: status, severity, page, limit, sortBy, sortOrder
 * - 6.6: Exclude adminNotes from responses
 */
async function getHandler(req: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const companyId = session.user.companyId;

    // Parse query parameters (Requirement 6.3)
    const { searchParams } = new URL(req.url);
    
    const query: ListBugsQuery = {};
    
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
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    query.page = Math.max(1, page);
    query.limit = Math.min(100, Math.max(1, limit)); // Cap at 100
    
    // Sorting
    const sortBy = searchParams.get("sortBy");
    if (sortBy && ["createdAt", "status", "severity", "resolvedAt"].includes(sortBy)) {
      query.sortBy = sortBy as ListBugsQuery["sortBy"];
    }
    
    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder && ["asc", "desc"].includes(sortOrder)) {
      query.sortOrder = sortOrder as "asc" | "desc";
    }

    // List bugs with tenant isolation, excluding adminNotes (Requirements 6.2, 6.6)
    const result = await listBugsForTenant(companyId, query, false);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing bug reports:", error);
    return NextResponse.json(
      { error: "Failed to list bug reports", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// Apply feature guard to all handlers (Requirement 4.6)
const bugsGuard = withFeatureGuard(FEATURE_KEYS.BUG_REPORTING);
export const POST = bugsGuard(postHandler);
export const GET = bugsGuard(getHandler);
