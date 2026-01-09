/**
 * Bug Report Detail API - User Endpoint
 * 
 * GET /api/bugs/[id] - Get a single bug report by ID
 * 
 * Requirements: 6.4, 6.5, 6.6
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import { getBugById } from "@/lib/bugs/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bugs/[id] - Get a single bug report
 * 
 * Requirements:
 * - 6.4: Expose GET /api/bugs/[id] endpoint
 * - 6.5: Verify bug belongs to user's tenant before returning data
 * - 6.6: Exclude adminNotes from response
 */
async function getHandler(req: NextRequest, { params }: RouteParams) {
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
    
    // Await params for Next.js 15+ compatibility
    const { id: bugId } = await params;

    if (!bugId) {
      return NextResponse.json(
        { error: "Bug ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Get bug with tenant isolation check (Requirements 6.5, 6.6)
    // The service enforces tenant isolation by filtering on companyId
    // adminNotes is excluded by passing false for includeAdminNotes
    const bug = await getBugById(bugId, companyId, false);

    if (!bug) {
      return NextResponse.json(
        { error: "Bug report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ bug });
  } catch (error) {
    console.error("Error fetching bug report:", error);
    return NextResponse.json(
      { error: "Failed to fetch bug report", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// Apply feature guard (Requirement 1.3)
const bugsGuard = withFeatureGuard(FEATURE_KEYS.BUG_REPORTING);
export const GET = bugsGuard(getHandler);
