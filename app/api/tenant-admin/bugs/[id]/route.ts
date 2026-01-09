/**
 * Tenant Admin Bug Report Detail API
 * 
 * GET /api/tenant-admin/bugs/[id] - Get a single bug report
 * PATCH /api/tenant-admin/bugs/[id] - Update bug status and admin notes
 * 
 * Requirements: 8.4, 8.5, 8.6, 9.3, 9.4
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { getBugByIdForAdmin, updateBugStatus } from "@/lib/bugs/service";
import { sanitizeText } from "@/lib/bugs/validation";
import type { UpdateBugRequest, BugStatus } from "@/types/bugs";
import { isBugStatus } from "@/types/bugs";

/**
 * Check if the user has tenant admin permission
 * 
 * Requirement 9.3: Require canManageTenants permission
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
 * GET /api/tenant-admin/bugs/[id] - Get a single bug report
 * 
 * Requirements:
 * - 8.5: Allow tenant admins to view any bug report
 * - 9.3: Require canManageTenants permission
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check tenant admin permission (Requirement 9.3)
    const { authorized } = await checkTenantAdminPermission();
    
    if (!authorized) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: bugId } = await params;

    // Get bug report (Requirement 8.5)
    const bug = await getBugByIdForAdmin(bugId);
    
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

/**
 * PATCH /api/tenant-admin/bugs/[id] - Update bug status and admin notes
 * 
 * Requirements:
 * - 8.4: Expose PATCH endpoint for updating bug status and adminNotes
 * - 8.5: Only allow updating: status, adminNotes
 * - 8.6: Auto-set resolvedAt when status changes to RESOLVED or CLOSED
 * - 9.3: Require canManageTenants permission
 * - 9.4: Create audit log entry for status changes
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check tenant admin permission (Requirement 9.3)
    const { authorized, userId } = await checkTenantAdminPermission();
    
    if (!authorized || !userId) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: bugId } = await params;

    // Parse request body
    let body: Partial<UpdateBugRequest>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Validate that only allowed fields are being updated (Requirement 8.5)
    const allowedFields = ["status", "adminNotes"];
    const providedFields = Object.keys(body);
    const invalidFields = providedFields.filter((f) => !allowedFields.includes(f));
    
    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid fields provided",
          code: "VALIDATION_ERROR",
          details: { invalidFields },
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    let validatedStatus: BugStatus | undefined;
    if (body.status !== undefined) {
      if (!isBugStatus(body.status)) {
        return NextResponse.json(
          {
            error: "Invalid status value",
            code: "VALIDATION_ERROR",
            details: { status: ["Must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED, WONT_FIX"] },
          },
          { status: 400 }
        );
      }
      validatedStatus = body.status;
    }

    // Sanitize adminNotes if provided
    let sanitizedAdminNotes: string | undefined;
    if (body.adminNotes !== undefined) {
      sanitizedAdminNotes = sanitizeText(body.adminNotes);
    }

    // Check if bug exists
    const existingBug = await getBugByIdForAdmin(bugId);
    if (!existingBug) {
      return NextResponse.json(
        { error: "Bug report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Update bug with audit logging (Requirements 8.4, 8.5, 8.6, 9.4)
    const updatedBug = await updateBugStatus({
      bugId,
      status: validatedStatus,
      adminNotes: sanitizedAdminNotes,
      actorId: userId,
    });

    return NextResponse.json({ bug: updatedBug });
  } catch (error) {
    console.error("Error updating bug report:", error);
    return NextResponse.json(
      { error: "Failed to update bug report", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
