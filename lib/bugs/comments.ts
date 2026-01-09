/**
 * Bug Comments Service
 * 
 * Provides CRUD operations for bug comments with tenant isolation
 * and admin-only visibility filtering.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import "server-only";

import { prisma } from "../../app/lib/prisma";
import type { BugComment } from "../../app/types/bugs";
import { sanitizeInput } from "./validation";

// ============================================
// TYPES
// ============================================

export interface AddCommentParams {
  bugReportId: string;
  authorId: string;
  content: string;
  isAdminOnly?: boolean;
}

export interface ListCommentsParams {
  bugReportId: string;
  includeAdminOnly?: boolean;
}

// ============================================
// COMMENT SERVICE
// ============================================

/**
 * Add a comment to a bug report
 * 
 * Requirements: 11.1, 11.2, 11.4
 * 
 * @param params - Comment creation parameters
 * @returns The created comment
 */
export async function addComment(params: AddCommentParams): Promise<BugComment> {
  const { bugReportId, authorId, content, isAdminOnly = false } = params;

  // Sanitize content to prevent XSS
  const sanitizedContent = sanitizeInput(content);

  const comment = await prisma.bugComment.create({
    data: {
      bugReportId,
      authorId,
      content: sanitizedContent,
      isAdminOnly,
    },
    include: {
      Author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return mapCommentToResponse(comment);
}

/**
 * List comments for a bug report with optional admin-only filtering
 * 
 * Requirements: 11.3, 11.5
 * 
 * @param params - List parameters
 * @returns Array of comments
 */
export async function listComments(params: ListCommentsParams): Promise<BugComment[]> {
  const { bugReportId, includeAdminOnly = false } = params;

  const where: any = { bugReportId };
  
  // Filter out admin-only comments for non-admins (Requirement 11.5)
  if (!includeAdminOnly) {
    where.isAdminOnly = false;
  }

  const comments = await prisma.bugComment.findMany({
    where,
    include: {
      Author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return comments.map(mapCommentToResponse);
}

/**
 * Verify that a bug report belongs to a specific tenant
 * 
 * Used for tenant isolation checks before allowing comment operations.
 * 
 * @param bugReportId - The bug report ID
 * @param companyId - The company ID to check against
 * @returns True if the bug belongs to the tenant
 */
export async function verifyBugBelongsToTenant(
  bugReportId: string,
  companyId: string
): Promise<boolean> {
  const bug = await prisma.bugReport.findFirst({
    where: {
      id: bugReportId,
      companyId,
    },
    select: { id: true },
  });

  return bug !== null;
}

/**
 * Get a bug report's company ID
 * 
 * Used for tenant admin operations to verify bug exists.
 * 
 * @param bugReportId - The bug report ID
 * @returns The company ID or null if not found
 */
export async function getBugCompanyId(bugReportId: string): Promise<string | null> {
  const bug = await prisma.bugReport.findUnique({
    where: { id: bugReportId },
    select: { companyId: true },
  });

  return bug?.companyId || null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma comment to API response format
 */
function mapCommentToResponse(comment: any): BugComment {
  return {
    id: comment.id,
    bugReportId: comment.bugReportId,
    authorId: comment.authorId,
    content: comment.content,
    isAdminOnly: comment.isAdminOnly,
    createdAt: comment.createdAt,
    author: comment.Author
      ? {
          id: comment.Author.id,
          name: comment.Author.name,
          email: comment.Author.email,
        }
      : undefined,
  };
}
