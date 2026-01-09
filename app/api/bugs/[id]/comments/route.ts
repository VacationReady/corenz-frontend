/**
 * Bug Comments API - User Endpoint
 * 
 * POST /api/bugs/[id]/comments - Add a comment to a bug report
 * GET /api/bugs/[id]/comments - List comments for a bug report
 * 
 * Requirements: 11.1, 11.2, 11.3
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import { 
  addComment, 
  listComments, 
  verifyBugBelongsToTenant 
} from "@/lib/bugs/comments";
import { validateCommentContent } from "@/lib/bugs/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bugs/[id]/comments - Add a comment to a bug report
 * 
 * Requirements:
 * - 11.1: Allow users to add comments to bug reports belonging to their tenant
 * - 11.2: Store BugComment records with required fields
 */
async function postHandler(req: NextRequest, { params }: RouteParams) {
  try {
    // Get authenticated session
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;
    const { id: bugId } = await params;

    if (!bugId) {
      return NextResponse.json(
        { error: "Bug ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Verify bug exists and belongs to user's tenant (Requirement 11.1)
    const belongsToTenant = await verifyBugBelongsToTenant(bugId, companyId);
    if (!belongsToTenant) {
      return NextResponse.json(
        { error: "Bug report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { content, isAdminOnly } = body;

    // Validate content
    const contentValidation = validateCommentContent(content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Regular users cannot create admin-only comments
    // (Only tenant admins can, via the tenant-admin endpoint)
    if (isAdminOnly) {
      return NextResponse.json(
        { error: "Only tenant admins can create admin-only comments", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Create comment (Requirement 11.2)
    const comment = await addComment({
      bugReportId: bugId,
      authorId: userId,
      content,
      isAdminOnly: false,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bugs/[id]/comments - List comments for a bug report
 * 
 * Requirements:
 * - 11.3: Display comments in chronological order on the bug detail view
 * - 11.5: Admin-only comments are excluded for non-tenant-admin users
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
    const { id: bugId } = await params;

    if (!bugId) {
      return NextResponse.json(
        { error: "Bug ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Verify bug exists and belongs to user's tenant
    const belongsToTenant = await verifyBugBelongsToTenant(bugId, companyId);
    if (!belongsToTenant) {
      return NextResponse.json(
        { error: "Bug report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // List comments (excluding admin-only for regular users)
    const comments = await listComments({
      bugReportId: bugId,
      includeAdminOnly: false, // Regular users don't see admin-only comments
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error listing comments:", error);
    return NextResponse.json(
      { error: "Failed to list comments", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// Apply feature guard (Requirement 1.3)
const bugsGuard = withFeatureGuard(FEATURE_KEYS.BUG_REPORTING);
export const POST = bugsGuard(postHandler);
export const GET = bugsGuard(getHandler);
