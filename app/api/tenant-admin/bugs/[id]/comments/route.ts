/**
 * Tenant Admin Bug Comments API
 * 
 * POST /api/tenant-admin/bugs/[id]/comments - Add a comment (including admin-only)
 * GET /api/tenant-admin/bugs/[id]/comments - List all comments (including admin-only)
 * 
 * Requirements: 11.1, 11.3, 11.4, 11.5
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedToken, TENANT_ADMIN_COOKIE_NAME } from "@/lib/tenant-admin-auth";
import { 
  addComment, 
  listComments, 
  getBugCompanyId 
} from "@/lib/bugs/comments";
import { validateCommentContent } from "@/lib/bugs/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Check if the user has tenant admin permission via cookie-based auth
 * 
 * Requirement 9.3: Verify tenant admin authentication
 */
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(TENANT_ADMIN_COOKIE_NAME);
  if (!session?.value) return false;
  const { valid } = verifySignedToken(session.value);
  return valid;
}

/**
 * POST /api/tenant-admin/bugs/[id]/comments - Add a comment to a bug report
 * 
 * Requirements:
 * - 11.4: Allow tenant admins to add comments to any bug report
 * - 11.5: Support marking comments as "admin only"
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // Check tenant admin authentication
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: bugId } = await params;

    if (!bugId) {
      return NextResponse.json(
        { error: "Bug ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Verify bug exists
    const companyId = await getBugCompanyId(bugId);
    if (!companyId) {
      return NextResponse.json(
        { error: "Bug report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Parse request body
    let body: { content?: string; isAdminOnly?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { content, isAdminOnly = false } = body;

    // Validate content
    const contentValidation = validateCommentContent(content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Create comment (Requirement 11.4, 11.5)
    // Note: authorId is "tenant-admin" since cookie-based auth doesn't have user identity
    const comment = await addComment({
      bugReportId: bugId,
      authorId: "tenant-admin",
      content: content!,
      isAdminOnly,
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
 * GET /api/tenant-admin/bugs/[id]/comments - List all comments for a bug report
 * 
 * Requirements:
 * - 11.3: Display comments in chronological order
 * - 11.5: Tenant admins see all comments including admin-only
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Check tenant admin authentication
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: bugId } = await params;

    if (!bugId) {
      return NextResponse.json(
        { error: "Bug ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Verify bug exists
    const companyId = await getBugCompanyId(bugId);
    if (!companyId) {
      return NextResponse.json(
        { error: "Bug report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // List all comments including admin-only (Requirement 11.5)
    const comments = await listComments({
      bugReportId: bugId,
      includeAdminOnly: true,
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
