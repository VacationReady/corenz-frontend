/**
 * Bug Attachment Download API - User Endpoint
 * 
 * GET /api/bugs/attachments/[id]/download - Get signed URL for attachment download
 * 
 * Requirements: 10.5
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import { getAttachmentById, getAttachmentSignedUrl } from "@/lib/bugs/attachments";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bugs/attachments/[id]/download - Get signed download URL
 * 
 * Requirements:
 * - 10.5: Generate secure, time-limited URLs for attachment downloads
 * - 9.1, 9.2: Verify user has access to parent bug (tenant isolation)
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
    const { id: attachmentId } = await params;

    if (!attachmentId) {
      return NextResponse.json(
        { error: "Attachment ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Get attachment with tenant isolation check
    const attachment = await getAttachmentById(attachmentId, companyId);
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Generate signed URL (Requirement 10.5)
    const signedUrlResult = await getAttachmentSignedUrl(attachmentId);
    if (!signedUrlResult) {
      return NextResponse.json(
        { error: "Failed to generate download URL", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrlResult.url,
      expiresAt: signedUrlResult.expiresAt,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// Apply feature guard (Requirement 1.3)
const bugsGuard = withFeatureGuard(FEATURE_KEYS.BUG_REPORTING);
export const GET = bugsGuard(getHandler);
