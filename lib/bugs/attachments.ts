/**
 * Bug Attachment Service
 * 
 * Handles file uploads, validation, and storage for bug report attachments.
 * Integrates with Supabase storage with tenant isolation.
 * 
 * Requirements: 9.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import "server-only";

import supabase from "../../app/lib/supabase-admin";
import { prisma } from "../../app/lib/prisma";
import { BUG_VALIDATION, type BugAttachment } from "../../app/types/bugs";

// Storage bucket for bug attachments
const BUCKET_NAME = "bug-attachments";

// Default signed URL expiry (1 hour)
const DEFAULT_URL_EXPIRY_SECONDS = 3600;

// ============================================
// TYPES
// ============================================

export interface AttachmentUploadParams {
  bugReportId: string;
  companyId: string;
  file: File | Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface AttachmentUploadResult {
  attachment: BugAttachment;
}

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}


// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate MIME type against allowed types
 * 
 * Requirements: 9.6, 10.2
 * 
 * @param mimeType - The MIME type to validate
 * @returns Validation result
 */
export function validateMimeType(mimeType: string): AttachmentValidationResult {
  const normalizedMimeType = mimeType.toLowerCase().trim();
  
  if (!BUG_VALIDATION.ALLOWED_MIME_TYPES.includes(normalizedMimeType as any)) {
    return {
      valid: false,
      error: `Invalid file type: ${mimeType}. Allowed types: ${BUG_VALIDATION.ALLOWED_MIME_TYPES.join(", ")}`,
      code: "INVALID_FILE_TYPE",
    };
  }
  
  return { valid: true };
}

/**
 * Validate file size against maximum allowed
 * 
 * Requirements: 10.3
 * 
 * @param fileSize - The file size in bytes
 * @returns Validation result
 */
export function validateFileSize(fileSize: number): AttachmentValidationResult {
  if (fileSize <= 0) {
    return {
      valid: false,
      error: "File size must be greater than 0",
      code: "INVALID_FILE_SIZE",
    };
  }
  
  if (fileSize > BUG_VALIDATION.MAX_FILE_SIZE_BYTES) {
    const maxSizeMB = BUG_VALIDATION.MAX_FILE_SIZE_BYTES / (1024 * 1024);
    const actualSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${actualSizeMB}MB) exceeds maximum allowed (${maxSizeMB}MB)`,
      code: "FILE_TOO_LARGE",
    };
  }
  
  return { valid: true };
}

/**
 * Validate attachment count for a bug report
 * 
 * Requirements: 10.1
 * 
 * @param bugReportId - The bug report ID
 * @returns Validation result
 */
export async function validateAttachmentCount(bugReportId: string): Promise<AttachmentValidationResult> {
  const currentCount = await prisma.bugAttachment.count({
    where: { bugReportId },
  });
  
  if (currentCount >= BUG_VALIDATION.MAX_ATTACHMENTS) {
    return {
      valid: false,
      error: `Maximum attachments (${BUG_VALIDATION.MAX_ATTACHMENTS}) already reached for this bug report`,
      code: "TOO_MANY_ATTACHMENTS",
    };
  }
  
  return { valid: true };
}

/**
 * Validate all attachment constraints
 * 
 * Requirements: 9.6, 10.1, 10.2, 10.3
 * 
 * @param params - Validation parameters
 * @returns Validation result
 */
export async function validateAttachment(params: {
  bugReportId: string;
  mimeType: string;
  fileSize: number;
}): Promise<AttachmentValidationResult> {
  // Validate MIME type
  const mimeResult = validateMimeType(params.mimeType);
  if (!mimeResult.valid) {
    return mimeResult;
  }
  
  // Validate file size
  const sizeResult = validateFileSize(params.fileSize);
  if (!sizeResult.valid) {
    return sizeResult;
  }
  
  // Validate attachment count
  const countResult = await validateAttachmentCount(params.bugReportId);
  if (!countResult.valid) {
    return countResult;
  }
  
  return { valid: true };
}


// ============================================
// STORAGE FUNCTIONS
// ============================================

/**
 * Generate storage path for attachment with tenant isolation
 * 
 * Path format: bugs/{companyId}/{bugReportId}/{timestamp}-{sanitizedFileName}
 * 
 * @param companyId - The company ID for tenant isolation
 * @param bugReportId - The bug report ID
 * @param fileName - The original file name
 * @returns The storage path
 */
function generateStoragePath(companyId: string, bugReportId: string, fileName: string): string {
  const timestamp = Date.now();
  // Sanitize filename: remove special chars, keep extension
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 100); // Limit filename length
  
  return `bugs/${companyId}/${bugReportId}/${timestamp}-${sanitizedName}`;
}

/**
 * Upload attachment to cloud storage and create database record
 * 
 * Requirements: 10.4
 * 
 * @param params - Upload parameters
 * @returns The created attachment record
 */
export async function uploadAttachment(params: AttachmentUploadParams): Promise<AttachmentUploadResult> {
  const { bugReportId, companyId, file, fileName, mimeType, fileSize } = params;
  
  // Validate all constraints first
  const validation = await validateAttachment({
    bugReportId,
    mimeType,
    fileSize,
  });
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // Generate storage path
  const storagePath = generateStoragePath(companyId, bugReportId, fileName);
  
  // Convert File to Buffer if needed
  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    const arrayBuffer = await (file as File).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }
  
  // Upload to Supabase storage
  const { error: uploadError } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
      metadata: {
        bugReportId,
        companyId,
        originalFileName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });
  
  if (uploadError) {
    console.error("[bug-attachments] Upload error:", uploadError);
    throw new Error(`Failed to upload attachment: ${uploadError.message}`);
  }
  
  // Create database record
  const attachment = await prisma.bugAttachment.create({
    data: {
      bugReportId,
      fileName,
      fileSize,
      mimeType,
      storagePath,
    },
  });
  
  console.log(`[bug-attachments] Uploaded: ${storagePath} (${(fileSize / 1024).toFixed(2)}KB)`);
  
  return {
    attachment: {
      id: attachment.id,
      bugReportId: attachment.bugReportId,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      storagePath: attachment.storagePath,
      createdAt: attachment.createdAt,
    },
  };
}

/**
 * Get signed URL for attachment download
 * 
 * Requirements: 10.5
 * 
 * @param attachmentId - The attachment ID
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns Signed URL and expiry time
 */
export async function getAttachmentSignedUrl(
  attachmentId: string,
  expiresIn: number = DEFAULT_URL_EXPIRY_SECONDS
): Promise<SignedUrlResult | null> {
  // Get attachment record
  const attachment = await prisma.bugAttachment.findUnique({
    where: { id: attachmentId },
  });
  
  if (!attachment) {
    return null;
  }
  
  // Generate signed URL
  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .createSignedUrl(attachment.storagePath, expiresIn);
  
  if (error || !data?.signedUrl) {
    console.error("[bug-attachments] Failed to create signed URL:", error);
    return null;
  }
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  
  return {
    url: data.signedUrl,
    expiresAt,
  };
}

/**
 * Get attachment by ID with optional tenant check
 * 
 * @param attachmentId - The attachment ID
 * @param companyId - Optional company ID for tenant isolation
 * @returns The attachment or null
 */
export async function getAttachmentById(
  attachmentId: string,
  companyId?: string
): Promise<BugAttachment | null> {
  const attachment = await prisma.bugAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      BugReport: {
        select: { companyId: true },
      },
    },
  });
  
  if (!attachment) {
    return null;
  }
  
  // Tenant isolation check
  if (companyId && attachment.BugReport.companyId !== companyId) {
    return null;
  }
  
  return {
    id: attachment.id,
    bugReportId: attachment.bugReportId,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    storagePath: attachment.storagePath,
    createdAt: attachment.createdAt,
  };
}


// ============================================
// DELETION FUNCTIONS
// ============================================

/**
 * Delete a single attachment from storage and database
 * 
 * @param attachmentId - The attachment ID
 * @returns True if deleted successfully
 */
export async function deleteAttachment(attachmentId: string): Promise<boolean> {
  const attachment = await prisma.bugAttachment.findUnique({
    where: { id: attachmentId },
  });
  
  if (!attachment) {
    return false;
  }
  
  // Delete from storage
  const { error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .remove([attachment.storagePath]);
  
  if (error) {
    console.error("[bug-attachments] Storage delete error:", error);
    // Continue to delete DB record even if storage delete fails
  }
  
  // Delete database record
  await prisma.bugAttachment.delete({
    where: { id: attachmentId },
  });
  
  console.log(`[bug-attachments] Deleted: ${attachment.storagePath}`);
  return true;
}

/**
 * Delete all attachments for a bug report from storage
 * 
 * Requirements: 10.6
 * 
 * Note: Database records are deleted via cascade when bug is deleted.
 * This function handles the storage cleanup.
 * 
 * @param bugReportId - The bug report ID
 * @returns Number of attachments deleted from storage
 */
export async function deleteAttachmentsForBug(bugReportId: string): Promise<number> {
  // Get all attachments for the bug
  const attachments = await prisma.bugAttachment.findMany({
    where: { bugReportId },
    select: { storagePath: true },
  });
  
  if (attachments.length === 0) {
    return 0;
  }
  
  // Delete from storage
  const paths = attachments.map((a) => a.storagePath);
  const { error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .remove(paths);
  
  if (error) {
    console.error("[bug-attachments] Bulk storage delete error:", error);
    // Log but don't throw - DB cascade will still clean up records
  }
  
  console.log(`[bug-attachments] Deleted ${paths.length} attachments for bug ${bugReportId}`);
  return paths.length;
}

/**
 * Validate that a storage path belongs to a specific company (tenant isolation)
 * 
 * @param storagePath - The storage path to validate
 * @param companyId - The company ID to verify
 * @returns True if path belongs to company
 */
export function validateAttachmentTenancy(storagePath: string, companyId: string): boolean {
  return storagePath.startsWith(`bugs/${companyId}/`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get file extension from MIME type
 * 
 * @param mimeType - The MIME type
 * @returns File extension or empty string
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
  };
  
  return mimeToExt[mimeType.toLowerCase()] || "";
}

/**
 * Check if a MIME type is an image
 * 
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("image/");
}
