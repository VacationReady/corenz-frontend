/**
 * Bug Attachment API - User Endpoint
 * 
 * POST /api/bugs/[id]/attachments - Upload attachment to a bug report
 * 
 * Requirements: 10.4
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import { getBugById } from "@/lib/bugs/service";
import { 
  uploadAttachment, 
  validateMimeType, 
  validateFileSize,
  validateAttachmentCount 
} from "@/lib/bugs/attachments";
import type { BugAttachment } from "@/types/bugs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bugs/[id]/attachments - Upload attachment
 * 
 * Requirements:
 * - 10.4: Store file in cloud storage and save reference in BugAttachment
 * - 9.6: Validate file uploads for allowed MIME types
 * - 10.2: Accept only allowed MIME types
 * - 10.3: Reject files larger than 10MB
 * - 10.1: Allow up to 5 attachments per bug report
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

    const companyId = session.user.companyId;
    const { id: bugId } = await params;

    if (!bugId) {
      return NextResponse.json(
        { error: "Bug ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Verify bug exists and belongs to user's tenant
    const bug = await getBugById(bugId, companyId, false);
    if (!bug) {
      return NextResponse.json(
        { error: "Bug report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Validate MIME type (Requirements 9.6, 10.2)
    const mimeValidation = validateMimeType(file.type);
    if (!mimeValidation.valid) {
      return NextResponse.json(
        { error: mimeValidation.error, code: mimeValidation.code },
        { status: 400 }
      );
    }

    // Validate file size (Requirement 10.3)
    const sizeValidation = validateFileSize(file.size);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error, code: sizeValidation.code },
        { status: 400 }
      );
    }

    // Validate attachment count (Requirement 10.1)
    const countValidation = await validateAttachmentCount(bugId);
    if (!countValidation.valid) {
      return NextResponse.json(
        { error: countValidation.error, code: countValidation.code },
        { status: 400 }
      );
    }

    // Upload attachment (Requirement 10.4)
    const result = await uploadAttachment({
      bugReportId: bugId,
      companyId,
      file,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    return NextResponse.json(
      { attachment: result.attachment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// Apply feature guard (Requirement 1.3)
const bugsGuard = withFeatureGuard(FEATURE_KEYS.BUG_REPORTING);
export const POST = bugsGuard(postHandler);
