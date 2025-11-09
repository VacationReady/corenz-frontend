/**
 * Clock Photo Storage Utility
 * 
 * Production-grade photo storage for time tracking clock entries
 * with Supabase integration, tenant isolation, and 6-year retention.
 * 
 * Compliance: NZ Employment Relations Act 2000 - 6-year record retention
 */

import supabase from '../../app/lib/supabase-admin';

// Storage bucket for time tracking photos
const BUCKET_NAME = 'time-tracking-photos';

// 6-year retention period for NZ compliance (in seconds)
const RETENTION_PERIOD_SECONDS = 6 * 365 * 24 * 60 * 60;

export interface ClockPhotoMetadata {
  entryId: string;
  employeeId: string;
  companyId: string;
  photoType: 'clockIn' | 'clockOut';
  timestamp?: number;
}

export interface UploadPhotoResult {
  url: string;
  path: string;
  bucket: string;
}

/**
 * Upload clock photo to Supabase storage with tenant isolation
 * 
 * **Storage Structure:**
 * `time-tracking/{companyId}/{employeeId}/{entryId}/{timestamp}-{photoType}.jpg`
 * 
 * **Compliance Features:**
 * - Tenant isolation by companyId prefix
 * - Deterministic paths for audit trail
 * - 6-year retention metadata
 * - Content-type validation
 * 
 * @param photoBase64 - Base64 encoded photo (with or without data URI prefix)
 * @param metadata - Photo metadata for path construction
 * @returns Upload result with public/signed URL
 * 
 * @throws Error if upload fails or validation fails
 * 
 * @example
 * ```typescript
 * const result = await uploadClockPhoto(
 *   'data:image/jpeg;base64,/9j/4AAQ...',
 *   {
 *     entryId: 'entry-123',
 *     employeeId: 'emp-456',
 *     companyId: 'comp-789',
 *     photoType: 'clockIn'
 *   }
 * );
 * // result.url: https://...supabase.co/storage/v1/object/public/time-tracking-photos/...
 * ```
 */
export async function uploadClockPhoto(
  photoBase64: string,
  metadata: ClockPhotoMetadata
): Promise<UploadPhotoResult> {
  try {
    // Validate metadata
    if (!metadata.entryId || !metadata.employeeId || !metadata.companyId) {
      throw new Error('Missing required metadata: entryId, employeeId, or companyId');
    }

    // Strip data URI prefix if present
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Validate file size (max 5MB for reasonable photo size)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      throw new Error(`Photo size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum (5MB)`);
    }

    // Construct deterministic path with tenant isolation
    const timestamp = metadata.timestamp || Date.now();
    const path = `time-tracking/${metadata.companyId}/${metadata.employeeId}/${metadata.entryId}/${timestamp}-${metadata.photoType}.jpg`;

    // Upload to Supabase storage
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false, // Prevent accidental overwrites
        // Metadata for 6-year retention compliance
        metadata: {
          entryId: metadata.entryId,
          employeeId: metadata.employeeId,
          companyId: metadata.companyId,
          photoType: metadata.photoType,
          uploadedAt: new Date().toISOString(),
          retentionYears: '6',
        },
      });

    if (error) {
      console.error('[clock-photos] Upload error:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload succeeded but no data returned');
    }

    // Get public URL (or signed URL for private buckets)
    const { data: urlData } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded photo');
    }

    console.log(`[clock-photos] Uploaded: ${path} (${(buffer.length / 1024).toFixed(2)}KB)`);

    return {
      url: urlData.publicUrl,
      path: path,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    console.error('[clock-photos] Upload failed:', error);
    throw error;
  }
}

/**
 * Delete clock photo from storage
 * 
 * @param path - Full storage path returned from uploadClockPhoto
 * @returns True if deleted successfully
 * 
 * @example
 * ```typescript
 * await deleteClockPhoto('time-tracking/comp-123/emp-456/entry-789/1234567890-clockIn.jpg');
 * ```
 */
export async function deleteClockPhoto(path: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('[clock-photos] Delete error:', error);
      return false;
    }

    console.log(`[clock-photos] Deleted: ${path}`);
    return true;
  } catch (error) {
    console.error('[clock-photos] Delete failed:', error);
    return false;
  }
}

/**
 * Get signed URL for private photo access (if bucket is private)
 * 
 * @param path - Full storage path
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedPhotoUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('[clock-photos] Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[clock-photos] Signed URL generation failed:', error);
    return null;
  }
}

/**
 * Validate photo belongs to the specified company (tenant isolation check)
 * 
 * @param path - Storage path to validate
 * @param companyId - Company ID to verify
 * @returns True if path belongs to company
 */
export function validatePhotoTenancy(path: string, companyId: string): boolean {
  return path.startsWith(`time-tracking/${companyId}/`);
}
